<script lang="ts">
	import { onMount } from 'svelte';
	import Flipbook from './Flipbook.svelte';
	import { layoutText, type FieldLayout } from './pretextLayout';

	interface Props {
		text: string;
		// A single animation applied to every glyph, or an array cycled through
		// by grapheme index for a mix of actions across the field.
		animation: string | string[];
		fps?: number;
		font?: string;
		lineHeight?: number;
		glyphSize?: string;
		phaseStep?: number;
		skipWhitespace?: boolean;
	}

	let {
		text,
		animation,
		fps = 8,
		font = '64px "Inter Tight"',
		lineHeight = 80,
		glyphSize,
		phaseStep = 0.13,
		skipWhitespace = true
	}: Props = $props();

	let animations = $derived(Array.isArray(animation) ? animation : [animation]);
	function pickAnimation(idx: number): string {
		return animations[idx % animations.length];
	}

	let container: HTMLDivElement;
	let width = $state(0);
	let layout = $state<FieldLayout>({
		positions: [],
		totalHeight: 0,
		totalWidth: 0,
		lineCount: 0
	});

	function relayout() {
		if (width <= 0) return;
		layout = layoutText(text, font, width, lineHeight);
	}

	$effect(() => {
		text;
		font;
		lineHeight;
		width;
		relayout();
	});

	onMount(() => {
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				width = e.contentRect.width;
			}
		});
		ro.observe(container);

		if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
			document.fonts.ready.then(() => relayout());
		}

		return () => ro.disconnect();
	});

	let visible = $derived(
		skipWhitespace
			? layout.positions.filter((p) => !/^\s+$/.test(p.grapheme))
			: layout.positions
	);

	let cellSize = $derived(glyphSize ?? `${Math.round(lineHeight * 0.9)}px`);
</script>

<div
	bind:this={container}
	class="field"
	role="img"
	aria-label={text}
	style="min-height: {layout.totalHeight}px;"
>
	{#each visible as p (p.index)}
		<span class="cell" style="left: {p.x}px; top: {p.y}px; width: {p.width}px;">
			<Flipbook
				animation={pickAnimation(p.index)}
				{fps}
				phase={p.index * phaseStep}
				size={cellSize}
			/>
		</span>
	{/each}
</div>

<style>
	.field {
		position: relative;
		width: 100%;
		line-height: 1;
	}
	.cell {
		position: absolute;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
</style>
