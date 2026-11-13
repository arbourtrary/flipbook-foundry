<script lang="ts">
	import { Container, Stack, Text, Link } from '$lib/ds';
	import { getLibrary, type Hub } from 'flipbook-foundry';
	import { Page } from 'flipbook-foundry/svelte';
	import GlyphStrip from '$lib/showcase/GlyphStrip.svelte';
	import { REPO } from '$lib/site';

	const lib = getLibrary();
	const m = lib.manifest;
	const actions = lib.names().map((n) => lib.action(n));
	const actionCount = actions.length;
	const frameCount = actions.reduce((n, a) => n + a.frames, 0).toLocaleString('en-US');

	const walk = lib.action('walk');
	const cycle = Math.round(walk.dx.reduce((s, d) => s + d, 0));
	const widths = (cycle / m.advance).toFixed(1);

	// Most common frame rate across the library.
	const fpsCount = new Map<number, number>();
	for (const a of actions) fpsCount.set(a.fps, (fpsCount.get(a.fps) ?? 0) + 1);
	const fps = [...fpsCount].sort((a, b) => b[1] - a[1])[0][0];

	const hubs = [...new Set(actions.flatMap((a) => [a.from, a.to]))] as Hub[];
	const route = lib
		.route('lie', 'sit')
		.map((a) => a.name)
		.join(' then ');
	const chunkCount = m.layers.regular.chunks?.length ?? 1;
	const thingCount = lib.thingNames().length;

	const list = (xs: string[]) => xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];

	const description = `How Flipbook Foundry bakes ${actionCount} stick-figure actions into a font, keeps their feet planted, and re-wraps text around them every frame.`;
</script>

<svelte:head>
	<title>How it works — Flipbook Foundry</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="How it works — Flipbook Foundry" />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="article" />
</svelte:head>

