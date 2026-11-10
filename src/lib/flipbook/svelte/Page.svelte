<script lang="ts">
	import { onMount } from 'svelte';
	import { Page, getLibrary, type PageOptions } from '../core';

	// A paragraph laid out by pretext where {action} tokens are stick figures.
	let { class: cls = '', ...opts }: Omit<PageOptions, 'library'> & { class?: string } = $props();
	let canvas: HTMLCanvasElement;
	let page: Page | null = null;

	onMount(() => {
		let alive = true;
		getLibrary()
			.load([opts.layer ?? 'regular'])
			.then(() => document.fonts.ready)
			.then(() => {
				if (alive) page = new Page(canvas, { ...opts });
			});
		return () => {
			alive = false;
			page?.destroy();
		};
	});

	$effect(() => {
		const t = opts.text;
		if (page && t !== undefined) page.setText(t);
	});
</script>

<canvas bind:this={canvas} class="flipbook-page {cls}"></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
	}
</style>
