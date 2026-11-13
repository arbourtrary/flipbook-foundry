<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, createTextFlow, getLibrary, type Character, type Prop } from 'flipbook-foundry';

	// An editor with an eraser walks up to a word that shouldn't be there and
	// scrubs it out, letter by letter. Wherever the eraser tip actually goes
	// on each frame, ink comes off the letter (cut out of the glyph itself,
	// not painted over). Then pretext closes the gap and the words slide up.
	interface Props {
		/** Figure size in px. Everything else scales from it. */
		size?: number;
		words?: string[];
		/** Index of the word to erase. */
		target?: number;
	}
	let { size = 120, words = ['THIS', 'IS', 'VERY', 'GOOD'], target = 2 }: Props = $props();

	let canvas: HTMLCanvasElement;
	const H = $derived(Math.round(size * 1.6));

	onMount(() => {
		let stage: Stage | null = null;
		let alive = true;
		const lib = getLibrary();
		const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
		const u = size / lib.unitsPerEm;
		let FONT = `700 ${Math.round(size * 0.9)}px Georgia`;

		lib
			.load(['regular', 'things'])
			.then(() => document.fonts.load(`700 ${size}px Georgia`))
			.then(async () => {
				if (!alive) return;
				const ink = getComputedStyle(canvas).color;
				stage = new Stage(canvas, { color: ink });
				const s = stage;
				const ground = s.height - size * 0.22;
				// Shrink the type until the sentence fits on one line.
				const m = document.createElement('canvas').getContext('2d')!;
				for (let px = Math.round(size * 0.9); px > 10; px -= 2) {
					FONT = `700 ${px}px Georgia`;
					m.font = FONT;
					if (m.measureText(words.join(' ')).width < s.width - size * 1.4) break;
				}
				const flow = createTextFlow({ text: words.join(' '), font: FONT, x: size * 0.9, y: 0, width: s.width - size, lineHeight: size * 1.3 });

				s.onBeforeDraw((_, st) => {
					st.ctx.fillStyle = ink;
					st.ctx.fillRect(0, ground, st.width, 1);
				});

				const editor: Character = s.add({ x: -size, y: ground, size, halo: true });
				const eraser = s.addThing({ name: 'eraser', size });
				s.hold(eraser, editor, 'R');

				// Where the rubber end of the eraser is right now (stage px).
				const tip = (): [number, number] => {
					const [hx, hy] = editor.anchor('handR');
					const a = (lib.forearm(editor.action, editor.frame, 'R') * Math.PI) / 180;
					return [hx + Math.cos(a) * 160 * u * editor.facing, hy - Math.sin(a) * 160 * u];
				};

				// Lay the sentence out with pretext, then turn every letter into
				// an object we can erase and slide.
				const layout = () => {
					flow.layout();
					flow.options.y += ground - (flow.fragments[0]?.y ?? ground);
					flow.layout();
					return flow.glyphs();
				};

				while (alive) {
					for (const p of [...s.props]) s.removeProp(p);
					flow.setText(words.join(' '));
					const glyphs = layout();
					// Map each glyph to its word.
					let wi = 0;
					let cursor = 0;
					const letters: { prop: Prop; word: number; g: (typeof glyphs)[number] }[] = [];
					for (const g of glyphs) {
						while (g.index >= cursor + words[wi].length + 1) cursor += words[wi++].length + 1;
						const prop = s.addProp({ text: g.char, font: FONT, x: g.x, y: g.y, align: 'left', erase: [], layer: 'back' });
						letters.push({ prop, word: wi, g });
					}
					const doomed = letters.filter((l) => l.word === target);

					// In with the eraser.
					editor.x = Math.max(-size, doomed[0].g.x - size * 3.2);
					editor.facing = 1;
					await editor.animate({ action: 'walk', x: doomed[0].g.x - 380 * u });

					for (const l of doomed) {
						if (!alive) return;
						const from = l.g.x - 330 * u;
						const to = l.g.x + l.g.width - 300 * u;
						if (Math.abs(editor.x - from) > 4) await editor.animate({ action: 'shuffle-step', x: from });
						editor.animate('erase');
						const offRub = editor.on('rub', () => {
							const [tx, ty] = tip();
							const crumb = s.addThing({ name: 'clod', x: tx, y: ty, size: size * 0.25 });
							s.fly(crumb, { to: [tx + (Math.random() - 0.3) * size * 0.4, ground], height: 6, duration: 0.35 }).then(() => s.removeThing(crumb));
						});
						// Scrub across the letter: the eraser takes ink wherever it touches.
						const t0 = performance.now();
						const D = 2400;
						await new Promise<void>((done) => {
							const off = s.onUpdate(() => {
								const k = Math.min(1, (performance.now() - t0) / D);
								editor.x = from + (to - from) * (0.5 - Math.cos(Math.PI * k) / 2);
								const [tx, ty] = tip();
								const dx = tx - l.prop.x;
								const dy = ty - l.prop.y;
								if (dx > -size * 0.3 && dx < l.g.width + size * 0.3) l.prop.erase!.push([dx, dy, 58 * u]);
								if (k >= 1) {
									off();
									done();
								}
							});
						});
						offRub();
						s.removeProp(l.prop);
					}

					// Step back, admire, and let the sentence close up.
					await editor.animate({ action: 'backpedal', x: editor.x - size * 0.6 });
					editor.facing = 1;
					await editor.animate('dust-off');
					flow.setText(words.filter((_, i) => i !== target).join(' '));
					const after = layout();
					const rest = letters.filter((l) => l.word !== target);
					rest.forEach((l, i) => s.fly(l.prop, { to: [after[i].x, after[i].y], height: 0, duration: 0.5 }));
					await editor.animate('victory');
					await wait(1.6);
					await editor.animate({ action: 'walk', x: s.width + size });
					await wait(0.8);
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
