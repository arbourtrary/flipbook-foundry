<script lang="ts">
	import { Stage, Figure } from 'flipbook-foundry/svelte';

	const FONTS = [
		{ label: 'Georgia', font: '700 10px Georgia' },
		{ label: 'Inter Tight', font: '800 10px "Inter Tight", system-ui' },
		{ label: 'Times italic', font: 'italic 400 10px "Times New Roman", serif' },
		{ label: 'Courier', font: '700 10px "Courier New", monospace' }
	];
	const ACTS = ['walk', 'wave', 'dance', 'jump', 'cheer', 'shrug', 'flex', 'bow', 'skip', 'laugh'];

	let word = $state('HELLO');
	let fontIndex = $state(0);
	let width = $state(800);
	const letters = $derived(word.replace(/\s+/g, '').slice(0, 10).split(''));
	const size = $derived(Math.min(180, (width / Math.max(letters.length, 4)) * 1.15));
	// Remount figures when the word or font changes.
	const key = $derived(`${word}|${fontIndex}|${Math.round(size)}`);
</script>

<div class="controls">
	<label>
		<span>Word</span>
		<input bind:value={word} maxlength="10" spellcheck="false" />
	</label>
	<div class="fonts">
		{#each FONTS as f, i}
			<button class:on={fontIndex === i} onclick={() => (fontIndex = i)}>{f.label}</button>
		{/each}
	</div>
</div>
<div bind:clientWidth={width}>
	{#key key}
		<Stage layers={['limbs']} style="height: {Math.round(size * 1.25)}px">
			{#each letters as ch, i}
				<Figure
					animate={ACTS[i % ACTS.length]}
					body={{ char: ch, font: FONTS[fontIndex].font }}
					x={(width / letters.length) * (i + 0.5)}
					y={Math.round(size * 1.08)}
					{size}
					transition={{ inPlace: true, phase: i / letters.length, repeat: Infinity, repeatDelay: 0.4 }}
				/>
			{/each}
		</Stage>
	{/key}
</div>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: end;
		margin-bottom: var(--space-4);
	}
	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font: var(--size-12) var(--font-mono);
	}
	input {
		font: var(--weight-medium) var(--size-20) var(--font-sans);
		border: var(--hairline);
		border-radius: 0;
		padding: var(--space-2) var(--space-3);
		background: var(--paper);
		color: var(--ink);
		width: 14ch;
	}
	.fonts button {
		font: var(--size-14) var(--font-sans);
		border: var(--hairline);
		border-radius: 0;
		background: var(--paper);
		color: var(--ink);
		padding: var(--space-2) var(--space-3);
		margin-right: -1px;
	}
	.fonts button.on {
		background: var(--ink);
		color: var(--paper);
	}
</style>
