<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Stack, Row, Rule, Text, Button } from '$lib/ds';
	import { createLibrary, getLibrary, type Library, type Manifest, type Transition } from '$lib/flipbook/core';
	import { Figure } from '$lib/flipbook/svelte';
	import LabStrip from './LabStrip.svelte';

	type Verdict = 'keep' | 'redo';
	interface Picks {
		build?: string;
		timing?: string;
		weight?: string;
		actions: Record<string, { verdict?: Verdict; note?: string }>;
		notes?: string;
	}

	let picks: Picks = $state({ actions: {} });
	let loaded = $state(false);
	let saved = $state('');

	const BUILDS = [
		{ id: 'a', label: 'Classic', note: 'Current proportions. Big round head, even 30u line.' },
		{ id: 'b', label: 'Inspo', note: 'Closest to frames.jpg: smaller head, finer line, longer legs.' },
		{ id: 'c', label: 'Chunky comic', note: 'Big head, thick line, short limbs. Reads at tiny sizes.' },
		{ id: 'd', label: 'Lanky', note: 'Long limbs, small head, fine line. Elegant, a bit Tati.' }
	];
	const BUILD_ACTIONS = ['walk', 'run', 'trip', 'cheer'];

	const TIMINGS: { id: string; label: string; note: string; transition: Transition }[] = [
		{ id: 'ones', label: 'On ones', note: 'Every frame, 24fps. Smoothest.', transition: {} },
		{ id: 'twos', label: 'On twos', note: 'Each frame held twice. Classic hand-drawn flipbook.', transition: { onTwos: true } },
		{ id: 'threes', label: 'On threes', note: 'Held three times, 8fps. Choppy, very zine.', transition: { fps: 8 } }
	];
	const TIMING_ACTIONS = ['walk', 'jump', 'slip', 'wave'];

	const WEIGHTS = [
		{ id: 'regular', label: 'Regular', layer: 'regular' as const },
		{ id: 'bold', label: 'Bold', layer: 'bold' as const }
	];

	const lib = getLibrary();
	const categories = Object.entries(lib.byCategory());
	let variants: Record<string, Library> = $state({});

	onMount(async () => {
		const res = await fetch('/__lab/picks').catch(() => null);
		if (res?.ok) {
			const data = await res.json();
			picks = { actions: {}, ...data };
		}
		loaded = true;
		const entries = await Promise.all(
			BUILDS.map(async (b) => {
				const m = (await (await fetch(`/lab/${b.id}/manifest.json`)).json()) as Manifest;
				return [b.id, createLibrary(m)] as const;
			})
		);
		variants = Object.fromEntries(entries);
	});

	let timer: ReturnType<typeof setTimeout> | undefined;
	function save() {
		clearTimeout(timer);
		saved = 'Saving…';
		timer = setTimeout(async () => {
			const r = await fetch('/__lab/picks', { method: 'POST', body: JSON.stringify(picks) }).catch(() => null);
			saved = r?.ok ? `Saved to lab/picks.json` : 'Could not save — is the dev server running?';
		}, 300);
	}

	function choose(key: 'build' | 'timing' | 'weight', id: string) {
		picks[key] = id;
		save();
	}

	function verdict(name: string, v: Verdict) {
		const cur = picks.actions[name] ?? {};
		picks.actions[name] = { ...cur, verdict: cur.verdict === v ? undefined : v };
		save();
	}

	function note(name: string, text: string) {
		picks.actions[name] = { ...(picks.actions[name] ?? {}), note: text };
		save();
	}

	const reviewed = $derived(Object.values(picks.actions).filter((a) => a.verdict).length);
</script>

<svelte:head>
	<title>Lab — Flipbook</title>
</svelte:head>

