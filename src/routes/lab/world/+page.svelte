<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, getLibrary, wander, greet, type Character } from '$lib/flipbook/core';

	let canvas: HTMLCanvasElement;
	let stage: Stage | null = null;
	let stats = $state('');
	let population = $state(120);

	// Ruled-paper world: each rule is a ground line, nearer rules are bigger.
	const ROWS = 7;
	const rowY = (h: number, i: number) => h * 0.34 + (h * 0.62 * i) / (ROWS - 1);
	const rowSize = (i: number) => 30 + i * 8;

	const LETTERS = 'FLIPBOOK';
	const REACTIONS = ['cheer', 'victory', 'laugh', 'panic', 'flex', 'dance', 'trip', 'flip', 'jump'];

	function populate(n: number) {
		if (!stage) return;
		for (const c of [...stage.characters]) stage.remove(c);
		const lib = getLibrary();
		for (let i = 0; i < n; i++) {
			const row = Math.floor(Math.random() * ROWS);
			const c = stage.add({
				x: Math.random() * stage.width,
				y: rowY(stage.height, row),
				size: rowSize(row),
				facing: Math.random() < 0.5 ? 1 : -1,
				// Every tenth figure is a letter with legs.
				...(i % 10 === 0
					? { body: { char: LETTERS[(i / 10) % LETTERS.length], font: '700 10px Georgia' }, layer: 'limbs' as const }
					: {})
			});
			c.data.row = row;
			c.animate('idle', { phase: Math.random() });
			c.use(wander({ pause: [0.5, 5] }), greet());
			void lib;
		}
	}

	onMount(() => {
		let alive = true;
		getLibrary()
			.load(['regular', 'limbs'])
			.then(() => {
				if (!alive) return;
				stage = new Stage(canvas, { color: '#0f0f0e' });
				stage.onBeforeDraw((_, s) => {
					s.ctx.fillStyle = '#0f0f0e';
					for (let i = 0; i < ROWS; i++) s.ctx.fillRect(0, Math.round(rowY(s.height, i)), s.width, 1);
					s.ctx.font = `700 ${Math.round(s.height * 0.26)}px Georgia`;
					s.ctx.textAlign = 'left';
					s.ctx.fillText('Flipbook', 24, rowY(s.height, 0) - 4);
					s.ctx.textAlign = 'center';
				});
				stage.onUpdate((_, s) => {
					stats = `${s.stats.fps}fps · ${s.stats.characters} figures · ${s.stats.drawMs.toFixed(1)}ms draw`;
				});
				populate(population);
			});
		return () => {
			alive = false;
			stage?.destroy();
		};
	});

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

<main>
	<div class="bar">
		<span>{stats}</span>
		<span class="pop">
			{#each [40, 120, 600, 2000, 5000] as n}
				<button class:on={population === n} onclick={() => ((population = n), populate(n))}>{n}</button>
			{/each}
		</span>
	</div>
	<canvas bind:this={canvas} onpointerdown={poke}></canvas>
</main>

<style>
	main {
		background: var(--paper);
		color: var(--ink);
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.bar {
		display: flex;
		justify-content: space-between;
		padding: var(--space-3) var(--space-6);
		font: var(--size-14) var(--font-mono);
		border-bottom: var(--hairline);
	}
	button {
		font: inherit;
		border: var(--hairline);
		background: var(--paper);
		color: var(--ink);
		padding: 2px 8px;
		margin-left: 4px;
		border-radius: 0;
	}
	button.on {
		background: var(--ink);
		color: var(--paper);
	}
	canvas {
		flex: 1;
		width: 100%;
		display: block;
		cursor: pointer;
	}
</style>
