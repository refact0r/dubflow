<script>
	import SettingsIcon from '~icons/ph/gear-duotone';
	import HistoryIcon from '~icons/ph/clock-clockwise-duotone';

	let { children } = $props();
</script>

<div class="container">
	<nav class="nav">
		<a href="/" class="logo">Dubflow</a>
		<div class="nav-icons">
			<a href="/#/history" class="nav-icon"><HistoryIcon /></a>
			<a href="/#/settings" class="nav-icon"><SettingsIcon /></a>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.container {
		background-color: var(--bg-1);
		display: flex;
		flex-direction: column;
	}
	.container::before {
		content: '';
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		background: var(--txt-1);
		filter: url(#noiseFilter);
		opacity: 0.2;
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		z-index: 1;
	}

	.logo {
		margin: 0;
		font-family: 'PPMondwest', sans-serif;
		font-size: 2.5rem;
	}

	.nav-icons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.nav-icon {
		font-size: 1.5rem;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-icon:hover {
		opacity: 0.7;
	}

	main {
		flex: 1;
		z-index: 1;
		padding: 0rem 2rem 2rem 2rem;
	}
</style>
