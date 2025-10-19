<script>
	import { sessionHistoryStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let allSessions = $state([]);

	// Load all sessions on mount
	onMount(async () => {
		await loadAllSessions();
		// Ensure all-time stats are loaded
		await sessionHistoryStore.loadAllTimeStats();
	});

	async function loadAllSessions() {
		if (window.electronAPI) {
			// Load more sessions for history page (50 max)
			const sessions = await window.electronAPI.getSessionHistory(50);
			allSessions = sessions;
		}
	}

	/**
	 * Get timeline segments for a completed session
	 * @param {Object} session - Completed session object
	 * @returns {Array} Array of segments with {state, widthPercent}
	 */
	function getHistorySegments(session) {
		const history = session.focusStateHistory;
		if (!history || history.length === 0) {
			return [{ state: 'focused', widthPercent: 100 }];
		}

		const actualDuration = Math.floor((session.endTime - session.startTime) / 1000); // in seconds
		if (actualDuration <= 0) {
			return [{ state: 'focused', widthPercent: 100 }];
		}

		const segments = [];

		for (let i = 0; i < history.length; i++) {
			const event = history[i];
			const nextEvent = history[i + 1];

			const segmentStart = event.elapsedTime ?? 0;
			const segmentEnd = nextEvent ? (nextEvent.elapsedTime ?? 0) : actualDuration;

			const segmentDuration = segmentEnd - segmentStart;

			if (segmentDuration <= 0) {
				continue;
			}

			const widthPercent = (segmentDuration / actualDuration) * 100;

			segments.push({
				state: event.state,
				widthPercent: Math.max(0.1, widthPercent)
			});
		}

		if (segments.length === 0) {
			return [{ state: 'focused', widthPercent: 100 }];
		}

		return segments;
	}
</script>

<div class="container">
	<div class="left">
		<div class="stats-summary">
			<h2 class="stats-title">All Time</h2>
			<div class="stat-item">
				<div class="stat-label">Total Time</div>
				<div class="stat-value">
					{sessionHistoryStore.allTimeStats.totalTime > 0
						? sessionHistoryStore.formatDuration(sessionHistoryStore.allTimeStats.totalTime)
						: '0 min'}
				</div>
			</div>
			<div class="stat-item">
				<div class="stat-label">Sessions</div>
				<div class="stat-value">{sessionHistoryStore.allTimeStats.sessionCount}</div>
			</div>
			<div class="stat-item">
				<div class="stat-label">Avg. Focus</div>
				<div class="stat-value">
					{sessionHistoryStore.allTimeStats.averageFocusScore > 0
						? `${sessionHistoryStore.allTimeStats.averageFocusScore}%`
						: '--'}
				</div>
			</div>
		</div>
	</div>

	<div class="right">
		<h2 class="page-title">Session History</h2>

		{#if allSessions.length > 0}
			<div class="history-list">
				{#each allSessions as session (session.id)}
					<div class="history-item">
						<div class="history-header">
							<div class="history-task">{session.taskName}</div>
							<div class="history-score">{session.focusScore}%</div>
						</div>
						<div class="focus-bar">
							{#each getHistorySegments(session) as segment}
								<div class="segment {segment.state}" style="width: {segment.widthPercent}%;"></div>
							{/each}
						</div>
						<div class="history-footer">
							<div class="history-timestamp">
								{sessionHistoryStore.formatRelativeTime(session.completedAt)}
							</div>
							<div class="history-time">
								{sessionHistoryStore.formatDuration(
									Math.floor((session.endTime - session.startTime) / 1000)
								)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>No sessions yet. Start your first session to track your focus!</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.container {
		margin: 1rem 0 0 0;
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

	/* Left Column Stats */
	.stats-summary {
		padding: 1.5rem;
		background: var(--bg-2);
		border-radius: 1.5rem;
		border: 1px solid var(--txt-1);
		margin-top: 0.5rem;
	}

	.stats-title {
		margin: 0 0 1rem 0;
		font-size: 2rem;
		font-family: 'PPMondwest', sans-serif;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-top: 1px solid var(--txt-1);
	}

	.stat-item:first-of-type {
		border-top: none;
		padding-top: 0;
	}

	.stat-label {
		color: var(--txt-2);
	}

	.stat-value {
		font-family: 'PPMondwest', sans-serif;
		font-size: 1.25rem;
	}

	/* Page Title */
	.page-title {
		margin: 0 0 1.5rem 0;
		font-size: 3rem;
		font-family: 'PPMondwest', sans-serif;
	}

	/* History List */
	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.history-item {
		padding: 1.25rem;
		background: var(--bg-2);
		border: 1px solid var(--txt-1);
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

	.history-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.75rem;
	}

	.history-time {
		font-size: 0.875rem;
		color: var(--txt-2);
		text-align: right;
	}

	.focus-bar {
		width: 100%;
		height: 0.5rem;
		background: var(--bg-1);
		border: 1px solid var(--txt-1);
		border-radius: 0.25rem;
		overflow: hidden;
		display: flex;
		margin-top: 0.75rem;
	}

	.focus-bar .segment {
		height: 100%;
		border-right: 1px solid var(--txt-1);
	}

	.focus-bar .segment:last-child {
		border-right: none;
	}

	.focus-bar .segment.focused {
		background: var(--acc-1);
	}

	.focus-bar .segment.distracted {
		background: var(--alt-1);
	}

	.history-score {
		color: var(--txt-2);
	}

	.history-timestamp {
		font-size: 0.875rem;
		color: var(--txt-2);
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: var(--txt-2);
		background: var(--bg-2);
		border: 1px solid var(--txt-1);
		border-radius: 1rem;
	}

	.empty-state p {
		margin: 0;
	}
</style>
