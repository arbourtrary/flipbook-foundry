<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, getLibrary, type Library, type Transition, type Layer } from 'flipbook-foundry';

	interface Props {
		actions: string[];
		library?: Library;
		/** Font base URL for a variant library. */
		fontBase?: string;
		layer?: Layer;
		size?: number;
		height?: number;
		transition?: Transition;
		/** Seconds to rest between plays of a one-shot. */
		rest?: number;
	}

	let {
		actions,
		library,
		fontBase = '/fonts/',
		layer = 'regular',
		size = 48,
		height = 84,
		transition = {},
		rest = 0.6
	}: Props = $props();

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const lib = library ?? getLibrary();
		let stage: Stage | null = null;
		let alive = true;
		lib.load([layer], fontBase).then(() => {
			if (!alive) return;
			const ink = getComputedStyle(canvas).color;
			stage = new Stage(canvas, { library: lib, color: ink });
			const ground = height - 18;
			const slot = stage.width / actions.length;
			actions.forEach((name, i) => {
				const a = lib.action(name);
				const c = stage!.add({ x: slot * (i + 0.5), y: ground, size, layer, library: lib });
				c.data.home = c.x;
				c.data.slot = slot;
				c.animate(name, {
					...transition,
					route: false,
					phase: i / actions.length,
					...(a.loop ? {} : { repeat: Infinity, repeatDelay: rest })
				});
			});
			stage.onBeforeDraw((_, s) => {
				s.ctx.fillStyle = ink;
				s.ctx.fillRect(0, ground, s.width, 1);
			});
			stage.onUpdate((_, s) => {
				// Travelling figures wrap inside their own slot so the strip
				// never empties out.
				for (const c of s.characters) {
					const home = c.data.home as number;
					const half = (c.data.slot as number) / 2;
					if (c.x > home + half) c.x -= half * 2;
					if (c.x < home - half) c.x += half * 2;
				}
			});
		});
		return () => {
			alive = false;
			stage?.destroy();
		};
	});
</script>

<canvas bind:this={canvas} style="height: {height}px"></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		color: var(--ink);
	}
</style>
