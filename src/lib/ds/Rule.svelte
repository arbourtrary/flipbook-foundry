<script lang="ts">
	interface Props {
		axis?: 'h' | 'v';
	}

	let { axis = 'h' }: Props = $props();
</script>

{#if axis === 'h'}
	<hr class="r r-h" />
{:else}
	<span class="r r-v" aria-hidden="true"></span>
{/if}

<style>
	.r {
		background: var(--rule);
		border: none;
		display: block;
	}
	.r-h {
		width: 100%;
		height: 1px;
	}
	.r-v {
		width: 1px;
		align-self: stretch;
	}
</style>
