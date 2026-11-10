<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Stack, Rule, Text } from '$lib/ds';
	import { Page } from '$lib/flipbook/svelte';
	import { getLibrary, type Page as PageT } from '$lib/flipbook/core';
	import { illustrate } from './verbs';

	const lib = getLibrary();

	// ----- 1. A play in one paragraph -----
	const play =
		'Bob {idle|sneak|tiptoe|run|trip|get-up|cheer} wants the last cookie. ' +
		'Sue {idle|think|look-around|point|angry|laugh|facepalm} is pretending to read. ' +
		'The jar sits on the top shelf, where it always sits, and what happens next happens every single time.';
	let playPage: PageT | null = $state(null);
	let direction = $state('');
	const SCRIPT: [number, string, string, string][] = [
		// seconds, bob, sue, stage direction
		[0, 'sneak', 'think', 'Bob sneaks. Sue thinks about her book.'],
		[4, 'tiptoe', 'look-around', 'Bob tiptoes. Sue hears something.'],
		[6.5, 'idle', 'point', 'Sue points. Bob freezes.'],
		[8, 'run', 'angry', 'Bob bolts for it.'],
		[10, 'trip', 'angry', 'Bob trips.'],
		[11.8, 'trip', 'laugh', 'Sue laughs.'],
		[13.5, 'cheer', 'laugh', 'Bob gets up and claims victory anyway.'],
		[16, 'cheer', 'facepalm', 'Sue despairs.'],
		[18.5, 'idle', 'idle', 'Curtain.']
	];
	const LENGTH = 21;

	// ----- 2. Stadium wave -----
	const crowd = 'THE CROWD GOES WILD\n' + Array.from({ length: 180 }, () => '{cheer}').join(' ');
	let wavePage: PageT | null = $state(null);
	let waveStats = $state('');

	// ----- 3. A poem that acts -----
	const poem = [
		'morning {yawn}',
		'stretch {flex}',
		'walk {walk} walk {walk} walk {walk}',
		'late {panic} run {run}',
		'trip {trip}',
		'',
		'lie there a while {sleep}',
		'',
		'get up {get-up}',
		'dance it off {dance}'
	].join('\n');

	// ----- 4. Say it with verbs -----
	let prose = $state(
		'On Monday I walked to work, tripped on the kerb, waved at nobody and danced anyway. ' +
			'My boss shrugged. Everybody laughed, then we all sat down and slept until Tuesday.'
	);
	const illustrated = $derived(illustrate(prose, (n) => lib.has(n)));

	// ----- weight -----
	let weight: { name: string; kb: number }[] = $state([]);

	onMount(() => {
		// The play: re-run the script on a loop.
		let timers: ReturnType<typeof setTimeout>[] = [];
		const run = () => {
			timers.forEach(clearTimeout);
			timers = SCRIPT.map(([t, bob, sue, line]) =>
				setTimeout(() => {
					const [b, s] = playPage?.figures ?? [];
					b?.animate(bob, { inPlace: true, repeat: bob === 'trip' ? 0 : Infinity, repeatDelay: 0.4 });
					s?.animate(sue, { inPlace: true, repeat: Infinity, repeatDelay: 0.6 });
					direction = line;
				}, t * 1000)
			);
			timers.push(setTimeout(run, LENGTH * 1000));
		};
		const start = setTimeout(run, 500);

		const stats = setInterval(() => {
			if (wavePage) waveStats = `${wavePage.stats.figures} figures · repaint ${wavePage.stats.paintMs.toFixed(1)}ms`;
			weight = performance
				.getEntriesByType('resource')
				.filter((e) => e.name.includes('/fonts/'))
				.map((e) => ({
					name: e.name.split('/').pop()!.split('?')[0],
					kb: Math.round(((e as PerformanceResourceTiming).encodedBodySize || (e as PerformanceResourceTiming).transferSize) / 1024)
				}));
		}, 1000);

		return () => {
			clearTimeout(start);
			timers.forEach(clearTimeout);
			clearInterval(stats);
		};
	});

	const fontKB = $derived(weight.reduce((n, w) => n + w.kb, 0));
</script>

<svelte:head>
	<title>Scenes — Flipbook</title>
</svelte:head>

<main>
	<Container>
		<Stack gap="16">
			<header>
				<Stack gap="3">
					<Text variant="title">Scenes</Text>
					<Text variant="body" color="ink-2">
						Everything on this page is text laid out by pretext. Some of the characters happen to be stick figures.
					</Text>
				</Stack>
			</header>

			<section>
				<Stack gap="4">
					<Text variant="heading">The Cookie Jar</Text>
					<Text variant="small" color="ink-2">A play in one paragraph. The figures act it out; the words never move.</Text>
					<Page bind:page={playPage} text={play} font={'400 26px Georgia'} figureScale={1.4} />
					<p class="direction">{direction}</p>
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="4">
					<Text variant="heading">Stadium</Text>
					<Text variant="small" color="ink-2">
						A crowd typeset as a paragraph. Each figure starts its loop according to where pretext put it.
					</Text>
					<Page
						bind:page={wavePage}
						text={crowd}
						font={'800 18px "Inter Tight"'}
						figureScale={2.4}
						lineHeight={48}
						align="center"
						phase={({ x, y, width }) => 1 - x / width + y / 900}
					/>
					<Text variant="mono" color="ink-2">{waveStats}</Text>
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="4">
					<Text variant="heading">A day, acted</Text>
					<Page text={poem} font={'italic 400 24px Georgia'} figureScale={1.4} lineHeight={40} align="center" />
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="4">
					<Text variant="heading">Say it with verbs</Text>
					<Text variant="small" color="ink-2">Write anything. Every verb with a matching action gets a figure.</Text>
					<textarea bind:value={prose} rows="3"></textarea>
					<Page text={illustrated} font={'400 22px Georgia'} figureScale={1.35} />
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="3">
					<Text variant="heading">What this page loaded</Text>
					<Text variant="body" color="ink-2">
						The Flipbook font is split by category, and the browser fetches only the parts whose drawings appear.
					</Text>
					<table>
						<tbody>
							{#each weight as w}
								<tr><td>{w.name}</td><td>{w.kb} KB</td></tr>
							{/each}
							<tr class="total"><td>Fonts total</td><td>{fontKB} KB</td></tr>
						</tbody>
					</table>
				</Stack>
			</section>
		</Stack>
	</Container>
</main>

<style>
	main {
		background: var(--paper);
		color: var(--ink);
		padding: var(--space-16) 0 var(--space-24);
	}
	.direction {
		margin: 0;
		font: italic var(--size-16) / 1.4 Georgia, serif;
		color: var(--ink-2);
		min-height: 1.4em;
	}
	textarea {
		font: var(--size-16) / 1.5 var(--font-sans);
		border: var(--hairline);
		border-radius: 0;
		padding: var(--space-3);
		background: var(--paper);
		color: var(--ink);
	}
	table {
		border-collapse: collapse;
		font: var(--size-14) var(--font-mono);
		max-width: 32rem;
	}
	td {
		border-top: var(--hairline);
		padding: var(--space-2) var(--space-6) var(--space-2) 0;
	}
	.total td {
		font-weight: var(--weight-bold);
	}
</style>
