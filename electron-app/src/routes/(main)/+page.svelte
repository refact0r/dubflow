<script>
	import { sessionStore } from '$lib/stores';

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
	let taskName = $state('Study unit 5 for the calculus midterm!');

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	}

	function handleStartSession() {
		sessionStore.start(taskName);
	}

	function handleStopSession() {
		sessionStore.stop();
	}
</script>

<div class="container">
	<div class="left">
		<div class="timer">
			<div class="time">12:34</div>
			<div class="buttons">
				<button class="text">Pause</button>
				<button class="text">End</button>
			</div>
		</div>
		{#if !sessionStore.isActive}
			<div class="start-session">
				<input
					type="text"
					bind:value={taskName}
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
				<button onclick={handleStopSession} class="btn btn-danger"> End Session </button>
			</div>
		{/if}
	</div>

	<div class="right">
		<h2 class="task-name">{taskName}</h2>
		<div class="timeline">
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
			<div class="time-labels">
				<span class="time-label">00:00</span>
				<span class="time-label">30:00</span>
			</div>
		</div>
	</div>
</div>

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

	.segment {
		position: absolute;
		height: 100%;
		/* border: 2px solid var(--txt-1); */
		/* border-radius: 0.5rem; */
	}

	.focus {
		background: var(--acc-1);
	}

	.distraction {
		background: var(--alt-1);
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
