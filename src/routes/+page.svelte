<script lang="ts">
	import { Container, Stack, Row, Rule, Text, Link, Code } from '$lib/ds';
	import { getLibrary } from 'flipbook-foundry';
	import InlineName from '$lib/showcase/InlineName.svelte';
	import Performer from '$lib/showcase/Performer.svelte';
	import FlowDemo from '$lib/showcase/FlowDemo.svelte';
	import LettersDemo from '$lib/showcase/LettersDemo.svelte';
	import GlyphStrip from '$lib/showcase/GlyphStrip.svelte';
	import ActionIndex from '$lib/showcase/ActionIndex.svelte';
	import Install from '$lib/showcase/Install.svelte';
	import Playground from '$lib/showcase/Playground.svelte';
	import LetterThieves from '$lib/showcase/LetterThieves.svelte';
	import { REPO, AUTHOR } from '$lib/site';
	import { Figure, Page } from 'flipbook-foundry/svelte';

	const lib = getLibrary();
	const actionCount = lib.names().length;
	const frameCount = lib.names().reduce((n, name) => n + lib.action(name).frames, 0);
	const description = `Stick-figure animation built from a font. ${actionCount} actions, ${frameCount.toLocaleString('en-US')} drawings, a framer-motion-style API for Svelte, React and plain JavaScript. Free and open source.`;

	const svelteSnippet = `<script>
  import { Stage, Figure, TextFlow } from 'flipbook-foundry/svelte';
<\/script>

<!-- Inline: one glyph in a line of text -->
<p>Hello <Figure animate="wave" whileHover="cheer" /></p>

<!-- A world: canvas, pretext, thousands of figures -->
<Stage style="height: 400px">
  <TextFlow text={copy} font="20px Georgia" width={720} lineHeight={30} />
  <Figure animate="run" x={0} y={300} size={64} />
  <Figure
    variants={{ rest: 'idle', happy: { action: 'cheer', transition: { repeat: 2 } } }}
    animate={mood}
    exit="bow"
  />
</Stage>`;

	const reactSnippet = `import { Stage, Figure, useAnimate, stagger } from 'flipbook-foundry/react';

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

	const imperativeSnippet = `import { createStage, animate, wander, greet } from 'flipbook-foundry';

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
	<title>Flipbook Foundry — an animation library where every frame is a glyph</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="Flipbook Foundry" />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
</svelte:head>

<main>

	<Container>
		<Stack gap="24">
			<header class="mark"><InlineName where="between" entrance="backflip" loop={['wave-hello', 'backflip', 'shrug', { action: 'clap', repeat: 1 }, 'bow']} /></header>
			<section class="lede">
				<Stack gap="6">
					<Text variant="title">An animation library where every frame is a glyph.</Text>
					<Text variant="subheading" color="ink-2">
						{actionCount} actions, {frameCount.toLocaleString('en-US')} hand-timed drawings, one font. A framer-motion-style API
						for Svelte, React and plain JavaScript. Free and open source.
					</Text>
					<Row gap="6" align="center" wrap>
						<Install />
						<Link href="/docs">Docs</Link>
						<Link href="/forge">Builder</Link>
						<Link href={REPO}>GitHub</Link>
					</Row>
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="6">
					<Text variant="heading">Write your own.</Text>
					<Playground />
				</Stack>
			</section>
			<Rule />
			<section>
				<Stack gap="6">
					<Text variant="heading">Figures are characters.</Text>
					<Page
						text={'Bob {walk} left the house at nine. Sue {wave} waved from the window, and the dog {run} ran after the postman. Halfway down the road Bob {trip} tripped, sat {sit-idle} on the curb for a while, then got up and {dance} danced it off. Nobody {shrug} minded.'}
						font={'400 22px Georgia'}
					/>
				</Stack>
			</section>

			<Rule />

			<section>
				<Stack gap="8">
					<Stack gap="4">
						<Text variant="heading"><LetterThieves text="It's just text." steal={[5, 12]} /></Text>
						<div class="two">
							<Text variant="body">
								Each drawing is a character in the Flipbook Stick font. A walk is twenty-four of them in a row. Playing an action
								means swapping one character for the next at the right moment — no canvas paths, no SVG, no skeleton at
								runtime. Select a line below and copy it: you're holding a walk cycle.
							</Text>
							<Text variant="body">
								Each frame also carries how far the planted foot travelled, so figures cover ground without skating, plus
								anchors for hands, feet and head so they can carry things and meet each other's hands.
							</Text>
						</div>
					</Stack>
					<Stack gap="6">
						<GlyphStrip action="walk" size={44} />
						<GlyphStrip action="trip" size={44} />
						<GlyphStrip action="backflip" size={44} />
						<GlyphStrip action="kick" size={44} />
					</Stack>
				</Stack>
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
						Any font, any letter. The letter becomes the body; the limbs come from the Flipbook Stick Limbs font, posed by the
						same {frameCount.toLocaleString('en-US')} drawings.
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
						Flipbook Foundry. Code under MIT, fonts under the SIL Open Font License.
						<Link href="/how">How it works</Link> · <Link href={REPO}>GitHub</Link><br />
						Made by <Link href={AUTHOR}>arbourtrary</Link>
					</Text>
					<span class="sign"
						><Performer size={40} entrance="backflip" loop={['wave', 'bow', 'backflip']} /></span
					>
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
	.mark {
		/* The wordmark's own headroom (room for a flip) is the top margin. */
		padding-top: var(--space-2);
	}
	.lede {
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
