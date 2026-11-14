<script lang="ts">
	import { base } from '$app/paths';
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'text';

	interface Props {
		variant?: Variant;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		href,
		type = 'button',
		disabled = false,
		onclick,
		children
	}: Props = $props();
	// Root-relative hrefs follow the site's base path.
	const to = $derived(href?.startsWith('/') ? base + href : href);
</script>

{#if href}
	<a class="b b-{variant}" href={to} aria-disabled={disabled || undefined}>
		{@render children()}
	</a>
{:else}
	<button class="b b-{variant}" {type} {disabled} {onclick}>
		{@render children()}
	</button>
{/if}

<style>
	.b {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-sans);
		font-size: var(--size-16);
		font-weight: var(--weight-medium);
		line-height: 1;
		border-radius: 0;
		transition: background-color var(--transition-fast), color var(--transition-fast);
		user-select: none;
		text-decoration: none;
	}
	.b:disabled,
	.b[aria-disabled='true'] {
		opacity: 0.4;
		pointer-events: none;
	}

	.b-primary {
		background: var(--ink);
		color: var(--paper);
		padding: var(--space-3) var(--space-6);
		border: 1px solid var(--ink);
	}
	.b-primary:hover {
		background: var(--paper);
		color: var(--ink);
	}

	.b-secondary {
		background: var(--paper);
		color: var(--ink);
		padding: var(--space-3) var(--space-6);
		border: 1px solid var(--ink);
	}
	.b-secondary:hover {
		background: var(--ink);
		color: var(--paper);
	}

	.b-text {
		background: none;
		color: var(--ink);
		padding: 0;
		border: none;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
	}
	.b-text:hover {
		color: var(--accent);
	}
</style>
