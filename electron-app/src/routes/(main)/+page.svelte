<script>
	import { sessionStore } from '$lib/stores';

	const sessionDuration = 30 * 60; // 30 minutes in seconds for timeline display

	let showModal = $state(false);
	let modalTaskName = $state('');
	let modalDuration = $state(25); // Default to 25 minutes
	let displayTime = $state(0); // For smooth RAF updates
	let rafId = $state(null);
	let overlayVisible = $state(true); // Track overlay visibility state
	let audioEnabled = $state(true); // Track audio enabled state

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

	function toggleOverlay() {
		overlayVisible = !overlayVisible;
		if (window.electronAPI?.toggleOverlay) {
			window.electronAPI.toggleOverlay(overlayVisible);
		}
	}

	function toggleAudio() {
		audioEnabled = !audioEnabled;
		if (window.electronAPI?.setAudioEnabled) {
			window.electronAPI.setAudioEnabled(audioEnabled);
		}
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

		<div class="overlay-controls">
			<h3 class="controls-title">Dubs Settings</h3>
			<div class="control-group">
				<label class="control-label">
					<span>Dubs Overlay</span>
					<button class="toggle-btn text {overlayVisible ? 'active' : ''}" onclick={toggleOverlay}>
						{overlayVisible ? 'On' : 'Off'}
					</button>
				</label>
				<label class="control-label">
					<span>Dubs Audio</span>
					<button class="toggle-btn text {audioEnabled ? 'active' : ''}" onclick={toggleAudio}>
						{audioEnabled ? 'On' : 'Off'}
					</button>
				</label>
			</div>
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

		<!-- Daily Stats Section -->
		<div class="daily-stats">
			<h3 class="section-title">Today's Focus</h3>
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-value">2h 15m</div>
					<div class="stat-label">Total Time</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">4</div>
					<div class="stat-label">Sessions</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">87%</div>
					<div class="stat-label">Focus Score</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">3🔥</div>
					<div class="stat-label">Day Streak</div>
				</div>
			</div>
		</div>

		<!-- Session History Section -->
		<div class="session-history">
			<h3 class="section-title">Recent Sessions</h3>
			<div class="history-list">
				<div class="history-item">
					<div class="history-header">
						<div class="history-task">Complete project proposal</div>
						<div class="history-time">45 min</div>
					</div>
					<div class="history-footer">
						<div class="focus-bar">
							<div class="focus-fill" style="width: 92%"></div>
						</div>
						<div class="history-score">92% focus</div>
					</div>
				</div>
				<div class="history-item">
					<div class="history-header">
						<div class="history-task">Study for exam</div>
						<div class="history-time">25 min</div>
					</div>
					<div class="history-footer">
						<div class="focus-bar">
							<div class="focus-fill" style="width: 78%"></div>
						</div>
						<div class="history-score">78% focus</div>
					</div>
				</div>
				<div class="history-item">
					<div class="history-header">
						<div class="history-task">Code review</div>
						<div class="history-time">60 min</div>
					</div>
					<div class="history-footer">
						<div class="focus-bar">
							<div class="focus-fill" style="width: 95%"></div>
						</div>
						<div class="history-score">95% focus</div>
					</div>
				</div>
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

			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				bind:value={modalTaskName}
				placeholder="What are you working on?"
				class="task-input"
				onkeydown={handleKeydown}
				autofocus
			/>
			<div class="duration-selector">
				<button
					class="duration-btn text {modalDuration === 25 ? 'selected' : ''}"
					onclick={() => selectDuration(25)}
				>
					25 min
				</button>
				<button
					class="duration-btn text {modalDuration === 45 ? 'selected' : ''}"
					onclick={() => selectDuration(45)}
				>
					45 min
				</button>
				<button
					class="duration-btn text {modalDuration === 60 ? 'selected' : ''}"
					onclick={() => selectDuration(60)}
				>
					60 min
				</button>
			</div>
			<div class="modal-buttons">
				<button onclick={closeModal} class="btn-cancel text">Cancel</button>
				<button
					onclick={handleStartSession}
					class="btn-start text"
					disabled={!modalTaskName.trim()}
				>
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
		margin: 1rem 0 1rem 0;
		font-size: 3rem;
		font-family: 'PPMondwest', sans-serif;
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

	/* Overlay Controls */
	.overlay-controls {
		padding: 1.5rem;
		background: var(--bg-2);
		border-radius: 1.5rem;
		border: 2px solid var(--txt-1);
	}

	.controls-title {
		margin: 0 0 1rem 0;
		font-size: 2rem;
		font-family: 'PPMondwest', sans-serif;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.toggle-btn {
		min-width: 4rem;
		padding: 0.75rem 1rem;
	}

	.toggle-btn.active {
		background: var(--acc-1);
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
		border: 2px solid var(--txt-1);
		border-radius: 1.5rem;
		padding: 2rem;
		width: 90%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal-title {
		margin: 0 0 0.5rem 0;
		font-size: 3rem;
		font-family: 'PPMondwest', sans-serif;
	}

	/* Duration Selector */
	.duration-selector {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin: 0 0 1rem 0;
	}

	.duration-btn {
		flex: 1;
	}

	.duration-btn.selected {
		transform: translate(0px, 0px);
		box-shadow: 0px 0px 0px 0px var(--txt-1);
		background: var(--acc-2);
	}

	.task-input {
		padding: 1rem 1rem;
		font-size: 1rem;
		border: 2px solid var(--txt-1);
		background: var(--bg-1);
		color: var(--txt-1);
		border-radius: 1rem;
		font-family: inherit;
	}

	.task-input:focus {
		outline: none;
	}

	.modal-buttons {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.btn-cancel {
		background: var(--bg-1);
	}

	/* Daily Stats */
	.daily-stats {
		margin-top: 2rem;
	}

	.section-title {
		margin: 0 0 1rem 0;
		font-size: 2rem;
		font-family: 'PPMondwest', sans-serif;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.stat-card {
		padding: 1.5rem;
		background: var(--bg-2);
		border: 2px solid var(--txt-1);
		border-radius: 1rem;
		text-align: center;
	}

	.stat-value {
		font-size: 2rem;
		font-family: 'PPMondwest', sans-serif;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--txt-2);
	}

	/* Session History */
	.session-history {
		margin-top: 2rem;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.history-item {
		padding: 1.25rem;
		background: var(--bg-2);
		border: 2px solid var(--txt-1);
		border-radius: 1rem;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.history-task {
		font-size: 1.125rem;
	}

	.history-time {
		color: var(--txt-2);
	}

	.history-footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.focus-bar {
		flex: 1;
		height: 0.5rem;
		background: var(--bg-1);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.focus-fill {
		height: 100%;
		background: var(--acc-1);
		transition: width 0.3s ease;
	}

	.history-score {
		font-size: 0.875rem;
		color: var(--txt-2);
		min-width: 4rem;
		text-align: right;
	}
</style>
