<script lang="ts">
	import { INSTALL } from '$lib/site';

	// One click copies the install line.
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;
	async function copy() {
		try {
			await navigator.clipboard.writeText(INSTALL);
		} catch {
			return;
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1600);
	}
</script>

<button class="install" onclick={copy} aria-label="Copy install command">
	<code>{INSTALL}</code>
	<span class="hint" aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
</button>

<style>
	.install {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--ink);
		color: var(--paper);
		border: 0;
		cursor: pointer;
		font: var(--weight-medium) var(--size-14) / 1 var(--font-mono);
		transition: opacity 120ms ease-out;
	}
	.install:active {
		opacity: 0.8;
	}
	.hint {
		opacity: 0.6;
		min-width: 6ch;
		text-align: right;
	}
</style>
