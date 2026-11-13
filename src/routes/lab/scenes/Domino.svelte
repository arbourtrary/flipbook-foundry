<script lang="ts">
	import { Page } from 'flipbook-foundry/svelte';
	import { getLibrary, type Page as PageT } from 'flipbook-foundry';

	// Topple is the domino fall; fall back to faceplant until it's baked.
	const FALL = getLibrary().has('topple') ? 'topple' : 'faceplant';
	const words = 'Tap the first one and watch what happens to every single person standing in this rather long and very unfortunate sentence'.split(' ');
	const text = words.map((w) => `${w} {idle|${FALL}}`).join(' ');

	let page: PageT | null = $state(null);
	let running = false;

	// Each figure falls a beat after the one before it, the beat stretched by
	// how far apart pretext set them — a line break is a longer gap.
	async function push() {
		if (!page || running) return;
		running = true;
		const figs = page.figures;
		let t = 0;
		figs.forEach((c, i) => {
			const prev = figs[i - 1];
			if (prev) {
				const dx = (c.data.pageX as number) - (prev.data.pageX as number);
				const dy = (c.data.pageY as number) - (prev.data.pageY as number);
				t += dy > 0 ? 0.35 : Math.max(0.08, dx / 900);
			}
			setTimeout(() => c.animate(FALL, { inPlace: true, repeat: 0 }), t * 1000);
		});
		// Everyone gets back up (get-up / rise are routed automatically).
		setTimeout(() => {
			figs.forEach((c, i) => setTimeout(() => c.animate('idle', { inPlace: true }), i * 60));
			setTimeout(() => (running = false), figs.length * 60 + 1500);
		}, (t + 2.5) * 1000);
	}
</script>

<button class="stage" onclick={push} aria-label="Push the first figure">
	<Page bind:page {text} font={'400 24px Georgia'} figureScale={1.4} lineHeight={44} />
</button>

<style>
	.stage {
		all: unset;
		display: block;
		width: 100%;
		cursor: pointer;
	}
</style>
