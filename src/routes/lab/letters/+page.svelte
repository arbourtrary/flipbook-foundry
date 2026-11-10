<script lang="ts">
	import { Stage, Figure } from '$lib/flipbook/svelte';
	const word = 'HELLO';
	const acts = ['walk', 'wave', 'jump', 'dance', 'cheer'];
	const fonts = ['700 10px Georgia', '800 10px "Inter Tight", system-ui', 'italic 400 10px "Times New Roman"'];
</script>
{#each fonts as font, fi}
	<Stage layers={['limbs', 'regular']} style="height: 220px; border-bottom: 1px solid">
		{#each word.split('') as ch, i}
			<Figure animate={acts[(i + fi) % acts.length]} body={{ char: ch, font }} x={120 + i * 150} y={190} size={170} transition={{ inPlace: true, phase: i / 5 }} />
		{/each}
	</Stage>
{/each}
