<script lang="ts">
	import { onMount } from 'svelte';
	import { Figure } from 'flipbook-foundry/svelte';
	import type { Character } from 'flipbook-foundry';
	import { perform, type Step } from './perform';

	// One inline figure that keeps performing; see perform.ts.
	let {
		size,
		entrance,
		loop,
		rest = 'idle'
	}: { size?: number; entrance?: string; loop: Step[]; rest?: string } = $props();

	let character: Character | null = $state(null);
	onMount(() => perform(() => character, { entrance, loop, rest }));
</script>

<Figure bind:character animate={rest} {size} />
