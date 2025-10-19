/* global MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME */

import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
import PythonIPCInterface from './py_interfacer.js';
import { WindowTracker } from './window-tracker.js';
import { SessionManager } from './session-manager.js';
import ElevenLabsService from './elevenlabs-service.js';
import BedrockService from './bedrock-service.js';
import PushoverService from './pushover-service.js';
import DistractionManager from './distraction-manager.js';
import { setupIPCHandlers, setupPythonIPCForwarding, cleanupIPCHandlers } from './ipc-handlers.js';

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

// Global variables
let mainWindow = null;
let overlayWindow = null;
let pythonIPC = null;

// Core managers and services
let windowTracker = null;
let sessionManager = null;
let elevenLabsService = null;
let bedrockService = null;
let pushoverService = null;
let distractionManager = null;

// Helper functions to get window references (for IPC handlers)
const getMainWindow = () => mainWindow;
const getOverlayWindow = () => overlayWindow;

const createDashboardWindow = () => {
	// Create the main dashboard window
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	});

	// Maximize the window
	mainWindow.maximize();

	// Load the index.html of the app
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		mainWindow.webContents.on('did-frame-finish-load', () => {
			mainWindow.webContents.openDevTools({ mode: 'detach' });
		});
	} else {
		mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	// Register window with managers
	if (windowTracker) {
		windowTracker.registerWindow(mainWindow);
	}
	if (sessionManager) {
		sessionManager.registerWindow(mainWindow);
	}
	if (distractionManager) {
		distractionManager.registerWindow(mainWindow);
	}
};

const createOverlayWindow = () => {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { height } = primaryDisplay.workAreaSize;

	// Create transparent overlay window
	overlayWindow = new BrowserWindow({
		width: 320,
		height: 320,
		x: 20,
		y: height - 300,
		transparent: true,
		frame: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		resizable: false,
		hasShadow: false,
		backgroundColor: '#00000000',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
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
			path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
			{ hash: '/overlay' }
		);
	}

	overlayWindow.on('closed', () => {
		overlayWindow = null;
	});

	// Register window with managers
	if (windowTracker) {
		windowTracker.registerWindow(overlayWindow);
	}
	if (sessionManager) {
		sessionManager.registerWindow(overlayWindow);
	}
	if (distractionManager) {
		distractionManager.registerWindow(overlayWindow);
	}
};

/**
 * Initialize core managers and services
 */
const initializeServices = () => {
	console.log('🚀 Initializing services...');

	// Initialize Window Tracker
	windowTracker = new WindowTracker();

	// Initialize Session Manager
	sessionManager = new SessionManager();

	// Initialize Python IPC connection
	pythonIPC = new PythonIPCInterface();
	pythonIPC.connect();

	// Connect session manager to Python IPC and distraction manager
	sessionManager.setPythonIPC(pythonIPC);
	sessionManager.setDistractionManager(distractionManager);

	// Initialize AI/Notification Services
	elevenLabsService = new ElevenLabsService();
	bedrockService = new BedrockService();
	pushoverService = new PushoverService();

	// Initialize Distraction Manager (orchestrator)
	distractionManager = new DistractionManager({
		pythonIPC,
		sessionManager,
		windowTracker,
		elevenLabsService,
		bedrockService,
		pushoverService
	});

	// Setup IPC handlers
	setupIPCHandlers({
		sessionManager,
		windowTracker,
		getOverlayWindow,
		elevenLabsService,
		distractionManager
	});

	// Setup Python IPC event forwarding to DistractionManager
	setupPythonIPCForwarding({
		pythonIPC,
		distractionManager
	});

	// Connect WindowTracker to DistractionManager
	// Override the broadcast method to also update distraction manager
	const originalBroadcast = windowTracker.broadcast.bind(windowTracker);
	windowTracker.broadcast = function (windowInfo) {
		originalBroadcast(windowInfo);
		if (windowInfo) {
			distractionManager.updateWindowState(windowInfo);
		}
	};

	console.log('✅ All services initialized');
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
	initializeServices();
	createDashboardWindow();
	createOverlayWindow();
	console.log("WINDOW TRACKING STARTING!!");
	windowTracker.start();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', async () => {
	// Clean up all services
	if (distractionManager) {
		distractionManager.destroy();
	}
	if (windowTracker) {
		windowTracker.destroy();
	}
	if (sessionManager) {
		sessionManager.destroy();
	}
	if (pythonIPC) {
		await pythonIPC.disconnect();
	}

	cleanupIPCHandlers();

	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		if (!windowTracker || !sessionManager || !pythonIPC || !distractionManager) {
			initializeServices();
		}
		createDashboardWindow();
		createOverlayWindow();
		windowTracker.start();
	}
});

app.on('will-quit', async () => {
	// Clean up all services
	if (distractionManager) {
		distractionManager.destroy();
	}
	if (windowTracker) {
		windowTracker.destroy();
	}
	if (sessionManager) {
		sessionManager.destroy();
	}
	if (pythonIPC) {
		await pythonIPC.disconnect();
	}

	cleanupIPCHandlers();
});
