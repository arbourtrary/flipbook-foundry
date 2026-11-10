import manifest from '$lib/font/poses.json';
import { codepointToString } from '$lib/font/types';

type TickFn = (now: number) => void;

const subscribers = new Set<TickFn>();
let rafId: number | null = null;

function loop(now: number) {
	for (const sub of subscribers) sub(now);
	rafId = requestAnimationFrame(loop);
}

export function subscribe(fn: TickFn): () => void {
	subscribers.add(fn);
	if (rafId === null && typeof requestAnimationFrame !== 'undefined') {
		rafId = requestAnimationFrame(loop);
	}
	return () => {
		subscribers.delete(fn);
		if (subscribers.size === 0 && rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};
}

const animationCache = new Map<string, string[]>();

export function getAnimation(name: string): string[] {
	let frames = animationCache.get(name);
	if (frames) return frames;

	const codepoints = (manifest.animations as Record<string, string[]>)[name];
	if (!codepoints) {
		throw new Error(`Unknown animation: ${name}`);
	}
	frames = codepoints.map(codepointToString);
	animationCache.set(name, frames);
	return frames;
}

export function listAnimations(): string[] {
	return Object.keys(manifest.animations);
}
