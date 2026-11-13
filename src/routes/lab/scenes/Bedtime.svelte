<script lang="ts">
	import { onMount } from 'svelte';
	import { Page } from 'flipbook-foundry/svelte';
	import type { Page as PageT } from 'flipbook-foundry';

	// As you scroll through, everyone in the story gets sleepier. Asking a
	// figure to `sleep` from standing routes through sit-down / lie-down on
	// its own; scrolling back up routes them back out of bed.
	const STAGES = ['idle', 'yawn', 'sit-idle', 'sleep'];
	const tok = `{${STAGES.join('|')}}`;
	const text =
		`It had been a long day. The baker ${tok} closed the shop. The postman ${tok} counted his last letters, ` +
		`and the twins ${tok} ${tok} argued about whose turn it was to turn off the light. Grandad ${tok} had been asleep for an hour ` +
		`already, but nobody had told him. Outside, the dog ${tok} watched the moon, and the moon ${tok} watched the dog.`;

	let page: PageT | null = $state(null);
	let host: HTMLDivElement;
	let stage = $state(0);

	onMount(() => {
		const onScroll = () => {
			const r = host.getBoundingClientRect();
			// 0 when the paragraph enters the bottom, 1 when it reaches the top.
			const p = 1 - (r.top + r.height / 2) / innerHeight;
			const next = Math.max(0, Math.min(STAGES.length - 1, Math.floor(p * 1.6 * STAGES.length)));
			if (next === stage || !page) return;
			stage = next;
			page.figures.forEach((c, i) =>
				setTimeout(() => c.animate(STAGES[next], { inPlace: true, ...(next === 1 ? { repeat: Infinity, repeatDelay: 1 } : {}) }), i * 180)
			);
		};
		addEventListener('scroll', onScroll, { passive: true });
		return () => removeEventListener('scroll', onScroll);
	});
</script>

<div bind:this={host}>
	<Page bind:page {text} font={'400 22px Georgia'} figureScale={1.4} lineHeight={42} />
	<p class="hint">{['Wide awake.', 'Yawning…', 'Sitting down.', 'Asleep. Scroll back up to wake them.'][stage]}</p>
</div>

<style>
	.hint {
		margin: var(--space-2) 0 0;
		font: italic var(--size-14) Georgia, serif;
		color: var(--ink-2);
	}
</style>
