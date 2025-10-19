<script>
	import { onMount } from 'svelte';
	import { dubsStore, sessionStore } from '$lib/stores';

	let animationTimeout = null;
	let currentMessage = $state('');
	let isDogAwake = $state(false); // Track if dog is currently awake/barking
	let audioEnabled = $state(true); // Track if audio is enabled

	/**
	 * Animation configuration with frame counts and FPS
	 * Duration in ms = (frames / fps) * 1000
	 */
	const ANIMATIONS = {
		waking_up: { frames: 3, fps: 7, duration: (3 / 7) * 1000 },
		barking_talking: { frames: 3, fps: 7, duration: (3 / 7) * 1000 },
		to_sleep: { frames: 3, fps: 7, duration: (3 / 7) * 1000 },
		sleeping: { frames: 10, fps: 7, duration: (10 / 7) * 1000 },
		default_stance: { frames: 3, fps: 7, duration: (3 / 7) * 1000 }
	};

	/**
	 * Play an animation sequence with automatic transitions
	 * @param {Array} sequence - Array of animation objects: [{ state: 'dubs_waking_up', loop: false }, ...]
	 * @param {Function} onComplete - Optional callback when sequence completes
	 * @param {Function} onStepComplete - Optional callback when each step completes (receives state name)
	 */
	function playAnimationSequence(sequence, onComplete = null, onStepComplete = null) {
		// Clear any pending animations
		if (animationTimeout) clearTimeout(animationTimeout);

		let currentStep = 0;

		function playNextStep() {
			if (currentStep >= sequence.length) {
				// Sequence complete
				if (onComplete) onComplete();
				return;
			}

			const step = sequence[currentStep];
			const animKey = step.state.replace('dubs_', '');
			const animConfig = ANIMATIONS[animKey];

			// Set the animation state
			dubsStore.setState(step.state);

			// If this is a looping animation, don't advance
			if (step.loop) {
				if (onStepComplete) onStepComplete(step.state);
				return;
			}

			// Schedule next step after animation completes
			animationTimeout = setTimeout(() => {
				if (onStepComplete) onStepComplete(step.state);
				currentStep++;
				playNextStep();
			}, animConfig?.duration || 571);
		}

		playNextStep();
	}

	/**
	 * Handle distraction alert from main process
	 * @param {Object} alertPackage - Complete alert package with message, audio, etc.
	 */
	function handleDistractionAlert(alertPackage) {
		console.log('🚨 Distraction alert received:', alertPackage);

		// Store the AI-generated message
		currentMessage = alertPackage.message || 'Hey! Get back to work! 🎯';

		// Play animation sequence: waking_up → barking_talking (loop)
		playAnimationSequence(
			[
				{ state: 'dubs_waking_up', loop: false },
				{ state: 'dubs_barking_talking', loop: true }
			],
			null,
			(completedState) => {
				// When waking_up completes, mark dog as awake and play audio
				if (completedState === 'dubs_waking_up') {
					isDogAwake = true;

					// Play audio if available
					if (alertPackage.audioData) {
						playAudio(alertPackage.audioData);
					}
				}
			}
		);
	}

	/**
	 * Play audio from base64 data
	 * @param {string} base64Data - Base64 encoded audio data
	 */
	function playAudio(base64Data) {
		// Check if audio is enabled before playing
		if (!audioEnabled) {
			console.log('🔇 Audio is disabled, skipping playback');
			return;
		}

		try {
			// Convert base64 to audio buffer
			const audioData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
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
		} catch (error) {
			console.error('❌ Error playing audio:', error);
		}
	}

	/**
	 * Handle user refocus event - reset dog to sleep state
	 * @param {Object} refocusData - Refocus event data
	 */
	function handleUserRefocused(refocusData) {
		console.log('😴 User refocused, resetting dog state:', refocusData);

		// Clear the current message
		currentMessage = '';

		// Only play sleep animation if dog was actually awake
		if (isDogAwake) {
			console.log('🐕 Dog was awake, playing sleep animation');
			// Play animation sequence: to_sleep → sleeping (loop)
			playAnimationSequence(
				[
					{ state: 'dubs_to_sleep', loop: false },
					{ state: 'dubs_sleeping', loop: true }
				],
				null,
				(completedState) => {
					// When to_sleep completes, mark dog as sleeping
					if (completedState === 'dubs_to_sleep') {
						isDogAwake = false;
					}
				}
			);
		} else {
			console.log('😴 Dog was already sleeping, no animation needed');
			// Dog was already sleeping, just ensure it stays sleeping
			dubsStore.setState('dubs_sleeping');
		}
	}

	/**
	 * Handle session state changes
	 * When session stops, put Dubs to sleep
	 */
	$effect(() => {
		const isActive = sessionStore.isActive;

		if (!isActive) {
			// Session stopped - put Dubs to sleep
			currentMessage = '';

			// Only play sleep animation if dog was awake
			if (isDogAwake) {
				playAnimationSequence(
					[
						{ state: 'dubs_to_sleep', loop: false },
						{ state: 'dubs_sleeping', loop: true }
					],
					null,
					(completedState) => {
						if (completedState === 'dubs_to_sleep') {
							isDogAwake = false;
						}
					}
				);
			} else {
				dubsStore.setState('dubs_sleeping');
			}
		}
	});

	onMount(() => {
		console.log('🎨 Overlay component mounted');

		// Listen for distraction alerts from main process
		if (window.electronAPI?.onDistractionAlert) {
			window.electronAPI.onDistractionAlert(handleDistractionAlert);
			console.log('✅ Listening for distraction alerts');
		} else {
			console.error('❌ electronAPI.onDistractionAlert not available');
		}

		// Listen for user refocus events from main process
		if (window.electronAPI?.onUserRefocused) {
			window.electronAPI.onUserRefocused(handleUserRefocused);
			console.log('✅ Listening for user refocus events');
		} else {
			console.error('❌ electronAPI.onUserRefocused not available');
		}

		// Listen for audio settings changes
		if (window.electronAPI?.onAudioSettingsChange) {
			window.electronAPI.onAudioSettingsChange((enabled) => {
				audioEnabled = enabled;
				console.log(`🔊 Audio settings changed: ${enabled ? 'enabled' : 'disabled'}`);
			});
			console.log('✅ Listening for audio settings changes');
		} else {
			console.error('❌ electronAPI.onAudioSettingsChange not available');
		}

		// Initialize Dubs as sleeping
		dubsStore.setState('dubs_sleeping');
		isDogAwake = false; // Ensure awake state is false on mount

		// Clean up on unmount
		return () => {
			if (animationTimeout) clearTimeout(animationTimeout);
		};
	});
