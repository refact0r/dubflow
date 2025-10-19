<script>
	// Mockup data
	const sessionDuration = 30 * 60; // 30 minutes in seconds
	const events = [
		{ type: 'focus', start: 0, duration: 300 },
		{ type: 'distraction', start: 300, duration: 120 },
		{ type: 'focus', start: 420, duration: 480 },
		{ type: 'distraction', start: 900, duration: 120 },
		{ type: 'focus', start: 1020, duration: 480 },
		{ type: 'current', start: 1500, duration: 150 }
	];

	let currentTime = $state(1650); // 27.5 minutes
	let taskName = $state('Deep work - Design mockups');

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	}
</script>

<<<<<<< HEAD
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
				<button onclick={() => dubsStore.emergencyStop()} class="btn btn-warning">
					🚨 Emergency Stop
				</button>
				<div class="dubs-state">
					<span>Current State:</span>
					<span class="state-badge">{dubsStore.state}</span>
				</div>
			</div>
		</section>
	</main>
=======
<div class="container">
	<div class="timer">
		<h1>{taskName}</h1>
		<div class="time">
			{formatTime(currentTime)} / {formatTime(sessionDuration)}
		</div>
		<div class="buttons">
			<button>Pause</button>
			<button>End</button>
		</div>
	</div>

	<div class="timeline">
		<h2>Timeline</h2>
		<div class="bar">
			{#each events as event}
				<div
					class="segment {event.type}"
					style="left: {(event.start / sessionDuration) * 100}%; width: {(event.duration /
						sessionDuration) *
						100}%;"
				></div>
			{/each}
			<div class="indicator" style="left: {(currentTime / sessionDuration) * 100}%;"></div>
		</div>
	</div>
>>>>>>> fe257f30c1380b79efc8aff14d24303137724160
</div>

<style>
	.container {
		padding: 2rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.timer {
		margin-bottom: 3rem;
		text-align: center;
	}

	.timer h1 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}

	.time {
		font-size: 3rem;
		font-weight: bold;
		margin: 1rem 0;
	}

	.buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 1rem;
	}

	button {
		padding: 0.5rem 1.5rem;
		border: 1px solid var(--txt-3);
		background: white;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background: var(--bg-2);
	}

<<<<<<< HEAD
	.btn-danger:hover {
		background: #e53e3e;
	}

	.btn-warning {
		background: #f6ad55;
		color: white;
	}

	.btn-warning:hover {
		background: #ed8936;
	}

	/* Activity Monitor */
	.current-window {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f7fafc;
		border-radius: 8px;
=======
	.timeline h2 {
		font-size: 1.2rem;
>>>>>>> fe257f30c1380b79efc8aff14d24303137724160
		margin-bottom: 1rem;
	}

	.bar {
		position: relative;
		height: 40px;
		background: var(--bg-2);
		border-radius: 4px;
	}

	.segment {
		position: absolute;
		height: 100%;
		border-radius: 4px;
	}

	.focus {
		background: #22c55e;
	}

	.distraction {
		background: #f59e0b;
	}

	.current {
		background: var(--acc-1);
	}

	.indicator {
		position: absolute;
		width: 2px;
		height: 100%;
		background: var(--txt-1);
		transform: translateX(-50%);
	}
</style>
