import { getContext, setContext } from 'svelte';
import type { Character, Family, Library, Stage, Transition, Layer } from '../core';

const STAGE = Symbol('flipbook-stage');
const CONFIG = Symbol('flipbook-config');

// Figures mount before their Stage's canvas exists, so the Stage hands out
// a handle that queues characters until the canvas is ready.
export class StageHandle {
	stage: Stage | null = null;
	/** Figures on a Stage draw in the Stage's family. */
	constructor(readonly library: Library) {}
	private pending: Character[] = [];
	attach(c: Character) {
		if (this.stage) this.stage.add(c);
		else this.pending.push(c);
	}
	detach(c: Character, exit?: Parameters<Stage['remove']>[1]) {
		const i = this.pending.indexOf(c);
		if (i >= 0) this.pending.splice(i, 1);
		else this.stage?.remove(c, exit);
	}
	ready(stage: Stage) {
		this.stage = stage;
		for (const c of this.pending) stage.add(c);
		this.pending = [];
	}
}

export const setStage = (h: StageHandle) => setContext(STAGE, h);
export const getStage = () => getContext<StageHandle | undefined>(STAGE);

export interface FlipbookConfig {
	/** Figure family for everything below (default: stick). */
	family?: Family;
	transition?: Transition;
	layer?: Layer;
	size?: number;
	color?: string;
	/** 'always' freezes every figure on its first frame. */
	reducedMotion?: 'user' | 'always' | 'never';
}

export const setConfig = (c: FlipbookConfig) => setContext(CONFIG, c);
export const getConfig = () => getContext<FlipbookConfig | undefined>(CONFIG) ?? {};

export function prefersReducedMotion(mode: FlipbookConfig['reducedMotion'] = 'user') {
	if (mode === 'always') return true;
	if (mode === 'never') return false;
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
