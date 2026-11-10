<script lang="ts">
	import { Stage, Figure, TextFlow } from '$lib/flipbook/svelte';
	import type { Stage as StageT } from '$lib/flipbook/core';
	let stage: StageT | null = $state(null);
	let stats = $state('');
	const actions = ['walk', 'run'];
</script>

<main>
	<p>inline: <Figure animate="walk" size={64} /> <Figure animate="run" size={64} /></p>
	<Stage
		style="height: 480px; border: 1px solid #000"
		bind:stage
		onUpdate={(_, s) => {
			for (const c of s.characters) if (c.x > s.width + 60) c.x = -60;
			stats = `${s.stats.fps}fps · ${s.stats.characters} chars · draw ${s.stats.drawMs.toFixed(2)}ms`;
		}}
	>
		<TextFlow
			text={'The quick brown fox jumps over the lazy dog. '.repeat(12)}
			font={'400 22px Georgia'}
			x={20}
			y={20}
			width={900}
			lineHeight={30}
		/>
		{#each Array(12) as _, i}
			<Figure animate={actions[i % 2]} x={i * 80} y={140 + (i % 4) * 100} size={90} transition={{ phase: i / 12 }} />
		{/each}
	</Stage>
	<p>{stats}</p>
</main>

<style>
	main { padding: 24px; }
</style>
