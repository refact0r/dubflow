/**
 * Window Tracker Module
 * Handles active window detection and classification
 */

import { activeWindowSync } from 'get-windows';
import { windowTrackerConfig } from './window-tracker-config.js';

/**
 * Get information about the currently active window
 * @returns {Object|null} Window information or null if error
 */
export const getActiveWindowInfo = () => {
	try {
		const window = activeWindowSync({
			accessibilityPermission: true, // Get browser URLs
			screenRecordingPermission: true // Get window titles
		});

		if (!window) {
			return null;
		}

		const isProductive = classifyWindow(window);

		return {
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
	} catch (error) {
		console.error('Error getting active window:', error);
		return null;
	}
};

/**
 * Classify whether a window is productive or distracting
 * Checks patterns against URL and window title, then falls back to app-based classification
 * @param {Object} window - Window object from get-windows
 * @returns {boolean} True if productive, false if distracting
 */
export const classifyWindow = (window) => {
	const { owner, url, title } = window;
	const appName = owner.name;
	const windowTitle = title || '';
	const { productiveApps, distractingApps, productivePatterns, distractingPatterns, settings } =
		windowTrackerConfig;

	// Check pattern-based classification (URL + title)
	if (settings.patternsOverrideApp) {
		const urlLower = url ? url.toLowerCase() : '';
		const titleLower = windowTitle.toLowerCase();

		// First check if it's a productive pattern
		const productiveMatch = productivePatterns.find(
			(pattern) =>
				urlLower.includes(pattern.toLowerCase()) || titleLower.includes(pattern.toLowerCase())
		);
		if (productiveMatch) {
			const source = urlLower.includes(productiveMatch.toLowerCase()) ? 'URL' : 'title';
			console.log(`✅ Productive pattern matched via ${source}: "${productiveMatch}"`);
			return true;
		}

		// Then check if it's a distracting pattern
		const distractingMatch = distractingPatterns.find(
			(pattern) =>
				urlLower.includes(pattern.toLowerCase()) || titleLower.includes(pattern.toLowerCase())
		);
		if (distractingMatch) {
			const source = urlLower.includes(distractingMatch.toLowerCase()) ? 'URL' : 'title';
			console.log(`⚠️  Distraction pattern matched via ${source}: "${distractingMatch}"`);
			return false;
		}

		// If URL exists but doesn't match any pattern, consider it productive
		if (url) {
			console.log(`✅ Unknown URL (defaulting to productive): ${url}`);
			return true;
		}
	}

	// Fallback to app-based classification
	// Check if app is in distraction list
	if (distractingApps.some((app) => appName.includes(app))) {
		console.log(`⚠️  Distracting app: ${appName}`);
		return false;
	}

	// Check if app is in productive list
	if (productiveApps.some((app) => appName.includes(app))) {
		console.log(`✅ Productive app: ${appName}`);
		return true;
	}

	// Use default setting for unknown apps
	console.log(`ℹ️  Unknown app (using default): ${appName}`);
	return settings.defaultToProductive;
};

/**
 * Window Tracker Class
 * Manages polling and broadcasting of active window information
 */
export class WindowTracker {
	constructor() {
		this.intervalId = null;
		this.windows = new Set(); // Store window references
		this.isTracking = false;
	}

	/**
	 * Register a window to receive active window updates
	 * @param {BrowserWindow} window - Electron BrowserWindow instance
	 */
	registerWindow(window) {
		if (window && !window.isDestroyed()) {
			this.windows.add(window);
		}
	}

	/**
	 * Unregister a window from receiving updates
	 * @param {BrowserWindow} window - Electron BrowserWindow instance
	 */
	unregisterWindow(window) {
		this.windows.delete(window);
	}

	/**
	 * Broadcast window info to all registered windows
	 * @param {Object} windowInfo - Window information to broadcast
	 */
	broadcast(windowInfo) {
		if (!windowInfo) return;

		// Clean up destroyed windows
		for (const window of this.windows) {
			if (window.isDestroyed()) {
				this.windows.delete(window);
			} else {
				window.webContents.send('active-window-update', windowInfo);
			}
		}
	}

	/**
	 * Poll and broadcast active window information
	 */
	poll() {
		const windowInfo = getActiveWindowInfo();
		this.broadcast(windowInfo);
	}

	/**
	 * Start tracking active windows
	 * @param {number} [pollInterval] - Optional poll interval in ms (defaults to config)
	 */
	start(pollInterval = null) {
		if (this.isTracking) {
			console.warn('Window tracker is already running');
			return;
		}

		const interval = pollInterval || windowTrackerConfig.settings.pollInterval;
		console.log(`🔍 Starting window tracker (polling every ${interval}ms)`);

		this.poll(); // Get initial window
		this.intervalId = setInterval(() => this.poll(), interval);
		this.isTracking = true;
	}

	/**
	 * Stop tracking active windows
	 */
	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.isTracking = false;
		console.log('🛑 Window tracker stopped');
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		this.stop();
		this.windows.clear();
	}
}
