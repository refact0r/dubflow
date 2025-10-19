/**
 * Session state management
 * Tracks active focus sessions and syncs with Electron IPC
 */

export class SessionStore {
	isActive = $state(false);
	isPaused = $state(false);
	taskName = $state('');
	duration = $state(0); // Total duration in seconds
	startTime = $state(null);
	elapsedTime = $state(0);
	remainingTime = $state(0);

	constructor() {
		// Set up IPC listeners if in Electron environment
		if (typeof window !== 'undefined' && window.electronAPI) {
			window.electronAPI.onSessionStarted((data) => {
				this.isActive = data.isActive;
				this.isPaused = data.isPaused;
				this.taskName = data.taskName;
				this.duration = data.duration;
				this.startTime = data.startTime;
				this.elapsedTime = data.elapsedTime;
				this.remainingTime = data.remainingTime;
			});

			window.electronAPI.onSessionPaused((data) => {
				this.isPaused = data.isPaused;
				this.elapsedTime = data.elapsedTime;
				this.remainingTime = data.remainingTime;
			});

			window.electronAPI.onSessionResumed((data) => {
				this.isPaused = data.isPaused;
				this.elapsedTime = data.elapsedTime;
				this.remainingTime = data.remainingTime;
			});

			window.electronAPI.onSessionStopped((data) => {
				this.isActive = data.isActive;
				this.isPaused = data.isPaused;
				this.elapsedTime = data.elapsedTime;
				this.remainingTime = data.remainingTime;
			});

			window.electronAPI.onSessionUpdated((data) => {
				this.elapsedTime = data.elapsedTime;
				this.remainingTime = data.remainingTime;
			});

			// Load initial state
			this.loadState();
		}
	}

	async loadState() {
		if (window.electronAPI) {
			const state = await window.electronAPI.getSessionState();
			this.isActive = state.isActive;
			this.isPaused = state.isPaused;
			this.taskName = state.taskName;
			this.duration = state.duration;
			this.startTime = state.startTime;
			this.elapsedTime = state.elapsedTime;
			this.remainingTime = state.remainingTime;
		}
	}

	start(taskName, durationMinutes) {
		if (window.electronAPI) {
			window.electronAPI.startSession({ taskName, duration: durationMinutes });
		}
	}

	pause() {
		if (window.electronAPI) {
			window.electronAPI.pauseSession();
		}
	}

	resume() {
		if (window.electronAPI) {
			window.electronAPI.resumeSession();
		}
	}

	stop() {
		if (window.electronAPI) {
			window.electronAPI.stopSession();
		}
	}
}

// Create singleton instance
export const sessionStore = new SessionStore();
