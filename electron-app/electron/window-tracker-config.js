/**
 * Focus Classification Configuration
 *
 * Customize which apps and websites are considered productive or distracting.
 * This file can be edited to match your personal workflow.
 */

export const windowTrackerConfig = {
	/**
	 * Apps considered productive for focused work
	 * Add any apps you use for work/study
	 */
	productiveApps: [
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
		'Brave',
		'Figma',
		'Sketch',
		'Adobe',
		'Microsoft Word',
		'Microsoft Excel',
		'Microsoft PowerPoint',
		'Pages',
		'Numbers',
		'Keynote'
	],

	/**
	 * Apps considered distracting
	 * These will trigger Dubs to wake up and alert you
	 */
	distractingApps: [
		'Messages',
		'Discord',
		'Vesktop',
		'Slack',
		'Instagram',
		'Twitter',
		'Reddit',
		'Netflix',
		'YouTube',
		'Spotify',
		'Music',
		'WhatsApp',
		'Telegram',
		'Signal',
		'iMessage'
	],

	/**
	 * Patterns for distracting websites/activities
	 * These patterns are checked against both URLs and window titles (case-insensitive)
	 * Works for all browsers including Firefox where URL detection may not be available
	 */
	distractingPatterns: [
		'reddit',
		'twitter',
		'x.com',
		'instagram',
		'facebook',
		'youtube',
		'netflix',
		'tiktok',
		'twitch',
		'discord',
		'spotify'
	],

	/**
	 * Patterns for productive websites/activities
	 * These patterns are checked against both URLs and window titles (case-insensitive)
	 * If a match is found, the activity is always considered productive
	 */
	productivePatterns: [
		'github',
		'stackoverflow',
		'stack overflow',
		'docs.',
		'documentation',
		'developer.mozilla.org',
		'mdn web docs',
		'learn.microsoft.com',
		'coursera',
		'udemy',
		'codecademy',
		'leetcode',
		'hackerrank'
	],

	/**
	 * Classification behavior settings
	 */
	settings: {
		// If true, unknown apps default to productive
		// If false, unknown apps default to distracting
		defaultToProductive: true,

		// If true, pattern matching (URL/title) takes priority over app classification
		patternsOverrideApp: true,

		// Polling interval for active window detection (milliseconds)
		pollInterval: 500
	}
};

export default windowTrackerConfig;
