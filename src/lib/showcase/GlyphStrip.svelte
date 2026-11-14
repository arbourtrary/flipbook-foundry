<script lang="ts">
	import { onMount } from 'svelte';
	import { getLibrary } from 'flipbook-foundry';

	// Every frame of an action, set as plain text. Select it, copy it — it's
	// just characters in a font.
	interface Props {
		action: string;
		size?: number;
	}
	let { action, size = 48 }: Props = $props();
	const lib = getLibrary();
	const a = $derived(lib.action(action));
	const text = $derived(Array.from({ length: a.frames }, (_, i) => lib.glyph(a, i)).join(''));
	const { family } = lib.css('regular');
	let ready = $state(false);
	// One line per action: shrink to fit the width, down to a floor, then
	// let the line scroll sideways rather than wrap.
	const MIN = 20;
	let el: HTMLParagraphElement;
	let fit: number | null = $state(null);
	function measure() {
		if (!el) return;
		const natural = (el.scrollWidth / (fit ?? size)) * size;
		fit = Math.max(MIN, Math.min(size, (size * el.clientWidth) / natural));
	}
	onMount(() => {
		lib.load(['regular']).then(() => {
			ready = true;
			requestAnimationFrame(measure);
		});
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

<p class="strip" bind:this={el} style="font-family: '{family}'; font-size: {fit ?? size}px; opacity: {ready ? 1 : 0}">{text}</p>
<p class="codes">
	{action} · U+{a.start.toString(16).toUpperCase()}–U+{(a.start + a.frames - 1).toString(16).toUpperCase()} · {a.frames} glyphs
</p>

<style>
	.strip {
		margin: 0;
		line-height: 1.1;
		white-space: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
		letter-spacing: -0.12em;
		transition: opacity 200ms;
	}
	.codes {
		margin: var(--space-2) 0 0;
		font: var(--size-12) var(--font-mono);
		color: var(--ink-2);
	}
</style>
