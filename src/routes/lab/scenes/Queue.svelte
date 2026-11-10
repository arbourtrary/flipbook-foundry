<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, getLibrary, type Character } from '$lib/flipbook/core';

	// A queue for the counter. Every few seconds the person at the front is
	// served and leaves; everyone shuffles up exactly one place (travel-to-x
	// stops on the spot); a newcomer joins at the back. While they wait,
	// they get impatient in their own ways.
	const FONT = '800 64px "Inter Tight"';
	const SIZE = 64;
	const GAP = 54;
	const N = 9;

	let canvas: HTMLCanvasElement;

	onMount(() => {
		let stage: Stage | null = null;
		let alive = true;
		let timer: ReturnType<typeof setInterval>;
		const lib = getLibrary();
		const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
		const WAITING = ['idle', 'tap-foot', 'look-around', 'yawn', 'sweat', 'huddle', 'fidget', 'shrug'].filter((a) => lib.has(a));

		lib
			.load(['regular'])
			.then(() => document.fonts.load(FONT))
			.then(() => {
				if (!alive) return;
				const ink = getComputedStyle(canvas).color;
				stage = new Stage(canvas, { color: ink });
				const s = stage;
				const ground = s.height - 24;
				const counterX = s.width - 150;
				const slot = (i: number) => counterX - 70 - i * GAP;

				s.onBeforeDraw((_, st) => {
					st.ctx.fillStyle = ink;
					st.ctx.fillRect(0, ground, st.width, 1);
					st.ctx.font = FONT;
					st.ctx.textAlign = 'left';
					st.ctx.fillText('NEXT', counterX - 20, ground);
				});

				const fidget = (c: Character) => c.animate(pick(WAITING), { repeat: Infinity, repeatDelay: 1 + Math.random() * 2 });
				const line: Character[] = [];
				for (let i = 0; i < N; i++) {
					const c = s.add({ x: slot(i), y: ground, size: SIZE });
					line.push(c);
					fidget(c);
				}

				const serve = () => {
					const front = line.shift();
					if (!front) return;
					// Served: a wave to the counter, then off the far side.
					front.sequence(['wave', { action: 'walk', x: s.width + 80 }]).then(() => s.remove(front));
					// Everyone moves up one place, a beat apart.
					line.forEach((c, i) =>
						setTimeout(() => c.animate({ action: 'walk', x: slot(i) }).then(() => fidget(c)), i * 160)
					);
					// Someone new joins at the back.
					const late = s.add({ x: -60, y: ground, size: SIZE });
					line.push(late);
					late.animate({ action: pick(['walk', 'jog', 'run']), x: slot(line.length - 1) }).then(() => fidget(late));
				};
				timer = setInterval(serve, 3800);
			});
		return () => {
			alive = false;
			clearInterval(timer);
			stage?.destroy();
		};
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 150px;
		color: var(--ink);
	}
</style>
