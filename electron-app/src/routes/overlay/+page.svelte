<script>
	import { onMount } from 'svelte';
	import { dubsStore, activeWindowStore, sessionStore } from '$lib/stores';
	import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

	let previousProductiveState = $state(true);
	let stateTimeout = null;
	let sleepTimeout = null;
	let lastFocusState = $state(null); // Track last state to prevent duplicates

	const ANIMATION_DELAY = (3 / 7) * 1000; // Exactly 4/7 seconds in milliseconds (~571ms)

	/**
	 * Generate context-aware message using Amazon Bedrock
	 */
	async function getBedrockString(context) {
		try {
			console.log('🤖 Calling Amazon Bedrock...');

			const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
			const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
			const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';

			const prompt = `Persona:
You are Dubs, the University of Washington husky mascot. Your personality is that of a loyal, intelligent, and slightly judgmental companion. You communicate in short, one sentence MAX exclamations. You think and talk like a dog, so your world revolves around walks, treats, naps, squirrels, and making your human proud. You are supportive, but you get very disappointed when your owner gets distracted, and you aren't afraid to show it.
Task:
Your job is to generate an exclamation to get them back on task. Your goal is to make them feel a little bit guilty for slacking off by summarizing their pattern of distraction. Use the dynamic context provided to make your message super specific.
Using Dynamic Context:
You will receive a single JSON object containing real-time information about the user's activity. Your task is to analyze this data and weave it into your exclamation to make it specific and impactful.
The JSON might contain:
- Webcam analysis (scene_analysis and face_analysis): Information about objects in the user's environment (phones, whiteboards, etc.), the user's apparent mood/emotions, physical characteristics (teen, male, etc.), and distraction level
- Current website: What site the user is currently viewing (e.g., Reddit, Instagram, YouTube)
- Session information: Time elapsed in the study session, time remaining, and the user's stated goal (e.g., "Finish the reading")
How to use this data:
- Reference specific distraction objects if present (e.g., phone detected)
- Mention the distracting website if applicable
- Reference their emotional state if relevant (confused, sad, etc.)
- Call out how much time they've already invested or have left
- Remind them of their specific goal
Rules for Your Response:
Output ONLY the exclamation text. Do not add any conversational text before or after, like 'Here is an exclamation:'. Keep it short. Aim for 15 words or less. ONE SENTENCE MAX. Do NOT use EM DASHES. Incorporate dog-like themes. Think about what a dog would say or care about. Use a mix of tones: guilt, loss aversion, sternness, and disappointed companionship.
Here is the context:
${context}

Generate the exclamation using this context now.`;

			// Initialize Bedrock client
			const client = new BedrockRuntimeClient({
				region: AWS_REGION,
				credentials: {
					accessKeyId: AWS_ACCESS_KEY_ID,
					secretAccessKey: AWS_SECRET_ACCESS_KEY,
				},
			});

			// Prepare request body for Amazon Titan Text Express
			const requestBody = {
				inputText: prompt,
				textGenerationConfig: {
					maxTokenCount: 50,
					temperature: 0.7,
					topP: 0.9,
				},
			};

			// Invoke the model
			const command = new InvokeModelCommand({
				modelId: 'amazon.titan-text-express-v1',
				contentType: 'application/json',
				accept: 'application/json',
				body: JSON.stringify(requestBody),
			});

			const response = await client.send(command);
			const responseBody = JSON.parse(new TextDecoder().decode(response.body));
			const generatedText = responseBody.results?.[0]?.outputText?.trim();

			console.log('✅ Bedrock response:', generatedText);
			return generatedText || 'Hey! Get back to work and stay focused! 🎯';
		} catch (error) {
			console.error('❌ Bedrock API error:', error);
			return 'Hey! Get back to work and stay focused! 🎯';
		}
	}

	/**
	 * Send push notification via Pushover
	 */
	async function sendPushoverNotification(message = 'Hey! Get back to work and stay focused! 🎯') {
		try {
			console.log('📱 Sending Pushover notification...');

			const PUSHOVER_TOKEN = import.meta.env.VITE_PUSHOVER_TOKEN;
			const PUSHOVER_USER = import.meta.env.VITE_PUSHOVER_USER;

			const response = await fetch('https://api.pushover.net/1/messages.json', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token: PUSHOVER_TOKEN,
					user: PUSHOVER_USER,
					message: message,
					title: '🐶 Dubs',
					priority: 1, // High priority
					sound: 'pushover', // Default sound
				}),
			});

			if (response.ok) {
				const result = await response.json();
				console.log('✅ Pushover notification sent:', result);
			} else {
				console.error('❌ Pushover notification failed:', response.status, response.statusText);
			}
		} catch (error) {
			console.error('❌ Pushover notification error:', error);
		}
	}

	/**
	 * Play voice notification using ElevenLabs
	 */
	async function playVoiceNotification() {
		try {
			console.log('🎙️ Requesting voice notification...');
			const result = await window.electronAPI.playVoiceNotification();

			if (result.success) {
				console.log(`✅ Playing message: "${result.message}"`);

				// Convert base64 audio data to audio buffer
				const audioData = Uint8Array.from(atob(result.audioData), (c) => c.charCodeAt(0));
				const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
				const audioUrl = URL.createObjectURL(audioBlob);

				// Play the audio
				const audio = new Audio(audioUrl);
				audio.play().catch((err) => {
					console.error('Failed to play audio:', err);
				});

				// Clean up URL after playing
				audio.onended = () => {
					URL.revokeObjectURL(audioUrl);
				};
			} else {
				console.log('⏭️ Voice notification skipped:', result.error);
			}
		} catch (error) {
			console.error('❌ Voice notification error:', error);
		}
	}

	// React to productivity changes
	$effect(() => {
		const isProductive = activeWindowStore.isProductive;
		const isActive = sessionStore.isActive;

		// Only react if session is active and state changed
		if (isActive && previousProductiveState !== isProductive) {
			// Clear all pending timeouts
			if (stateTimeout) clearTimeout(stateTimeout);
			if (sleepTimeout) clearTimeout(sleepTimeout);

			if (!isProductive) {
				// User got distracted - play waking up animation
				dubsStore.setState('dubs_waking_up');

				// Wait exactly 4/7 seconds for animation to complete
				stateTimeout = setTimeout(() => {
					// Initially show default stance (mild concern)
					dubsStore.setState('dubs_default_stance');

					// Escalate to heavy bark if distraction continues for 3+ seconds
					stateTimeout = setTimeout(() => {
						if (!activeWindowStore.isProductive) {
							dubsStore.setState('dubs_heavy_bark');
							// Play voice notification when barking starts
							playVoiceNotification();
							// Send push notification to user's device
							sendPushoverNotification();
						}
					}, 3000);
				}, ANIMATION_DELAY);
			} else {
				// User returned to focus - play going to sleep animation
				dubsStore.setState('dubs_to_sleep');

				// Wait exactly 4/7 seconds for animation to complete
				sleepTimeout = setTimeout(() => {
					dubsStore.setState('dubs_sleeping');
				}, ANIMATION_DELAY);
			}

			previousProductiveState = isProductive;
		} else if (!isActive) {
			// No active session, keep Dubs sleeping
			if (stateTimeout) clearTimeout(stateTimeout);
			if (sleepTimeout) clearTimeout(sleepTimeout);
			dubsStore.setState('dubs_sleeping');
		}
	});

	onMount(() => {
		// Initialize with current state
		previousProductiveState = activeWindowStore.isProductive;

		// ===== SIMPLE TEST: Listen for Python vision events =====
		console.log('🔌 Setting up Python vision event listener...');

		// Listen for focus updates from Python vision system
		window.electronAPI?.onVisionFocusUpdate?.((data) => {
			console.log('📊 Python focus update:', data);

			// Prevent duplicate state changes
			if (lastFocusState === data.focused) {
				return;
			}
			lastFocusState = data.focused;

			if (data.focused) {
				console.log('✅ User FOCUSED - Dubs going to sleep');
				// Clear any pending timeouts
				if (stateTimeout) clearTimeout(stateTimeout);
				if (sleepTimeout) clearTimeout(sleepTimeout);

				// Play going to sleep animation
				dubsStore.setState('dubs_to_sleep');

				// Wait exactly 4/7 seconds for animation to complete
				sleepTimeout = setTimeout(() => {
					dubsStore.setState('dubs_sleeping');
				}, ANIMATION_DELAY);
			} else {
				console.log('⚠️ User UNFOCUSED - Dubs waking up');
				// Clear any pending timeouts
				if (stateTimeout) clearTimeout(stateTimeout);
				if (sleepTimeout) clearTimeout(sleepTimeout);

				// Play waking up animation first
				dubsStore.setState('dubs_waking_up');

				// Wait exactly 4/7 seconds for animation to complete
				stateTimeout = setTimeout(() => {
					// Initially show default stance
					dubsStore.setState('dubs_default_stance');

					// Escalate to heavy bark if distraction continues for 3+ seconds
					stateTimeout = setTimeout(() => {
						if (lastFocusState === false) {
							// Still unfocused
							dubsStore.setState('dubs_heavy_bark');
							playVoiceNotification();
							sendPushoverNotification();
						}
					}, 3000);
				}, ANIMATION_DELAY);
			}
		});

		console.log('✅ Python vision listener ready');

		// Clean up on unmount
		return () => {
			if (stateTimeout) clearTimeout(stateTimeout);
			if (sleepTimeout) clearTimeout(sleepTimeout);
		};
	});
