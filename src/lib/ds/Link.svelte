<script lang="ts">
	import { base } from '$app/paths';
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		external?: boolean;
		children: Snippet;
	}

	let { href, external = false, children }: Props = $props();
	// Root-relative hrefs follow the site's base path.
	const to = $derived(href.startsWith('/') ? base + href : href);
</script>

<a
	href={to}
	class="lk"
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
>
	{@render children()}{#if external}<span class="ext" aria-hidden="true"> ↗</span>{/if}
</a>

<style>
	.lk {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
		transition: color var(--transition-fast);
	}
	.lk:hover {
		color: var(--accent);
	}
	.ext {
		display: inline-block;
		text-decoration: none;
	}
</style>
