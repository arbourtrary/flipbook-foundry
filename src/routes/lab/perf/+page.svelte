<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, getLibrary, type Stage as StageT } from '$lib/flipbook/core';
	let canvas: HTMLCanvasElement;
	let stats = $state('');
	onMount(() => {
		const n = Number(new URLSearchParams(location.search).get('n') ?? 3000);
		let s: StageT;
		getLibrary().load(['regular']).then(() => {
			s = new Stage(canvas, { background: '#fafaf7' });
			const acts = ['walk', 'run'];
			for (let i = 0; i < n; i++) {
				const c = s.add({ x: Math.random() * s.width, y: 30 + Math.random() * (s.height - 30), size: 28 + Math.random() * 20, facing: Math.random() < 0.5 ? 1 : -1 });
				c.animate(acts[i % 2], { phase: Math.random() });
			}
			s.onUpdate((_, st) => {
				for (const c of st.characters) {
					if (c.x > st.width + 20) c.x = -20;
					if (c.x < -20) c.x = st.width + 20;
				}
				stats = `${st.stats.fps}fps · ${st.stats.characters} figures · update ${st.stats.updateMs.toFixed(2)}ms · draw ${st.stats.drawMs.toFixed(2)}ms`;
			});
		});
		return () => s?.destroy();
	});
</script>
<p style="position:fixed;top:8px;left:8px;background:#fff;padding:4px 8px;font:13px monospace;z-index:2" id="stats">{stats}</p>
<canvas bind:this={canvas} style="width:100vw;height:100vh;display:block"></canvas>
