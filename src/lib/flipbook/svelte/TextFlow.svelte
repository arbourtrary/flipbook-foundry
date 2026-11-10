<script lang="ts">
	import { onMount } from 'svelte';
	import { createTextFlow, type TextFlow, type Rect, type Stage } from '../core';
	import { getStage } from './context';

	interface Props {
		text: string;
		font: string;
		x?: number;
		y?: number;
		width: number;
		lineHeight: number;
		color?: string;
		/** Re-wrap around the Stage's figures every frame. */
		avoid?: boolean;
		padding?: number;
		/** Extra obstacles (stage px). */
		obstacles?: Rect[];
		flow?: TextFlow | null;
	}

	let {
		text,
		font,
		x = 0,
		y = 0,
		width,
		lineHeight,
		color,
		avoid = true,
		padding,
		obstacles = [],
		flow = $bindable(null)
	}: Props = $props();

	const handle = getStage();

	onMount(() => {
		if (!handle) throw new Error('[flipbook] <TextFlow> must be inside a <Stage>');
		let off: (() => void) | null = null;
		let raf = 0;
		const attach = (stage: Stage) => {
			const f = createTextFlow({ text, font, x, y, width, lineHeight, padding });
			flow = f;
			off = stage.onBeforeDraw((_, s) => {
				Object.assign(f.options, { x, y, width, lineHeight });
				if (f.options.text !== text) f.setText(text);
				const obs = avoid ? s.characters.map((c) => c.bounds()) : [];
				f.layout(obstacles.length ? obs.concat(obstacles) : obs);
				f.draw(s.ctx, color ?? s.options.color);
			});
		};
		// The stage may not exist yet (fonts loading); poll briefly.
		const wait = () => {
			if (handle.stage) attach(handle.stage);
			else raf = requestAnimationFrame(wait);
		};
		document.fonts.load(font).then(wait);
		return () => {
			cancelAnimationFrame(raf);
			off?.();
			flow?.destroy();
		};
	});
</script>
