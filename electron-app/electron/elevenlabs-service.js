/**
 * ElevenLabs Voice Notification Service
 * Handles text-to-speech for Dubs' voice notifications
 */

import https from 'https';
import { Buffer } from 'buffer';

class ElevenLabsService {
	constructor() {
		this.apiKey = process.env.ELEVENLABS_API_KEY;
		this.voiceId = process.env.ELEVENLABS_VOICE_ID;
		this.isEnabled = process.env.VOICE_NOTIFICATION_ENABLED !== 'false';

		if (!this.apiKey) {
			console.error('⚠️ ELEVENLABS_API_KEY not found in environment variables');
		}
		if (!this.voiceId) {
			console.error('⚠️ ELEVENLABS_VOICE_ID not found in environment variables');
		}

		// Random distraction messages
		this.messages = [
			"Hey! Lock back in!",
			"Focus up, champ!",
			"What are you doing?",
			"Eyes on the screen!",
			"Let's get back to work!",
			"Come on, stay focused!",
			"You got this, lock in!",
			"No distractions allowed!",
			"Get back to grinding!",
			"Time to focus!"
		];

		console.log('🎙️ ElevenLabs Service initialized');
		console.log(`   Voice ID: ${this.voiceId}`);
		console.log(`   Cooldown: DISABLED`);
	}

	/**
	 * Check if we can play a voice notification
	 */
	canPlay() {
		if (!this.isEnabled) return false;
		return true;
	}

	/**
	 * Get a random distraction message
	 */
	getRandomMessage() {
		return this.messages[Math.floor(Math.random() * this.messages.length)];
	}

	/**
	 * Generate speech using ElevenLabs API
	 * @param {string} text - Text to convert to speech
	 * @returns {Promise<Buffer>} Audio buffer
	 */
	async generateSpeech(text) {
		return new Promise((resolve, reject) => {
			const postData = JSON.stringify({
				text: text,
				model_id: "eleven_turbo_v2_5",
				voice_settings: {
					stability: 0.5,
					similarity_boost: 0.75,
					style: 0.0,
					use_speaker_boost: true
				}
			});

			const options = {
				hostname: 'api.elevenlabs.io',
				port: 443,
				path: `/v1/text-to-speech/${this.voiceId}`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'xi-api-key': this.apiKey,
					'Content-Length': Buffer.byteLength(postData)
				}
			};

			const req = https.request(options, (res) => {
				const chunks = [];

				res.on('data', (chunk) => {
					chunks.push(chunk);
				});

				res.on('end', () => {
					if (res.statusCode === 200) {
						const buffer = Buffer.concat(chunks);
						resolve(buffer);
					} else {
						const error = Buffer.concat(chunks).toString();
						reject(new Error(`ElevenLabs API error: ${res.statusCode} - ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				reject(error);
			});

			req.write(postData);
			req.end();
		});
	}

	/**
	 * Play a distraction notification
	 * @returns {Promise<{success: boolean, audioData?: Buffer, message?: string, error?: string}>}
	 */
	async playDistractionNotification() {
		try {
			if (!this.canPlay()) {
				return {
					success: false,
					error: 'Cooldown active'
				};
			}

			const message = this.getRandomMessage();
			console.log(`🎙️ Generating speech: "${message}"`);

			const audioBuffer = await this.generateSpeech(message);

			console.log(`✅ Speech generated: ${audioBuffer.length} bytes`);

			return {
				success: true,
				audioData: audioBuffer,
				message: message
			};
		} catch (error) {
			console.error('❌ Failed to generate speech:', error.message);
			return {
				success: false,
				error: error.message
			};
		}
	}
}

export default ElevenLabsService;

