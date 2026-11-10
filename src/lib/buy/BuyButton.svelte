<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/ds';

	const buyUrl = env.PUBLIC_LS_BUY_URL ?? '';
	const enabled = buyUrl.length > 0;

	onMount(() => {
		if (!enabled) return;
		const existing = document.querySelector(
			'script[src="https://app.lemonsqueezy.com/js/lemon.js"]'
		);
		if (existing) return;
		const s = document.createElement('script');
		s.src = 'https://app.lemonsqueezy.com/js/lemon.js';
		s.defer = true;
		document.head.appendChild(s);
	});

	function handleClick(e: MouseEvent) {
		if (!enabled) return;
		const ls = (window as unknown as { LemonSqueezy?: { Url: { Open: (u: string) => void } } })
			.LemonSqueezy;
		if (ls?.Url?.Open) {
			e.preventDefault();
			ls.Url.Open(buyUrl);
		}
	}
</script>

{#if enabled}
	<a class="ls-link" href={buyUrl} onclick={handleClick} target="_blank" rel="noopener">
		<span class="ls-button">Buy for $1</span>
	</a>
{:else}
	<Button variant="primary" disabled>
		{#snippet children()}Coming soon · $1{/snippet}
	</Button>
{/if}

<style>
	.ls-link {
		text-decoration: none;
		display: inline-block;
	}
	.ls-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--ink);
		color: var(--paper);
		border: 1px solid var(--ink);
		padding: var(--space-3) var(--space-6);
		font-family: var(--font-sans);
		font-size: var(--size-16);
		font-weight: var(--weight-medium);
		line-height: 1;
		border-radius: 0;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);
	}
	.ls-button:hover {
		background: var(--paper);
		color: var(--ink);
	}
</style>
