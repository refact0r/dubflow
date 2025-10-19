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

	.timeline h2 {
		font-size: 1.2rem;
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
