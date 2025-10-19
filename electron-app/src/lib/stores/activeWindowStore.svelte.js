/**
 * Active window tracking state
 * Monitors which application/window the user is currently using
 */

import { SvelteMap } from 'svelte/reactivity';

export class ActiveWindowStore {
	appName = $state('Unknown'); // Name of the currently active application (e.g., "Visual Studio Code")
	windowTitle = $state(''); // Title of the active window (e.g., "main.js - MyProject")
	url = $state(null); // Current URL if the app is a browser
	bundleId = $state(null); // macOS bundle identifier (e.g., "com.google.Chrome")
	processId = $state(null); // Process ID of the active application
	memoryUsage = $state(0); // Memory usage in bytes
	bounds = $state(null); // Window position and size { x, y, width, height }
	isProductive = $state(true); // Whether the current app is considered productive based on focus rules
	timestamp = $state(null); // When this window became active
	history = $state([]); // Last 20 window changes for tracking patterns

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
		const unique = new SvelteMap();
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

// Create singleton instance
export const activeWindowStore = new ActiveWindowStore();
