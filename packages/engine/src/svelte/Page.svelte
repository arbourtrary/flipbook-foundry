<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Page, getLibrary, plainText, type Family, type PageOptions } from '../core';
	import { getConfig } from './context';

	// A paragraph laid out by pretext where {action} tokens are stick figures.
	let {
		family,
		class: cls = '',
		page = $bindable(null),
		...opts
	}: Omit<PageOptions, 'library'> & { family?: Family; class?: string; page?: Page | null } = $props();
	// svelte-ignore state_referenced_locally
	const library = getLibrary(family ?? getConfig().family);
	let canvas: HTMLCanvasElement;

	onMount(() => {
		// Page fetches the font chunks its figures need on its own.
		page = new Page(canvas, { ...opts, library });
		return () => page?.destroy();
	});

	// Re-typeset only when the text actually changes.
	let last = untrack(() => opts.text);
	$effect(() => {
		const t = opts.text;
		if (page && t !== last) {
			last = t;
			page.setText(t);
		}
	});
</script>

<canvas bind:this={canvas} class="flipbook-page {cls}" aria-hidden="true"></canvas>
<p class="flipbook-sr">{plainText(opts.text)}</p>

<style>
	canvas {
		display: block;
		width: 100%;
	}
	.flipbook-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