<main>
	<Container>
		<Stack gap="12">
			<header>
				<Stack gap="4">
					<Text variant="title">Check-in</Text>
					<Text variant="body" color="ink-2">
						Pick one option in each of the first three sections, then mark every action Keep or Redo.
						Notes are optional but steer the next round. Everything saves as you click.
					</Text>
					<Text variant="mono" color="ink-2">{saved || (loaded ? 'Nothing picked yet' : 'Loading…')}</Text>
				</Stack>
			</header>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">1. Build</Text>
					<Text variant="body" color="ink-2">Same animation, four figure builds. Which one is the Flipbook character?</Text>
					{#each BUILDS as b}
						<div class="option" class:picked={picks.build === b.id}>
							<div class="label">
								<span class="letter">{b.id.toUpperCase()}</span>
								<Stack gap="2">
									<Text variant="subheading">{b.label}</Text>
									<Text variant="small" color="ink-2">{b.note}</Text>
									<div>
										<Button variant={picks.build === b.id ? 'primary' : 'secondary'} onclick={() => choose('build', b.id)}>
											{picks.build === b.id ? 'Picked' : 'Pick'}
										</Button>
									</div>
								</Stack>
							</div>
							<div class="strip">
								{#if variants[b.id]}
									<LabStrip actions={BUILD_ACTIONS} library={variants[b.id]} fontBase="/lab/{b.id}/" size={56} height={90} />
								{/if}
							</div>
						</div>
					{/each}
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">2. Timing</Text>
					<Text variant="body" color="ink-2">How often a new drawing appears. Twos is the flipbook default in most hand animation.</Text>
					{#each TIMINGS as t}
						<div class="option" class:picked={picks.timing === t.id}>
							<div class="label">
								<span class="letter">{t.id === 'ones' ? '1' : t.id === 'twos' ? '2' : '3'}</span>
								<Stack gap="2">
									<Text variant="subheading">{t.label}</Text>
									<Text variant="small" color="ink-2">{t.note}</Text>
									<div>
										<Button variant={picks.timing === t.id ? 'primary' : 'secondary'} onclick={() => choose('timing', t.id)}>
											{picks.timing === t.id ? 'Picked' : 'Pick'}
										</Button>
									</div>
								</Stack>
							</div>
							<div class="strip">
								<LabStrip actions={TIMING_ACTIONS} transition={t.transition} size={56} height={90} />
							</div>
						</div>
					{/each}
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">3. Weight in running text</Text>
					<Text variant="body" color="ink-2">Figures set inline with body copy at 16, 24 and 40px.</Text>
					{#each WEIGHTS as w}
						<div class="option" class:picked={picks.weight === w.id}>
							<div class="label">
								<span class="letter">{w.id === 'regular' ? 'R' : 'B'}</span>
								<Stack gap="2">
									<Text variant="subheading">{w.label}</Text>
									<div>
										<Button variant={picks.weight === w.id ? 'primary' : 'secondary'} onclick={() => choose('weight', w.id)}>
											{picks.weight === w.id ? 'Picked' : 'Pick'}
										</Button>
									</div>
								</Stack>
							</div>
							<div class="strip inline-demo">
								{#each [16, 24, 40] as px}
									<p style="font-size: {px}px">
										Somebody <Figure animate="walk" layer={w.layer} size={px} /> walked in, somebody
										<Figure animate="wave" layer={w.layer} size={px} transition={{ repeat: Infinity, repeatDelay: 0.5 }} /> waved, and
										somebody <Figure animate="trip" layer={w.layer} size={px} transition={{ repeat: Infinity, repeatDelay: 0.8 }} /> fell over.
									</p>
								{/each}
							</div>
						</div>
					{/each}
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Row justify="between" align="baseline">
						<Text variant="heading">4. Every action</Text>
						<Text variant="mono" color="ink-2">{reviewed} / {lib.names().length} reviewed</Text>
					</Row>
					<Text variant="body" color="ink-2">
						Keep it, or send it back with a note: what feels off, what it should feel like.
					</Text>
					{#each categories as [cat, list]}
						<Stack gap="4">
							<Text variant="subheading">{cat}</Text>
							<div class="grid">
								{#each list as a (a.name)}
									{@const p = picks.actions[a.name] ?? {}}
									<div class="card" class:keep={p.verdict === 'keep'} class:redo={p.verdict === 'redo'}>
										<LabStrip actions={[a.name]} size={48} height={84} />
										<div class="meta">
											<Row justify="between" align="baseline">
												<Text variant="body"><strong>{a.name}</strong></Text>
												<Text variant="mono" color="ink-2">{a.frames}f · {a.loop ? 'loop' : `${a.from}→${a.to}`}</Text>
											</Row>
											<Text variant="small" color="ink-2">{a.description}</Text>
											<Row gap="2">
												<button class="v" class:on={p.verdict === 'keep'} onclick={() => verdict(a.name, 'keep')}>Keep</button>
												<button class="v" class:on={p.verdict === 'redo'} onclick={() => verdict(a.name, 'redo')}>Redo</button>
											</Row>
											<input
												class="note"
												placeholder="Note"
												value={p.note ?? ''}
												onchange={(e) => note(a.name, (e.currentTarget as HTMLInputElement).value)}
											/>
										</div>
									</div>
								{/each}
							</div>
						</Stack>
					{/each}
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="4">
					<Text variant="heading">5. Anything else</Text>
					<textarea
						class="notes"
						rows="6"
						placeholder="Overall direction, actions that are missing, interactions you want to see…"
						value={picks.notes ?? ''}
						onchange={(e) => {
							picks.notes = (e.currentTarget as HTMLTextAreaElement).value;
							save();
						}}
					></textarea>
				</Stack>
			</section>
		</Stack>
	</Container>
</main>

<style>
	main {
		padding: var(--space-16) 0 var(--space-24);
		background: var(--paper);
		color: var(--ink);
	}
	.option {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: var(--space-6);
		align-items: center;
		padding: var(--space-4) 0;
		border-top: var(--hairline);
	}
	.option.picked .letter {
		background: var(--ink);
		color: var(--paper);
	}
	.label {
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: var(--space-4);
		align-items: start;
	}
	.letter {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border: var(--hairline);
		font: var(--weight-bold) var(--size-28) / 1 var(--font-sans);
	}
	.strip {
		min-width: 0;
	}
	.inline-demo p {
		margin: 0 0 var(--space-2);
		line-height: 1.4;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		border-left: var(--hairline);
		border-top: var(--hairline);
	}
	.card {
		border-right: var(--hairline);
		border-bottom: var(--hairline);
		display: flex;
		flex-direction: column;
	}
	.card.keep {
		box-shadow: inset 0 -4px 0 var(--ink);
	}
	.card.redo {
		box-shadow: inset 0 -4px 0 var(--accent);
	}
	.meta {
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		flex: 1;
	}
	.v {
		font: var(--weight-medium) var(--size-14) / 1 var(--font-sans);
		padding: var(--space-2) var(--space-3);
		border: var(--hairline);
		background: var(--paper);
		color: var(--ink);
		border-radius: 0;
	}
	.v.on {
		background: var(--ink);
		color: var(--paper);
	}
	.card.redo .v.on {
		background: var(--accent);
		border-color: var(--accent);
	}
	.note,
	.notes {
		font: var(--size-14) / 1.4 var(--font-sans);
		border: var(--hairline);
		border-radius: 0;
		background: var(--paper);
		color: var(--ink);
		padding: var(--space-2);
		width: 100%;
	}
	@media (max-width: 760px) {
		.option {
			grid-template-columns: 1fr;
		}
	}
</style>
