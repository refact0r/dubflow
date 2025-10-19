const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
	// Session control
	startSession: (taskName) => ipcRenderer.send('start-session', taskName),
	stopSession: () => ipcRenderer.send('stop-session'),
	getSessionState: () => ipcRenderer.invoke('get-session-state'),

	// Overlay control
	toggleOverlay: (visible) => ipcRenderer.send('toggle-overlay', visible),
	setDubsState: (state) => ipcRenderer.send('set-dubs-state', state),

	// Voice notifications
	playVoiceNotification: () => ipcRenderer.invoke('play-voice-notification'),

	// Listeners for updates from main process
	onActiveWindowUpdate: (callback) => {
		ipcRenderer.on('active-window-update', (event, data) => callback(data));
	},
	onSessionStarted: (callback) => {
		ipcRenderer.on('session-started', (event, data) => callback(data));
	},
	onSessionStopped: (callback) => {
		ipcRenderer.on('session-stopped', (event, data) => callback(data));
	},
	onDubsStateChange: (callback) => {
		ipcRenderer.on('dubs-state-change', (event, state) => callback(state));
	},

	// Python vision event listeners
	onVisionFocusUpdate: (callback) => {
		ipcRenderer.on('vision-focus-update', (event, data) => callback(data));
	},
	onVisionDistractionDetected: (callback) => {
		ipcRenderer.on('vision-distraction-detected', (event, data) => callback(data));
	},
	onVisionFocusRestored: (callback) => {
		ipcRenderer.on('vision-focus-restored', (event, data) => callback(data));
	},

	// Cleanup listeners
	removeAllListeners: (channel) => {
		ipcRenderer.removeAllListeners(channel);
	}
});
