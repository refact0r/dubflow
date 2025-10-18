import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { activeWindowSync } from 'get-windows';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

let mainWindow = null;
let overlayWindow = null;
let activeWindowInterval = null;

// Session state
let sessionState = {
	isActive: false,
	startTime: null,
	elapsedTime: 0,
	focusTime: 0,
	distractionCount: 0,
	taskName: ''
};

// Active window tracking using get-windows
const getActiveWindow = () => {
	try {
		const window = activeWindowSync({
			accessibilityPermission: true, // Get browser URLs
			screenRecordingPermission: true // Get window titles
		});

		if (!window) {
			return;
		}

		const isProductive = classifyWindow(window);

		const windowInfo = {
			appName: window.owner.name,
			windowTitle: window.title || '',
			url: window.url || null,
			bundleId: window.owner.bundleId || null,
			processId: window.owner.processId,
			memoryUsage: window.memoryUsage,
			bounds: window.bounds,
			isProductive,
			timestamp: Date.now()
		};

		// Broadcast to both windows
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('active-window-update', windowInfo);
		}
		if (overlayWindow && !overlayWindow.isDestroyed()) {
			overlayWindow.webContents.send('active-window-update', windowInfo);
		}
	} catch (error) {
		console.error('Error getting active window:', error);
	}
};

// Enhanced window classification with URL detection
const classifyWindow = (window) => {
	const { owner, url, title } = window;
	const appName = owner.name;

	// Check URL for browser-based distractions (most accurate!)
	if (url) {
		const distractingSites = [
			'reddit.com',
			'twitter.com',
			'x.com',
			'instagram.com',
			'facebook.com',
			'youtube.com',
			'netflix.com',
			'tiktok.com',
			'twitch.tv',
			'discord.com/channels',
			'slack.com/client'
		];

		// Check if URL contains any distracting site
		if (distractingSites.some((site) => url.includes(site))) {
			return false; // Distraction detected via URL!
		}

		// If URL exists and doesn't match distracting sites, it's likely productive browsing
		return true;
	}

	// Fallback to app-based classification
	const productiveApps = [
		'Code',
		'Visual Studio Code',
		'Cursor',
		'Xcode',
		'Terminal',
		'iTerm2',
		'Notion',
		'Obsidian',
		'Safari',
		'Chrome',
		'Firefox',
		'Arc',
		'Brave'
	];

	const distractingApps = [
		'Messages',
		'Discord',
		'Slack',
		'Instagram',
		'Twitter',
		'Reddit',
		'Netflix',
		'YouTube',
		'Spotify',
		'Music',
		'WhatsApp'
	];

	// Check if app is in distraction list
	if (distractingApps.some((app) => appName.includes(app))) {
		return false;
	}

	// Check if app is in productive list
	if (productiveApps.some((app) => appName.includes(app))) {
		return true;
	}

	// Default to productive for unknown apps
	return true;
};

const createDashboardWindow = () => {
	// Create the main dashboard window
	mainWindow = new BrowserWindow({
		width: 900,
		height: 700,
		webPreferences: {
			preload: path.join(import.meta.dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	});

	// Load the index.html of the app
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		mainWindow.webContents.on('did-frame-finish-load', () => {
			mainWindow.webContents.openDevTools({ mode: 'detach' });
		});
	} else {
		mainWindow.loadFile(
			path.join(import.meta.dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
		);
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
};

const createOverlayWindow = () => {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { width, height } = primaryDisplay.workAreaSize;

	// Create transparent overlay window
	overlayWindow = new BrowserWindow({
		width: 300,
		height: 300,
		x: width - 320,
		y: height - 320,
		transparent: true,
		frame: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		resizable: false,
		hasShadow: false,
		backgroundColor: '#00000000',
		webPreferences: {
			preload: path.join(import.meta.dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	});

	// Make window click-through
	overlayWindow.setIgnoreMouseEvents(true, { forward: true });

	// Load overlay route (using hash routing in both dev and production)
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		overlayWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/overlay`);
	} else {
		// In production, use hash routing to navigate to overlay
		overlayWindow.loadFile(
			path.join(import.meta.dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
			{ hash: '/overlay' }
		);
	}

	overlayWindow.on('closed', () => {
		overlayWindow = null;
	});
};

const startActiveWindowTracking = () => {
	if (activeWindowInterval) {
		clearInterval(activeWindowInterval);
	}

	// Poll every 2 seconds
	activeWindowInterval = setInterval(getActiveWindow, 2000);
	getActiveWindow(); // Get initial window
};

const stopActiveWindowTracking = () => {
	if (activeWindowInterval) {
		clearInterval(activeWindowInterval);
		activeWindowInterval = null;
	}
};

// IPC Handlers
ipcMain.on('start-session', (event, taskName) => {
	sessionState.isActive = true;
	sessionState.startTime = Date.now();
	sessionState.taskName = taskName;
	sessionState.elapsedTime = 0;
	sessionState.focusTime = 0;
	sessionState.distractionCount = 0;

	// Broadcast to both windows
	if (mainWindow) mainWindow.webContents.send('session-started', sessionState);
	if (overlayWindow) overlayWindow.webContents.send('session-started', sessionState);

	startActiveWindowTracking();
});

ipcMain.on('stop-session', () => {
	sessionState.isActive = false;

	// Broadcast to both windows
	if (mainWindow) mainWindow.webContents.send('session-stopped', sessionState);
	if (overlayWindow) overlayWindow.webContents.send('session-stopped', sessionState);

	stopActiveWindowTracking();
});

ipcMain.on('toggle-overlay', (event, visible) => {
	if (overlayWindow) {
		if (visible) {
			overlayWindow.show();
		} else {
			overlayWindow.hide();
		}
	}
});

ipcMain.on('set-dubs-state', (event, state) => {
	// Broadcast dubs state to overlay
	if (overlayWindow && !overlayWindow.isDestroyed()) {
		overlayWindow.webContents.send('dubs-state-change', state);
	}
});

ipcMain.handle('get-session-state', () => {
	return sessionState;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
	createDashboardWindow();
	createOverlayWindow();
	startActiveWindowTracking();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
	stopActiveWindowTracking();
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createDashboardWindow();
		createOverlayWindow();
		startActiveWindowTracking();
	}
});

app.on('will-quit', () => {
	stopActiveWindowTracking();
});
