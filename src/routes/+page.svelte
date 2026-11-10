<script lang="ts">
	import { Container, Stack, Row, Rule, Text, Button, Link, Code } from '$lib/ds';
	import { getLibrary } from '$lib/flipbook/core';
	import WorldStrip from '$lib/showcase/WorldStrip.svelte';
	import FlowDemo from '$lib/showcase/FlowDemo.svelte';
	import LettersDemo from '$lib/showcase/LettersDemo.svelte';
	import GlyphStrip from '$lib/showcase/GlyphStrip.svelte';
	import ActionIndex from '$lib/showcase/ActionIndex.svelte';
	import BuyButton from '$lib/buy/BuyButton.svelte';
	import { Figure } from '$lib/flipbook/svelte';

	const lib = getLibrary();
	const actionCount = lib.names().length;
	const frameCount = Object.values(lib.manifest.actions).reduce((n, a) => n + a.frames, 0);

	const svelteSnippet = `<script>
  import { Stage, Figure, TextFlow } from 'flipbook/svelte';
<\/script>

<!-- Inline: one glyph in a line of text -->
<p>Hello <Figure animate="wave" whileHover="cheer" /></p>

<!-- A world: canvas, pretext, thousands of figures -->
<Stage style="height: 400px">
  <TextFlow text={copy} font="20px Georgia" width={720} lineHeight={30} />
  <Figure animate="run" x={0} y={300} size={96} />
  <Figure
    variants={{ rest: 'idle', happy: { action: 'cheer', transition: { repeat: 2 } } }}
    animate={mood}
    exit="bow"
  />
</Stage>`;

	const reactSnippet = `import { Stage, Figure, useAnimate, stagger } from 'flipbook/react';

function Parade({ people }) {
  const animate = useAnimate();
  const crowd = useRef([]);
  return (
    <Stage style={{ height: 300 }}>
      {people.map((p, i) => (
        <Figure key={p.id} ref={(c) => (crowd.current[i] = c)}
                animate="walk" x={i * 60} y={240} />
      ))}
      <button onClick={() => animate(crowd.current, 'jump', { delay: stagger(0.05) })}>
        Everybody jump
      </button>
    </Stage>
  );
}`;

	const imperativeSnippet = `import { createStage, animate, wander, greet } from 'flipbook';

const stage = createStage(canvas);
const bob = stage.add({ x: 0, y: 300, size: 80 });
const sue = stage.add({ x: 600, y: 300, size: 80, facing: -1 });

// Walk until x = 260, high-five on the same frame, then go about the day.
await animate([
  [bob, 'walk', { x: 260 }],
  [sue, 'walk', { x: 340, at: '<' }],
  [[bob, sue], 'high-five'],
]);
bob.use(wander(), greet());
sue.use(wander(), greet());`;
</script>

<svelte:head>
	<title>Flipbook — an animation library where every frame is a glyph</title>
	<meta
		name="description"
		content="Stick-figure animation built from a font. {actionCount} actions, {frameCount} drawings, framer-motion-style API for Svelte and React, pretext-powered text that makes room."
	/>
</svelte:head>

<main>
	<WorldStrip title="Flipbook" rows={5} population={64} height={560} />

	<Container>
		<Stack gap="24">
			<section class="lede">
				<Stack gap="6">
					<Text variant="title">An animation library where every frame is a glyph.</Text>
					<Text variant="subheading" color="ink-2">
						{actionCount} actions, {frameCount.toLocaleString()} hand-timed drawings, one font. Walk them, trip them, sit
						them on your headlines. A framer-motion-style API for Svelte and React, and a map of ten thousand figures
						still draws in under ten milliseconds.
					</Text>
					<Row gap="4" wrap>
						<Button href="/docs">Read the docs</Button>
						<Button href="/forge" variant="secondary">Open the builder</Button>
						<BuyButton />
					</Row>
					<Text variant="small" color="ink-2">Poke anyone up there. They don't mind.</Text>
				</Stack>
			</section>

			<Rule />

			<section>
				<div class="two">
					<Stack gap="4">
						<Text variant="heading">It's just text.</Text>
						<Text variant="body">
							Each drawing is a character in the Flipbook font. A walk is twenty-four of them in a row. Playing an action
							means swapping one character for the next at the right moment — no canvas paths, no SVG, no skeleton at
							runtime. Select the line on the right and copy it: you're holding a walk cycle.
						</Text>
						<Text variant="body">
							Each frame also carries how far the planted foot travelled, so figures cover ground without skating, plus
							anchors for hands, feet and head so they can carry things and meet each other's hands.
						</Text>
					</Stack>
					<Stack gap="6">
						<GlyphStrip action="walk" size={44} />
						<GlyphStrip action="trip" size={44} />
					</Stack>
				</div>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">Text that makes room.</Text>
					<Text variant="body" color="ink-2">
						Paragraphs are laid out by Cheng Lou's pretext. It measures once, then wraps with arithmetic, so a
						paragraph can re-flow around moving figures every frame.
					</Text>
					<FlowDemo />
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">Letters with legs.</Text>
					<Text variant="body" color="ink-2">
						Any font, any letter. The letter becomes the body; the limbs come from the Flipbook Limbs font, posed by the
						same {frameCount.toLocaleString()} drawings.
					</Text>
					<LettersDemo />
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">Familiar if you've used framer-motion.</Text>
					<Text variant="body" color="ink-2">
						<code>animate</code>, <code>initial</code>, <code>exit</code>, <code>variants</code>,
						<code>transition</code>, <code>whileHover</code>, <code>stagger</code>, sequences with
						<code>at</code>. Swap a pose for an action name and you already know it. Figures route themselves between
						rest poses, so <code>animate="sit-idle"</code> from a run plays the stop and the sit-down first.
					</Text>
					<div class="two">
						<Code label="Svelte" code={svelteSnippet} />
						<Code label="React" code={reactSnippet} />
					</div>
					<Code label="Vanilla" code={imperativeSnippet} />
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Row justify="between" align="baseline">
						<Text variant="heading">Every action.</Text>
						<Text variant="mono" color="ink-2">{actionCount} actions · {frameCount} frames</Text>
					</Row>
					<ActionIndex />
				</Stack>
			</section>

			<Rule />

			<footer>
				<Row justify="between" align="baseline" wrap>
					<Text variant="small" color="ink-2">
						Flipbook Foundry. Fonts are $1; the library is free to use with them.
						<Link href="/license">License</Link>
					</Text>
					<span class="sign"><Figure animate="bow" size={40} transition={{ repeat: Infinity, repeatDelay: 2 }} /></span>
				</Row>
			</footer>
		</Stack>
	</Container>
</main>

<style>
	main {
		background: var(--paper);
		color: var(--ink);
		padding-bottom: var(--space-16);
	}
	.lede {
		padding-top: var(--space-12);
		max-width: 56rem;
	}
	.two {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--space-12);
		align-items: start;
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.92em;
	}
	@media (max-width: 860px) {
		.two {
			grid-template-columns: 1fr;
			gap: var(--space-8);
		}
	}
</style>
