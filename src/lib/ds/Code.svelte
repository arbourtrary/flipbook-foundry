<script lang="ts">
	interface Props {
		code: string;
		label?: string;
	}
	let { code, label }: Props = $props();
</script>

<figure class="code">
	{#if label}<figcaption>{label}</figcaption>{/if}
	<pre><code>{code}</code></pre>
</figure>

<style>
	.code {
		margin: 0;
		border: var(--hairline);
		min-width: 0;
		max-width: 100%;
	}
	figcaption {
		font: var(--weight-medium) var(--size-12) / 1 var(--font-mono);
		padding: var(--space-2) var(--space-3);
		border-bottom: var(--hairline);
	}
	pre {
		margin: 0;
		padding: var(--space-4);
		overflow-x: auto;
		font: var(--size-14) / 1.55 var(--font-mono);
		tab-size: 2;
	}
</style>
