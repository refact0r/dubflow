<script>
	import { sessionStore } from '$lib/stores';

	const sessionDuration = 30 * 60; // 30 minutes in seconds for timeline display

	let showModal = $state(false);
	let modalTaskName = $state('');
	let modalDuration = $state(25); // Default to 25 minutes
	let displayTime = $state(0); // For smooth RAF updates
	let rafId = $state(null);

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	}

	function openModal() {
		modalTaskName = '';
		modalDuration = 25; // Reset to default
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function handleStartSession() {
		if (modalTaskName.trim() && modalDuration > 0) {
			sessionStore.start(modalTaskName, modalDuration);
			closeModal();
		}
	}

	function handlePauseSession() {
		sessionStore.pause();
	}

	function handleResumeSession() {
		sessionStore.resume();
	}

	function handleStopSession() {
		sessionStore.stop();
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			closeModal();
		} else if (event.key === 'Enter') {
			handleStartSession();
		}
	}

	function selectDuration(minutes) {
		modalDuration = minutes;
	}

	// RequestAnimationFrame loop for smooth timer updates and future Dubs animation management
	$effect(() => {
		if (sessionStore.isActive) {
			// Start RAF loop
			const animate = () => {
				// Update display time from session store
				displayTime = sessionStore.remainingTime;

				// TODO: Future Dubs animation management can be added here
				// This loop runs on every frame when session is active

				rafId = requestAnimationFrame(animate);
			};

			rafId = requestAnimationFrame(animate);

			// Cleanup function
			return () => {
				if (rafId) {
					cancelAnimationFrame(rafId);
					rafId = null;
				}
			};
		} else {
			// Session not active, display 00:00
			displayTime = 0;

			// Cleanup RAF if it's running
			if (rafId) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		}
	});
</script>

<div class="container">
	<div class="left">
		<div class="timer">
			<div class="time">{formatTime(displayTime)}</div>
			{#if !sessionStore.isActive}
				<div class="start-session">
					<button onclick={openModal} class="btn-start text"> Start Session </button>
				</div>
			{:else if sessionStore.isPaused}
				<div class="buttons">
					<button class="text" onclick={handleResumeSession}>Resume</button>
					<button class="text" onclick={handleStopSession}>End</button>
				</div>
			{:else}
				<div class="buttons">
					<button class="text" onclick={handlePauseSession}>Pause</button>
					<button class="text" onclick={handleStopSession}>End</button>
				</div>
			{/if}
		</div>
	</div>

	<div class="right">
		<h2 class="task-name">{sessionStore.taskName || 'No active task'}</h2>
		<div class="timeline">
			<div class="bar">
				<!-- Timeline visualization will be populated with real data later -->
				{#if sessionStore.isActive && sessionStore.duration > 0}
					<div
						class="indicator"
						style="left: {((sessionStore.duration - sessionStore.remainingTime) /
							sessionStore.duration) *
							100}%;"
					></div>
				{/if}
			</div>
			<div class="time-labels">
				<span class="time-label">00:00</span>
				<span class="time-label"
					>{sessionStore.duration > 0 ? formatTime(sessionStore.duration) : '00:00'}</span
				>
			</div>
		</div>
	</div>
</div>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeModal}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<h2 id="modal-title" class="modal-title">Start New Session</h2>

			<!-- Duration Selector -->
			<div class="duration-selector">
				<button
					class="duration-btn {modalDuration === 25 ? 'selected' : ''}"
					onclick={() => selectDuration(25)}
				>
					25 min
				</button>
				<button
					class="duration-btn {modalDuration === 45 ? 'selected' : ''}"
					onclick={() => selectDuration(45)}
				>
					45 min
				</button>
				<button
					class="duration-btn {modalDuration === 60 ? 'selected' : ''}"
					onclick={() => selectDuration(60)}
				>
					60 min
				</button>
			</div>

			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				bind:value={modalTaskName}
				placeholder="What are you working on?"
				class="task-input"
				onkeydown={handleKeydown}
				autofocus
			/>
			<div class="modal-buttons">
				<button onclick={closeModal} class="btn-cancel">Cancel</button>
				<button onclick={handleStartSession} class="btn-start" disabled={!modalTaskName.trim()}>
					Start
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.container {
		margin: 0 auto;
		display: flex;
		gap: 3rem;
	}

	.left {
		width: 100%;
		max-width: 18rem;
	}
	.right {
		width: 100%;
	}

	.timer {
		margin-bottom: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.task-name {
		margin: 1rem 0 2rem 0;
		font-size: 2rem;
		font-weight: 500;
	}

	.time {
		font-size: 8rem;
		font-family: 'PPMondwest', sans-serif;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	.buttons {
		display: flex;
		gap: 1rem;
	}

	.buttons button {
		width: 100%;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.time-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
	}

	.time-label {
		font-size: 1.25rem;
		font-variant-numeric: tabular-nums;
		color: var(--txt-2);
	}

	.bar {
		position: relative;
		height: 2rem;
		background: var(--bg-2);
	}

	.indicator {
		position: absolute;
		width: 2px;
		height: 100%;
		background: var(--txt-1);
		transform: translateX(-50%);
	}

	.start-session {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: var(--bg-1);
		border: 2px solid var(--bg-2);
		border-radius: 1rem;
		padding: 2rem;
		width: 90%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.modal-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 500;
		color: var(--txt-1);
	}

	/* Duration Selector */
	.duration-selector {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.duration-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		font-weight: 500;
		border: 2px solid var(--bg-2);
		background: transparent;
		color: var(--txt-1);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.duration-btn:hover {
		background: var(--bg-2);
	}

	.duration-btn.selected {
		background: var(--acc-1);
		border-color: var(--acc-1);
		color: var(--bg-1);
	}

	.task-input {
		padding: 0.75rem 1rem;
		font-size: 1rem;
		border: 2px solid var(--bg-2);
		background: var(--bg-1);
		color: var(--txt-1);
		border-radius: 0.5rem;
		font-family: inherit;
	}

	.task-input:focus {
		outline: none;
		border-color: var(--acc-1);
	}

	.modal-buttons {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.btn-cancel {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		border: 2px solid var(--bg-2);
		background: transparent;
		color: var(--txt-1);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.2s;
		font-family: inherit;
	}

	.btn-cancel:hover {
		background: var(--bg-2);
	}
</style>
