<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, getLibrary, type Character, type Prop, type Thing } from '$lib/flipbook/core';

	// Composable props: the shovel is a glyph in the Things font, held in the
	// figure's right hand and turned with the forearm every frame. The hole
	// and the pile are Things too — each scoop is one frame deeper, each
	// toss one frame taller. Dig deep enough and something comes up.
	const WORD = 'TREASURE';
	const FONT = '800 40px "Inter Tight"';
	const SIZE = 120;
	const H = 320;

	let canvas: HTMLCanvasElement;

	onMount(() => {
		let stage: Stage | null = null;
		let alive = true;
		const lib = getLibrary();
		const act = (...names: string[]) => names.find((n) => lib.has(n)) ?? 'idle';
		const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

		lib
			.load(['regular', 'things'])
			.then(() => document.fonts.load(FONT))
			.then(async () => {
				if (!alive) return;
				const ink = getComputedStyle(canvas).color;
				stage = new Stage(canvas, { color: ink });
				const s = stage;
				const ground = H - 90;
				const u = SIZE / lib.unitsPerEm; // font units → px
				const digger: Character = s.add({ x: s.width * 0.38, y: ground, size: SIZE });
				const shovel: Thing = s.addThing({ name: 'shovel', size: SIZE });
				const hole: Thing = s.addThing({ name: 'hole', x: digger.x + 440 * u, y: ground, size: SIZE });
				const pile: Thing = s.addThing({ name: 'pile', x: digger.x - 330 * u, y: ground, size: SIZE });
				const letters: Prop[] = [];

				s.onBeforeDraw((_, st) => {
					st.ctx.fillStyle = ink;
					// The ground line, broken where the hole is.
					const w = (110 + (hole.frame / 11) * 420) * u * 0.5;
					st.ctx.fillRect(0, ground, hole.x - w, 1);
					st.ctx.fillRect(hole.x + w, ground, st.width, 1);
				});

				// Where the shovel blade is right now (stage px).
				const blade = (): [number, number] => {
					const [hx, hy] = digger.anchor('handR');
					const a = (lib.forearm(digger.action, digger.frame, 'R') * Math.PI) / 180;
					return [hx + Math.cos(a) * 440 * u * digger.facing, hy - Math.sin(a) * 440 * u];
				};

				digger.on('scoop', () => {
					hole.frame = Math.min(11, hole.frame + 1);
				});
				digger.on('toss', () => {
					const [bx, by] = blade();
					const clod = s.addThing({ name: 'clod', x: bx, y: by, size: SIZE * 0.8 });
					s.fly(clod, { to: [pile.x + (Math.random() - 0.5) * 30, ground - (pile.frame / 11) * 150 * u], height: 70, duration: 0.5 }).then(() => {
						s.removeThing(clod);
						pile.frame = Math.min(11, pile.frame + 1);
					});
				});

				while (alive) {
					hole.frame = 0;
					pile.frame = 0;
					for (const l of letters) s.removeProp(l);
					letters.length = 0;
					s.hold(shovel, digger, 'R');
					digger.animate(act('dig', 'push'), { inPlace: true });
					while (alive && hole.frame < 11) await wait(0.2);
					if (!alive) return;
					await wait(0.6);
					digger.animate(act('peek', 'look-around'), { inPlace: true });
					await wait(0.5);
					// Up it comes, a letter at a time, landing in a row.
					const startX = hole.x + 70;
					for (let i = 0; i < WORD.length; i++) {
						const p = s.addProp({ text: WORD[i], font: FONT, x: hole.x, y: ground + 10 });
						letters.push(p);
						s.fly(p, { to: [startX + i * 30, ground - 2], height: 120 + i * 10, duration: 0.7, spin: 1 }).then(() => (p.rotate = 0));
						await wait(0.18);
					}
					await wait(0.9);
					s.drop(shovel);
					shovel.layer = 'back';
					await digger.animate(act('victory', 'cheer'), { inPlace: true });
					await digger.animate(act('dust-off', 'idle'), { inPlace: true });
					await wait(1.5);
				}
			});
		return () => {
			alive = false;
			stage?.destroy();
		};
	});
</script>

<canvas bind:this={canvas} style="height: {H}px"></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		color: var(--ink);
	}
</style>
