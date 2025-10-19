/**
 * Session Manager Module
 * Handles focus session state and lifecycle management
 */

export class SessionManager {
	constructor() {
		this.state = {
			isActive: false,
			startTime: null,
			elapsedTime: 0,
			focusTime: 0,
			distractionCount: 0,
			taskName: ''
		};
		this.windows = new Set(); // Store window references
		this.pythonIPC = null;
		this.distractionManager = null; // Reference to distraction manager
	}

	/**
	 * Set the Python IPC interface reference
	 * @param {PythonIPCInterface} pythonIPC - Python IPC instance
	 */
	setPythonIPC(pythonIPC) {
		this.pythonIPC = pythonIPC;
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
	 * @returns {Object} Updated session state
	 */
	start(taskName) {
		console.log(`🎯 Starting session: "${taskName}"`);

		this.state = {
			isActive: true,
			startTime: Date.now(),
			taskName,
			elapsedTime: 0,
			focusTime: 0,
			distractionCount: 0
		};

		console.log('✅ Session state updated:', this.state);

		this.broadcast('session-started', this.state);

		// Reset distraction manager state for new session
		if (this.distractionManager) {
			this.distractionManager.resetDistractionState();
		}

		// Notify Python IPC about session start
		if (this.pythonIPC && this.pythonIPC.isConnected) {
			this.pythonIPC.send('session_start', {
				taskName,
				timestamp: Date.now()
			});
		}

		return this.state;
	}

	/**
	 * Stop the current focus session
	 * @returns {Object} Final session state
	 */
	stop() {
		console.log('⏹️  Stopping session');

		this.state.isActive = false;

		this.broadcast('session-stopped', this.state);

		// Reset distraction manager state when session ends
		if (this.distractionManager) {
			this.distractionManager.resetDistractionState();
		}

		// Notify Python IPC about session stop
		if (this.pythonIPC && this.pythonIPC.isConnected) {
			this.pythonIPC.send('session_stop', {
				timestamp: Date.now()
			});
		}

		return this.state;
	}

	/**
	 * Update session metrics
	 * @param {Object} updates - Object containing metrics to update
	 */
	updateMetrics(updates) {
		this.state = { ...this.state, ...updates };
		this.broadcast('session-updated', this.state);
	}

	/**
	 * Increment distraction count
	 */
	incrementDistractions() {
		this.state.distractionCount++;
		this.broadcast('session-updated', this.state);
	}

	/**
	 * Update elapsed and focus time
	 */
	updateTime() {
		if (this.state.isActive && this.state.startTime) {
			this.state.elapsedTime = Date.now() - this.state.startTime;
		}
	}

	/**
	 * Get current session state
	 * @returns {Object} Current session state
	 */
	getState() {
		return { ...this.state };
	}

	/**
	 * Check if a session is currently active
	 * @returns {boolean} True if session is active
	 */
	isSessionActive() {
		return this.state.isActive;
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		this.windows.clear();
		this.pythonIPC = null;
	}
}
