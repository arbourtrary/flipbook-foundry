<script lang="ts">
	import { onMount } from 'svelte';
	let host: HTMLDivElement;
	onMount(() => {
		let root: { unmount(): void } | undefined;
		(async () => {
			const [{ createRoot }, { createElement }, { default: Demo }] = await Promise.all([
				import('react-dom/client'),
				import('react'),
				import('./Demo.tsx')
			]);
			const r = createRoot(host);
			r.render(createElement(Demo));
			root = r;
		})();
		return () => root?.unmount();
	});
</script>

<div bind:this={host} style="padding: 24px"></div>
