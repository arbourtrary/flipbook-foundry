<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="container">
	{@render children()}
</div>

<style>
	.container {
		width: 100%;
		max-width: var(--container);
		margin: 0 auto;
		padding-left: var(--column-gutter);
		padding-right: var(--column-gutter);
	}
</style>
