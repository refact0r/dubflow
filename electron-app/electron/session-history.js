/**
 * Session History Manager Module
 * Handles persistent storage and retrieval of completed focus sessions
 */

import Store from 'electron-store';
import { randomUUID } from 'crypto';

export class SessionHistoryManager {
	constructor() {
		// Initialize electron-store with schema
		this.store = new Store({
			name: 'session-history',
			schema: {
				sessions: {
					type: 'array',
					default: []
				},
				lastActiveDate: {
					type: ['string', 'null'],
					default: null
				},
				dayStreak: {
					type: 'number',
					default: 0
				}
			}
		});
	}

	/**
	 * Calculate focus score from focus state history
	 * @param {Array} focusStateHistory - Array of focus state events
	 * @param {number} elapsedTime - Total elapsed time in seconds
	 * @returns {number} Focus score percentage (0-100)
	 */
	calculateFocusScore(focusStateHistory, elapsedTime) {
		if (!focusStateHistory || focusStateHistory.length === 0 || elapsedTime === 0) {
			return 100;
		}

		let focusedTime = 0;

		for (let i = 0; i < focusStateHistory.length; i++) {
			const event = focusStateHistory[i];
			const nextEvent = focusStateHistory[i + 1];

			if (event.state === 'focused') {
				const segmentStart = event.elapsedTime ?? 0;
				const segmentEnd = nextEvent ? (nextEvent.elapsedTime ?? 0) : elapsedTime;

				focusedTime += Math.max(0, segmentEnd - segmentStart);
			}
		}

		return Math.round((focusedTime / elapsedTime) * 100);
	}

	/**
	 * Save a completed session
	 * @param {Object} sessionData - Session data to save
	 * @returns {Object} Saved session with generated ID
	 */
	saveSession(sessionData) {
		const session = {
			id: randomUUID(),
			taskName: sessionData.taskName,
			duration: sessionData.duration,
			startTime: sessionData.startTime,
			endTime: Date.now(),
			focusScore: this.calculateFocusScore(sessionData.focusStateHistory, sessionData.elapsedTime),
			focusStateHistory: sessionData.focusStateHistory,
			completedAt: Date.now()
		};

		const sessions = this.store.get('sessions');
		sessions.push(session);
		this.store.set('sessions', sessions);

		// Update day streak
		this.updateDayStreak();

		console.log(`📝 Session saved: ${session.taskName} (${session.focusScore}% focus)`);

		return session;
	}

	/**
	 * Get sessions for a specific date
	 * @param {Date} date - Date to filter sessions
	 * @returns {Array} Sessions for that date
	 */
	getSessionsForDate(date) {
		const sessions = this.store.get('sessions');
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		return sessions.filter((session) => {
			const sessionDate = new Date(session.completedAt);
			return sessionDate >= startOfDay && sessionDate <= endOfDay;
		});
	}

	/**
	 * Get today's sessions
	 * @returns {Array} Today's sessions
	 */
	getTodaySessions() {
		return this.getSessionsForDate(new Date());
	}

	/**
	 * Get recent sessions (last N sessions)
	 * @param {number} count - Number of sessions to retrieve
	 * @returns {Array} Recent sessions, newest first
	 */
	getRecentSessions(count = 10) {
		const sessions = this.store.get('sessions');
		return sessions.slice(-count).reverse(); // Get last N and reverse for newest first
	}

	/**
	 * Get daily statistics for a specific date
	 * @param {Date} date - Date to get stats for
	 * @returns {Object} Daily stats
	 */
	getDailyStats(date = new Date()) {
		const sessions = this.getSessionsForDate(date);

		if (sessions.length === 0) {
			return {
				totalTime: 0,
				sessionCount: 0,
				averageFocusScore: 0,
				dayStreak: this.store.get('dayStreak')
			};
		}

		const totalTime = sessions.reduce((sum, session) => {
			// Use actual elapsed time instead of planned duration
			const actualDuration = Math.floor((session.endTime - session.startTime) / 1000);
			return sum + actualDuration;
		}, 0);

		const averageFocusScore = Math.round(
			sessions.reduce((sum, session) => sum + session.focusScore, 0) / sessions.length
		);

		return {
			totalTime,
			sessionCount: sessions.length,
			averageFocusScore,
			dayStreak: this.store.get('dayStreak')
		};
	}

	/**
	 * Get all-time statistics for all sessions
	 * @returns {Object} All-time stats
	 */
	getAllTimeStats() {
		const sessions = this.store.get('sessions');
		console.log(`📊 Getting all-time stats for ${sessions.length} sessions`);

		if (sessions.length === 0) {
			return {
				totalTime: 0,
				sessionCount: 0,
				averageFocusScore: 0
			};
		}

		const totalTime = sessions.reduce((sum, session) => {
			// Use actual elapsed time instead of planned duration
			const actualDuration = Math.floor((session.endTime - session.startTime) / 1000);
			return sum + actualDuration;
		}, 0);

		const averageFocusScore = Math.round(
			sessions.reduce((sum, session) => sum + session.focusScore, 0) / sessions.length
		);

		const stats = {
			totalTime,
			sessionCount: sessions.length,
			averageFocusScore
		};

		console.log('📊 All-time stats calculated:', stats);
		return stats;
	}

	/**
	 * Update day streak based on session activity
	 * Increments streak if user completed a session today and yesterday
	 */
	updateDayStreak() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const lastActiveDate = this.store.get('lastActiveDate');
		let currentStreak = this.store.get('dayStreak');

		if (!lastActiveDate) {
			// First session ever
			currentStreak = 1;
		} else {
			const lastActive = new Date(lastActiveDate);
			lastActive.setHours(0, 0, 0, 0);

			const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

			if (daysDiff === 0) {
				// Same day, keep streak
			} else if (daysDiff === 1) {
				// Consecutive day, increment streak
				currentStreak++;
			} else {
				// Streak broken, reset to 1
				currentStreak = 1;
			}
		}

		this.store.set('lastActiveDate', today.toISOString());
		this.store.set('dayStreak', currentStreak);
	}

	/**
	 * Clean up old sessions (keep last N days)
	 * @param {number} daysToKeep - Number of days to keep
	 */
	cleanupOldSessions(daysToKeep = 30) {
		const sessions = this.store.get('sessions');
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

		const filteredSessions = sessions.filter((session) => {
			return new Date(session.completedAt) >= cutoffDate;
		});

		this.store.set('sessions', filteredSessions);
		console.log(
			`🧹 Cleaned up ${sessions.length - filteredSessions.length} old sessions (keeping ${daysToKeep} days)`
		);
	}

	/**
	 * Get all sessions
	 * @returns {Array} All stored sessions
	 */
	getAllSessions() {
		return this.store.get('sessions');
	}

	/**
	 * Clear all session history (for testing/debugging)
	 */
	clearAllSessions() {
		this.store.set('sessions', []);
		this.store.set('dayStreak', 0);
		this.store.set('lastActiveDate', null);
		console.log('🗑️  All session history cleared');
	}
}
