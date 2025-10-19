/**
 * Distraction Manager Module
 * Centralized orchestration of distraction detection and alert flow
 */

import { EventEmitter } from 'events';

export class DistractionManager extends EventEmitter {
	constructor({
		pythonIPC,
		sessionManager,
		windowTracker,
		elevenLabsService,
		bedrockService,
		pushoverService,
		logger = null
	}) {
		super();

		// Dependencies
		this.pythonIPC = pythonIPC;
		this.sessionManager = sessionManager;
		this.windowTracker = windowTracker;
		this.elevenLabsService = elevenLabsService;
		this.bedrockService = bedrockService;
		this.pushoverService = pushoverService;
		this.logger = logger; // Optional: DistractionLogger for event persistence

		// Distraction state
		this.isWindowDistracted = false;
		this.isEyeDistracted = false;
		this.distractionStartTime = null;
		this.checkInterval = null;
		this.currentWindowInfo = null;
		this.lastTriggerSource = null;

		// Configuration
		this.DISTRACTION_THRESHOLD = 2500; // 2.5 seconds in milliseconds
		this.CHECK_INTERVAL = 500; // Check every 500 milliseconds

		// Registered windows for broadcasting
		this.windows = new Set();

		console.log('🎯 Distraction Manager initialized');
	}

	/**
	 * Register a window to receive distraction alerts
	 * @param {BrowserWindow} window - Electron BrowserWindow instance
	 */
	registerWindow(window) {
		if (window && !window.isDestroyed()) {
			this.windows.add(window);
		}
	}

	/**
	 * Unregister a window from receiving alerts
	 * @param {BrowserWindow} window - Electron BrowserWindow instance
	 */
	unregisterWindow(window) {
		this.windows.delete(window);
	}

	/**
	 * Update distraction state based on window activity
	 * @param {Object} windowInfo - Current window information
	 */
	updateWindowState(windowInfo) {
		if (!windowInfo) return;

		console.log('🪟 Window state updated:', {
			appName: windowInfo.appName,
			isProductive: windowInfo.isProductive,
			sessionActive: this.sessionManager.isSessionActive()
		});

		this.currentWindowInfo = windowInfo;
		const wasWindowDistracted = this.isWindowDistracted;
		this.isWindowDistracted = !windowInfo.isProductive;

		// If user refocused (was distracted, now productive), immediately handle refocus
		if (wasWindowDistracted && !this.isWindowDistracted) {
			console.log('🔄 Window refocus detected - immediately stopping any distraction flow');
			this.handleImmediateRefocus('window_tracker');
		} else if (this.isWindowDistracted) {
			this.lastTriggerSource = 'window_tracker';
		}

		this.checkDistractionState();
	}

	/**
	 * Update distraction state based on eye tracking
	 * @param {boolean} isFocused - Whether user is focused (eyes on screen)
	 */
	updateEyeState(isFocused) {
		const wasEyeDistracted = this.isEyeDistracted;
		this.isEyeDistracted = !isFocused;

		// If user refocused (was distracted, now focused), immediately handle refocus
		if (wasEyeDistracted && !this.isEyeDistracted) {
			console.log('🔄 Eye refocus detected - immediately stopping any distraction flow');
			this.handleImmediateRefocus('eye_tracker');
		} else if (this.isEyeDistracted) {
			this.lastTriggerSource = 'eye_tracker';
		}

		this.checkDistractionState();
	}

	/**
	 * Handle immediate refocus - aggressively stop any ongoing distraction flow
	 * @param {string} source - Source of the refocus (window_tracker or eye_tracker)
	 */
	handleImmediateRefocus(source) {
		console.log(`🚨 IMMEDIATE REFOCUS from ${source} - stopping all distraction flows`);
		
		// Stop any ongoing timer
		if (this.distractionStartTime) {
			console.log('⏹️ Stopping distraction timer');
			this.distractionStartTime = null;
		}
		
		// Clear any check intervals
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
		
		// Reset distraction states
		this.isWindowDistracted = false;
		this.isEyeDistracted = false;
		this.lastTriggerSource = null;
		
		// Immediately broadcast refocus to stop dog animation
		this.broadcastRefocus();
		
		console.log('✅ Immediate refocus handled - dog animation should stop');
	}

	/**
	 * Check overall distraction state (OR logic)
	 * If either detector reports distraction, user is considered distracted
	 */
	checkDistractionState() {
		const sessionActive = this.sessionManager.isSessionActive();
		// console.log('🔍 Checking distraction state:', {
		// 	sessionActive,
		// 	isWindowDistracted: this.isWindowDistracted,
		// 	isEyeDistracted: this.isEyeDistracted,
		// 	hasTimer: !!this.distractionStartTime
		// });

		// Only track distractions if a session is active
		if (!sessionActive) {
			console.log('⏸️ No active session, resetting timer');
			this.resetTimer();
			return;
		}

		const isDistracted = this.isWindowDistracted || this.isEyeDistracted;

		if (isDistracted && !this.distractionStartTime) {
			// Start distraction timer
			console.log('🚨 Starting distraction timer!');
			this.startTimer();
		} else if (!isDistracted && this.distractionStartTime) {
			// User is focused again, reset timer (hard reset)
			console.log('✅ User refocused, resetting timer');
			this.resetTimer();
			this.broadcastRefocus();
		}
	}

