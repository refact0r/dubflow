<script>
	import { sessionHistoryStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let allSessions = $state([]);
	let historyTooltip = $state(null); // { source: string, x: number, y: number }
	let showClearConfirm = $state(false);

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
	 * Format source name for display in tooltip
	 * @param {string} source - Source identifier
	 * @returns {string} Formatted source name
	 */
	function formatSourceName(source) {
		if (!source) return 'Unknown';

		const sourceMap = {
			window_tracker: 'Digital Distraction',
			eye_tracker: 'Physical Distraction',
			session_start: 'Session Start',
			refocus: 'Refocus',
			emergency_stop: 'Emergency Stop'
		};

		return sourceMap[source] || source.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	/**
	 * Handle mouse enter on distracted segment
	 * @param {MouseEvent} event - Mouse event
	 * @param {string} source - Distraction source
	 */
	function handleSegmentMouseEnter(event, source) {
		if (!source) return;

		const rect = event.currentTarget.getBoundingClientRect();
		historyTooltip = {
			source: formatSourceName(source),
			x: rect.left + rect.width / 2,
			y: rect.top
		};
	}

	/**
	 * Handle mouse leave on segment
	 */
	function handleSegmentMouseLeave() {
		historyTooltip = null;
	}

	/**
	 * Get timeline segments for a completed session
	 * @param {Object} session - Completed session object
	 * @returns {Array} Array of segments with {state, widthPercent, source}
	 */
	function getHistorySegments(session) {
		const history = session.focusStateHistory;
		if (!history || history.length === 0) {
			return [{ state: 'focused', widthPercent: 100, source: null }];
		}

		const actualDuration = Math.floor((session.endTime - session.startTime) / 1000); // in seconds
		if (actualDuration <= 0) {
			return [{ state: 'focused', widthPercent: 100, source: null }];
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
				widthPercent: Math.max(0.1, widthPercent),
				source: event.source || null
			});
		}

		if (segments.length === 0) {
			return [{ state: 'focused', widthPercent: 100, source: null }];
		}

		return segments;
	}

	/**
	 * Handle clear history button click
	 */
	function handleClearHistory() {
		showClearConfirm = true;
	}

	/**
	 * Confirm clearing history
	 */
	async function confirmClearHistory() {
		await sessionHistoryStore.clearAllSessions();
		// Reload sessions for this page
		await loadAllSessions();
		showClearConfirm = false;
	}

	/**
	 * Cancel clearing history
	 */
	function cancelClearHistory() {
		showClearConfirm = false;
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
		<div class="header-row">
			<h2 class="page-title">Session History</h2>
			{#if allSessions.length > 0}
				<button class="text" onclick={handleClearHistory}> Clear History </button>
			{/if}
		</div>

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
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
								<div
									class="segment {segment.state} {segment.state === 'distracted' && segment.source
										? 'hoverable'
										: ''}"
									style="width: {segment.widthPercent}%;"
									onmouseenter={(e) =>
										segment.state === 'distracted' && segment.source
											? handleSegmentMouseEnter(e, segment.source)
											: null}
									onmouseleave={() =>
										segment.state === 'distracted' && segment.source
											? handleSegmentMouseLeave()
											: null}
									role={segment.state === 'distracted' && segment.source ? 'button' : undefined}
									tabindex={segment.state === 'distracted' && segment.source ? 0 : undefined}
								></div>
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
			<p>No sessions yet. Start your first session to track your focus!</p>
		{/if}
	</div>
</div>

<!-- Tooltip for history sessions - rendered outside container to avoid overflow clipping -->
{#if historyTooltip}
	<div class="tooltip" style="left: {historyTooltip.x}px; top: {historyTooltip.y}px;">
		{historyTooltip.source}
	</div>
{/if}

<!-- Confirmation dialog for clearing history -->
{#if showClearConfirm}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-backdrop" onclick={cancelClearHistory}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<h3 class="modal-title">Clear History?</h3>
			<p class="modal-message">
				This will permanently delete all session history. This action cannot be undone.
			</p>
			<div class="modal-buttons">
				<button class="text btn-cancel" onclick={cancelClearHistory}>Cancel</button>
				<button class="text" onclick={confirmClearHistory}>Clear All</button>
			</div>
		</div>
	</div>
{/if}

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
		margin: 0;
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

	.focus-bar .segment.hoverable {
		cursor: pointer;
	}

	.focus-bar .segment.hoverable:hover {
		background: var(--alt-2);
	}

	.tooltip {
		position: fixed;
		transform: translate(-50%, -100%);
		margin-top: -8px;
		padding: 0.5rem 0.75rem;
		background: var(--bg-1);
		border: 1px solid var(--txt-1);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: var(--txt-1);
		white-space: nowrap;
		pointer-events: none;
		z-index: 100;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

	/* Header with clear button */
	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
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
		border: 1px solid var(--txt-1);
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

	.modal-message {
		margin: 0 0 1rem 0;
		color: var(--txt-2);
		line-height: 1.5;
	}

	.modal-buttons {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.btn-cancel {
		background: var(--bg-1);
	}
</style>
