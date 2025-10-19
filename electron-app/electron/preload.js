const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
	// Session control
	startSession: (data) => ipcRenderer.send('start-session', data),
	pauseSession: () => ipcRenderer.send('pause-session'),
	resumeSession: () => ipcRenderer.send('resume-session'),
	stopSession: () => ipcRenderer.send('stop-session'),
	getSessionState: () => ipcRenderer.invoke('get-session-state'),

	// Overlay control
	toggleOverlay: (visible) => ipcRenderer.send('toggle-overlay', visible),
	setDubsState: (state) => ipcRenderer.send('set-dubs-state', state),
	setAudioEnabled: (enabled) => ipcRenderer.send('set-audio-enabled', enabled),

	// Emergency stop for distraction manager
	emergencyStopDistraction: () => ipcRenderer.send('emergency-stop-distraction'),

	// Listeners for updates from main process
	onSessionStarted: (callback) => {
		ipcRenderer.on('session-started', (event, data) => callback(data));
	},
	onSessionPaused: (callback) => {
		ipcRenderer.on('session-paused', (event, data) => callback(data));
	},
	onSessionResumed: (callback) => {
		ipcRenderer.on('session-resumed', (event, data) => callback(data));
	},
	onSessionStopped: (callback) => {
		ipcRenderer.on('session-stopped', (event, data) => callback(data));
	},
	onSessionUpdated: (callback) => {
		ipcRenderer.on('session-updated', (event, data) => callback(data));
	},
	onDubsStateChange: (callback) => {
		ipcRenderer.on('dubs-state-change', (event, state) => callback(state));
	},

	// Distraction alert listener (new unified system)
	onDistractionAlert: (callback) => {
		ipcRenderer.on('distraction-alert', (event, alertPackage) => callback(alertPackage));
	},

	// User refocused listener
	onUserRefocused: (callback) => {
		ipcRenderer.on('user-refocused', (event, refocusData) => callback(refocusData));
	},

	// Active window tracking listener
	onActiveWindowUpdate: (callback) => {
		ipcRenderer.on('active-window-update', (event, windowInfo) => callback(windowInfo));
	},

	// Audio settings listener
	onAudioSettingsChange: (callback) => {
		ipcRenderer.on('audio-settings-change', (event, enabled) => callback(enabled));
	},

	// Cleanup listeners
	removeAllListeners: (channel) => {
		ipcRenderer.removeAllListeners(channel);
	}
});
