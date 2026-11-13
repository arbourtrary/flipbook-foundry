<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, createTextFlow, getLibrary, type Character } from 'flipbook-foundry';

	// A figure runs along the tops of the words, line by line, the way your
	// eye reads. pretext's word ledges are the ground. Long words trip it up.
	const copy =
		'Reading is a sport if you do it properly. You start at the top left, sprint along the line, and drop to the next ' +
		'one without slowing down. Short words are easy. Extraordinarily inconvenient, unnecessarily complicated words are ' +
		'another matter entirely, and anybody who tells you otherwise has never tried running across them at speed.';
	const FONT = '500 26px Georgia';
	const LH = 64;
	const SIZE = 52;
	const GAIT = 'sprint';
	const PACE = { speed: 1.3 };

	let canvas: HTMLCanvasElement;

	onMount(() => {
		let stage: Stage | null = null;
		let alive = true;
		getLibrary()
			.load(['regular'])
			.then(() => document.fonts.load(FONT))
			.then(() => {
				if (!alive) return;
				const ink = getComputedStyle(canvas).color;
				stage = new Stage(canvas, { color: ink });
				const s = stage;
				const flow = createTextFlow({ text: copy, font: FONT, x: 0, y: 30, width: s.width, lineHeight: LH });
				flow.layout();

				// Group word ledges by line.
				type Ledge = { x0: number; x1: number; y: number; text: string };
				let lines: Ledge[][] = [];
				const relayout = () => {
					flow.options.width = s.width;
					flow.layout();
					const byY = new Map<number, Ledge[]>();
					for (const l of flow.ledges()) {
						const key = Math.round(l.y);
						byY.set(key, [...(byY.get(key) ?? []), l]);
					}
					lines = [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([, ls]) => ls);
				};
				relayout();
				canvas.style.height = `${flow.height + 40}px`;
				s.resize();
				relayout();

				const runner: Character = s.add({ size: SIZE, x: lines[0][0].x0, y: lines[0][0].y });
				let line = 0;
				let busy = false;
				const tripped = new Set<string>();

				const nextLine = () => {
					busy = true;
					line = (line + 1) % lines.length;
					const start = lines[line][0];
					runner.x = start.x0;
					runner.y = start.y;
					runner.facing = 1;
					// `land` starts in the air: it reads as dropping onto the line.
					runner.animate('land', { inPlace: true }).then(() => {
						busy = false;
						runner.animate(GAIT, PACE);
					});
				};

				runner.animate(GAIT, PACE);
				s.onBeforeDraw((_, st) => flow.draw(st.ctx, ink));
				s.onUpdate(() => {
					if (busy) return;
					const ls = lines[line];
					if (!ls) return;
					const word = ls.find((w) => runner.x >= w.x0 - 4 && runner.x <= w.x1 + 4);
					if (word) runner.y = word.y;
					// Long words are hard going.
					const key = `${line}:${word?.x0}`;
					if (word && word.text.replace(/\W/g, '').length >= 11 && !tripped.has(key) && runner.x > (word.x0 + word.x1) / 2) {
						tripped.add(key);
						busy = true;
						runner.sequence(['trip', 'dust-off'].filter((a) => runner.library.has(a))).then(() => {
							busy = false;
							runner.animate(GAIT, PACE);
						});
						return;
					}
					if (runner.x > ls[ls.length - 1].x1 + 10) {
						if (line === lines.length - 1) tripped.clear();
						nextLine();
					}
				});
				new ResizeObserver(relayout).observe(canvas);
			});
		return () => {
			alive = false;
			stage?.destroy();
		};
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 360px;
		color: var(--ink);
	}
</style>
