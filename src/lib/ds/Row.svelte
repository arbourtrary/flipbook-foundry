<script lang="ts">
	import type { Snippet } from 'svelte';

	type GapToken = '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '24';
	type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
	type Justify = 'start' | 'center' | 'end' | 'between';

	interface Props {
		gap?: GapToken;
		align?: Align;
		justify?: Justify;
		wrap?: boolean;
		children: Snippet;
	}

	let { gap = '4', align = 'center', justify = 'start', wrap = false, children }: Props = $props();
</script>

<div
	class="row"
	class:wrap
	style="--gap: var(--space-{gap}); --align: {alignMap(align)}; --justify: {justifyMap(justify)};"
>
	{@render children()}
</div>

<script lang="ts" module>
	function alignMap(a: 'start' | 'center' | 'end' | 'stretch' | 'baseline') {
		return a === 'start' ? 'flex-start' : a === 'end' ? 'flex-end' : a;
	}
	function justifyMap(j: 'start' | 'center' | 'end' | 'between') {
		return j === 'start'
			? 'flex-start'
			: j === 'end'
				? 'flex-end'
				: j === 'between'
					? 'space-between'
					: j;
	}
</script>

<style>
	.row {
		display: flex;
		flex-direction: row;
		gap: var(--gap);
		align-items: var(--align);
		justify-content: var(--justify);
	}
	.row.wrap {
		flex-wrap: wrap;
	}
</style>
