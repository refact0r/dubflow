<script>
	import { onMount } from 'svelte';
	import { dubsStore, sessionStore } from '$lib/stores';

	let animationTimeout = null;
	let currentMessage = $state('');
	let isDogAwake = $state(false); // Track if dog is currently awake/barking

	const ANIMATION_DELAY = (3 / 7) * 1000; // Animation timing (~571ms)

	/**
	 * Handle distraction alert from main process
	 * @param {Object} alertPackage - Complete alert package with message, audio, etc.
	 */
	function handleDistractionAlert(alertPackage) {
		console.log('🚨 Distraction alert received:', alertPackage);

		// Clear any pending animations
		if (animationTimeout) clearTimeout(animationTimeout);

		// Store the AI-generated message
		currentMessage = alertPackage.message || 'Hey! Get back to work! 🎯';

		// Play waking up animation
		dubsStore.setState('dubs_waking_up');

		// Wait for animation to complete, then show barking state
		animationTimeout = setTimeout(() => {
			dubsStore.setState('dubs_heavy_bark');
			isDogAwake = true; // Mark dog as awake when it starts barking

			// Play audio if available
			if (alertPackage.audioData) {
				playAudio(alertPackage.audioData);
			}
		}, ANIMATION_DELAY);
	}

	/**
	 * Play audio from base64 data
	 * @param {string} base64Data - Base64 encoded audio data
	 */
	function playAudio(base64Data) {
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
		
		// Clear any pending animations
		if (animationTimeout) clearTimeout(animationTimeout);

		// Clear the current message
		currentMessage = '';

		// Only play sleep animation if dog was actually awake
		if (isDogAwake) {
			console.log('🐕 Dog was awake, playing sleep animation');
			// Play going to sleep animation
			dubsStore.setState('dubs_to_sleep');

			// Wait for animation to complete, then show sleeping state
			animationTimeout = setTimeout(() => {
				dubsStore.setState('dubs_sleeping');
				isDogAwake = false; // Mark dog as sleeping
			}, ANIMATION_DELAY);
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
			if (animationTimeout) clearTimeout(animationTimeout);

			// Only play sleep animation if dog was awake
			if (isDogAwake) {
				dubsStore.setState('dubs_to_sleep');
				animationTimeout = setTimeout(() => {
					dubsStore.setState('dubs_sleeping');
					isDogAwake = false;
				}, ANIMATION_DELAY);
			} else {
				dubsStore.setState('dubs_sleeping');
			}

			currentMessage = '';
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
		bottom: 0;
		left: 0;
		transition: 0.3s ease;
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
		background: white;
		padding: 0.75rem 1rem;
		border-radius: 20px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		animation: fadeInBounce 0.5s ease-out;
		max-width: 250px;
		text-align: center;
	}

	.thought-bubble p {
		margin: 0;
		font-weight: 600;
		color: #333;
		font-size: 0.9rem;
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
