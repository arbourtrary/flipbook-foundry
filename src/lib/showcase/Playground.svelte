<script lang="ts">
	import { Page } from 'flipbook-foundry/svelte';

	let text = $state(
		'Type anything. Put an action in braces and it {wave} appears at text size: {jump}, {sneak}, {sit-idle}. Chain them with > like {sit-down>get-up}.'
	);
</script>

<div class="play">
	<textarea bind:value={text} rows="3" spellcheck="false" placeholder={'Bob {walk} went for a walk.'} aria-label="Text with {'{action}'} tokens"></textarea>
	<Page {text} font={'400 22px Georgia'} />
</div>

<style>
	.play {
		display: grid;
		gap: var(--space-6);
	}
	textarea {
		width: 100%;
		resize: vertical;
		padding: var(--space-3);
		border: var(--hairline);
		background: transparent;
		color: inherit;
		font: var(--size-14) / 1.55 var(--font-mono);
	}
	textarea:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: -1px;
	}
</style>
