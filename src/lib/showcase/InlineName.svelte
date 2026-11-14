<script lang="ts">
	import { onMount } from 'svelte';
	import { Figure } from 'flipbook-foundry/svelte';
	import type { Character } from 'flipbook-foundry';

	// The name in plain type, with one stick figure set in the line as a
	// glyph. It plays `entrance` once as the page appears, then rests.
	// Pointing at it plays `hover`.
	let {
		where = 'end',
		entrance,
		rest = 'idle',
		hover,
		facing = 1,
		travel = false,
		loop,
		restFor = 4
	}: {
		where?: 'between' | 'end' | 'start';
		entrance?: string;
		rest?: string;
		hover?: string;
		facing?: 1 | -1;
		travel?: boolean;
		/** Actions played in order after the entrance, then rest `restFor` seconds and go again. */
		loop?: (string | { action: string; repeat: number })[];
		restFor?: number;
	} = $props();

	let character: Character | null = $state(null);
	let busy = false;

	function play(action: string) {
		if (!character || busy) return;
		busy = true;
		character.animate({ action, then: rest }, { repeat: 0 }).then(() => (busy = false));
	}

	const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

	// One pass: every step in order, each settling into the next, ending at rest.
	async function cycle(alive: () => boolean) {
		for (const step of loop!) {
			if (!alive() || !character) return;
			const { action, repeat } = typeof step === 'string' ? { action: step, repeat: 0 } : step;
			await character.animate(action, { repeat });
		}
		// Rest loops forever, so start it and move on rather than awaiting it.
		if (alive() && character) character.animate(rest);
	}

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let live = true;
		const alive = () => live;
		(async () => {
			await wait(0.25);
			if (!loop) return entrance && play(entrance);
			busy = true;
			if (entrance && character) await character.animate(entrance, { repeat: 0 });
			while (live) {
				await cycle(alive);
				await wait(restFor);
			}
		})();
		return () => (live = false);
	});
</script>

<div class="fit"><h1 class="name">
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
