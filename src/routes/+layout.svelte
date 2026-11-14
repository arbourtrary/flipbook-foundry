<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/ds/tokens.css';
	import '$lib/ds/reset.css';
	import { setFontBase } from 'flipbook-foundry';
	import { base } from '$app/paths';

	// The site serves its own freshly baked fonts; the package defaults to jsDelivr.
	setFontBase(`${base}/fonts/`);

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<!-- The ds token --font-sans is Inter Tight; it was never actually loaded. -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

{@render children()}
