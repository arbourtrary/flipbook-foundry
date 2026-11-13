<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, Figure } from 'flipbook-foundry/svelte';
	import type { Character, Stage as StageT } from 'flipbook-foundry';

	// The name, set in the site's sans, each letter standing on its own legs.
	// They hold still and breathe; every few seconds one of them does one
	// small thing. Pointing at a letter makes it hop; tapping it, flip.
	let { text = 'Flipbook Foundry' }: { text?: string } = $props();

	const FONT = '800 10px "Inter Tight", system-ui, sans-serif';
	const GESTURES = ['wave', 'shrug', 'salute', 'look-around', 'facepalm'];
	const EVERY = 3200;

	let width = $state(0);
	let ready = $state(false);
	let measure: ((ch: string, px: number) => number) | null = null;

	// The letter's font px per unit of figure size (from the idle pose's
	// pelvis-to-head height), the space between letters, and room at each
	// end for an arm reaching past the first or last letter.
	const PX_PER_SIZE = 0.66;
	const GAP = 0.04;
	const EDGE = 0.18;

	interface Placed {
		ch: string;
		x: number;
		w: number;
		row: number;
	}

	const layout = $derived.by(() => {
		if (!ready || !measure || width <= 0) return null;
		const m = measure;
		const words = text.split(' ');
		const span = (w: string, size: number) =>
			[...w].reduce((sum, ch) => sum + m(ch, size * PX_PER_SIZE) + size * GAP, 0) - size * GAP;
		const lineWidth = (ws: string[], size: number) =>
			ws.reduce((sum, w) => sum + span(w, size), 0) + size * 0.5 * (ws.length - 1);
		// One line if the letters stay big enough, else one word per row.
		let rows = [words];
		const fit = (ws: string[][]) => width / (Math.max(...ws.map((r) => lineWidth(r, 100) / 100)) + EDGE * 2);
		let size = Math.min(220, fit(rows));
		if (size < 120 && words.length > 1) {
			rows = words.map((w) => [w]);
			size = Math.min(200, fit(rows));
		}
		const placed: Placed[] = [];
		rows.forEach((ws, row) => {
			let x = size * EDGE;
			ws.forEach((w, wi) => {
				// The last letter already added its gap.
				if (wi) x += size * (0.5 - GAP);
				for (const ch of w) {
					const adv = m(ch, size * PX_PER_SIZE);
					placed.push({ ch, x: x + adv / 2, w: adv, row });
					x += adv + size * GAP;
				}
			});
		});
		return { placed, size, rows: rows.length };
	});

	// Room above for a flip, the figure, and its feet on the line.
	const rowH = $derived(layout ? layout.size * 1.02 : 0);
	const top = $derived(layout ? layout.size * 0.5 : 0);
	const height = $derived(layout ? Math.round(top + rowH * layout.rows) : 0);
	const key = $derived(layout ? `${Math.round(layout.size)}|${layout.placed.length}` : '');

	let stage: StageT | null = $state(null);
	let busy = new Set<Character>();

	function play(c: Character | null, action: string) {
		if (!c || busy.has(c)) return;
		busy.add(c);
		c.animate({ action, then: 'idle' }).then(() => busy.delete(c));
	}

	onMount(() => {
		const canvas = document.createElement('canvas').getContext('2d')!;
		measure = (ch, px) => {
			canvas.font = FONT.replace('10px', `${px}px`);
			return canvas.measureText(ch).width;
		};
		document.fonts.load(FONT.replace('10px', '100px')).then(() => (ready = true));

		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		// One letter at a time, never one of the last few.
		const recent: number[] = [];
		const timer = setInterval(() => {
			const characters = stage?.characters ?? [];
			const n = characters.length;
			if (!n || document.hidden) return;
			let i = Math.floor(Math.random() * n);
			for (let k = 0; k < n && (recent.includes(i) || busy.has(characters[i])); k++) i = (i + 1) % n;
			recent.push(i);
			if (recent.length > Math.min(4, n - 1)) recent.shift();
			play(characters[i], GESTURES[Math.floor(Math.random() * GESTURES.length)]);
		}, EVERY);
		return () => clearInterval(timer);
	});

	// The letter under the pointer: a letter is wider than its stick figure,
	// so pick by letter box rather than the Stage's hit test.
	function letterAt(e: PointerEvent): Character | null {
		if (!stage || !layout) return null;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - r.left;
		const row = Math.floor((e.clientY - r.top - top) / rowH);
		const i = layout.placed.findIndex((p) => p.row === row && Math.abs(p.x - x) <= p.w / 2 + layout.size * GAP * 0.5);
		return i >= 0 ? (stage.characters[i] ?? null) : null;
	}
	function onpointermove(e: PointerEvent) {
		if (e.pointerType !== 'touch') play(letterAt(e), 'jump');
	}
	function onpointerdown(e: PointerEvent) {
		const c = letterAt(e);
		if (!c) return;
		// A tap overrides a hover hop that's already under way.
		busy.delete(c);
		c.animate({ action: 'frontflip', then: 'idle' }).then(() => busy.delete(c));
		busy.add(c);
	}
</script>

<h1 class="sr">{text}</h1>
<div class="wordmark" bind:clientWidth={width} style="height: {height}px" aria-hidden="true">
	{#if layout}
		{#key key}
			<Stage layers={['limbs']} style="height: {height}px" bind:stage {onpointermove} {onpointerdown}>
				{#each layout.placed as p, i}
					<Figure
						animate="idle"
						body={{ char: p.ch, font: FONT, front: true }}
						x={p.x}
						y={Math.round(top + rowH * (p.row + 1) - layout.size * 0.06)}
						size={layout.size}
						transition={{ inPlace: true, phase: (i * 0.37) % 1 }}
					/>
				{/each}
			</Stage>
		{/key}
	{/if}
</div>

<style>
	.wordmark {
		width: 100%;
		cursor: default;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
