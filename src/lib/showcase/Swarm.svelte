<script lang="ts">
	// Two ways to swarm, kept side by side to compare.
	//  - 'page' (default): figures move into the page itself — on letters,
	//    rules, corners and code blocks — and scroll with it, then leave
	//    after a while or on a second press. See swarm-page.ts.
	//  - 'overlay': one press drops a crowd onto the viewport: hundreds of
	//    figures rain in, land, dance, flip and high-five, then bolt away
	//    from the button that summoned them. One canvas Stage over the
	//    viewport — every figure is a single fillText — torn down when
	//    they've gone.
	import { onDestroy } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { Stage, getLibrary, type Character, type FrameData } from 'flipbook-foundry';
	import { Button } from '$lib/ds';
	import { inhabit, type Inhabited } from './swarm-page';

	let { mode = 'page' }: { mode?: 'page' | 'overlay' } = $props();

	// Choreography, in seconds from the press.
	const DROP = 0.9; // last figure leaves the sky
	const FLEE = 3.3; // the scatter starts at the button
	const RIPPLE = 0.7; // ...and takes this long to reach the far corner
	const FADE = 4.7; // the overlay fades out
	const END = 5.2;

	const ACTS = ['dance', 'cheer', 'frontflip', 'backflip', 'clap', 'jump', 'wave', 'laugh', 'victory', 'flex', 'shrug', 'hop'];
	const LOOPS = new Set(['dance', 'cheer', 'clap', 'laugh', 'hop']);

	let running = $state(false);
	let stats = $state({ figures: 0, fps: 0 });
	let teardown: (() => void) | null = null;

	const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
	const rand = (a: number, b: number) => a + Math.random() * (b - a);

	interface Mind {
		ground: number;
		vy: number;
		dropAt: number;
		fleeAt: number;
		phase: 'wait' | 'fall' | 'act' | 'flee';
		partner?: Character;
		landed?: boolean;
		fived?: boolean;
	}
	const mind = (c: Character) => c.data as unknown as Mind;

	// Page mode: the first press moves them in, the second sends them off.
	let resident: Inhabited | null = null;
	let leaving = $state(false);
	async function inhabitPage() {
		if (resident) {
			leaving = true;
			resident.leave();
			return;
		}
		running = true;
		const library = getLibrary();
		await Promise.all([library.load(['regular']), library.loadAnchors(), document.fonts.ready]);
		resident = inhabit({
			library,
			root: document.querySelector('main') ?? document.body,
			reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
			onStats: (s) => (stats = { figures: s.figures, fps: s.fps || stats.fps }),
			onGone: () => {
				resident = null;
				running = false;
				leaving = false;
			}
		});
	}

	function press(e: MouseEvent) {
		if (mode === 'page') inhabitPage();
		else swarm(e);
	}

	async function swarm(e: MouseEvent) {
		if (running) return;
		running = true;
		const library = getLibrary();
		await library.load(['regular']);

		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const W = innerWidth;
		const H = innerHeight;
		const small = W < 640;
		// Crowd size follows the screen: ~500 on a laptop, ~180 on a phone.
		const count = reduced ? Math.min(80, Math.round((W * H) / 9000)) : Math.max(120, Math.min(700, Math.round((W * H) / 1800)));

		const canvas = document.createElement('canvas');
		canvas.className = 'flipbook-swarm';
		canvas.setAttribute('aria-hidden', 'true');
		canvas.style.cssText =
			'position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:1000;transition:opacity 400ms ease-out;';
		if (reduced) canvas.style.opacity = '0';
		document.body.appendChild(canvas);

		const ink = getComputedStyle(document.body).color;
		const stage = new Stage(canvas, { library, color: ink, pixelRatio: 2, paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#fafaf7' });

		// Where the scatter starts: the button that was pressed.
		const r = (e.currentTarget as HTMLElement | null)?.getBoundingClientRect();
		const bx = r ? r.left + r.width / 2 : W / 2;
		const by = r ? r.top + r.height / 2 : H / 2;
		const far = Math.max(Math.hypot(bx, by), Math.hypot(W - bx, by), Math.hypot(bx, H - by), Math.hypot(W - bx, H - by));

		// Ground lines spread down the viewport; nearer (lower) figures are
		// bigger. Sizes snap to a few steps: each size is its own font, and a
		// handful of fonts keeps the glyph cache warm (an unsnapped crowd runs
		// at a fraction of the frame rate).
		const sizeAt = (y: number) => {
			const t = y / H;
			return Math.round(((small ? 26 : 34) + t * (small ? 16 : 26)) / 8) * 8;
		};

		const add = (x: number, ground: number, facing: 1 | -1, dropAt: number) => {
			const size = sizeAt(ground);
			const c = stage.add({ x, y: ground, size, facing, halo: true, initial: 'idle' });
			c.data = { ground, vy: rand(0, 300), dropAt, fleeAt: 0, phase: 'wait' } satisfies Mind;
			// Lift it above the top edge until its turn.
			c.y = -size;
			const d = Math.hypot(x - bx, ground - by);
			mind(c).fleeAt = FLEE + (d / far) * RIPPLE + rand(0, 0.12);
			return c;
		};

		if (reduced) {
			// A still crowd that fades in, holds, and fades out.
			for (let i = 0; i < count; i++) {
				const ground = rand(H * 0.15, H * 0.98);
				const c = stage.add({ x: rand(16, W - 16), y: ground, size: sizeAt(ground), facing: Math.random() < 0.5 ? 1 : -1, halo: true });
				c.pose(pick(['cheer', 'wave', 'victory', 'flex', 'shrug']), 6);
			}
			requestAnimationFrame(() => (canvas.style.opacity = '1'));
		} else {
			let made = 0;
			// A share of the crowd arrives in pairs that land facing each other and high-five.
			while (made < count) {
				const ground = rand(H * 0.12, H * 0.99);
				const x = rand(12, W - 12);
				const dropAt = rand(0, DROP) * (0.4 + 0.6 * (ground / H));
				if (made + 2 <= count && Math.random() < 0.18) {
					const gap = sizeAt(ground) * 0.62;
					const a = add(x - gap / 2, ground, 1, dropAt);
					const b = add(x + gap / 2, ground, -1, dropAt);
					mind(a).partner = b;
					mind(b).partner = a;
					mind(b).vy = mind(a).vy;
					made += 2;
				} else {
					add(x, ground, Math.random() < 0.5 ? 1 : -1, dropAt);
					made++;
				}
			}
		}

		const perform = (c: Character) => {
			const m = mind(c);
			if (m.phase !== 'act') return;
			const act = pick(ACTS);
			c.animate(act, LOOPS.has(act) ? { repeat: 1, phase: Math.random() } : {}).then(() => perform(c));
		};

		const land = (c: Character) => {
			const m = mind(c);
			m.phase = 'act';
			m.landed = true;
			c.animate('land', { interrupt: 'cut' }).then(() => {
				if (m.phase !== 'act') return;
				const p = m.partner;
				if (p && mind(p).landed && mind(p).phase === 'act') {
					if (m.fived) return;
					m.fived = mind(p).fived = true;
					c.animate('high-five').then(() => perform(c));
					p.animate('high-five').then(() => perform(p));
				} else if (!p) perform(c);
				else if (!m.fived) c.animate('idle');
			});
		};

		const flee = (c: Character) => {
			const m = mind(c);
			m.phase = 'flee';
			c.y = m.ground;
			const dir = c.x >= bx ? 1 : -1;
			const off = dir > 0 ? W + 120 : -120;
			const roll = Math.random();
			const go = () => c.animate({ action: 'sprint', x: off, transition: { speed: 2.6, interrupt: 'cut' } });
			if (roll < 0.15) c.animate({ action: 'sneak-off', x: off, transition: { speed: 2.4, interrupt: 'cut' } });
			else if (roll < 0.25) {
				c.facing = dir as 1 | -1;
				c.animate('frontflip', { interrupt: 'cut', speed: 1.4 }).then(go);
			} else if (roll < 0.33) {
				c.facing = dir as 1 | -1;
				c.animate('tumble', { interrupt: 'cut', speed: 1.5 }).then(go);
			} else go();
		};

		const t0 = performance.now();
		const G = 3200; // px/s²
		const update = (data: FrameData) => {
			const t = (performance.now() - t0) / 1000;
			if (reduced) return;
			const dt = data.delta / 1000;
			for (const c of stage.characters) {
				const m = mind(c);
				if (m.phase === 'wait' && t >= m.dropAt) {
					m.phase = 'fall';
					c.animate('fall', { interrupt: 'cut', phase: Math.random() });
				}
				if (m.phase === 'fall') {
					m.vy += G * dt;
					c.y += m.vy * dt;
					if (c.y >= m.ground) {
						c.y = m.ground;
						land(c);
					}
				}
				if ((m.phase === 'act' || m.phase === 'fall') && t >= m.fleeAt) flee(c);
			}
		};
		const offUpdate = stage.onUpdate(update);

		const ticker = setInterval(() => {
			stats = { figures: stage.characters.length, fps: stage.stats.fps || stats.fps };
		}, 250);
		stats = { figures: stage.characters.length, fps: 60 };

		const timers = [
			setTimeout(() => (canvas.style.opacity = '0'), (reduced ? 2.2 : FADE) * 1000),
			setTimeout(() => teardown?.(), (reduced ? 2.7 : END) * 1000)
		];

		teardown = () => {
			timers.forEach(clearTimeout);
			clearInterval(ticker);
			offUpdate();
			stage.destroy();
			canvas.remove();
			teardown = null;
			running = false;
		};
	}

	// It lives in the layout, so a swarm must not outlive the page it measured.
	function clear() {
		teardown?.();
		resident?.destroy();
		resident = null;
		running = leaving = false;
	}
	beforeNavigate(clear);
	onDestroy(clear);
</script>

<span class="swarm">
	<Button variant="secondary" onclick={press} disabled={mode === 'page' ? leaving : running}
		>{mode === 'page' && running ? 'Shoo!' : 'Swarm!'}</Button
	>
	{#if running}
		<span class="stats" aria-live="off">{stats.figures} figures · {stats.fps} fps</span>
	{/if}
</span>

<style>
	/* Docked bottom-right so you can swarm from anywhere on any page. */
	.swarm {
		position: fixed;
		right: max(var(--space-4), env(safe-area-inset-right));
		bottom: max(var(--space-4), env(safe-area-inset-bottom));
		z-index: 1001;
	}
	.stats {
		position: fixed;
		left: var(--space-4);
		bottom: var(--space-4);
		z-index: 1001;
		padding: var(--space-1) var(--space-2);
		background: var(--paper);
		color: var(--ink);
		font: var(--weight-medium) var(--size-12) / 1 var(--font-mono);
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}
</style>