</script>

<div class="overlay-container">
	<div class="dubs-character">
		<img src={`/${dubsStore.spriteFile}`} alt="Dubs" class="dubs-sprite" />

		<!-- <img src="dubs/dubs_barking_talking.gif" alt="Dubs the mascot" class="dubs-sprite" /> -->
	</div>

	{#if sessionStore.isActive && dubsStore.state !== 'dubs_sleeping' && currentMessage}
		<div class="thought-bubble">
			<p>{currentMessage}</p>
			<!-- <p>Hey! Get back to work! Hey! Get back to work! Hey! Get back to work!</p> -->
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
		position: relative;
	}

	.dubs-character {
		position: absolute;
		bottom: 20px;
		left: 20px;
		transition: 0.3s ease;
	}

	.dubs-character:hover {
		opacity: 0.2;
	}

	.dubs-sprite {
		width: 280px;
		object-fit: contain;
		image-rendering: pixelated;
		filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.3));
	}

	.thought-bubble {
		position: absolute;
		top: 20px;
		left: 20px;
		background: var(--bg-1);
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		animation: fadeInBounce 0.5s ease-out;
		max-width: 250px;
		text-align: center;
	}

	.thought-bubble p {
		margin: 0;
		font-weight: 500;
		color: var(--txt-1);
		line-height: 1.4;
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
		border-top: 10px solid var(--bg-1);
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
