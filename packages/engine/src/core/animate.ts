// Imperative animation API, modelled on framer-motion's `animate()`:
//
//   animate(bob, 'wave')
//   animate(bob, 'walk', { x: 600 })                 // travel, then idle
//   animate(crowd, 'cheer', { delay: stagger(0.05) })
//   animate([
//     [bob, 'walk', { x: 300 }],
//     [sue, 'wave', { at: '<' }],                    // with the previous step
//     [bob, 'high-five', { at: '+0.2' }],            // 0.2s after it ends
//   ])

import type { Character, Definition, PlaybackControls, Target, Transition } from './character';

export type StaggerOrigin = 'first' | 'last' | 'center' | number;

export type DelayFn = (index: number, total: number) => number;

/** framer-motion's stagger(): a per-index delay function. */
export function stagger(each = 0.1, opts: { startDelay?: number; from?: StaggerOrigin; ease?: (t: number) => number } = {}): DelayFn {
	const { startDelay = 0, from = 'first', ease } = opts;
	return (i, total) => {
		const origin = from === 'first' ? 0 : from === 'last' ? total - 1 : from === 'center' ? (total - 1) / 2 : from;
		const dist = Math.abs(i - origin);
		if (!ease) return startDelay + each * dist;
		const max = Math.max(origin, total - 1 - origin) || 1;
		return startDelay + ease(dist / max) * each * max;
	};
}

export interface AnimateOptions extends Omit<Transition, 'delay'> {
	delay?: number | DelayFn;
	x?: number;
	facing?: 1 | -1;
	then?: Definition;
}

export interface SequenceOptions extends AnimateOptions {
	/** number = seconds from sequence start; '<' = with previous; '+n' / '-n' = relative to previous end. */
	at?: number | '<' | `+${number}` | `-${number}`;
}

export type SequenceStep = [Character | Character[], Definition, SequenceOptions?];

function toTarget(def: Definition, o: AnimateOptions, delay: number): [Definition, Transition] {
	const { x, facing, then, delay: _d, ...transition } = o;
	const t: Transition = { ...transition, delay };
	if (x === undefined && facing === undefined && then === undefined) return [def, t];
	const base: Target = typeof def === 'string' ? { action: def } : { ...def };
	return [{ ...base, x: x ?? base.x, facing: facing ?? base.facing, then: then ?? base.then }, t];
}

function group(controls: PlaybackControls[]): PlaybackControls {
	const finished = Promise.all(controls.map((c) => c.finished)).then(() => {});
	return {
		then: (a, b) => finished.then(a, b),
		stop: () => controls.forEach((c) => c.stop()),
		finished
	};
}

export function animate(sequence: SequenceStep[]): PlaybackControls;
export function animate(target: Character | Character[], def: Definition, options?: AnimateOptions): PlaybackControls;
export function animate(
	target: Character | Character[] | SequenceStep[],
	def?: Definition,
	options: AnimateOptions = {}
): PlaybackControls {
	if (def === undefined) return runSequence(target as SequenceStep[]);
	const list = Array.isArray(target) ? (target as Character[]) : [target as Character];
	return group(
		list.map((c, i) => {
			const delay = typeof options.delay === 'function' ? options.delay(i, list.length) : (options.delay ?? 0);
			const [d, t] = toTarget(def, options, delay);
			return c.animate(d, t);
		})
	);
}

function runSequence(steps: SequenceStep[]): PlaybackControls {
	let stopped = false;
	const live: PlaybackControls[] = [];
	const wait = (s: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, s * 1000)));
	const started = performance.now();
	const finished = (async () => {
		let prevStart: Promise<void> = Promise.resolve();
		let prevEnd: Promise<void> = Promise.resolve();
		const all: Promise<void>[] = [];
		for (const [target, def, opts = {}] of steps) {
			const { at, ...o } = opts;
			let gate: Promise<void>;
			if (at === '<') gate = prevStart;
			else if (typeof at === 'number') gate = wait(at - (performance.now() - started) / 1000);
			else if (typeof at === 'string') {
				const off = parseFloat(at);
				gate = off >= 0 ? prevEnd.then(() => wait(off)) : prevEnd;
			} else gate = prevEnd;
			let markStart!: () => void;
			const startP = new Promise<void>((r) => (markStart = r));
			const endP = gate.then(() => {
				if (stopped) return;
				markStart();
				const c = animate(target, def, o);
				live.push(c);
				return c.finished;
			});
			prevStart = startP;
			prevEnd = endP;
			all.push(endP);
		}
		await Promise.all(all);
	})();
	return {
		then: (a, b) => finished.then(a, b),
		stop: () => {
			stopped = true;
			live.forEach((c) => c.stop());
		},
		finished
	};
}
