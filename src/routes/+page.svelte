<script lang="ts">
	import { Container, Stack, Row, Rule, Text, Button, Link } from '$lib/ds';
	import { FlipbookField, Flipbook } from '$lib/flipbook';
	import BuyButton from '$lib/buy/BuyButton.svelte';
</script>

<svelte:head>
	<title>Flipbook Foundry — a font of stick figures</title>
	<meta
		name="description"
		content="A typeface where every glyph is a pose. Animated by codepoint cycling. Positioned by pretext. One dollar."
	/>
</svelte:head>

<main>
	<Container>
		<Stack gap="24">
			<section class="hero">
				<Stack gap="8">
					<FlipbookField
						text="FLIPBOOK FOUNDRY"
						animation={[
							'walk',
							'run',
							'jump',
							'dance',
							'greet',
							'cheer',
							'salute',
							'extend',
							'throw',
							'lunge',
							'hop',
							'balance',
							'swim',
							'point-right'
						]}
						fps={14}
						font='700 96px "FoundrySans Stick"'
						glyphSize="96px"
						lineHeight={120}
						phaseStep={0.07}
					/>
					<Text variant="subheading" color="ink-2">
						A typeface where every glyph is a pose. The runtime flips through them. The
						letters walk, run, jump, peek around corners, dance.
					</Text>
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">What it is</Text>
					<Text variant="body">
						Flipbook Foundry is a font. Each glyph is a stick figure in a different pose. A
						tiny runtime swaps the rendered codepoint at the framerate you ask for — so the
						character on the page walks, waves, dances.
					</Text>
					<Text variant="body">
						Layout is handled by <Link href="https://github.com/chenglou/pretext" external>
							pretext
						</Link>, which measures and breaks text without ever touching the DOM. That means
						a paragraph of animated figures reflows on resize without the browser thrashing.
					</Text>
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="8">
					<Text variant="heading">In motion</Text>
					<Stack gap="12">
						<FlipbookField
							text="every letter is alive and the page does not care"
							animation={[
								'run',
								'walk',
								'jump',
								'dance',
								'greet',
								'cheer',
								'throw',
								'hop',
								'lunge',
								'point-right',
								'salute',
								'tap-foot'
							]}
							fps={18}
							font='500 56px "FoundrySans Stick"'
							glyphSize="56px"
							lineHeight={72}
							phaseStep={0.05}
						/>
						<FlipbookField
							text="resize the window and the field reflows without the animation skipping a frame"
							animation={[
								'walk',
								'greet',
								'clap',
								'extend',
								'nod',
								'shake-head',
								'yawn',
								'tip-toe',
								'balance',
								'salute',
								'point-left'
							]}
							fps={14}
							font='400 28px "FoundrySans Stick"'
							glyphSize="28px"
							lineHeight={40}
							phaseStep={0.04}
						/>
					</Stack>
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="8">
					<Stack gap="3">
						<Text variant="heading">A through Z — an action for every letter</Text>
						<Text variant="body" color="ink-2">
							Twenty-six action cycles, one for each letter of the alphabet — applaud,
							balance, clap, dance, extend, flex, greet, hop, idle, jump, kneel, lunge,
							march, nod, overhead, point, quake, run, sit, throw, unwind, victory, walk,
							x-leap, yawn, zen — plus the legacy cheer, salute, swim, shake-head,
							tap-foot, and tip-toe motions, and eight static stances. Cycle any of them
							at any framerate.
						</Text>
					</Stack>
					<div class="gallery">
						{#each [
							['applaud', 12],
							['balance', 6],
							['clap', 14],
							['dance', 12],
							['extend', 8],
							['flex', 6],
							['greet', 10],
							['hop', 14],
							['idle', 8],
							['jump', 12],
							['kneel', 10],
							['lunge', 10],
							['march', 14],
							['nod', 8],
							['overhead', 4],
							['point-right', 8],
							['quake', 20],
							['run', 20],
							['sit', 8],
							['throw', 14],
							['unwind', 8],
							['victory', 8],
							['walk', 14],
							['x-leap', 14],
							['yawn', 6],
							['zen', 4]
						] as [name, fps]}
							<Stack gap="2" align="center">
								<div class="cell">
									<Flipbook animation={name as string} fps={fps as number} size="100px" />
								</div>
								<Text variant="mono" color="ink-2">{name}</Text>
							</Stack>
						{/each}
					</div>
					<Text variant="small" color="ink-2">
						Full list of poses and animations on the <Link href="/usage">usage page</Link>.
					</Text>
				</Stack>
			</section>

			<Rule />

			<section id="buy">
				<Row gap="12" align="baseline" wrap>
					<Text variant="display">
						<span class="price"><span class="dollar">$</span>1</span>
					</Text>
					<Stack gap="4">
						<Text variant="subheading">One font. One dollar.</Text>
						<Text variant="body" color="ink-2">
							Includes the .woff2, the .otf, the license, and a usage snippet. Same price
							for personal, commercial, t-shirts, billboards, films. The dollar is the
							joke. The license is real.
						</Text>
						<Row gap="4" wrap>
							<BuyButton />
							<Button variant="text" href="/license">
								{#snippet children()}Read the license{/snippet}
							</Button>
						</Row>
					</Stack>
				</Row>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">Usage</Text>
					<Text variant="body">
						Drop the .woff2 into your project, declare an <Text variant="mono">@font-face</Text>,
						and cycle the codepoints. Full snippets on the <Link href="/usage">usage page</Link>.
					</Text>
					<pre class="snippet"><code>{`@font-face {
  font-family: 'FoundrySans Stick';
  src: url('flipbook.woff2') format('woff2');
}`}</code></pre>
				</Stack>
			</section>

			<Rule />

			<footer class="footer">
				<Row gap="8" align="center" justify="between" wrap>
					<Row gap="3" align="center">
						<Flipbook animation="greet" fps={3} size="28px" />
						<Text variant="small" color="ink-2">Flipbook Foundry · 2026</Text>
					</Row>
					<Row gap="6" align="center" wrap>
						<Link href="/usage">Usage</Link>
						<Link href="/license">License</Link>
						<Link href="https://github.com/chenglou/pretext" external>pretext</Link>
						<Link href="https://github.com/opentypejs/opentype.js" external>opentype.js</Link>
					</Row>
				</Row>
			</footer>
		</Stack>
	</Container>
</main>

<style>
	main {
		padding: var(--space-16) 0 var(--space-24);
	}
	.hero {
		padding-top: var(--space-8);
	}
	.price {
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.04em;
	}
	.dollar {
		font-size: 0.55em;
		vertical-align: 0.55em;
		margin-right: 0.05em;
	}
	.snippet {
		font-family: var(--font-mono);
		font-size: var(--size-14);
		background: var(--paper);
		border: var(--hairline);
		padding: var(--space-4) var(--space-6);
		overflow-x: auto;
		line-height: var(--leading-body);
	}
	.footer {
		padding-top: var(--space-4);
	}
	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-6);
	}
	.cell {
		width: 100%;
		height: 140px;
		border: var(--hairline);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	@media (max-width: 640px) {
		.snippet {
			font-size: var(--size-12);
		}
	}
</style>
