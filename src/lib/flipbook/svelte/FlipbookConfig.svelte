<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setConfig, type FlipbookConfig } from './context';

	// framer-motion's <MotionConfig>: defaults for every Figure below it.
	let { children, ...config }: FlipbookConfig & { children: Snippet } = $props();
	// svelte-ignore state_referenced_locally
	setConfig(config);
</script>

{@render children()}
