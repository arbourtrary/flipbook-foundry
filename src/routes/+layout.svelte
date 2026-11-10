<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/ds/tokens.css';
	import '$lib/ds/reset.css';
	import { FONT_VERSION } from '$lib/font/font-version';

	let { children } = $props();

	const fontFaceCss = `@font-face{font-family:'FoundrySans Stick';src:url('/fonts/flipbook.woff2?v=${FONT_VERSION}') format('woff2'),url('/fonts/flipbook.otf?v=${FONT_VERSION}') format('opentype');font-display:block;font-weight:400;font-style:normal}`;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://rsms.me/" />
	<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
	{@html `<style>${fontFaceCss}</style>`}
</svelte:head>

{@render children()}
