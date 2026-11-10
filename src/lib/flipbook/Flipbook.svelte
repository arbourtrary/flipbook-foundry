<script lang="ts">
	import { subscribe, getAnimation } from './runtime';

	interface Props {
		animation: string;
		fps?: number;
		phase?: number;
		size?: string;
	}

	let { animation, fps = 12, phase, size }: Props = $props();

	let frames = $derived(getAnimation(animation));
	let frameIndex = $state(0);
	let current = $derived(frames[frameIndex % frames.length]);

	$effect(() => {
		const interval = 1000 / fps;
		const cycle = interval * frames.length;
		const offset = (phase ?? Math.random()) * cycle;
		let lastTick = performance.now() - offset;

		return subscribe((now) => {
			while (now - lastTick >= interval) {
				frameIndex++;
				lastTick += interval;
			}
		});
	});
</script>

<span
	class="flipbook"
	aria-hidden="true"
	style={size ? `font-size: ${size};` : undefined}
>{current}</span>

<style>
	.flipbook {
		font-family: var(--font-flipbook);
		font-feature-settings: normal;
		line-height: 1;
		display: inline-block;
		font-variant-ligatures: none;
	}
</style>
