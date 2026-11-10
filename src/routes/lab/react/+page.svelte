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
			root = createRoot(host);
			root.render(createElement(Demo));
		})();
		return () => root?.unmount();
	});
</script>

<div bind:this={host} style="padding: 24px"></div>
