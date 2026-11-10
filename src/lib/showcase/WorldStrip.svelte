<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, getLibrary, wander, greet, type Character } from '$lib/flipbook/core';

	interface Props {
		rows?: number;
		population?: number;
		height?: number;
		title?: string;
		titleFont?: string;
	}
	let { rows = 5, population = 70, height = 520, title, titleFont = '700 {size}px Georgia' }: Props = $props();

	let canvas: HTMLCanvasElement;
	let stage: Stage | null = null;
	const REACTIONS = ['cheer', 'victory', 'laugh', 'flex', 'dance', 'flip', 'jump', 'trip'];

	onMount(() => {
		let alive = true;
		let ro: ResizeObserver | null = null;
		const top = 0.42;
		const rowY = (h: number, i: number) => h * top + ((h * (0.97 - top)) * i) / Math.max(1, rows - 1);
		const rowSize = (i: number) => 30 + i * (44 / Math.max(1, rows - 1));
		getLibrary()
			.load(['regular'])
			.then(() => {
				if (!alive) return;
				const ink = getComputedStyle(canvas).color;
				stage = new Stage(canvas, { color: ink });
				stage.onBeforeDraw((_, s) => {
					s.ctx.fillStyle = ink;
					for (let i = 0; i < rows; i++) s.ctx.fillRect(0, Math.round(rowY(s.height, i)), s.width, 1);
					if (title) {
						const size = Math.min(s.height * 0.34, s.width * 0.2);
						s.ctx.font = titleFont.replace('{size}', String(Math.round(size)));
						s.ctx.textAlign = 'left';
						s.ctx.fillText(title, 0, rowY(s.height, 0) - size * 0.02);
						s.ctx.textAlign = 'center';
					}
				});
				for (let i = 0; i < population; i++) {
					const row = Math.floor(Math.random() * rows);
					stage
						.add({
							x: Math.random() * stage.width,
							y: rowY(stage.height, row),
							size: rowSize(row),
							facing: Math.random() < 0.5 ? 1 : -1
						})
						.use(wander({ pause: [0.5, 5] }), greet());
				}
				// Keep rows glued to the rules when the canvas resizes.
				ro = new ResizeObserver(() => {
					if (!stage) return;
					for (const c of stage.characters) {
						const row = Math.round(((c.size - 30) / 44) * Math.max(1, rows - 1));
						c.y = rowY(stage.height, row);
					}
				});
				ro.observe(canvas);
			});
		return () => {
			alive = false;
			ro?.disconnect();
			stage?.destroy();
			stage = null;
		};
	});

	// Poke a figure and it reacts, then goes back about its business.
	function poke(e: PointerEvent) {
		if (!stage) return;
		const [x, y] = stage.toStage(e.clientX, e.clientY);
		const c: Character | null = stage.hitTest(x, y);
		if (!c) return;
		const m = c.data.mind as { busy: boolean } | undefined;
		if (m) m.busy = true;
		c.animate(REACTIONS[Math.floor(Math.random() * REACTIONS.length)]).then(() => {
			if (m) m.busy = false;
		});
	}
</script>

<canvas bind:this={canvas} style="height: {height}px" onpointerdown={poke}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		color: var(--ink);
		cursor: pointer;
	}
</style>
