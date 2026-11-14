<script lang="ts">
	import { page } from '$app/state';
	import { Container, Stack, Text } from '$lib/ds';
	import Wordmark from '$lib/showcase/Wordmark.svelte';
	import HopOnce from './parts/HopOnce.svelte';
	import InlineName from './parts/InlineName.svelte';

	// Title lab: options for the homepage wordmark. ?v=<id> shows one.
	const OPTIONS = [
		{ id: 'today', label: 'Today', bet: 'Letters on legs, a random gesture every 3s.' },
		{ id: 'hop-once', label: 'Hop once', bet: 'Same letters on legs, one hop across the name on load, then the usual rest. No random gestures. Hover hops, tap flips.' },
		{ id: 'flip-between', label: 'Flip between', bet: 'Plain type. One figure stands between the words and does a single front flip on load.' },
		{ id: 'lean-on-it', label: 'Lean on it', bet: 'Plain type. One figure leans on the end of the name. Hover: it waves.' },
		{ id: 'cheer-at-end', label: 'Cheer at the end', bet: 'Plain type. One figure after the name cheers once on load, then stands. Hover: backflip.' }
	];
	const only = $derived(page.url.searchParams.get('v'));
	const shown = $derived(only ? OPTIONS.filter((o) => o.id === only) : OPTIONS);
</script>

<svelte:head><title>Title lab</title></svelte:head>

<main>
	<Container>
		<Stack gap="24">
			{#each shown as o (o.id)}
				<section id={o.id}>
					<Stack gap="4">
						<Text variant="small" color="ink-2"><a href="?v={o.id}">{o.label}</a> · {o.bet}</Text>
						{#if o.id === 'today'}
							<Wordmark />
						{:else if o.id === 'hop-once'}
							<HopOnce />
						{:else if o.id === 'flip-between'}
							<InlineName where="between" entrance="frontflip" loop={['wave', 'shrug', { action: 'clap', repeat: 1 }, 'bow']} />
						{:else if o.id === 'lean-on-it'}
							<InlineName where="end" rest="lean" facing={-1} hover="wave" />
						{:else if o.id === 'cheer-at-end'}
							<InlineName where="end" entrance="cheer" hover="backflip" />
						{/if}
					</Stack>
				</section>
			{/each}
		</Stack>
	</Container>
</main>

<style>
	main {
		padding: var(--space-12) 0;
	}
	a {
		color: inherit;
	}
</style>
