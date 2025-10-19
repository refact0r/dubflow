/**
 * Distraction Logger Module
 * Logs distraction events to JSON files for analytics and history
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class DistractionLogger {
	constructor() {
		// Set up log directory in user data folder
		this.logDir = path.join(app.getPath('userData'), 'distraction-logs');
		this.ensureLogDirectory();

		console.log('📝 Distraction Logger initialized');
		console.log(`   Log directory: ${this.logDir}`);
	}

	/**
	 * Ensure log directory exists
	 */
	ensureLogDirectory() {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
	}

	/**
	 * Get log file path for a specific date
	 * @param {Date} date - Date for the log file
	 * @returns {string} Path to log file
	 */
	getLogFilePath(date = new Date()) {
		const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
		return path.join(this.logDir, `${dateString}.json`);
	}

	/**
	 * Read existing log file
	 * @param {string} filePath - Path to log file
	 * @returns {Array} Array of log entries
	 */
	readLogFile(filePath) {
		try {
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, 'utf-8');
				return JSON.parse(content);
			}
		} catch (error) {
			console.error('❌ Error reading log file:', error.message);
		}
		return [];
	}

	/**
	 * Write log file
	 * @param {string} filePath - Path to log file
	 * @param {Array} entries - Array of log entries
	 */
	writeLogFile(filePath, entries) {
		try {
			fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8');
		} catch (error) {
			console.error('❌ Error writing log file:', error.message);
		}
	}

	/**
	 * Log a distraction event
	 * @param {Object} eventData - Distraction event data
	 */
	logEvent(eventData) {
		try {
			const logEntry = {
				id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				timestamp: new Date().toISOString(),
				...eventData
			};

			const logFile = this.getLogFilePath();
			const entries = this.readLogFile(logFile);
			entries.push(logEntry);
			this.writeLogFile(logFile, entries);

			console.log('📝 Distraction event logged:', logEntry.id);
		} catch (error) {
			console.error('❌ Error logging event:', error.message);
		}
	}

	/**
	 * Get all events for a specific date
	 * @param {Date} date - Date to query
	 * @returns {Array} Array of events
	 */
	getEventsForDate(date) {
		const logFile = this.getLogFilePath(date);
		return this.readLogFile(logFile);
	}

	/**
	 * Get events for a date range
	 * @param {Date} startDate - Start date
	 * @param {Date} endDate - End date
	 * @returns {Array} Array of events
	 */
	getEventsForRange(startDate, endDate) {
		const events = [];
		const currentDate = new Date(startDate);

		while (currentDate <= endDate) {
			const dayEvents = this.getEventsForDate(currentDate);
			events.push(...dayEvents);
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return events;
	}

	/**
	 * Get statistics for a specific session
	 * @param {string} sessionId - Session ID
	 * @returns {Object} Session statistics
	 */
	getSessionStats(sessionId) {
		// For now, search recent files (last 7 days)
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 7);

		const events = this.getEventsForRange(startDate, endDate);
		const sessionEvents = events.filter((e) => e.context?.session?.sessionId === sessionId);

		return {
			totalDistractions: sessionEvents.length,
			triggers: {
				window: sessionEvents.filter((e) => e.triggerSource === 'window_tracker').length,
				eye: sessionEvents.filter((e) => e.triggerSource === 'eye_tracker').length
			},
			phoneDetections: sessionEvents.filter((e) => e.hasPhone).length,
			events: sessionEvents
		};
	}

	/**
	 * Get daily summary statistics
	 * @param {Date} date - Date to summarize
	 * @returns {Object} Daily statistics
	 */
	getDailySummary(date = new Date()) {
		const events = this.getEventsForDate(date);

		return {
			date: date.toISOString().split('T')[0],
			totalDistractions: events.length,
			triggers: {
				window: events.filter((e) => e.triggerSource === 'window_tracker').length,
				eye: events.filter((e) => e.triggerSource === 'eye_tracker').length
			},
			phoneDetections: events.filter((e) => e.hasPhone).length,
			topDistractingApps: this.getTopDistractingApps(events),
			hourlyDistribution: this.getHourlyDistribution(events)
		};
	}

	/**
	 * Get top distracting apps from events
	 * @param {Array} events - Array of events
	 * @returns {Array} Top apps with counts
	 */
	getTopDistractingApps(events) {
		const appCounts = {};

		events.forEach((event) => {
			const appName = event.context?.window?.appName;
			if (appName) {
				appCounts[appName] = (appCounts[appName] || 0) + 1;
			}
		});

		return Object.entries(appCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([app, count]) => ({ app, count }));
	}

	/**
	 * Get hourly distribution of distractions
	 * @param {Array} events - Array of events
	 * @returns {Object} Hour -> count mapping
	 */
	getHourlyDistribution(events) {
		const hourCounts = {};

		events.forEach((event) => {
			const hour = new Date(event.timestamp).getHours();
			hourCounts[hour] = (hourCounts[hour] || 0) + 1;
		});

		return hourCounts;
	}

	/**
	 * Clean up old log files (older than specified days)
	 * @param {number} daysToKeep - Number of days to keep
	 */
	cleanupOldLogs(daysToKeep = 30) {
		try {
			const files = fs.readdirSync(this.logDir);
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

			files.forEach((file) => {
				if (file.endsWith('.json')) {
					const dateString = file.replace('.json', '');
					const fileDate = new Date(dateString);

					if (fileDate < cutoffDate) {
						const filePath = path.join(this.logDir, file);
						fs.unlinkSync(filePath);
						console.log(`🧹 Deleted old log file: ${file}`);
					}
				}
			});
		} catch (error) {
			console.error('❌ Error cleaning up old logs:', error.message);
		}
	}
}

export default DistractionLogger;
