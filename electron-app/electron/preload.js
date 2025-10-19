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

	// Emergency stop for distraction manager
	emergencyStopDistraction: () => ipcRenderer.send('emergency-stop-distraction'),

	// Listeners for updates from main process
	onSessionStarted: (callback) => {
		ipcRenderer.on('session-started', (event, data) => callback(data));
	},
	onSessionStopped: (callback) => {
		ipcRenderer.on('session-stopped', (event, data) => callback(data));
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

	// Cleanup listeners
	removeAllListeners: (channel) => {
		ipcRenderer.removeAllListeners(channel);
	}
});
