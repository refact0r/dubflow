/**
 * Session Manager Module
 * Handles focus session state and lifecycle management (Pomodoro timer)
 */

import { SessionHistoryManager } from './session-history.js';

export class SessionManager {
	constructor() {
		this.state = {
			isActive: false,
			isPaused: false,
			taskName: '',
			duration: 0, // Total session duration in seconds
			startTime: null, // Timestamp when session started
			pausedAt: null, // Timestamp when paused, null if not paused
			totalPausedTime: 0, // Accumulated milliseconds spent paused
			focusStateHistory: [] // Array of focus state change events
		};
		this.windows = new Set(); // Store window references
		this.distractionManager = null; // Reference to distraction manager
		this.timerInterval = null; // Interval for checking if time is up
		this.historyManager = new SessionHistoryManager(); // Session history manager
	}

	/**
	 * Set the distraction manager reference
	 * @param {DistractionManager} distractionManager - Distraction manager instance
	 */
	setDistractionManager(distractionManager) {
		this.distractionManager = distractionManager;
	}

	/**
	 * Register a window to receive session updates
	 * @param {BrowserWindow} window - Electron BrowserWindow instance
	 */
	registerWindow(window) {
		if (window && !window.isDestroyed()) {
			this.windows.add(window);
		}
	}

	/**
	 * Unregister a window from receiving updates
	 * @param {BrowserWindow} window - Electron BrowserWindow instance
	 */
	unregisterWindow(window) {
		this.windows.delete(window);
	}

	/**
	 * Broadcast session event to all registered windows
	 * @param {string} channel - IPC channel name
	 * @param {Object} data - Data to send
	 */
	broadcast(channel, data) {
		// Clean up destroyed windows
		for (const window of this.windows) {
			if (window.isDestroyed()) {
				this.windows.delete(window);
			} else {
				window.webContents.send(channel, data);
			}
		}
	}

	/**
	 * Start a new focus session
	 * @param {string} taskName - Name of the task to focus on
	 * @param {number} durationMinutes - Duration in minutes
	 * @returns {Object} Updated session state
	 */
	start(taskName, durationMinutes) {
		console.log(`🎯 Starting session: "${taskName}" for ${durationMinutes} minutes`);

		// Clear any existing timer
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}

		this.state = {
			isActive: true,
			isPaused: false,
			taskName,
			duration: durationMinutes * 60, // Convert to seconds
			startTime: Date.now(),
			pausedAt: null,
			totalPausedTime: 0,
			focusStateHistory: [
				{
					timestamp: Date.now(),
					elapsedTime: 0, // Session just started
					state: 'focused',
					source: 'session_start'
				}
			]
		};

		// Start interval to check if time is up (check every second)
		this.timerInterval = setInterval(() => {
			if (!this.state.isPaused) {
				const remainingTime = this.getState().remainingTime;

				// Auto-stop when time runs out
				if (remainingTime <= 0) {
					console.log('⏰ Session time complete - auto-stopping');
					this.stop();
				} else {
					// Broadcast updated state every second
					this.broadcast('session-updated', this.getState());
				}
			}
		}, 1000);

		console.log('✅ Session state updated:', this.state);

		// Reset distraction manager state for new session and initialize with focused state
		if (this.distractionManager) {
			this.distractionManager.resetDistractionState();
			// Initialize distraction manager's history with the initial focused event
			this.distractionManager.focusStateHistory = [...this.state.focusStateHistory];
		}

		this.broadcast('session-started', this.getState());

		return this.getState();
	}

	/**
	 * Pause the current session
	 * @returns {Object} Updated session state
	 */
	pause() {
		if (!this.state.isActive || this.state.isPaused) {
			console.warn('⚠️ Cannot pause: session not active or already paused');
			return this.getState();
		}

		console.log('⏸️  Pausing session');
		this.state.isPaused = true;
		this.state.pausedAt = Date.now();

		this.broadcast('session-paused', this.getState());

		// Tell distraction manager to stop tracking
		if (this.distractionManager) {
			this.distractionManager.emergencyStop();
		}

		return this.getState();
	}

	/**
	 * Resume the current session
	 * @returns {Object} Updated session state
	 */
	resume() {
		if (!this.state.isActive || !this.state.isPaused) {
			console.warn('⚠️ Cannot resume: session not active or not paused');
			return this.getState();
		}

		console.log('▶️  Resuming session');

		// Accumulate paused time
		if (this.state.pausedAt) {
			this.state.totalPausedTime += Date.now() - this.state.pausedAt;
		}

		this.state.isPaused = false;
		this.state.pausedAt = null;

		this.broadcast('session-resumed', this.getState());

		// Reset distraction manager state
		if (this.distractionManager) {
			this.distractionManager.resetDistractionState();
		}

		return this.getState();
	}

	/**
	 * Stop the current focus session
	 * @returns {Object} Final session state
	 */
	stop() {
		console.log('⏹️  Stopping session');

		// Clear timer
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}

		// Get final state before marking inactive
		const finalState = this.getState();

		// Save session to history if it was active
		if (this.state.isActive && this.state.startTime) {
			const savedSession = this.historyManager.saveSession({
				taskName: this.state.taskName,
				duration: this.state.duration,
				startTime: this.state.startTime,
				elapsedTime: finalState.elapsedTime,
				focusStateHistory: this.state.focusStateHistory
			});

			// Broadcast session completion with the saved session data
			this.broadcast('session-completed', savedSession);
		}

		this.state.isActive = false;
		this.state.isPaused = false;

		this.broadcast('session-stopped', this.getState());

		// Reset distraction manager state when session ends
		if (this.distractionManager) {
			this.distractionManager.resetDistractionState();
		}

		return this.getState();
	}

	/**
	 * Update focus state history from distraction manager
	 * @param {Array} history - Array of focus state events
	 */
	updateFocusHistory(history) {
		this.state.focusStateHistory = [...history];
		// Broadcast updated state to frontend
		this.broadcast('session-updated', this.getState());
	}

	/**
	 * Get current session state with computed values
	 * @returns {Object} Current session state
	 */
	getState() {
		const now = Date.now();
		let elapsedTime = 0;
		let remainingTime = this.state.duration;

		if (this.state.isActive && this.state.startTime) {
			// Calculate elapsed time accounting for paused time
			const totalElapsed = now - this.state.startTime;
			const pausedTime =
				this.state.totalPausedTime + (this.state.pausedAt ? now - this.state.pausedAt : 0);
			elapsedTime = Math.floor((totalElapsed - pausedTime) / 1000); // Convert to seconds
			remainingTime = Math.max(0, this.state.duration - elapsedTime);
		}

		return {
			isActive: this.state.isActive,
			isPaused: this.state.isPaused,
			taskName: this.state.taskName,
			duration: this.state.duration,
			startTime: this.state.startTime,
			elapsedTime,
			remainingTime,
			focusStateHistory: this.state.focusStateHistory
		};
	}

	/**
	 * Check if a session is currently active
	 * @returns {boolean} True if session is active
	 */
	isSessionActive() {
		return this.state.isActive;
	}

	/**
	 * Check if session is paused
	 * @returns {boolean} True if session is paused
	 */
	isSessionPaused() {
		return this.state.isPaused;
	}

	/**
	 * Get session history manager
	 * @returns {SessionHistoryManager} History manager instance
	 */
	getHistoryManager() {
		return this.historyManager;
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}
		this.windows.clear();
		this.distractionManager = null;
	}
}
