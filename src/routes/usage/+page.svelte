<script lang="ts">
	import { Container, Stack, Row, Text, Link, Rule } from '$lib/ds';
	import manifest from '$lib/font/poses.json';

	const cssSnippet = `@font-face {
  font-family: 'FoundrySans Stick';
  src: url('flipbook.woff2') format('woff2'),
       url('flipbook.otf') format('opentype');
  font-display: block;
}

.figure {
  font-family: 'FoundrySans Stick', sans-serif;
  font-size: 96px;
}`;

	const jsSnippet = `const frames = ['\\uE001', '\\uE002']; // stand, hands-on-hips
const el = document.querySelector('.figure');
let i = 0;
let last = performance.now();
const interval = 1000 / 8; // 8 fps

function tick(now) {
  if (now - last >= interval) {
    el.textContent = frames[i++ % frames.length];
    last = now;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);`;
</script>

<svelte:head>
	<title>Usage — Flipbook Foundry</title>
</svelte:head>

<main class="page">
	<Container>
		<Stack gap="16">
			<Stack gap="2">
				<Text variant="small" color="ink-2">/usage</Text>
				<Text variant="title">Usage</Text>
				<Text variant="body" color="ink-2">
					Drop the font in, declare it, cycle the codepoints. The whole runtime is a few
					lines of JavaScript.
				</Text>
			</Stack>

			<Rule />

			<Stack gap="6">
				<Text variant="heading">Install</Text>
				<Text variant="body">
					Put <Text variant="mono">flipbook.woff2</Text> (and optionally
					<Text variant="mono">flipbook.otf</Text>) somewhere your site can serve them, and
					declare the face:
				</Text>
				<pre class="snippet"><code>{cssSnippet}</code></pre>
			</Stack>

			<Rule />

			<Stack gap="6">
				<Text variant="heading">Animate</Text>
				<Text variant="body">
					Every pose lives at its own Private Use Area codepoint. Animating it means swapping
					the rendered character on a timer. A single <Text variant="mono">requestAnimationFrame</Text>
					loop handles any number of figures:
				</Text>
				<pre class="snippet"><code>{jsSnippet}</code></pre>
				<Text variant="body" color="ink-2">
					For dense scenes — paragraphs of figures, headlines that reflow — the runtime in
					this repo (<Text variant="mono">Flipbook</Text>, <Text variant="mono">FlipbookField</Text>)
					uses one shared ticker and lets <Link
						href="https://github.com/chenglou/pretext"
						external
					>
						pretext
					</Link> place every grapheme without DOM reflow.
				</Text>
			</Stack>

			<Rule />

			<Stack gap="6">
				<Text variant="heading">Poses</Text>
				<Text variant="body" color="ink-2">
					Every glyph the font ships with, with its Private Use Area codepoint.
				</Text>
				<div class="table">
					<div class="th">
						<Text variant="small" color="ink-2">Name</Text>
						<Text variant="small" color="ink-2">Codepoint</Text>
					</div>
					{#each manifest.poses as pose}
						<div class="tr">
							<Text variant="mono">{pose.name}</Text>
							<Text variant="mono">{pose.codepoint}</Text>
						</div>
					{/each}
				</div>
			</Stack>

			<Rule />

			<Stack gap="6">
				<Text variant="heading">Animations</Text>
				<Text variant="body" color="ink-2">
					Named pose sequences. Cycle them at any framerate.
				</Text>
				<div class="table">
					<div class="th">
						<Text variant="small" color="ink-2">Name</Text>
						<Text variant="small" color="ink-2">Sequence</Text>
					</div>
					{#each Object.entries(manifest.animations) as [name, seq]}
						<div class="tr">
							<Text variant="mono">{name}</Text>
							<Text variant="mono">{seq.join(' → ')}</Text>
						</div>
					{/each}
				</div>
			</Stack>

			<Rule />

			<Row gap="6" wrap>
				<Link href="/license">License</Link>
				<Link href="/">Back to the foundry</Link>
			</Row>
		</Stack>
	</Container>
</main>

<style>
	.page {
		padding: var(--space-16) 0 var(--space-24);
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
	.table {
		display: grid;
		gap: 0;
	}
	.th, .tr {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: var(--space-6);
		padding: var(--space-3) 0;
		border-bottom: var(--hairline);
	}
	.th {
		border-top: var(--hairline);
	}
	@media (max-width: 640px) {
		.th, .tr {
			grid-template-columns: 120px 1fr;
		}
		.snippet {
			font-size: var(--size-12);
		}
	}
</style>
