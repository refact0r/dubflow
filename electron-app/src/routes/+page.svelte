<script>
	import { onMount, onDestroy } from 'svelte';
	import { sessionStore, activeWindowStore, dubsStore } from '$lib/stores.svelte.js';

	let taskNameInput = $state('');
	let elapsedDisplay = $state('00:00');
	let timerInterval = null;

	// Format seconds to MM:SS
	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	}

	// Update timer display every second when active
	function startTimerDisplay() {
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (sessionStore.isActive) {
				elapsedDisplay = formatTime(sessionStore.currentElapsed);
			}
		}, 1000);
	}

	function handleStartSession() {
		if (taskNameInput.trim()) {
			sessionStore.start(taskNameInput);
			startTimerDisplay();
		}
	}

	function handleStopSession() {
		sessionStore.stop();
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function toggleOverlay() {
		dubsStore.toggleOverlay();
	}

	// Calculate focus percentage
	function getFocusPercentage() {
		if (sessionStore.currentElapsed === 0) return 100;
		return Math.round((sessionStore.focusTime / sessionStore.currentElapsed) * 100);
	}

	onMount(() => {
		// Initialize display
		elapsedDisplay = formatTime(sessionStore.currentElapsed);
		if (sessionStore.isActive) {
			startTimerDisplay();
		}
	});

	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});
</script>

<div class="dashboard">
	<header>
		<h1>🐕 LockInDubs</h1>
		<p class="subtitle">Your Focus Companion</p>
	</header>

	<main>
		<!-- Session Controls -->
		<section class="session-control">
			<h2>Focus Session</h2>

			{#if !sessionStore.isActive}
				<div class="start-session">
					<input
						type="text"
						bind:value={taskNameInput}
						placeholder="What are you working on?"
						class="task-input"
					/>
					<button onclick={handleStartSession} class="btn btn-primary"> Start Session </button>
				</div>
			{:else}
				<div class="active-session">
					<div class="task-info">
						<span class="task-label">Current Task:</span>
						<span class="task-name">{sessionStore.taskName}</span>
					</div>
					<div class="timer">{elapsedDisplay}</div>
					<button onclick={handleStopSession} class="btn btn-danger"> End Session </button>
				</div>
			{/if}
		</section>

		<!-- Active Window Display -->
		<section class="activity-monitor">
			<h2>Current Activity</h2>
			<div class="current-window">
				<div class="window-info">
					<span class="app-name">{activeWindowStore.appName}</span>
					{#if activeWindowStore.windowTitle}
						<span class="window-title">{activeWindowStore.windowTitle}</span>
					{/if}
					{#if activeWindowStore.url}
						<span class="window-url" title={activeWindowStore.url}>
							🌐 {new URL(activeWindowStore.url).hostname}
						</span>
					{/if}
				</div>
				<span class="productivity-badge" class:productive={activeWindowStore.isProductive}>
					{activeWindowStore.isProductive ? '✅ Productive' : '⚠️ Distraction'}
				</span>
			</div>

			{#if activeWindowStore.recentApps.length > 0}
				<div class="recent-apps">
					<h3>Recent Apps</h3>
					<ul>
						{#each activeWindowStore.recentApps as app}
							<li>
								<span class="app-icon">{app.isProductive ? '✅' : '⚠️'}</span>
								<span>{app.appName}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>

		<!-- Stats Display -->
		<section class="stats">
			<h2>Session Stats</h2>
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-value">{formatTime(sessionStore.currentElapsed)}</div>
					<div class="stat-label">Total Time</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{getFocusPercentage()}%</div>
					<div class="stat-label">Focus Rate</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{sessionStore.distractionCount}</div>
					<div class="stat-label">Distractions</div>
				</div>
			</div>
		</section>

		<!-- Dubs Controls -->
		<section class="dubs-controls">
			<h2>Dubs Controls</h2>
			<div class="controls-grid">
				<button onclick={toggleOverlay} class="btn">
					{dubsStore.overlayVisible ? 'Hide' : 'Show'} Overlay
				</button>
				<div class="dubs-state">
					<span>Current State:</span>
					<span class="state-badge">{dubsStore.state}</span>
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 2rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
	}

	.subtitle {
		margin: 0.5rem 0 0 0;
		opacity: 0.9;
		font-size: 1.1rem;
	}

	main {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	section {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 12px;
		padding: 1.5rem;
		color: #333;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		color: #667eea;
	}

	h3 {
		margin: 1rem 0 0.5rem 0;
		font-size: 1rem;
		color: #555;
	}

	/* Session Controls */
	.start-session {
		display: flex;
		gap: 1rem;
	}

	.task-input {
		flex: 1;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
	}

	.task-input:focus {
		outline: none;
		border-color: #667eea;
	}

	.active-session {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.task-info {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
	}

	.task-label {
		font-weight: 600;
		color: #666;
	}

	.task-name {
		font-size: 1.2rem;
		color: #333;
	}

	.timer {
		font-size: 3rem;
		font-weight: bold;
		color: #667eea;
		font-family: 'Monaco', monospace;
	}

	/* Buttons */
	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.btn-primary {
		background: #667eea;
		color: white;
	}

	.btn-primary:hover {
		background: #5568d3;
	}

	.btn-danger {
		background: #f56565;
		color: white;
	}

	.btn-danger:hover {
		background: #e53e3e;
	}

	/* Activity Monitor */
	.current-window {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f7fafc;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.window-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.app-name {
		font-weight: 600;
		font-size: 1.1rem;
	}

	.window-title {
		color: #666;
		font-size: 0.9rem;
	}

	.window-url {
		color: #4a90e2;
		font-size: 0.85rem;
		font-family: 'Monaco', monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 400px;
	}

	.productivity-badge {
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.productivity-badge.productive {
		background: #c6f6d5;
		color: #276749;
	}

	.productivity-badge:not(.productive) {
		background: #fed7d7;
		color: #742a2a;
	}

	.recent-apps ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.recent-apps li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #f7fafc;
		border-radius: 4px;
	}

	.app-icon {
		font-size: 0.9rem;
	}

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		text-align: center;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 8px;
		color: white;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.9rem;
		opacity: 0.9;
	}

	/* Dubs Controls */
	.controls-grid {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
	}

	.dubs-state {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.state-badge {
		padding: 0.5rem 1rem;
		background: #667eea;
		color: white;
		border-radius: 20px;
		font-weight: 600;
	}
</style>
