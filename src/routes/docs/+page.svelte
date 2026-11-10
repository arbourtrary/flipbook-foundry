<script lang="ts">
	import { Container, Stack, Rule, Text, Code, Link } from '$lib/ds';
	import { getLibrary } from '$lib/flipbook/core';
	import { Figure } from '$lib/flipbook/svelte';

	const lib = getLibrary();
	const ORDER = ['locomotion', 'aerial', 'pratfall', 'transition', 'idle', 'gesture', 'emote', 'interaction'];
	const groups = Object.entries(lib.byCategory()).sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));

	const toc = [
		['start', 'Getting started'],
		['page', 'Page'],
		['figure', 'Figure'],
		['transition', 'Transition'],
		['variants', 'Variants'],
		['stage', 'Stage'],
		['textflow', 'TextFlow'],
		['animate', 'animate() & stagger()'],
		['character', 'Character'],
		['behaviors', 'Behaviors'],
		['hooks', 'React hooks'],
		['config', 'FlipbookConfig'],
		['hubs', 'Hubs & routing'],
		['actions', 'Action reference'],
		['authoring', 'Authoring actions']
	];

	const install = `// Svelte
import { Stage, Figure, TextFlow, FlipbookConfig } from 'flipbook/svelte';
// React
import { Stage, Figure, TextFlow, FlipbookConfig, useAnimate } from 'flipbook/react';
// Anything else
import { createStage, animate, stagger } from 'flipbook';

// Serve static/fonts/flipbook-*.woff2 at /fonts/. Components load what they use;
// call getLibrary().load(['regular', 'bold']) yourself to preload.`;

	const pageEx = `<Page
  text="Bob {walk} left the house. Sue {wave} waved. The dog {run} gave chase."
  font="400 20px Georgia"   // any CSS font for the words
  figureScale={1.3}         // figure size relative to the text (default 1.3)
  align="center"            // or left
  phase={({ x, width }) => x / width}   // loops start by position: a wave
  bind:page                 // page.figures[i] are Characters you can direct
/>

{trip>get-up>dust-off}   a sequence, looped
{idle|sneak|run}         a figure that may switch between these
                         (room is reserved for the widest, so the line never moves)
a newline                starts a new paragraph`;

	const figureEx = `<Figure
  animate="walk"            // action or variant to play; change it to play another
  initial="sit-idle"        // shown first; routes from here into animate
  exit="bow"                // played before removal from a Stage
  transition={{ onTwos: true }}
  whileHover="wave"         // inline only (Stage figures: use stage.hitTest)
  whileTap="jump"
  x={120} y={300}           // Stage px; y is the ground line under the feet
  size={64}                 // font size in px; the figure is ~0.7 of it
  facing={-1}               // 1 faces right, -1 mirrors
  layer="bold"              // regular | bold | limbs | limbs-bold
  body={{ char: 'A', font: '700 10px Georgia' }}   // a letter for a body
  onAnimationComplete={(action) => …}
  onEvent={(event, action) => …}                    // 'hit', 'land', 'release'…
/>`;

	const transitionRows = [
		['fps', 'number', "Frames per second. Defaults to the action's authored rate (usually 24)."],
		['speed', 'number', 'Rate multiplier on top of fps.'],
		['onTwos', 'boolean', 'Hold each drawing for two frames, the hand-drawn flipbook cadence.'],
		['delay', 'seconds', 'Wait before starting. In animate(), may be a stagger() function.'],
		['repeat', 'number', 'Extra plays. Loops default to Infinity, one-shots to 0.'],
		['repeatType', "'loop' | 'reverse' | 'mirror'", 'Restart, or ping-pong the drawings.'],
		['repeatDelay', 'seconds', 'Hold between repeats.'],
		['phase', '0–1', 'Start a loop partway through, to desynchronise a crowd.'],
		['inPlace', 'boolean', 'Ignore baked root motion: treadmill instead of travel.'],
		['route', 'boolean', 'Route through hub transitions first (default true).']
	];

	const variantsEx = `const moods = {
  calm: 'idle',
  happy: { action: 'cheer', transition: { repeat: 2 }, then: 'calm' },
  leave: { action: 'walk', x: 900, then: 'wave' },   // travel to x, then wave
};

<Figure variants={moods} animate={mood} />`;

	const stageEx = `<Stage
  background={null}         // or a colour; null leaves the canvas transparent
  layers={['regular']}      // fonts to load before first draw
  onUpdate={(frame, stage) => …}      // game logic, every frame
  onBeforeDraw={(frame, stage) => …}  // draw terrain under the figures
  onAfterDraw={(frame, stage) => …}
>
  …figures, text flows…
</Stage>

// The Stage instance (bind:stage in Svelte, onReady / useStage in React):
stage.add({ x, y, size, facing })         // → Character
stage.remove(character, 'bow')           // exit action, then gone
stage.addProp({ text: 'A', font: '700 40px Georgia', attach: { to: c, anchor: 'handR' } })
stage.hitTest(x, y)                      // topmost Character or null
stage.toStage(clientX, clientY)          // pointer → stage space
stage.camera = { x, y, zoom }            // scroll and zoom big maps
stage.stats                               // { fps, characters, drawn, updateMs, drawMs }`;

	const flowEx = `<Stage style="height: 420px">
  <TextFlow
    text={copy}
    font="400 22px Georgia"   // any CSS font; measured once by pretext
    x={0} y={0} width={720} lineHeight={32}
    padding={10}               // breathing room around figures
    avoid                      // re-wrap around every figure, every frame
  />
  <Figure animate="run" x={0} y={160} size={64} />
</Stage>

// Without components:
const flow = createTextFlow({ text, font, x, y, width, lineHeight });
flow.layout(obstacles);  // Rect[] → fragments, pure arithmetic
flow.draw(ctx);
flow.ledges();           // word tops: places to stand, sit or hang`;

	const animateEx = `import { animate, stagger } from 'flipbook';

animate(bob, 'jump');                                // → controls (thenable)
await animate(bob, 'walk', { x: 400, then: 'wave' }); // travel, then settle
animate(crowd, 'cheer', { delay: stagger(0.04, { from: 'center' }) });

// Sequences, with framer-motion's \`at\`:
animate([
  [bob, 'walk', { x: 260 }],
  [sue, 'walk', { x: 340, at: '<' }],     // same time as previous
  [[bob, sue], 'high-five'],              // after both arrive
  [bob, 'cheer', { at: '+0.3' }],         // 0.3s after
]);

const c = animate(bob, 'dance');
c.stop();  await c.finished;`;

	const characterEx = `const c = createCharacter({ x: 0, y: 300, size: 64, animate: 'idle' });
c.animate('trip');                 // interrupts, routes hubs, resolves when done
c.pose('jump', 14);                // freeze on a drawing
c.on('hit', () => shake());        // baked events: hit, land, release, grab…
c.on('frame', ({ action, frame }) => …);
c.anchor('handR');                 // [x, y] stage px — where to put the letter
c.bounds();                        // ink box, for hit-tests and text flow
c.glyph;                           // the current character to draw
c.use(wander(), greet());          // behaviours

// Compose: actions play in order; rest-pose routes (get-up, stand-up…)
// are inserted for you. Loops play one cycle each.
c.sequence(['sneak', 'trip', 'dust-off', 'wave'], { loop: true });`;

	const behaviorsEx = `import { wander, greet } from 'flipbook';

stage.add({ x, y }).use(
  wander({
    area: [0, 1200],
    gaits: ['walk', 'walk', 'jog', 'skip'],
    idles: ['idle', 'look-around', 'yawn', 'dance'],
    pause: [1, 4],
    clumsiness: 0.1,            // chance of a trip on the way
  }),
  greet({ radius: 70, actions: ['wave', 'high-five', 'bow'] }),
);

// A behaviour is just (character, stage, now) => void. Write your own:
const flee = (c, stage) => { if (near(c, cat)) c.animate({ action: 'sprint', x: 0 }); };`;

	const hooksEx = `const animate = useAnimate();       // animate() that stops on unmount
const stage = useStage();           // enclosing Stage (null until fonts load)
useStageFrame((frame, stage) => …); // per-frame logic
const reduced = useReducedMotion(); // honours prefers-reduced-motion

<Figure ref={setBob} animate="idle" />   // ref → Character`;

	const configEx = `<FlipbookConfig
  transition={{ onTwos: true }}
  layer="bold"
  size={48}
  reducedMotion="user"      // 'user' | 'always' | 'never' — freezes figures on frame 0
>
  …
</FlipbookConfig>`;

	const authoringEx = `// src/lib/flipbook/rig/actions/emote.ts
export const shrug: ActionDef = {
  name: 'shrug', category: 'gesture', description: '…',
  frames: 30, fps: 24, loop: false, from: 'stand', to: 'stand',
  keys: [
    { at: 0, ...STAND },
    { at: 8, armL: [-20, 120], armR: [20, 120], head: -10, ease: 'snap' },
    { at: 20, head: 4, event: 'shrugged' },
    { at: 29, ...STAND },
  ],
};

// npm run build:font   → bakes every action into the fonts + manifest
// npm run sheet shrug  → contact sheet in .sheets/shrug.png
// /forge               → pose it by hand, copy the ActionDef`;
</script>

