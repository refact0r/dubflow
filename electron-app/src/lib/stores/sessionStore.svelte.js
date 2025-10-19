/**
 * Session state management
 * Tracks active focus sessions and syncs with Electron IPC
 */

export class SessionStore {
	isActive = $state(false); // Whether a focus session is currently running
	taskName = $state(''); // Name/description of the current task (e.g., "Study for exam")
	startTime = $state(null); // Timestamp (ms) when the session started
	elapsedTime = $state(0); // Total elapsed time in seconds
	focusTime = $state(0); // Time spent actually focused in seconds
	distractionCount = $state(0); // Number of times user got distracted during session

	constructor() {
		// Set up IPC listeners if in Electron environment
		if (typeof window !== 'undefined' && window.electronAPI) {
			window.electronAPI.onSessionStarted((data) => {
				this.isActive = true;
				this.taskName = data.taskName;
				this.startTime = data.startTime;
				this.elapsedTime = data.elapsedTime;
				this.focusTime = data.focusTime;
				this.distractionCount = data.distractionCount;
			});

			window.electronAPI.onSessionStopped((data) => {
				this.isActive = false;
				this.elapsedTime = data.elapsedTime;
				this.focusTime = data.focusTime;
				this.distractionCount = data.distractionCount;
			});

			// Load initial state
			this.loadState();
		}
	}

	async loadState() {
		if (window.electronAPI) {
			const state = await window.electronAPI.getSessionState();
			this.isActive = state.isActive;
			this.taskName = state.taskName;
			this.startTime = state.startTime;
			this.elapsedTime = state.elapsedTime;
			this.focusTime = state.focusTime;
			this.distractionCount = state.distractionCount;
		}
	}

	start(taskName) {
		if (window.electronAPI) {
			window.electronAPI.startSession(taskName);
		}
	}

	stop() {
		if (window.electronAPI) {
			window.electronAPI.stopSession();
		}
	}

	// Computed elapsed time (updates in real-time)
	get currentElapsed() {
		if (this.isActive && this.startTime) {
			return Math.floor((Date.now() - this.startTime) / 1000);
		}
		return this.elapsedTime;
	}
}

// Create singleton instance
export const sessionStore = new SessionStore();
