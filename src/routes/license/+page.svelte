<script lang="ts">
	import { Container, Stack, Text, Link, Row } from '$lib/ds';
	import { LICENSE } from '$lib/license';
</script>

<svelte:head>
	<title>License — Flipbook Foundry</title>
</svelte:head>

<main class="page">
	<Container>
		<Stack gap="16">
			<Stack gap="2">
				<Text variant="small" color="ink-2">/license</Text>
				<Text variant="title">{LICENSE.title}</Text>
			</Stack>

			<Stack gap="6">
				{#each LICENSE.intro as p}
					<Text variant="body">{p}</Text>
				{/each}
			</Stack>

			{#each LICENSE.sections as s}
				<Stack gap="6">
					<Text variant="heading">{s.heading}</Text>
					{#each s.paragraphs as p}
						<Text variant="body">{p}</Text>
					{/each}
				</Stack>
			{/each}

			<Stack gap="6">
				<Text variant="body" color="ink-2">{LICENSE.signoff}</Text>
			</Stack>

			<Row gap="6" wrap>
				<Link href="/license.txt" external>Plain-text version</Link>
				<Link href="/">Back to the foundry</Link>
			</Row>
		</Stack>
	</Container>
</main>

<style>
	.page {
		padding: var(--space-16) 0 var(--space-24);
	}
</style>
