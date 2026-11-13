<script lang="ts">
	import { onMount } from 'svelte';
	import { getLibrary } from 'flipbook-foundry';

	// Every frame of an action, set as plain text. Select it, copy it — it's
	// just characters in a font.
	interface Props {
		action: string;
		size?: number;
	}
	let { action, size = 48 }: Props = $props();
	const lib = getLibrary();
	const a = $derived(lib.action(action));
	const text = $derived(Array.from({ length: a.frames }, (_, i) => lib.glyph(a, i)).join(''));
	const { family } = lib.css('regular');
	let ready = $state(false);
	onMount(() => {
		lib.load(['regular']).then(() => (ready = true));
	});
</script>

<p class="strip" style="font-family: '{family}'; font-size: {size}px; opacity: {ready ? 1 : 0}">{text}</p>
<p class="codes">
	U+{a.start.toString(16).toUpperCase()}–U+{(a.start + a.frames - 1).toString(16).toUpperCase()} · {a.frames} glyphs
</p>

<style>
	.strip {
		margin: 0;
		line-height: 1.1;
		overflow-wrap: anywhere;
		word-break: break-all;
		letter-spacing: -0.12em;
		transition: opacity 200ms;
	}
	.codes {
		margin: var(--space-2) 0 0;
		font: var(--size-12) var(--font-mono);
		color: var(--ink-2);
	}
</style>