</script>

<div class="overlay-container">
	<div class="dubs-character">
		<img src={`/${dubsStore.spriteFile}`} alt="Dubs the mascot" class="dubs-sprite" />
	</div>

	{#if sessionStore.isActive && dubsStore.state !== 'dubs_sleeping'}
		<div class="thought-bubble">
			{#if dubsStore.state === 'dubs_default_stance'}
				<p>Hey... focus up! 👀</p>
			{:else if dubsStore.state === 'dubs_light_bark'}
				<p>Hey! Stay focused! 🎯</p>
			{:else if dubsStore.state === 'dubs_heavy_bark'}
				<p>LOCK IN! 🔥</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: transparent;
	}

	.overlay-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.dubs-character {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dubs-sprite {
		width: 240px;
		object-fit: contain;
		image-rendering: pixelated;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
	}

	.thought-bubble {
		position: absolute;
		top: 20px;
		background: white;
		padding: 0.75rem 1rem;
		border-radius: 20px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		animation: fadeInBounce 0.5s ease-out;
		max-width: 200px;
		text-align: center;
	}

	.thought-bubble p {
		margin: 0;
		font-weight: 600;
		color: #333;
		font-size: 0.9rem;
	}

	.thought-bubble::after {
		content: '';
		position: absolute;
		bottom: -10px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 10px solid transparent;
		border-right: 10px solid transparent;
		border-top: 10px solid white;
	}

	@keyframes fadeInBounce {
		0% {
			opacity: 0;
			transform: translateY(-20px) scale(0.8);
		}
		50% {
			transform: translateY(5px) scale(1.05);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
