<script lang="ts">
	// Two thieves run in, lift real letters out of this line of text, and run
	// off with them on their heads. The line is left with holes. Then they
	// tiptoe back, set each letter down in its slot, own up, and leave.
	//
	// The text stays DOM text the whole time: a stolen letter only turns
	// transparent, so the heading's accessible name, selection and copy are
	// always the full line. The figures and the carried letters are drawn on
	// a canvas laid over the page just for the show, then removed.
	//
	// It plays once, when the line has been fully in view for a moment: the
	// gag lands where the reader already is, with no extra control on the
	// page. Reduced motion: it doesn't play; the line is just the line.
	import { onMount } from 'svelte';
	import { Stage, getLibrary, type Character, type Prop } from 'flipbook-foundry';

	interface Props {
		text: string;
		/** Indices into `text` of the letters that get stolen, one thief each. */
		steal: number[];
	}
	let { text, steal }: Props = $props();

	const chars = $derived([...text]);
	let gone = $state<boolean[]>([]);
	let root: HTMLSpanElement;
	let spans: HTMLSpanElement[] = $state([]);
	let marks: HTMLElement[] = $state([]);

	// What each thief does once a letter is back in place.
	const SORRY = ['shrug', 'bow'];

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let alive = true;
		let started = false;
		let dwell: ReturnType<typeof setTimeout> | undefined;
		let teardown: (() => void) | null = null;

		const io = new IntersectionObserver(
			([e]) => {
				clearTimeout(dwell);
				if (!e.isIntersecting || started) return;
				dwell = setTimeout(() => {
					started = true;
					io.disconnect();
					void show();
				}, 500);
			},
			{ threshold: 1, rootMargin: '0px 0px -20% 0px' }
		);
		io.observe(root);

		async function show() {
			const lib = getLibrary();
			await lib.load(['regular']);
			await lib.loadAnchors();
			const cs = getComputedStyle(spans[0]);
			const FONT = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			await document.fonts.load(FONT);
			if (!alive) return;

			const F = parseFloat(cs.fontSize);
			const S = Math.round(F * 1.8); // figure size: a head taller than the caps
			const u = S / lib.unitsPerEm;
			const W = document.documentElement.clientWidth;

			// Each stolen letter's slot: centre x and baseline, in page px.
			const slots = steal.map((i) => {
				const r = spans[i].getBoundingClientRect();
				return { i, cx: r.left + r.width / 2, base: marks[i].getBoundingClientRect().bottom };
			});
			const top = Math.min(...slots.map((s) => s.base)) - S * 0.9 - F * 1.1;
			const bottom = Math.max(...slots.map((s) => s.base)) + 8;

			// One canvas over the page, in page coordinates, for this show only.
			const canvas = document.createElement('canvas');
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText = `position:absolute;left:0;top:${top + scrollY}px;width:${W}px;height:${bottom - top}px;pointer-events:none;z-index:1;`;
			document.body.appendChild(canvas);
			const ink = getComputedStyle(spans[0]).color;
			const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || undefined;
			const s = new Stage(canvas, { library: lib, color: ink, paper });
			const timers = new Set<ReturnType<typeof setTimeout>>();
			const wait = (sec: number) => new Promise<void>((r) => timers.add(setTimeout(r, sec * 1000)));

			let ended = false;
			const end = () => {
				if (ended) return;
				ended = true;
				alive = false;
				for (const t of timers) clearTimeout(t);
				removeEventListener('resize', end);
				s.destroy();
				canvas.remove();
				gone = [];
				teardown = null;
			};
			teardown = end;
			// Positions are measured once; if the page reflows mid-show, just put the line back.
			addEventListener('resize', end);

			// The lift: hands meet the letter on frame 10 ('grab'), overhead by the end.
			const lift = lib.action('lift');
			const [gx, gy] = lib.anchor(lift, 10, 'handR');
			const overhead = lib.anchor(lift, lift.frames - 1, 'handR')[1];

			// A carried letter rides the hands. Low, it sits exactly in its slot;
			// overhead, it sits on the hands; in between, it eases from one to the other.
			interface Load { prop: Prop; dx: number; dy: number }
			const loads = new Map<Character, Load>();
			s.onUpdate(() => {
				for (const [c, l] of loads) {
					const a = l.prop.attach;
					if (!a || a.anchor !== 'handR') continue;
					const hy = lib.anchor(c.action, c.frame, 'handR')[1];
					const k = 1 - Math.max(0, Math.min(1, (hy - gy) / (overhead - gy)));
					a.dx = l.dx * k;
					a.dy = l.dy * k;
				}
			});
			const toHands = (c: Character, slot: (typeof slots)[number], prop: Prop) => {
				// Offsets from the frame-10 hand to the slot, wherever the thief stands.
				const hx = c.x + gx * u * c.facing;
				const hy = c.y - gy * u;
				prop.attach = { to: c, anchor: 'handR' };
				loads.set(c, { prop, dx: slot.cx - hx, dy: slot.base - hy });
			};
			// On the head it stands on its lowest ink, so a j's tail doesn't pierce the skull.
			const measure = document.createElement('canvas').getContext('2d')!;
			measure.font = FONT;
			const toHead = (c: Character, prop: Prop) =>
				(prop.attach = { to: c, anchor: 'top', dx: 0, dy: -Math.max(0, measure.measureText(prop.text).actualBoundingBoxDescent) - 1 });

			// Step a figure through frames by hand (the lift, played backwards).
			const scrub = (c: Character, from: number, to: number, sec: number) =>
				new Promise<void>((done) => {
					const t0 = performance.now();
					const off = s.onUpdate(() => {
						const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
						c.pose('lift', Math.round(from + (to - from) * k));
						if (k >= 1) {
							off();
							done();
						}
					});
				});

			const offstage = -S * 0.7;
			const ground = (slot: (typeof slots)[number]) => slot.base - top;
			let away = 0;
			let allAway!: () => void;
			const everyoneAway = new Promise<void>((r) => (allAway = r));

			const thief = async (slot: (typeof slots)[number], n: number) => {
				const y = ground(slot);
				const cx = slot.cx;
				const sl = { ...slot, base: y };
				const stand = cx - gx * u; // where the hands land on the letter at frame 10
				const c = s.add({ x: offstage - n * S * 0.5, y, size: S, facing: 1, halo: true });

				await wait(n * 0.25);
				await c.animate({ action: 'run', x: stand }, { speed: 1.5 });
				if (!alive) return;
				await c.animate('rub-hands', { repeat: 0 });
				if (!alive) return;

				// Grab: the DOM letter goes transparent and a drawn one takes its place.
				let prop: Prop | null = null;
				const offGrab = c.on('grab', () => {
					gone[slot.i] = true;
					prop = s.addProp({ text: chars[slot.i], font: FONT, x: cx, y, color: ink });
					toHands(c, sl, prop);
				});
				await c.animate('lift', { speed: 1.6 });
				offGrab();
				if (!alive || !prop) return;
				const p: Prop = prop;
				toHead(c, p);
				await c.animate({ action: 'run', x: -S }, { speed: 1.5 });
				if (!alive) return;
				if (++away === slots.length) allAway();
				await everyoneAway;
				await wait(0.15 + n * 0.1);
				if (!alive) return;

				// Sheepishly back, letter still on the head.
				await c.animate({ action: 'tiptoe', x: stand }, { speed: 4 });
				if (!alive) return;
				c.facing = 1;
				toHands(c, sl, p);
				await scrub(c, lift.frames - 1, 10, 0.55);
				if (!alive) return;
				// Set down: the real letter comes back and the drawn one goes.
				loads.delete(c);
				s.removeProp(p);
				gone[slot.i] = false;
				await scrub(c, 10, 0, 0.25);
				if (!alive) return;
				await c.animate(SORRY[n % SORRY.length]);
				if (!alive) return;
				await c.animate({ action: 'run', x: offstage - S }, { speed: 1.5 });
			};

			await Promise.all(slots.map((slot, n) => thief(slot, n)));
			end();
		}

		return () => {
			alive = false;
			clearTimeout(dwell);
			io.disconnect();
			teardown?.();
		};
	});
</script>

<!-- The thieves work this line; data-swarm-skip keeps the swarm off it. -->
<span class="line" data-swarm-skip bind:this={root}
	>{#each chars as ch, i}<span class="ch" class:gone={gone[i]} bind:this={spans[i]}
			>{ch}<i bind:this={marks[i]}></i></span
		>{/each}</span
>

<style>
	.ch.gone {
		color: transparent;
	}
	/* A zero-size inline box: its bottom edge is the baseline. */
	i {
		display: inline-block;
		width: 0;
		height: 0;
	}
</style>
