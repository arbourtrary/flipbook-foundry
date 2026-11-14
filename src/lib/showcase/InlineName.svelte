<script lang="ts">
	import { onMount } from 'svelte';
	import { Figure } from 'flipbook-foundry/svelte';
	import type { Character } from 'flipbook-foundry';
	import { perform, type Step } from './perform';

	// The name in plain type, with one stick figure set in the line as a
	// glyph. It plays `entrance` as the page appears, then rests — or, given
	// a `loop`, keeps performing. Pointing at it plays `hover`.
	let {
		where = 'end',
		entrance,
		rest = 'idle',
		hover,
		facing = 1,
		travel = false,
		loop
	}: {
		where?: 'between' | 'end' | 'start';
		entrance?: string;
		rest?: string;
		hover?: string;
		facing?: 1 | -1;
		travel?: boolean;
		/** Keep performing after the entrance; see perform.ts. */
		loop?: Step[];
	} = $props();

	let character: Character | null = $state(null);
	let busy = false;

	function play(action: string) {
		if (!character || busy) return;
		busy = true;
		character.animate({ action, then: rest }, { repeat: 0 }).then(() => (busy = false));
	}

	onMount(() => {
		if (loop) return perform(() => character, { entrance, loop, rest });
		if (!entrance || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = setTimeout(() => play(entrance), 250);
		return () => clearTimeout(t);
	});
</script>

<!-- data-swarm-skip: figures on the title get cropped at the top of the page. -->
<div class="fit" data-swarm-skip><h1 class="name">
	{#if where === 'start'}<span class="fig" role="presentation" onpointerenter={() => hover && play(hover)}><Figure bind:character animate={rest} {facing} {travel} /></span>{/if}Flipbook{#if where === 'between'}<span class="fig mid" role="presentation" onpointerenter={() => hover && play(hover)}><Figure bind:character animate={rest} {facing} {travel} /></span>{:else}{' '}{/if}Foundry{#if where === 'end'}<span class="fig" role="presentation" onpointerenter={() => hover && play(hover)}><Figure bind:character animate={rest} {facing} {travel} /></span>{/if}
</h1></div>

<style>
	.fit {
		container-type: inline-size;
	}
	.name {
		font: 800 min(136px, 12cqi) / 1 var(--font-sans);
		letter-spacing: -0.035em;
		color: var(--ink);
		margin: 0;
		white-space: nowrap;
	}
	.fig {
		display: inline-block;
		font-size: 1.15em;
		vertical-align: -0.02em;
		letter-spacing: 0;
		margin-left: 0.02em;
	}
	.mid {
		margin: 0 0.14em 0 0.04em;
	}
</style>
