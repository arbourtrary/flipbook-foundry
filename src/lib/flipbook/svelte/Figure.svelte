<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Character,
		InlineFigure,
		gestures,
		getLibrary,
		type Definition,
		type Variants,
		type Transition,
		type Layer
	} from '../core';
	import { getStage, getConfig, prefersReducedMotion } from './context';

	interface Props {
		/** Action or variant to play. Changing it plays the new one. */
		animate?: Definition;
		/** Shown before `animate` starts; `false` skips straight to animate. */
		initial?: Definition | false;
		/** Played when the figure leaves a Stage. */
		exit?: Definition;
		variants?: Variants;
		transition?: Transition;
		whileHover?: Definition;
		whileTap?: Definition;
		x?: number;
		y?: number;
		size?: number;
		facing?: 1 | -1;
		layer?: Layer;
		color?: string;
		/** A letter in any font, standing in for the body. */
		body?: { char: string; font: string; color?: string };
		/** Inline only: let root motion move the element. */
		travel?: boolean;
		/** Stage only: a thing from the Things font in this figure's hand. */
		holding?: { thing: string; hand?: 'L' | 'R'; behind?: boolean; frame?: number; size?: number };
		character?: Character | null;
		onAnimationStart?: (action: string) => void;
		onAnimationComplete?: (action: string) => void;
		onEvent?: (event: string, action: string) => void;
		class?: string;
	}

	let {
		animate,
		initial,
		exit,
		variants,
		transition,
		whileHover,
		whileTap,
		x = 0,
		y = 0,
		size,
		facing = 1,
		layer,
		color,
		body,
		travel = false,
		holding,
		character = $bindable(null),
		onAnimationStart,
		onAnimationComplete,
		onEvent,
		class: cls = ''
	}: Props = $props();

	const stage = getStage();
	const config = getConfig();
	const reduced = prefersReducedMotion(config.reducedMotion);
	let el: HTMLSpanElement | undefined = $state();
	let inline: InlineFigure | null = null;

	const opts = untrack(() => ({
		x,
		y,
		size: size ?? config.size ?? (stage ? 32 : undefined),
		facing,
		layer: layer ?? config.layer ?? (body ? 'limbs' : 'regular'),
		color: color ?? config.color,
		body,
		variants,
		transition: { ...config.transition, ...transition },
		initial: reduced ? (animate ?? initial) : initial,
		animate: reduced ? undefined : animate
	}));

	// Stage figures exist immediately (the Stage queues them); inline ones
	// need their element first.
	if (stage) {
		character = new Character(opts);
		stage.attach(character);
	}

	onMount(() => {
		if (!stage && el) {
			inline = new InlineFigure(el, { ...opts, travel });
			character = inline.character;
			// Just this action's font chunk; others load when first shown.
			getLibrary().load([opts.layer as Layer], undefined, [inline.character.action.name]);
		}
		const c = character!;
		const offs: (() => void)[] = [];
		if (stage && holding) {
			const h = holding;
			const give = () => {
				if (!stage.stage) return void requestAnimationFrame(give);
				const t = stage.stage.addThing({ name: h.thing, frame: h.frame ?? 0, size: h.size ?? c.size });
				stage.stage.hold(t, c, h.hand ?? 'R', h.behind);
				offs.push(() => stage.stage?.removeThing(t));
			};
			give();
		}
		if (onAnimationStart) offs.push(c.on('start', (p) => onAnimationStart(p.action)));
		if (onAnimationComplete) offs.push(c.on('complete', (p) => onAnimationComplete(p.action)));
		if (onEvent) offs.push(c.on('frame', (p) => p.event && onEvent(p.event, p.action)));
		if (!stage && el && (whileHover || whileTap)) {
			offs.push(gestures(el, c, { whileHover, whileTap, rest: () => animate }));
		}
		return () => {
			offs.forEach((f) => f());
			if (stage) stage.detach(c, exit);
			inline?.destroy();
		};
	});

	// Prop → character sync. Only re-runs when that prop changes.
	let first = true;
	$effect(() => {
		const a = animate;
		if (first || reduced || a === undefined) return;
		untrack(() => character?.animate(a));
	});
	$effect(() => {
		const v = variants;
		if (character && v) character.variants = v;
	});
	$effect(() => {
		const px = x, py = y;
		if (first) return;
		untrack(() => {
			if (character) {
				character.x = px;
				character.y = py;
			}
		});
	});
	$effect(() => {
		const f = facing;
		if (!first && character) character.facing = f;
	});
	$effect(() => {
		first = false;
	});
</script>

{#if !stage}
	<span bind:this={el} class="flipbook-figure {cls}"></span>
{/if}

<style>
	.flipbook-figure {
		display: inline-block;
		line-height: 1;
		font-variant-ligatures: none;
		user-select: none;
	}
</style>
