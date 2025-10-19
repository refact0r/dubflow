<script>
	let { children } = $props();
</script>

<div class="container">
	<nav class="nav">
		<h1 class="logo">dubflow</h1>
		<ul class="nav-links">
			<li><a href="/">Home</a></li>
			<li><a href="/#/settings">Settings</a></li>
		</ul>
	</nav>

	<main class="content">
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
		opacity: 0.3;
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem 1rem 1rem;
		z-index: 1;
	}

	.logo {
		margin: 0;
		font-family: 'PPMondwest', sans-serif;
		font-size: 2.5rem;
	}

	.nav-links {
		display: flex;
		list-style: none;
		gap: 2rem;
		margin: 0;
		padding: 0;
	}

	.nav-links a {
		text-decoration: none;
		color: var(--txt-1);
		font-weight: 600;
	}

	.content {
		flex: 1;
		z-index: 1;
		padding: 1rem;
	}
</style>
