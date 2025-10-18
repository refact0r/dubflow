/**
 * State management using Svelte 5 runes
 * Syncs with Electron IPC for cross-window communication
 */

// Session state
export class SessionStore {
	isActive = $state(false);
	taskName = $state('');
	startTime = $state(null);
	elapsedTime = $state(0);
	focusTime = $state(0);
	distractionCount = $state(0);

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

// Active window state
export class ActiveWindowStore {
	appName = $state('Unknown');
	windowTitle = $state('');
	url = $state(null);
	bundleId = $state(null);
	processId = $state(null);
	memoryUsage = $state(0);
	bounds = $state(null);
	isProductive = $state(true);
	timestamp = $state(null);
	history = $state([]);

	constructor() {
		if (typeof window !== 'undefined' && window.electronAPI) {
			window.electronAPI.onActiveWindowUpdate((data) => {
				this.appName = data.appName;
				this.windowTitle = data.windowTitle;
				this.url = data.url;
				this.bundleId = data.bundleId;
				this.processId = data.processId;
				this.memoryUsage = data.memoryUsage;
				this.bounds = data.bounds;
				this.isProductive = data.isProductive;
				this.timestamp = data.timestamp;

				// Keep last 20 items in history
				this.history = [{ ...data }, ...this.history.slice(0, 19)];
			});
		}
	}

	get recentApps() {
		// Get unique apps from recent history
		const unique = new Map();
		this.history.forEach((item) => {
			if (!unique.has(item.appName)) {
				unique.set(item.appName, item);
			}
		});
		return Array.from(unique.values()).slice(0, 10);
	}

	// Format memory usage for display
	get memoryUsageFormatted() {
		if (!this.memoryUsage) return '0 MB';
		const mb = (this.memoryUsage / 1024 / 1024).toFixed(1);
		return `${mb} MB`;
	}
}

// Dubs character state
export class DubsStore {
	state = $state('sleeping'); // sleeping, waking, alert, barking
	overlayVisible = $state(true);

	constructor() {
		if (typeof window !== 'undefined' && window.electronAPI) {
			window.electronAPI.onDubsStateChange((state) => {
				this.state = state;
			});
		}
	}

	setState(newState) {
		this.state = newState;
		if (window.electronAPI) {
			window.electronAPI.setDubsState(newState);
		}
	}

	toggleOverlay() {
		this.overlayVisible = !this.overlayVisible;
		if (window.electronAPI) {
			window.electronAPI.toggleOverlay(this.overlayVisible);
		}
	}

	// Map state to sprite filename
	get spriteFile() {
		const sprites = {
			sleeping: 'dubs_sleeping.gif',
			waking: 'dubs_waking_up.gif',
			alert: 'dubs_light_bark.gif',
			barking: 'dubs_heavy_bark.gif',
			standing: 'dubs_default_stance.gif'
		};
		return sprites[this.state] || sprites.sleeping;
	}
}

// Create singleton instances
export const sessionStore = new SessionStore();
export const activeWindowStore = new ActiveWindowStore();
export const dubsStore = new DubsStore();
