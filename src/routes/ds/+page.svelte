<script lang="ts">
	import { Text, Button, Link, Field, Stack, Row, Container, Rule } from '$lib/ds';
	import { Figure } from '$lib/flipbook/svelte';

	let fieldValue = $state('');
	let errorValue = $state('not-an-email');
</script>

<svelte:head>
	<title>DS — Flipbook Foundry</title>
</svelte:head>

<main class="page">
	<Container>
		<Stack gap="16">
			<Stack gap="2">
				<Text variant="small" color="ink-2">/ds</Text>
				<Text variant="title">Design system</Text>
				<Text variant="body" color="ink-2">
					The visual contract. Every route is built from these primitives. If it looks like an
					AI app, fix the tokens, not the page.
				</Text>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">Type</Text>
				<Stack gap="6">
					<Text variant="display">Display 96</Text>
					<Text variant="title">Title 64</Text>
					<Text variant="heading">Heading 40</Text>
					<Text variant="subheading">Subheading 28</Text>
					<Text variant="body">
						Body 16 — the workhorse. Paragraphs of explanatory copy, descriptions, prose.
						Restrained line-height of 1.5. No tricks.
					</Text>
					<Text variant="small" color="ink-2">Small 14 — captions, footnotes, secondary.</Text>
					<Text variant="mono">Mono 14 — U+E001, 12&nbsp;fps, $1.00</Text>
				</Stack>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">Color</Text>
				<Row gap="6" wrap>
					<div class="swatch s-paper"><span class="swatch-label">paper</span></div>
					<div class="swatch s-ink"><span class="swatch-label">ink</span></div>
					<div class="swatch s-ink-2"><span class="swatch-label">ink-2</span></div>
					<div class="swatch s-accent"><span class="swatch-label">accent</span></div>
				</Row>
				<Text variant="small" color="ink-2">
					Four working tokens. One accent per visible viewport — used once on this page, on the
					price below.
				</Text>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">Button</Text>
				<Row gap="4" wrap>
					<Button variant="primary">{#snippet children()}Primary{/snippet}</Button>
					<Button variant="secondary">{#snippet children()}Secondary{/snippet}</Button>
					<Button variant="text">{#snippet children()}Text button{/snippet}</Button>
					<Button variant="primary" disabled>{#snippet children()}Disabled{/snippet}</Button>
				</Row>
				<Row gap="4" wrap>
					<Button variant="primary" href="/docs">{#snippet children()}As link{/snippet}</Button>
					<Button variant="secondary" href="/license">
						{#snippet children()}Read license{/snippet}
					</Button>
				</Row>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">Link</Text>
				<Stack gap="3">
					<Text variant="body">
						An inline <Link href="/docs">internal link</Link> reads as part of the sentence,
						not a button. An <Link href="https://github.com/chenglou/pretext" external>
							external link
						</Link> shows the marker.
					</Text>
				</Stack>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">Field</Text>
				<Stack gap="6">
					<Field label="Name" placeholder="Stick figure" bind:value={fieldValue} />
					<Field label="Email" hint="We'll never email you." placeholder="you@studio.xyz" />
					<Field label="Email" error="Doesn't look like an email." bind:value={errorValue} />
				</Stack>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">Layout primitives</Text>
				<Stack gap="3">
					<Text variant="small" color="ink-2">Row, gap 6, align center</Text>
					<Row gap="6" align="center">
						<Text variant="body">Item A</Text>
						<Rule axis="v" />
						<Text variant="body">Item B</Text>
						<Rule axis="v" />
						<Text variant="body">Item C</Text>
					</Row>
				</Stack>
				<Stack gap="3">
					<Text variant="small" color="ink-2">Stack, gap 4</Text>
					<Stack gap="4">
						<Text variant="body">One</Text>
						<Text variant="body">Two</Text>
						<Text variant="body">Three</Text>
					</Stack>
				</Stack>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">The single accent example</Text>
				<Row gap="6" align="baseline" wrap>
					<Text variant="display">
						<span class="price"><span class="dollar">$</span>1</span>
					</Text>
					<Stack gap="2">
						<Text variant="subheading">Flipbook Foundry</Text>
						<Text variant="small" color="ink-2">
							One-time. Includes .woff2, .otf, the license, and bragging rights.
						</Text>
					</Stack>
				</Row>
			</Stack>

			<Rule />

			<Stack gap="8">
				<Text variant="heading">Figure</Text>
				<Text variant="body" color="ink-2">
					The motion primitive in isolation: one glyph, swapped for the next drawing at the action's
					authored rate. Hover to cheer.
				</Text>
				<Row gap="8" align="end" wrap>
					{#each ['walk', 'run', 'jump', 'dance'] as a}
						<Stack gap="2" align="center">
							<Figure animate={a} size={64} whileHover="cheer" transition={{ repeat: Infinity, repeatDelay: 0.5 }} />
							<Text variant="mono" color="ink-2">{a}</Text>
						</Stack>
					{/each}
				</Row>
			</Stack>

			<Rule />

			<Stack gap="4">
				<Text variant="small" color="ink-2">Anti-slop audit</Text>
				<Stack gap="2">
					<Text variant="body">No rounded corners. No drop shadows. No faded hairlines.</Text>
					<Text variant="body">
						No uppercase eyebrows. No nested cards. Hierarchy via type and whitespace.
					</Text>
					<Text variant="body">One accent. Two type families (sans + mono).</Text>
				</Stack>
			</Stack>
		</Stack>
	</Container>
</main>

<style>
	.page {
		padding: var(--space-16) 0 var(--space-24);
	}
	.swatch {
		width: 160px;
		height: 100px;
		border: var(--hairline);
		display: flex;
		align-items: flex-end;
		padding: var(--space-2);
	}
	.swatch-label {
		font-family: var(--font-mono);
		font-size: var(--size-12);
		color: var(--ink);
		background: var(--paper);
		padding: 2px 4px;
	}
	.s-paper { background: var(--paper); }
	.s-ink { background: var(--ink); }
	.s-ink-2 { background: var(--ink-2); }
	.s-accent { background: var(--accent); }
	.s-ink .swatch-label,
	.s-ink-2 .swatch-label,
	.s-accent .swatch-label {
		background: var(--paper);
	}


	.price {
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.dollar {
		font-size: 0.55em;
		vertical-align: 0.55em;
		margin-right: 0.05em;
	}
</style>
