/**
 * Session History Store
 * Manages session history and daily stats using Svelte 5 runes
 */

export class SessionHistoryStore {
	recentSessions = $state([]);
	dailyStats = $state({
		totalTime: 0,
		sessionCount: 0,
		averageFocusScore: 0,
		dayStreak: 0
	});
	allTimeStats = $state({
		totalTime: 0,
		sessionCount: 0,
		averageFocusScore: 0
	});

	constructor() {
		// Set up IPC listeners if in Electron environment
		if (typeof window !== 'undefined' && window.electronAPI) {
			// Listen for session completions
			window.electronAPI.onSessionCompleted((session) => {
				console.log('📊 Session completed:', session);
				// Reload history and stats when a session completes
				this.loadHistory();
				this.loadDailyStats();
				this.loadAllTimeStats();
			});

			// Load initial data
			this.loadHistory();
			this.loadDailyStats();
			this.loadAllTimeStats();
		}
	}

	async loadHistory(count = 3) {
		if (window.electronAPI) {
			const sessions = await window.electronAPI.getSessionHistory(count);
			this.recentSessions = sessions;
		}
	}

	async loadDailyStats() {
		if (window.electronAPI) {
			const stats = await window.electronAPI.getDailyStats();
			this.dailyStats = stats;
		}
	}

	async loadAllTimeStats() {
		if (window.electronAPI) {
			console.log('📊 Loading all-time stats...');
			const stats = await window.electronAPI.getAllTimeStats();
			console.log('📊 All-time stats loaded:', stats);
			this.allTimeStats = stats;
		}
	}

	async clearAllSessions() {
		if (window.electronAPI) {
			console.log('🗑️  Clearing all session history...');
			await window.electronAPI.clearSessionHistory();
			// Reload all data after clearing
			await this.loadHistory();
			await this.loadDailyStats();
			await this.loadAllTimeStats();
			console.log('✅ Session history cleared');
		}
	}

	/**
	 * Format duration in seconds to human-readable string
	 * @param {number} seconds - Duration in seconds
	 * @returns {string} Formatted duration (e.g., "45 min", "1h 30m")
	 */
	formatDuration(seconds) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (hours > 0) {
			return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
		}
		return `${minutes} min`;
	}

	/**
	 * Format timestamp to relative time or absolute time
	 * @param {number} timestamp - Unix timestamp in milliseconds
	 * @returns {string} Formatted time string
	 */
	formatRelativeTime(timestamp) {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			if (days === 1) return 'Yesterday';
			if (days < 7) return `${days} days ago`;
			// For older sessions, show the date
			const date = new Date(timestamp);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}

		if (hours > 0) {
			return `${hours} hour${hours > 1 ? 's' : ''} ago`;
		}

		if (minutes > 0) {
			return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
		}

		return 'Just now';
	}
}

// Create singleton instance
export const sessionHistoryStore = new SessionHistoryStore();