<svelte:head>
	<title>Docs — Flipbook</title>
</svelte:head>

<main>
	<Container>
		<div class="layout">
			<nav>
				<a href="/" class="home"><Figure animate="walk" size={36} /> Flipbook</a>
				{#each toc as [id, label]}
					<a href="#{id}">{label}</a>
				{/each}
			</nav>

			<article>
				<Stack gap="16">
					<section id="start">
						<Stack gap="4">
							<Text variant="title">Docs</Text>
							<Text variant="body">
								Flipbook is an animation library where every frame is a glyph. Actions are baked into fonts at build
								time; at runtime a figure is one character that gets swapped for the next drawing. The API borrows
								framer-motion's vocabulary. If you know <code>animate</code>, <code>variants</code> and
								<code>stagger</code>, you know this.
							</Text>
							<Code code={install} />
						</Stack>
					</section>

					<Rule />

					<section id="page">
						<Stack gap="4">
							<Text variant="heading">Page</Text>
							<Text variant="body">
								The simplest way in. Write a sentence and drop actions into it as <code>{'{walk}'}</code>. pretext lays
								the paragraph out once, with words in your font and figures in the Flipbook font, all at text size.
								Every drawing of an action has the same width, so animating a figure only swaps its character and the
								layout never moves.
							</Text>
							<Code code={pageEx} />
						</Stack>
					</section>

					<section id="figure">
						<Stack gap="4">
							<Text variant="heading">Figure</Text>
							<Text variant="body">
								The motion component. On its own it renders inline: a single character in a line of text that you can
								style with CSS like any other. Inside a <a href="#stage">Stage</a> it draws on the canvas instead, so
								thousands can share one frame.
							</Text>
							<Code code={figureEx} />
						</Stack>
					</section>

					<section id="transition">
						<Stack gap="4">
							<Text variant="heading">Transition</Text>
							<Text variant="body">Passed as <code>transition</code>, inside a variant, or as animate()'s options.</Text>
							<table>
								<tbody>
									{#each transitionRows as [k, t, d]}
										<tr><td><code>{k}</code></td><td><code>{t}</code></td><td>{d}</td></tr>
									{/each}
								</tbody>
							</table>
						</Stack>
					</section>

					<section id="variants">
						<Stack gap="4">
							<Text variant="heading">Variants</Text>
							<Text variant="body">
								Name your states, then animate between names. A variant is an action name or a target with its own
								transition, a destination <code>x</code>, a <code>facing</code>, and what to do <code>then</code>.
							</Text>
							<Code code={variantsEx} />
						</Stack>
					</section>

					<Rule />

					<section id="stage">
						<Stack gap="4">
							<Text variant="heading">Stage</Text>
							<Text variant="body">
								A canvas world. Each figure is one <code>fillText</code> of its current glyph, depth-sorted by its ground line and skipped when offscreen; a stage that's scrolled out of view stops painting. A thousand figures draw in a few milliseconds.
							</Text>
							<Code code={stageEx} />
						</Stack>
					</section>

					<section id="textflow">
						<Stack gap="4">
							<Text variant="heading">TextFlow</Text>
							<Text variant="body">
								Paragraphs in any font, laid out by <Link href="https://github.com/chenglou/pretext" external>pretext</Link>.
								Measurement happens once, so wrapping is arithmetic and can run every frame around moving figures.
							</Text>
							<Code code={flowEx} />
						</Stack>
					</section>

					<Rule />

					<section id="animate">
						<Stack gap="4">
							<Text variant="heading">animate() & stagger()</Text>
							<Code code={animateEx} />
						</Stack>
					</section>

					<section id="character">
						<Stack gap="4">
							<Text variant="heading">Character</Text>
							<Text variant="body">The state behind every figure. It never draws; renderers read <code>glyph</code>.</Text>
							<Code code={characterEx} />
						</Stack>
					</section>

					<section id="behaviors">
						<Stack gap="4">
							<Text variant="heading">Behaviors</Text>
							<Text variant="body">
								Small brains for crowds. They run once per frame and only ever call <code>animate()</code>.
							</Text>
							<Code code={behaviorsEx} />
						</Stack>
					</section>

					<section id="hooks">
						<Stack gap="4">
							<Text variant="heading">React hooks</Text>
							<Code code={hooksEx} />
						</Stack>
					</section>

					<section id="config">
						<Stack gap="4">
							<Text variant="heading">FlipbookConfig</Text>
							<Text variant="body">Defaults for every Figure below it, like framer-motion's MotionConfig.</Text>
							<Code code={configEx} />
						</Stack>
					</section>

					<Rule />

					<section id="hubs">
						<Stack gap="4">
							<Text variant="heading">Hubs & routing</Text>
							<Text variant="body">
								Every one-shot starts and ends on a rest pose, called a hub: <code>stand</code>, <code>crouch</code>,
								<code>sit</code>, <code>lie</code>, <code>perch</code> (on a ledge) or <code>hang</code> (from one). Ask a lying figure to
								<code>wave</code> and it plays <code>get-up</code> first. Ask a standing one to <code>sit-idle</code> and it plays
								<code>sit-down</code>. Ledge actions move the ground line for you: <code>sit-on</code> puts a figure on a
								ledge, <code>hop-off</code> drops it back to the floor.
							</Text>
						</Stack>
					</section>

					<section id="actions">
						<Stack gap="6">
							<Text variant="heading">Action reference</Text>
							{#each groups as [cat, list]}
								<Stack gap="2">
									<Text variant="subheading">{cat}</Text>
									<table>
										<tbody>
											{#each list as a (a.name)}
												<tr>
													<td class="fig"><Figure animate={a.name} size={40} transition={a.loop ? {} : { repeat: Infinity, repeatDelay: 0.8 }} /></td>
													<td><code>{a.name}</code></td>
													<td class="mono">{a.frames}f @{a.fps}</td>
													<td class="mono">{a.loop ? 'loop' : `${a.from} → ${a.to}`}</td>
													<td class="mono">{Object.values(a.events).filter((v, i, xs) => xs.indexOf(v) === i).join(' ')}</td>
													<td>{a.description}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</Stack>
							{/each}
						</Stack>
					</section>

					<Rule />

					<section id="authoring">
						<Stack gap="4">
							<Text variant="heading">Authoring actions</Text>
							<Text variant="body">
								Actions are written as sparse pose keys on a skeleton with fixed bone lengths. Angles interpolate along
								splines, so hands sweep arcs instead of cutting corners. At bake time a solver plants the lowest foot,
								derives root motion from it so nothing skates, and adds speed lines and impact puffs. Then every frame is
								written into the fonts. The skeleton exists only at build time.
							</Text>
							<Code code={authoringEx} />
						</Stack>
					</section>
				</Stack>
			</article>
		</div>
	</Container>
</main>

<style>
	main {
		background: var(--paper);
		color: var(--ink);
		padding: var(--space-12) 0 var(--space-24);
	}
	.layout {
		display: grid;
		grid-template-columns: 200px minmax(0, 1fr);
		gap: var(--space-12);
	}
	nav {
		position: sticky;
		top: var(--space-6);
		align-self: start;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font: var(--size-14) var(--font-sans);
	}
	nav a {
		color: var(--ink);
		text-decoration: none;
	}
	nav a:hover {
		color: var(--accent);
	}
	.home {
		font-weight: var(--weight-bold);
		margin-bottom: var(--space-4);
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.9em;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font: var(--size-14) / 1.45 var(--font-sans);
	}
	td {
		border-top: var(--hairline);
		padding: var(--space-2) var(--space-3) var(--space-2) 0;
		vertical-align: bottom;
	}
	td.fig {
		width: 48px;
	}
	td.mono {
		font: var(--size-12) var(--font-mono);
		white-space: nowrap;
		color: var(--ink-2);
	}
	section {
		scroll-margin-top: var(--space-6);
	}
	@media (max-width: 860px) {
		.layout {
			grid-template-columns: 1fr;
		}
		nav {
			position: static;
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
</style>
