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
	 * Website domains considered distracting
	 * These are checked when you're browsing in any browser
	 * This is more accurate than app-based detection!
	 */
	distractingSites: [
		'reddit.com',
		'twitter.com',
		'x.com',
		'instagram.com',
		'facebook.com',
		'youtube.com',
		'netflix.com',
		'tiktok.com',
		'twitch.tv',
		'discord.com/channels'
	],

	/**
	 * Website domains considered productive
	 * If a URL matches these, it's always considered productive
	 * even if other rules might classify it differently
	 */
	productiveSites: [
		'github.com',
		'stackoverflow.com',
		'docs.',
		'developer.mozilla.org',
		'learn.microsoft.com',
		'coursera.org',
		'udemy.com',
		'codecademy.com',
		'leetcode.com',
		'hackerrank.com'
	],

	/**
	 * Classification behavior settings
	 */
	settings: {
		// If true, unknown apps default to productive
		// If false, unknown apps default to distracting
		defaultToProductive: true,

		// If true, having a URL always takes priority over app classification
		urlOverridesApp: true,

		// Polling interval for active window detection (milliseconds)
		pollInterval: 500
	}
};

export default windowTrackerConfig;
