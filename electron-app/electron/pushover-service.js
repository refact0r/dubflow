/**
 * Pushover Push Notification Service
 * Sends push notifications to user's mobile device
 */

import https from 'https';

class PushoverService {
	constructor() {
		this.token = process.env.PUSHOVER_TOKEN;
		this.user = process.env.PUSHOVER_USER;
		this.isEnabled = true;

		if (!this.token || !this.user) {
			console.warn('⚠️  Pushover credentials not found in environment variables');
			this.isEnabled = false;
		} else {
			console.log('📱 Pushover Service initialized');
		}
	}

	/**
	 * Send push notification via Pushover
	 * @param {string} message - Message to send
	 * @param {Object} options - Additional options (priority, sound, etc.)
	 * @returns {Promise<boolean>} Success status
	 */
	async sendNotification(message, options = {}) {
		if (!this.isEnabled) {
			console.log('⏭️  Pushover disabled, skipping notification');
			return false;
		}

		try {
			console.log('📱 Sending Pushover notification...');

			const postData = JSON.stringify({
				token: this.token,
				user: this.user,
				message: message,
				title: options.title || '🐶 Dubs',
				priority: options.priority || 1, // High priority
				sound: options.sound || 'pushover' // Default sound
			});

			return new Promise((resolve, reject) => {
				const requestOptions = {
					hostname: 'api.pushover.net',
					port: 443,
					path: '/1/messages.json',
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(postData)
					}
				};

				const req = https.request(requestOptions, (res) => {
					let responseData = '';

					res.on('data', (chunk) => {
						responseData += chunk;
					});

					res.on('end', () => {
						if (res.statusCode === 200) {
							console.log('✅ Pushover notification sent:', JSON.parse(responseData));
							resolve(true);
						} else {
							console.error('❌ Pushover notification failed:', res.statusCode, responseData);
							resolve(false);
						}
					});
				});

				req.on('error', (error) => {
					console.error('❌ Pushover request error:', error.message);
					reject(error);
				});

				req.write(postData);
				req.end();
			});
		} catch (error) {
			console.error('❌ Pushover notification error:', error);
			return false;
		}
	}
}

export default PushoverService;
