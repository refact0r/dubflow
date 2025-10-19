<script>
	import { onMount } from 'svelte';
	import { dubsStore, activeWindowStore, sessionStore } from '$lib/stores';

	let previousProductiveState = $state(true);
	let stateTimeout = null;

	// React to productivity changes
	$effect(() => {
		const isProductive = activeWindowStore.isProductive;
		const isActive = sessionStore.isActive;

		// Only react if session is active and state changed
		if (isActive && previousProductiveState !== isProductive) {
			if (stateTimeout) clearTimeout(stateTimeout);

			if (!isProductive) {
				// User got distracted
				dubsStore.setState('dubs_waking_up');

				// Transition to alert/barking after waking animation
				stateTimeout = setTimeout(() => {
					dubsStore.setState('dubs_light_bark');

					// Optionally escalate to barking if distraction continues
					stateTimeout = setTimeout(() => {
						if (!activeWindowStore.isProductive) {
							dubsStore.setState('dubs_heavy_bark');
						}
					}, 5000);
				}, 2000);
			} else {
				// User returned to focus
				dubsStore.setState('dubs_sleeping');
			}

			previousProductiveState = isProductive;
		} else if (!isActive) {
			// No active session, keep Dubs sleeping
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
			if (data.focused) {
				console.log('✅ User FOCUSED - Dubs sleeping');
				dubsStore.setState('dubs_sleeping');
			} else {
				console.log('⚠️ User UNFOCUSED - Dubs barking');
				dubsStore.setState('dubs_heavy_bark');
			}
		});

		console.log('✅ Python vision listener ready');

		// Clean up on unmount
		return () => {
			if (stateTimeout) clearTimeout(stateTimeout);
		};
	});
</script>

<div class="overlay-container">
	<div class="dubs-character">
		<img src={`/${dubsStore.spriteFile}`} alt="Dubs the mascot" class="dubs-sprite" />
	</div>

	{#if sessionStore.isActive && dubsStore.state !== 'dubs_sleeping'}
		<div class="thought-bubble">
			{#if dubsStore.state === 'dubs_light_bark'}
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
