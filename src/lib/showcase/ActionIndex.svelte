<script lang="ts">
	import { getLibrary } from '$lib/flipbook/core';
	import { Figure } from '$lib/flipbook/svelte';

	const ORDER = ['locomotion', 'aerial', 'pratfall', 'transition', 'idle', 'gesture', 'emote', 'interaction'];
	const lib = getLibrary();
	const groups = Object.entries(lib.byCategory()).sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
</script>

{#each groups as [cat, list]}
	<section>
		<h3>{cat} <span>{list.length}</span></h3>
		<div class="grid">
			{#each list as a (a.name)}
				<div class="cell" title={a.description}>
					<!-- Ledge actions hang below their baseline; lift them into the cell. -->
					<div class="fig" style:padding-bottom={a.floor ? '0' : '52px'}>
						<Figure animate={a.name} size={80} transition={a.loop ? {} : { repeat: Infinity, repeatDelay: 0.6 }} />
					</div>
					<code>{a.name}</code>
				</div>
			{/each}
		</div>
	</section>
{/each}

<style>
	section {
		margin-bottom: var(--space-8);
	}
	h3 {
		font: var(--weight-medium) var(--size-20) / 1.2 var(--font-sans);
		margin: 0 0 var(--space-3);
	}
	h3 span {
		font: var(--size-12) var(--font-mono);
		color: var(--ink-2);
		margin-left: var(--space-2);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
		border-top: var(--hairline);
		border-left: var(--hairline);
	}
	.cell {
		border-right: var(--hairline);
		border-bottom: var(--hairline);
		padding: var(--space-3) var(--space-2) var(--space-2);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}
	.fig {
		height: 104px;
		box-sizing: border-box;
		display: flex;
		align-items: flex-end;
		overflow: visible;
	}
	code {
		font: var(--size-12) var(--font-mono);
	}
</style>
