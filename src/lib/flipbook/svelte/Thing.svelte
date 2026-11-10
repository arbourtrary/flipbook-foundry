<script lang="ts">
	import { onMount } from 'svelte';
	import type { Thing } from '../core';
	import { getStage } from './context';

	// A prop or set piece from the Things font, standing on a Stage.
	interface Props {
		name: string;
		frame?: number;
		x?: number;
		y?: number;
		size?: number;
		facing?: 1 | -1;
		/** 'front' draws over figures (a wall to hide behind). */
		layer?: 'back' | 'front';
		thing?: Thing | null;
	}
	let { name, frame = 0, x = 0, y = 0, size = 64, facing = 1, layer = 'back', thing = $bindable(null) }: Props = $props();

	const handle = getStage();
	onMount(() => {
		if (!handle) throw new Error('[flipbook] <Thing> must be inside a <Stage>');
		let alive = true;
		const attach = () => {
			if (!alive) return;
			if (!handle.stage) return void requestAnimationFrame(attach);
			thing = handle.stage.addThing({ name, frame, x, y, size, facing, layer });
		};
		attach();
		return () => {
			alive = false;
			if (thing) handle.stage?.removeThing(thing);
		};
	});

	$effect(() => {
		if (!thing) return;
		Object.assign(thing, { frame, x, y, size, facing, layer });
	});
</script>
