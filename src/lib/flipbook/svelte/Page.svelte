<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Page, type PageOptions } from '../core';

	// A paragraph laid out by pretext where {action} tokens are stick figures.
	let {
		class: cls = '',
		page = $bindable(null),
		...opts
	}: Omit<PageOptions, 'library'> & { class?: string; page?: Page | null } = $props();
	let canvas: HTMLCanvasElement;

	onMount(() => {
		// Page fetches the font chunks its figures need on its own.
		page = new Page(canvas, { ...opts });
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

<canvas bind:this={canvas} class="flipbook-page {cls}"></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
	}
</style>
