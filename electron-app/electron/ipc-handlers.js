/**
 * IPC Handlers Module
 * Centralizes all IPC communication handlers for the main process
 */

import { ipcMain } from 'electron';

/**
 * Setup all IPC handlers
 * @param {Object} deps - Dependencies
 * @param {SessionManager} deps.sessionManager - Session manager instance
 * @param {WindowTracker} deps.windowTracker - Window tracker instance
 * @param {Function} deps.getOverlayWindow - Function to get overlay window reference
 * @param {ElevenLabsService} deps.elevenLabsService - ElevenLabs voice service (legacy)
 * @param {DistractionManager} deps.distractionManager - Distraction manager instance
 */
export const setupIPCHandlers = ({
	sessionManager,
	windowTracker,
	getOverlayWindow,
	elevenLabsService,
	distractionManager
}) => {
	console.log('🔌 Setting up IPC handlers...');

	// Session Management
	ipcMain.on('start-session', (event, taskName) => {
		sessionManager.start(taskName);
		windowTracker.start();
	});

	ipcMain.on('stop-session', () => {
		sessionManager.stop();
		windowTracker.stop();
	});

	ipcMain.handle('get-session-state', () => {
		return sessionManager.getState();
	});

	// Emergency stop for distraction manager
	ipcMain.on('emergency-stop-distraction', () => {
		if (distractionManager) {
			distractionManager.emergencyStop();
		}
	});

	// Overlay Management
	ipcMain.on('toggle-overlay', (event, visible) => {
		const overlayWindow = getOverlayWindow();
		if (overlayWindow && !overlayWindow.isDestroyed()) {
			if (visible) {
				overlayWindow.show();
			} else {
				overlayWindow.hide();
			}
		}
	});

	// Dubs Character State Management
	ipcMain.on('set-dubs-state', (event, state) => {
		const overlayWindow = getOverlayWindow();
		if (overlayWindow && !overlayWindow.isDestroyed()) {
			overlayWindow.webContents.send('dubs-state-change', state);
		}
	});

	// Distraction Alert Handler
	ipcMain.on('distraction-alert', (event, alertPackage) => {
		const overlayWindow = getOverlayWindow();
		if (overlayWindow && !overlayWindow.isDestroyed()) {
			overlayWindow.webContents.send('distraction-alert', alertPackage);
		}
	});

	// User Refocused Handler
	ipcMain.on('user-refocused', (event, refocusData) => {
		const overlayWindow = getOverlayWindow();
		if (overlayWindow && !overlayWindow.isDestroyed()) {
			overlayWindow.webContents.send('user-refocused', refocusData);
		}
	});

	// Voice Notification Handler
	ipcMain.handle('play-voice-notification', async () => {
		try {
			console.log('🎙️ Voice notification requested');
			const result = await elevenLabsService.playDistractionNotification();

			if (result.success) {
				// Convert buffer to base64 for transmission
				return {
					success: true,
					audioData: result.audioData.toString('base64'),
					message: result.message
				};
			} else {
				return result;
			}
		} catch (error) {
			console.error('❌ Voice notification error:', error);
			return {
				success: false,
				error: error.message
			};
		}
	});

	console.log('✅ IPC handlers setup complete');
};

/**
 * Setup Python IPC event forwarding to DistractionManager
 * @param {Object} deps - Dependencies
 * @param {PythonIPCInterface} deps.pythonIPC - Python IPC interface
 * @param {DistractionManager} deps.distractionManager - Distraction manager instance
 */
export const setupPythonIPCForwarding = ({ pythonIPC, distractionManager }) => {
	console.log('🐍 Setting up Python IPC forwarding...');

	// Forward focus updates to DistractionManager
	pythonIPC.on('focus_update', (data) => {
		// Update distraction manager with eye tracking state
		distractionManager.updateEyeState(data.focused);
	});

	// Legacy event listeners (in case something still uses them)
	pythonIPC.on('distraction_detected', (data) => {
		distractionManager.updateEyeState(false);
	});

	pythonIPC.on('focus_restored', (data) => {
		distractionManager.updateEyeState(true);
	});

	console.log('✅ Python IPC forwarding setup complete');
};

/**
 * Clean up all IPC handlers
 */
export const cleanupIPCHandlers = () => {
	ipcMain.removeAllListeners('start-session');
	ipcMain.removeAllListeners('stop-session');
	ipcMain.removeAllListeners('toggle-overlay');
	ipcMain.removeAllListeners('set-dubs-state');
	ipcMain.removeAllListeners('emergency-stop-distraction');
	ipcMain.removeHandler('get-session-state');
	ipcMain.removeHandler('play-voice-notification');
	console.log('🧹 IPC handlers cleaned up');
};
