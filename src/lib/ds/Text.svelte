<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'small' | 'mono';
	type Color = 'ink' | 'ink-2' | 'accent';
	type Align = 'left' | 'center' | 'right';

	interface Props {
		variant?: Variant;
		as?: keyof HTMLElementTagNameMap;
		color?: Color;
		align?: Align;
		children: Snippet;
	}

	let { variant = 'body', as, color = 'ink', align = 'left', children }: Props = $props();

	const defaultTag: Record<Variant, keyof HTMLElementTagNameMap> = {
		display: 'h1',
		title: 'h2',
		heading: 'h3',
		subheading: 'h4',
		body: 'p',
		small: 'small',
		mono: 'span'
	};

	const tag = $derived(as ?? defaultTag[variant]);
</script>

<svelte:element this={tag} class="t t-{variant} c-{color} a-{align}">
	{@render children()}
</svelte:element>

<style>
	.t {
		font-family: var(--font-sans);
		font-weight: var(--weight-regular);
	}

	.t-display {
		font-size: var(--size-96);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
		letter-spacing: -0.02em;
	}
	.t-title {
		font-size: var(--size-64);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
		letter-spacing: -0.015em;
	}
	.t-heading {
		font-size: var(--size-40);
		font-weight: var(--weight-medium);
		line-height: var(--leading-snug);
		letter-spacing: -0.01em;
	}
	.t-subheading {
		font-size: var(--size-28);
		font-weight: var(--weight-medium);
		line-height: var(--leading-snug);
	}
	.t-body {
		font-size: var(--size-16);
		line-height: var(--leading-body);
	}
	.t-small {
		font-size: var(--size-14);
		line-height: var(--leading-body);
	}
	.t-mono {
		font-family: var(--font-mono);
		font-size: var(--size-14);
		line-height: var(--leading-body);
	}

	.c-ink { color: var(--ink); }
	.c-ink-2 { color: var(--ink-2); }
	.c-accent { color: var(--accent); }

	.a-left { text-align: left; }
	.a-center { text-align: center; }
	.a-right { text-align: right; }

	@media (max-width: 640px) {
		.t-display { font-size: var(--size-64); }
		.t-title { font-size: var(--size-40); }
		.t-heading { font-size: var(--size-28); }
	}
</style>
