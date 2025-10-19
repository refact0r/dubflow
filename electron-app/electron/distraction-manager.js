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
		this.DISTRACTION_THRESHOLD = 10000; // 10 seconds in milliseconds
		this.CHECK_INTERVAL = 1000; // Check every second

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

		this.currentWindowInfo = windowInfo;
		this.isWindowDistracted = !windowInfo.isProductive;

		if (this.isWindowDistracted) {
			this.lastTriggerSource = 'window_tracker';
		}

		this.checkDistractionState();
	}

	/**
	 * Update distraction state based on eye tracking
	 * @param {boolean} isFocused - Whether user is focused (eyes on screen)
	 */
	updateEyeState(isFocused) {
		this.isEyeDistracted = !isFocused;

		if (this.isEyeDistracted) {
			this.lastTriggerSource = 'eye_tracker';
		}

		this.checkDistractionState();
	}

	/**
	 * Check overall distraction state (OR logic)
	 * If either detector reports distraction, user is considered distracted
	 */
	checkDistractionState() {
		// Only track distractions if a session is active
		if (!this.sessionManager.isSessionActive()) {
			this.resetTimer();
			return;
		}

		const isDistracted = this.isWindowDistracted || this.isEyeDistracted;

		if (isDistracted && !this.distractionStartTime) {
			// Start distraction timer
			this.startTimer();
		} else if (!isDistracted && this.distractionStartTime) {
			// User is focused again, reset timer (hard reset)
			this.resetTimer();
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
			this.checkThreshold();
		}, this.CHECK_INTERVAL);
	}

	/**
	 * Reset the distraction timer
	 */
	resetTimer() {
		if (this.distractionStartTime) {
			console.log('✅ User refocused, timer reset');
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
		if (!this.distractionStartTime) return;

		const elapsed = Date.now() - this.distractionStartTime;

		if (elapsed >= this.DISTRACTION_THRESHOLD) {
			console.log('🔥 Distraction threshold reached! Triggering alert...');
			this.handleDistractionThreshold();
		}
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
				rekognitionData = await this.pythonIPC.requestData(5000);
				console.log('✅ Rekognition data received');
			} catch (error) {
				console.warn('⚠️  Failed to get Rekognition data:', error.message);
				// Continue without rekognition data
			}

			// Step 2: Gather all context
			const context = this.gatherContext(rekognitionData);
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
	 * Clean up resources
	 */
	destroy() {
		this.resetTimer();
		this.windows.clear();
		console.log('🧹 Distraction Manager destroyed');
	}
}

export default DistractionManager;
