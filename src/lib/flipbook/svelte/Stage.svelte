<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Stage, getLibrary, type Layer, type FrameData } from '../core';
	import { StageHandle, setStage } from './context';

	interface Props {
		background?: string | null;
		color?: string;
		layers?: Layer[];
		pixelRatio?: number;
		depthSort?: boolean;
		class?: string;
		style?: string;
		stage?: Stage | null;
		onReady?: (stage: Stage) => void;
		onUpdate?: (data: FrameData, stage: Stage) => void;
		onBeforeDraw?: (data: FrameData, stage: Stage) => void;
		onAfterDraw?: (data: FrameData, stage: Stage) => void;
		onpointermove?: (e: PointerEvent) => void;
		onpointerdown?: (e: PointerEvent) => void;
		onpointerup?: (e: PointerEvent) => void;
		children?: Snippet;
	}

	let {
		background = null,
		color = 'currentColor',
		layers = ['regular'],
		pixelRatio = 2,
		depthSort = true,
		class: cls = '',
		style = '',
		stage = $bindable(null),
		onReady,
		onUpdate,
		onBeforeDraw,
		onAfterDraw,
		onpointermove,
		onpointerdown,
		onpointerup,
		children
	}: Props = $props();

	const handle = new StageHandle();
	setStage(handle);
	let canvas: HTMLCanvasElement;

	onMount(() => {
		let s: Stage | null = null;
		let cancelled = false;
		const offs: (() => void)[] = [];
		getLibrary()
			.load(layers)
			.then(() => {
				if (cancelled) return;
				const resolved = color === 'currentColor' ? getComputedStyle(canvas).color : color;
				s = new Stage(canvas, { background, color: resolved, pixelRatio, depthSort });
				if (onUpdate) offs.push(s.onUpdate(onUpdate));
				if (onBeforeDraw) offs.push(s.onBeforeDraw(onBeforeDraw));
				if (onAfterDraw) offs.push(s.onAfterDraw(onAfterDraw));
				handle.ready(s);
				stage = s;
				onReady?.(s);
			});
		return () => {
			cancelled = true;
			offs.forEach((f) => f());
			s?.destroy();
			stage = null;
		};
	});
</script>

<div class="flipbook-stage {cls}" {style}>
	<canvas bind:this={canvas} {onpointermove} {onpointerdown} {onpointerup}></canvas>
	{@render children?.()}
</div>

<style>
	.flipbook-stage {
		position: relative;
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
	}
</style>