<main>
	<Container>
		<article>
			<Stack gap="12">
				<Stack gap="6">
					<Text variant="heading" as="h1">How it works</Text>
					<p>
						Flipbook Foundry is {actionCount} actions of stick-figure animation, {frameCount} drawings in all, shipped as a
						font. In the browser a figure is one character. Playing an action means replacing that character with the
						next one, {fps} times a second. This is how the drawings are made, how they move without sliding, and where
						the idea runs out.
					</p>
				</Stack>

				<section>
					<h2>A drawing is a character</h2>
					<p>
						The baker gives each action a contiguous run of Private Use Area codepoints, starting at U+E000. Frame
						<code>i</code> of an action is <code>String.fromCodePoint(start + i)</code>. Here is the whole walk cycle,
						{walk.frames} characters set as ordinary text. Select it and copy it if you like.
					</p>
					<div class="example">
						<GlyphStrip action="walk" size={40} />
					</div>
					<p>
						Every drawing has the same advance width, {m.advance} units on a {m.unitsPerEm}-unit em, with the pelvis on
						the centre line. That is most of the trick. Each frame is exactly as wide as the last, so swapping one for the
						next never changes the width of the line it sits in, and the text around a figure never moves. There is no
						SVG, no canvas path and no skeleton at runtime. There is a font and a lookup table.
					</p>
				</section>

				<section>
					<h2>Bones and angles</h2>
					<p>
						The drawings come from a skeleton with fixed bone lengths: thigh, shin, torso, neck, upper arm, forearm and a
						head. A pose is a handful of angles on those bones, two per limb, plus lean, spine curve, head tilt and a
						whole-body rotation for tumbles. An action is a list of sparse keys on a frame timeline, and each key states
						only what changes.
					</p>
					<p>
						Interpolating angles instead of joint positions keeps the figures from going rubbery. A hand moving between
						two keys sweeps an arc at the end of a rigid arm rather than cutting a straight line through the chest.
						Between keys the timeline runs a time-aware Catmull-Rom spline, so speed carries through a key instead of
						stopping at it. A key can ask for an explicit ease when it should stop: a hold, a hit, the snap into a take.
					</p>
				</section>

				<section>
					<h2>Feet that stay put</h2>
					<p>
						The classic failure of a 2D walk is skating. The body moves at one speed, the feet at another, and the
						figure looks like it is on ice. The baker fixes this per frame, in two passes.
					</p>
					<p>
						First it runs forward kinematics, finds the lowest ink, and moves the figure so that point sits on the ground.
						Then, for each pair of neighbouring frames, it looks at the contacts near the floor in both. The foot sliding
						backward under the body is the one bearing weight; a swing foot still travelling with the body is only
						landing. The baker locks the weight-bearing foot, and the distance it slid becomes that frame's root motion,
						<code>dx</code>. Frames in the air get the average. These are the walk's, in font units:
					</p>
					<p class="mono">{walk.dx.join('  ')}</p>
					<p>
						The numbers ship in the manifest. A travelling figure adds <code>dx</code>, scaled to its size and flipped
						by its facing, on every frame it steps. One walk cycle covers {cycle} units, about {widths} figure widths,
						which is exactly as far as its planted foot says. <code>scripts/skate.ts</code> prints the drift that is
						left, frame by frame.
					</p>
				</section>

				<section>
					<h2>Everything is in the outline</h2>
					<p>
						Squash and stretch are fields on the pose. Speed lines are traced from where fast joints were over the two
						previous frames. Impact puffs are pinned in world space for three frames, so they stay on the ground while
						the body moves on. All of it is drawn into the glyph, and the runtime has nothing extra to render.
					</p>
					<p>
						Limbs are stroked into closed shapes that overlap at every joint. Before writing a glyph the baker unions
						them into a single outline, so no rasteriser ever sees overlapping contours and there is no seam where an
						arm crosses the chest.
					</p>
					<p>
						The baker also records anchors for every frame: head, top of head, hands, feet, pelvis, shoulder, spine angle
						and forearm angles. Text layout doesn't need them, so they live in a separate file a canvas Stage loads on
						demand. They are what let a figure hold a shovel, take someone's hand, or swap its body for a letter.
					</p>
				</section>

				<section>
					<h2>Fonts in pieces</h2>
					<p>
						The same drawings are baked four ways: Flipbook Stick Regular and Bold, and Flipbook Stick Limbs Regular and Bold, which
						leave out the head and torso. All four use the same codepoints. Props such as a shovel or a sack are a fifth
						font, Flipbook Stick Things, with {thingCount} of them.
					</p>
					<p>
						Actions are grouped by category, and each group is a contiguous range of codepoints. So each group becomes
						its own woff2 file, {chunkCount} per weight, registered as a <code>FontFace</code> with a matching
						<code>unicode-range</code>. The browser fetches a file only when the page uses a codepoint inside it. A
						page with one waving figure downloads one small file.
					</p>
				</section>

				<section>
					<h2>One loop</h2>
					<p>
						At runtime a Character holds an action, a frame, a position and a facing. It never draws. Every Character on
						the page steps on one shared <code>requestAnimationFrame</code>, split into read, update and render phases
						like framer-motion's frameloop. Each figure advances at its action's frame rate and caps catch-up, so a
						tab returning from the background doesn't fast-forward a crowd.
					</p>
					<p>
						Every action starts and ends on one of {hubs.length} rest poses: {list(hubs)}. Transitions such as
						sit-down and get-up are edges between them, and a breadth-first search finds the shortest path. Ask a
						figure lying on the floor to sit and it plays {route} first. Any action can follow any other without a pop,
						and the API stays declarative: you say what a figure should be doing, not how it gets there.
					</p>
				</section>

				<section>
					<h2>Text that makes room</h2>
					<p>
						Text is laid out with Cheng Lou's <Link href="https://github.com/chenglou/pretext" external>pretext</Link>.
						pretext measures a string once; after that, line breaking is arithmetic with no DOM reads. A Page splits a
						paragraph on <code>{'{action}'}</code> tokens and hands pretext a list of inline items: words in your font,
						figures as single characters in the Flipbook Stick font, each padded by however far that action's ink reaches past
						its advance. Layout runs when the text or width changes. Animation only repaints.
					</p>
					<div class="example">
						<Page
							text={'Sue {wave} waved from the door. Bob {walk} walked over, sat {sit-idle} down on the step, and {shrug} shrugged. The sentence never moved.'}
							font={'400 20px Georgia'}
						/>
					</div>
					<p>
						On a canvas Stage, TextFlow goes further and re-wraps the paragraph every frame. For each line it takes the
						boxes of the figures crossing it, finds the free gaps between them, and fills each gap with pretext's
						<code>layoutNextLineRange</code>. The words that come out double as ledges a figure can stand on.
					</p>
					<p>
						Letters with legs use the Limbs font. The Stage draws a letter from any typeface between the pelvis and the
						top of the head, tilted to the spine anchor, then draws the limbs over it.
					</p>
					<p>
						The Stage itself is plain. Each figure is one <code>setTransform</code> and one <code>fillText</code> of one
						glyph, and facing left is a negative x scale. Props, letters and paragraphs are <code>fillText</code> too, so
						a crowd is just more calls.
					</p>
				</section>

				<section>
					<h2>What it's for</h2>
					<p>
						Small, characterful motion in places that are already text: a figure in a sentence, an empty state, a loading
						line, docs that want an illustration but not a sprite sheet. The API follows framer-motion, with
						<code>animate</code>, <code>exit</code>, <code>variants</code> and <code>stagger</code>, for Svelte, React
						and plain JavaScript.
					</p>
				</section>

				<section>
					<h2>Limits</h2>
					<p>
						They are stick figures, in one style. Proportions are fixed when the fonts are baked, so changing them or
						adding an action means editing an action file and baking again. The <Link href="/forge">builder</Link>
						exports actions as TypeScript for that.
					</p>
					<p>
						The characters live in the Private Use Area. Copied out of the page, they paste as empty boxes anywhere the
						Flipbook Stick font isn't loaded. Inline figures are hidden from assistive tech. Page and TextFlow draw to a
						canvas, so each mirrors its words into a visually hidden paragraph for screen readers, with the figures left
						out.
					</p>
					<p>
						Motion is stepped. Actions are drawn at fixed frame rates, most at {fps} fps, and each drawing is held until
						the next; nothing is tweened between them. That is the look, and it is also the ceiling.
					</p>
				</section>

				<p class="end">
					Code is MIT and the fonts are under the SIL Open Font License. Read the <Link href="/docs">docs</Link> or the
					source on <Link href={REPO} external>GitHub</Link>.
				</p>
			</Stack>
		</article>
	</Container>
</main>

<style>
	main {
		background: var(--paper);
		color: var(--ink);
		padding: var(--space-16) 0;
	}
	article {
		max-width: 40rem;
	}
	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	h2 {
		margin: 0;
		font: var(--weight-medium) var(--size-20) / var(--leading-snug) var(--font-sans);
	}
	p {
		margin: 0;
		font: var(--weight-regular) var(--size-16) / var(--leading-body) var(--font-sans);
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.92em;
	}
	.example {
		padding: var(--space-4) 0;
	}
	.mono {
		font: var(--size-14) / var(--leading-body) var(--font-mono);
		color: var(--ink-2);
		word-spacing: 0.2em;
	}
	.end {
		color: var(--ink-2);
	}
</style>
