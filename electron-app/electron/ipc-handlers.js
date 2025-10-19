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
 * @param {BrowserWindow} deps.overlayWindow - Overlay window reference
 * @param {ElevenLabsService} deps.elevenLabsService - ElevenLabs voice service
 */
export const setupIPCHandlers = ({ sessionManager, windowTracker, getOverlayWindow, elevenLabsService }) => {
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
 * Setup Python IPC event forwarding
 * @param {Object} deps - Dependencies
 * @param {PythonIPCInterface} deps.pythonIPC - Python IPC interface
 * @param {Function} deps.getMainWindow - Function to get main window
 * @param {Function} deps.getOverlayWindow - Function to get overlay window
 */
export const setupPythonIPCForwarding = ({ pythonIPC, getMainWindow, getOverlayWindow }) => {
	console.log('🐍 Setting up Python IPC forwarding...');

	/**
	 * Broadcast Python event to both windows
	 * @param {string} channel - IPC channel name
	 * @param {Object} data - Data to forward
	 */
	const broadcastPythonEvent = (channel, data) => {
		const mainWindow = getMainWindow();
		const overlayWindow = getOverlayWindow();

		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send(channel, data);
		}
		if (overlayWindow && !overlayWindow.isDestroyed()) {
			overlayWindow.webContents.send(channel, data);
		}
	};

	// Forward focus updates from Python
	pythonIPC.on('focus_update', (data) => {
		broadcastPythonEvent('vision-focus-update', data);
	});

	// Forward distraction detection from Python
	pythonIPC.on('distraction_detected', (data) => {
		broadcastPythonEvent('vision-distraction-detected', data);
	});

	// Forward focus restoration from Python
	pythonIPC.on('focus_restored', (data) => {
		broadcastPythonEvent('vision-focus-restored', data);
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
	ipcMain.removeHandler('get-session-state');
	ipcMain.removeHandler('play-voice-notification');
	console.log('🧹 IPC handlers cleaned up');
};