	/**
	 * Start the distraction timer
	 */
	startTimer() {
		this.distractionStartTime = Date.now();
		console.log(`⏱️  Distraction timer started (${this.lastTriggerSource})`);

		// Start checking if threshold is reached
		this.checkInterval = setInterval(() => {
			console.log("INITIATING A THRESHOLD CHECK!");
			if(this.checkThreshold() === "exitThis" || 
				this.checkThreshold === "handlingDistraction") {
				clearInterval(this.checkInterval);
			}
		}, this.CHECK_INTERVAL);
	}

	/**
	 * Reset the distraction timer
	 */
	resetTimer() {
		if (this.distractionStartTime) {
			console.log('✅ User refocused, timer reset');
			
			// Broadcast refocus event to reset dog's state
			this.broadcastRefocus();
		}

		this.distractionStartTime = null;
		this.lastTriggerSource = null;

		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	/**
	 * Check if distraction threshold has been reached
	 */
	checkThreshold() {
		if (!this.distractionStartTime) return "exitThis";

		// Safety check: if user is no longer distracted, stop immediately
		const isCurrentlyDistracted = this.isWindowDistracted || this.isEyeDistracted;
		if (!isCurrentlyDistracted) {
			console.log('🛑 User refocused during countdown - stopping threshold check');
			this.distractionStartTime = null;
			return "exitThis";
		}

		const elapsed = Date.now() - this.distractionStartTime;

		if (elapsed >= this.DISTRACTION_THRESHOLD) {
			console.log('🔥 Distraction threshold reached! Triggering alert...');
			this.handleDistractionThreshold();
			return "handlingDistraction";
		}
		return "continuing";
	}
	async sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Wait for Rekognition data to be available
	 * @param {number} timeout - Maximum time to wait in milliseconds
	 * @returns {Promise<Object|null>} Rekognition data or null if timeout
	 */
	async waitForRekognitionData(timeout = 5000) {
		return new Promise((resolve) => {
			const startTime = Date.now();
			const checkInterval = 100; // Check every 100ms
			
			const checkForData = () => {
				// Check if we have new data (not empty and different from previous)
				if (this.pythonIPC.globalBedrockString && 
					this.pythonIPC.globalBedrockString.trim() !== '') {
					console.log('✅ Rekognition data received asynchronously');
					resolve(this.pythonIPC.globalBedrockString);
					return;
				}
				
				// Check if we've exceeded timeout
				if (Date.now() - startTime > timeout) {
					console.warn('⚠️ Timeout waiting for Rekognition data');
					resolve(null);
					return;
				}
				
				// Continue checking
				setTimeout(checkForData, checkInterval);
			};
			
			// Start checking
			checkForData();
		});
	}
	/**
	 * Main orchestration method when distraction threshold is reached
	 * Executes the full alert flow
	 */
	async handleDistractionThreshold() {
		// Reset timer first to prevent multiple triggers
		this.resetTimer();

		try {
			console.log('📊 Gathering context for distraction alert...');

			// Step 1: Request Rekognition data from Python
			let rekognitionData = null;
			try {
				console.log('📸 Requesting Rekognition data from Python...');
				
				// Clear previous data to ensure we get fresh data
				this.pythonIPC.globalBedrockString = '';
				
				// Request new data
				this.pythonIPC.requestData();
				
				// Wait asynchronously for the data to be available
				rekognitionData = await this.waitForRekognitionData(3000); // 3 second timeout
				
				if (rekognitionData) {
					console.log('** Rekognition data received ** ', rekognitionData);
				} else {
					console.log('** No Rekognition data received within timeout **');
				}
			} catch (error) {
				console.warn('⚠️  Failed to get Rekognition data:', error.message);
				// Continue without rekognition data
			}

			// Step 2: Gather all context
			const context = this.gatherContext(rekognitionData);
			console.log(context);
			
			console.log('📋 Context gathered:', JSON.stringify(context, null, 2));

			// Step 3: Generate message using Bedrock
			console.log('🤖 Generating AI message...');
			const dubsMessage = await this.bedrockService.generateMessage(context);
			console.log('💬 Dubs says:', dubsMessage);

			// Step 4: Generate audio using ElevenLabs
			console.log('🎙️  Generating audio...');
			const audioResult = await this.elevenLabsService.generateSpeechFromText(dubsMessage);

			// Step 5: Check for phone and send push notification if detected
			const hasPhone = this.checkForPhone(rekognitionData);
			if (hasPhone && this.pushoverService) {
				console.log('📱 Phone detected! Sending push notification...');
				await this.pushoverService.sendNotification(dubsMessage);
			}

			// Step 6: Broadcast alert to all registered windows
			const alertPackage = {
				message: dubsMessage,
				audioData: audioResult.success ? audioResult.audioData.toString('base64') : null,
				triggerSource: this.lastTriggerSource,
				hasPhone: hasPhone,
				timestamp: Date.now(),
				context: context
			};

			this.broadcastAlert(alertPackage);

			// Log event if logger is enabled
			if (this.logger) {
				this.logger.logEvent(alertPackage);
			}

			// Emit event for other listeners
			this.emit('distraction-occurred', alertPackage);
			this.DISTRACTION_THRESHOLD = 7000;

		} catch (error) {
			console.error('❌ Error handling distraction threshold:', error);
		}
	}

	/**
	 * Gather all context for the distraction alert
	 * @param {Object} rekognitionData - Rekognition data from Python
	 * @returns {Object} Complete context object
	 */
	gatherContext(rekognitionData) {
		const sessionState = this.sessionManager.getState();

		// Calculate time in session
		const timeInSession = sessionState.startTime
			? Math.floor((Date.now() - sessionState.startTime) / 1000 / 60) // minutes
			: 0;

		return {
			session: {
				taskName: sessionState.taskName || 'Unknown task',
				timeElapsed: timeInSession,
				isActive: sessionState.isActive
			},
			window: {
				appName: this.currentWindowInfo?.appName || 'Unknown',
				windowTitle: this.currentWindowInfo?.windowTitle || '',
				url: this.currentWindowInfo?.url || null,
				isProductive: this.currentWindowInfo?.isProductive || false
			},
			trigger: {
				source: this.lastTriggerSource,
				windowDistracted: this.isWindowDistracted,
				eyeDistracted: this.isEyeDistracted
			},
			rekognition: rekognitionData || null
		};
	}

	/**
	 * Check if phone is detected in Rekognition data
	 * @param {Object} rekognitionData - Rekognition data
	 * @returns {boolean} True if phone detected
	 */
	checkForPhone(rekognitionData) {
		if (!rekognitionData || !rekognitionData.scene_analysis) {
			return false;
		}

		const labels = rekognitionData.scene_analysis.labels || [];
		const distractionObjects = rekognitionData.scene_analysis.distraction_objects || [];

		// Check in labels
		const hasPhoneInLabels = labels.some(
			(label) => label.name && label.name.toLowerCase().includes('phone')
		);

		// Check in distraction objects
		const hasPhoneInObjects = distractionObjects.some(
			(obj) => obj.object && obj.object.toLowerCase().includes('phone')
		);

		return hasPhoneInLabels || hasPhoneInObjects;
	}

	/**
	 * Broadcast alert to all registered windows
	 * @param {Object} alertPackage - Complete alert package
	 */
	broadcastAlert(alertPackage) {
		console.log('📢 Broadcasting distraction alert to windows...');

		// Clean up destroyed windows
		for (const window of this.windows) {
			if (window.isDestroyed()) {
				this.windows.delete(window);
			} else {
				window.webContents.send('distraction-alert', alertPackage);
			}
		}
	}

	/**
	 * Broadcast refocus event to reset dog's state
	 */
	broadcastRefocus() {
		console.log('😴 Broadcasting refocus event to reset dog state...');

		// Clean up destroyed windows
		for (const window of this.windows) {
			if (window.isDestroyed()) {
				this.windows.delete(window);
			} else {
				window.webContents.send('user-refocused', {
					timestamp: Date.now(),
					message: 'User is back to being focused!'
				});
			}
		}
	}

	/**
	 * Emergency stop - immediately stop all distraction flows and reset dog
	 * Can be called from frontend or internally
	 */
	emergencyStop() {
		console.log('🚨 EMERGENCY STOP - immediately stopping all distraction flows');
		
		// Stop any ongoing timer
		if (this.distractionStartTime) {
			this.distractionStartTime = null;
		}
		
		// Clear any check intervals
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
		
		// Reset all distraction states
		this.isWindowDistracted = false;
		this.isEyeDistracted = false;
		this.lastTriggerSource = null;
		this.currentWindowInfo = null;
		
		// Immediately broadcast refocus to stop dog animation
		this.broadcastRefocus();
		
		console.log('✅ Emergency stop complete - dog should be sleeping');
	}

	/**
	 * Reset distraction state (called when session starts/ends)
	 */
	resetDistractionState() {
		console.log('🔄 Resetting distraction state');
		this.isWindowDistracted = false;
		this.isEyeDistracted = false;
		this.distractionStartTime = null;
		this.lastTriggerSource = null;
		this.currentWindowInfo = null;
		
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		this.resetTimer();
		this.windows.clear();
		console.log('🧹 Distraction Manager destroyed');
	}
}

export default DistractionManager;
