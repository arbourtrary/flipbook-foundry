<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, createTextFlow, getLibrary, type Character, type Prop, type Thing } from '$lib/flipbook/core';

	// A thief peeks out from behind a wall, sneaks over with an empty sack,
	// and steals a sentence one letter at a time. The sentence is real text,
	// set right-aligned by pretext: every stolen letter is removed from the
	// text and the line re-flows toward the thief, like a conveyor belt.
	const SENTENCE = 'HAPPY HOLIDAYS, EVERYONE';
	const SIZE = 120;
	const H = 300;

	let canvas: HTMLCanvasElement;

	onMount(() => {
		let stage: Stage | null = null;
		let alive = true;
		const lib = getLibrary();
		// Prefer the purpose-made actions; fall back gracefully if not baked.
		const act = (...names: string[]) => names.find((n) => lib.has(n)) ?? 'idle';
		const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

		lib
			.load(['regular', 'things'])
			.then(() => document.fonts.load('700 54px Georgia'))
			.then(async () => {
				if (!alive) return;
				const ink = getComputedStyle(canvas).color;
				stage = new Stage(canvas, { color: ink });
				const s = stage;
				const ground = H - 36;
				const wallX = s.width - 110;
				const standX = wallX - 210; // where the thief works from
				let text = SENTENCE;
				const width = standX - 46 - 16;
				// Largest size (≤ 54px) at which the whole sentence fits on one line.
				const measure = document.createElement('canvas').getContext('2d')!;
				let px = 54;
				for (; px > 18; px -= 2) {
					measure.font = `700 ${px}px Georgia`;
					if (measure.measureText(SENTENCE).width < width - 8) break;
				}
				const FONT = `700 ${px}px Georgia`;
				const flow = createTextFlow({ text, font: FONT, x: 16, y: 0, width, lineHeight: px * 1.3, align: 'right' });
				// Sit the line on the ground.
				flow.layout();
				flow.options.y += ground - (flow.fragments[0]?.y ?? ground);

				s.onBeforeDraw((_, st) => {
					st.ctx.fillStyle = ink;
					st.ctx.fillRect(0, ground, st.width, 1);
					flow.layout();
					flow.draw(st.ctx, ink);
				});

				const wall: Thing = s.addThing({ name: 'wall', x: wallX, y: ground, size: SIZE, layer: 'front' });
				void wall;
				const sack: Thing = s.addThing({ name: 'sack', x: wallX + 70, y: ground, size: SIZE, layer: 'back' });
				const thief: Character = s.add({ x: wallX + 4, y: ground, size: SIZE, facing: -1 });

				const steal = () =>
					new Promise<void>((done) => {
						const letters = flow.glyphs();
						const last = letters[letters.length - 1];
						if (!last) return done();
						let prop: Prop | null = null;
						const offGrab = thief.on('grab', () => {
							// Lift the letter out of the text; pretext closes the gap.
							text = text.slice(0, last.index) + text.slice(last.index + 1);
							flow.setText(text.replace(/[\s,]+$/, ''));
							text = flow.options.text;
							prop = s.addProp({ text: last.char, font: FONT, x: last.x, y: last.y, attach: { to: thief, anchor: 'handR', dy: 18 } });
						});
						const offRelease = thief.on('release', () => {
							const p = prop;
							if (!p) return;
							const mouth: [number, number] = [sack.x, sack.y - (lib.thing('sack').grip[Math.round(sack.frame)][1] * sack.size) / 1000 + 20];
							s.fly(p, { to: mouth, height: 90, duration: 0.55, spin: 1.5 }).then(() => {
								s.removeProp(p);
								const stolen = SENTENCE.replace(/[\s,]/g, '').length - text.replace(/[\s,]/g, '').length;
								sack.frame = Math.min(11, Math.round((stolen / SENTENCE.replace(/[\s,]/g, '').length) * 11));
							});
						});
						thief.animate(act('scoop-toss', 'throw'), { inPlace: true }).then(() => {
							offGrab();
							offRelease();
							done();
						});
					});

				// The show, on a loop.
				while (alive) {
					thief.x = wallX + 4;
					thief.facing = -1;
					sack.frame = 0;
					s.hold(sack, thief, 'L', true);
					await thief.animate(act('peek-out', 'peek'), { inPlace: true });
					await thief.animate(act('peek-out', 'peek'), { inPlace: true });
					await thief.animate(act('rub-hands', 'idle'), { repeat: 2 });
					await thief.animate({ action: act('sneak-off', 'sneak'), x: standX });
					s.drop(sack);
					sack.x = standX + 70;
					thief.facing = -1;
					while (alive && flow.glyphs().length) await steal();
					await thief.animate(act('rub-hands', 'cheer'), { repeat: 1 });
					// Off with the loot.
					s.hold(sack, thief, 'R', true);
					await thief.animate({ action: act('drag', 'pull', 'walk'), x: wallX + 40 });
					s.drop(sack);
					sack.x = wallX + 70;
					await wait(1.2);
					// The village writes it all out again.
					text = '';
					for (const ch of SENTENCE) {
						if (!alive) return;
						text += ch;
						flow.setText(text);
						await wait(ch === ' ' ? 0.02 : 0.06);
					}
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
