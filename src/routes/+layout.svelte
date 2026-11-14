<script lang="ts">
	import favicon from '$lib/assets/favicon.png';
	import '$lib/ds/tokens.css';
	import '$lib/ds/reset.css';
	import { setFontBase } from 'flipbook-foundry';
	import { page } from '$app/state';
	import Swarm from '$lib/showcase/Swarm.svelte';
	import { SITE } from '$lib/site';
	import { onMount } from 'svelte';
	import { animateFavicon } from '$lib/favicon';
	import { base } from '$app/paths';

	// The site serves its own freshly baked fonts; the package defaults to jsDelivr.
	setFontBase(`${base}/fonts/`);

	let { children } = $props();

	// The tab icon backflips every few seconds; see favicon.ts.
	let icon: HTMLLinkElement;
	onMount(() => animateFavicon(icon));
</script>

<svelte:head>
	<link rel="icon" href={favicon} bind:this={icon} />
	<!-- Share card for every page; each page sets its own title and description. -->
	<link rel="canonical" href="{SITE}{page.url.pathname}" />
	<meta property="og:site_name" content="Flipbook Foundry" />
	<meta property="og:url" content="{SITE}{page.url.pathname}" />
	<meta property="og:image" content="{SITE}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Flipbook Foundry: a stick figure mid-backflip between the two words" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="{SITE}/og.png" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<!-- The ds token --font-sans is Inter Tight; it was never actually loaded. -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

{@render children()}

<!-- The lab has its own tools; everywhere else gets the swarm. -->
{#if !page.url.pathname.includes('/lab')}<Swarm />{/if}
