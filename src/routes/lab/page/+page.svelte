<script lang="ts">
	import { Page } from '$lib/flipbook/svelte';
	let text = $state(
		'Bob {walk} left the house at nine. Sue {wave} waved from the window, and the dog {run} ran after the postman. ' +
			'Halfway down the road Bob {trip} tripped, sat {sit-idle} on the kerb for a while, then got up and {dance} danced it off. ' +
			'Nobody {shrug} minded. The postman {cheer} cheered. Every figure here is a character in a font, laid out by pretext with the words around it.'
	);
</script>

<main>
	<Page {text} font={'400 20px Georgia'} />
	<Page {text} font={'500 15px "Inter Tight", system-ui'} />
	<textarea bind:value={text} rows="5"></textarea>
</main>

<style>
	main { max-width: 680px; margin: 48px auto; display: grid; gap: 32px; color: var(--ink); padding: 0 16px; }
	textarea { font: 14px var(--font-mono); border: var(--hairline); border-radius: 0; padding: 8px; }
</style>
