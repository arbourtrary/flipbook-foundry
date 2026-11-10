<script lang="ts">
	import { Stage, Figure, TextFlow } from '$lib/flipbook/svelte';
	import type { Stage as StageT } from '$lib/flipbook/core';

	const copy =
		'This paragraph is set in a real typeface and laid out by pretext, which measures once and then wraps with arithmetic alone. ' +
		'That makes it cheap enough to re-wrap every single frame, so the text simply makes room for whoever is passing through. ' +
		'Nobody here is an image. Each figure is one character in a font, swapped for the next drawing twenty-four times a second, ' +
		'and moved along by exactly as far as its planted foot says it travelled. The words do not mind. They have seen worse. ' +
		'Resize the window and everything reflows without a single DOM measurement.';

	let width = $state(800);
	// Figures stand on text lines (baseline = line bottom) so they wade
	// through the paragraph rather than below it.
	const LH = 40;
	const line = (n: number) => 8 + LH * n;
	const height = line(10);

	function wrap(_: unknown, s: StageT) {
		for (const c of s.characters) {
			if (c.x > s.width + 80) c.x = -80;
			if (c.x < -80) c.x = s.width + 80;
		}
	}
</script>

<div bind:clientWidth={width}>
	<Stage style="height: {height}px" onUpdate={wrap}>
		<TextFlow text={copy + ' ' + copy} font={'400 25px Georgia'} x={0} y={8} {width} lineHeight={LH} padding={12} />
		<Figure animate="run" x={40} y={line(3)} size={110} />
		<Figure animate="walk" x={width * 0.55} y={line(6)} size={110} facing={-1} />
		<Figure animate="sneak" x={width * 0.2} y={line(9)} size={110} />
		<Figure animate="cheer" x={width * 0.82} y={line(9)} size={110} transition={{ inPlace: true }} />
	</Stage>
</div>
