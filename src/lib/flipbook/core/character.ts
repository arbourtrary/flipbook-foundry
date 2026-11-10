// A Character is one figure's playback state: which action, which frame,
// where it stands. It never draws — renderers (canvas Stage, inline DOM)
// read `glyph` and position each frame. All motion is glyph sequencing plus
// the root motion baked alongside each frame.

import { type ActionInfo, type AnchorName, type Hub, type Layer, type Library, getLibrary } from './library';

export interface Transition {
	/** Frames per second; defaults to the action's authored fps. */
	fps?: number;
	/** Playback rate multiplier (1 = authored). */
	speed?: number;
	/** Hold every frame twice — classic animation "on twos". */
	onTwos?: boolean;
	/** Seconds before this action starts. */
	delay?: number;
	/** Number of extra plays (Infinity loops forever). Loops default to Infinity, one-shots to 0. */
	repeat?: number;
	/** 'loop' restarts; 'reverse' / 'mirror' ping-pong the frames. */
	repeatType?: 'loop' | 'reverse' | 'mirror';
	/** Seconds to hold between repeats. */
	repeatDelay?: number;
	/** Route through hub transitions (sit-down, get-up…) when hubs differ. Default true. */
	route?: boolean;
	/** Start loops at a fraction of their cycle (0–1) — desynchronises crowds. */
	phase?: number;
	/** Play in place: ignore baked root motion. */
	inPlace?: boolean;
}

export interface Target {
	action: string;
	transition?: Transition;
	/** Travel until x (stage px) is reached, then settle. Faces the right way automatically. */
	x?: number;
	facing?: 1 | -1;
	/** What to play once the target is reached / a one-shot completes. */
	then?: string | Target;
}

export type Definition = string | Target;
export type Variants = Record<string, Definition>;

export interface CharacterOptions {
	x?: number;
	/** Ground line in px (the figure's feet sit here). */
	y?: number;
	/** Font size in px — the figure is ~0.7 of this tall. */
	size?: number;
	facing?: 1 | -1;
	layer?: Layer;
	color?: string;
	opacity?: number;
	z?: number;
	initial?: Definition | false;
	animate?: Definition;
	variants?: Variants;
	transition?: Transition;
	/** Letter (any font) standing in for the body; pairs with the 'limbs' layer. */
	body?: { char: string; font: string; color?: string };
	library?: Library;
	data?: Record<string, unknown>;
}

export interface PlaybackControls extends PromiseLike<void> {
	stop(): void;
	readonly finished: Promise<void>;
}

type Listener = (payload: { action: string; frame: number; event?: string }) => void;

interface Clip {
	action: ActionInfo;
	fps: number;
	frameMs: number;
	repeat: number;
	repeatType: 'loop' | 'reverse' | 'mirror';
	repeatDelay: number;
	delay: number;
	inPlace: boolean;
	untilX?: number;
	resolve: () => void;
	settle?: Definition;
	startFrame: number;
}

let nextId = 1;

export class Character {
	readonly id = nextId++;
	readonly library: Library;
	x: number;
	y: number;
	size: number;
	facing: 1 | -1;
	layer: Layer;
	color: string;
	opacity: number;
	z: number;
	body: CharacterOptions['body'];
	variants: Variants;
	transition: Transition;
	data: Record<string, unknown>;

	/** Per-frame brains, run by the Stage (see behavior.ts). */
	behaviors: import('./behavior').Behavior[] = [];

	/** Current action + frame — the only things a renderer needs. */
	action: ActionInfo;
	frame = 0;
	/** Set whenever the visible glyph or position changes; renderers clear it. */
	dirty = true;

	private queue: Clip[] = [];
	private clip: Clip | null = null;
	private acc = 0;
	private dir = 1;
	private plays = 0;
	private waiting = 0;
	private listeners = new Map<string, Set<Listener>>();
	private hub: Hub;

	constructor(opts: CharacterOptions = {}) {
		this.library = opts.library ?? getLibrary();
		this.x = opts.x ?? 0;
		this.y = opts.y ?? 0;
		this.size = opts.size ?? 64;
		this.facing = opts.facing ?? 1;
		this.layer = opts.layer ?? (opts.body ? 'limbs' : 'regular');
		this.color = opts.color ?? 'currentColor';
		this.opacity = opts.opacity ?? 1;
		this.z = opts.z ?? 0;
		this.body = opts.body;
		this.variants = opts.variants ?? {};
		this.transition = opts.transition ?? {};
		this.data = opts.data ?? {};

		const first = opts.initial !== false && opts.initial !== undefined ? opts.initial : (opts.animate ?? 'idle');
		const firstAction = this.resolve(first).action;
		this.action = this.library.has(firstAction) ? this.library.action(firstAction) : this.library.action(this.library.names()[0]);
		this.hub = this.action.from;
		if (opts.initial !== undefined && opts.initial !== false) {
			// `initial` shows that action's first frame without playing it.
			this.frame = 0;
		}
		if (opts.animate !== undefined) this.animate(opts.animate, { route: opts.initial !== undefined });
	}

	/** Attach behaviours (wander, greet…). Returns this for chaining. */
	use(...b: import('./behavior').Behavior[]) {
		this.behaviors.push(...b);
		return this;
	}

	/** Units → px for this character's size. */
	get scale() {
		return this.size / this.library.unitsPerEm;
	}

	get glyph() {
		return this.library.glyph(this.action, this.frame);
	}

	get playing() {
		return this.clip !== null;
	}

	/** World-space (px) position of a baked anchor on the current frame. */
	anchor(name: AnchorName): [number, number] {
		const [ax, ay] = this.library.anchor(this.action, this.frame, name);
		return [this.x + ax * this.scale * this.facing, this.y - ay * this.scale];
	}

	/** Approximate ink box in stage px (from anchors). */
	bounds() {
		const s = this.scale;
		const a = this.action.anchors[this.frame];
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
		for (let i = 0; i < 16; i += 2) {
			const x = this.x + a[i] * s * this.facing;
			const y = this.y - a[i + 1] * s;
			if (x < x0) x0 = x;
			if (x > x1) x1 = x;
			if (y < y0) y0 = y;
			if (y > y1) y1 = y;
		}
		const pad = (a[18] ?? 76) * s;
		return { x: x0 - pad * 0.4, y: y0 - pad * 0.3, width: x1 - x0 + pad * 0.8, height: y1 - y0 + pad * 0.3 };
	}

	on(event: 'frame' | 'complete' | 'start' | string, cb: Listener) {
		let set = this.listeners.get(event);
		if (!set) this.listeners.set(event, (set = new Set()));
		set.add(cb);
		return () => set!.delete(cb);
	}

	private emit(event: string, payload: { action: string; frame: number; event?: string }) {
		const set = this.listeners.get(event);
		if (set) for (const cb of set) cb(payload);
	}

	private resolve(def: Definition): Target {
		if (typeof def === 'string') {
			const v = this.variants[def];
			if (v !== undefined && v !== def) return this.resolve(v);
			return { action: def };
		}
		return def;
	}

	/**
	 * Play an action (or a variant name). Interrupts whatever is playing,
	 * routing through hub transitions first if needed. Resolves when a
	 * one-shot (or finite repeat, or travel-to-x) completes.
	 */
	animate(def: Definition, override: Transition = {}): PlaybackControls {
		const target = this.resolve(def);
		const t: Transition = { ...this.transition, ...target.transition, ...override };
		const action = this.library.action(target.action);
		if (target.facing) this.facing = target.facing;
		if (target.x !== undefined) this.facing = target.x >= this.x ? 1 : -1;

		// Flush the queue; anything waiting on it resolves now (interrupted).
		for (const c of this.queue) c.resolve();
		this.queue = [];
		if (this.clip) this.clip.resolve();

		const clips: Clip[] = [];
		const route = t.route !== false;
		const here = this.clip ? (this.clip.action.loop ? this.clip.action.from : this.hub) : this.hub;
		if (route && here !== action.from) {
			for (const hop of this.library.route(here, action.from)) clips.push(this.makeClip(hop, {}, () => {}));
		}

		let resolve!: () => void;
		const finished = new Promise<void>((r) => (resolve = r));
		const main = this.makeClip(action, t, resolve);
		main.untilX = target.x;
		main.settle = target.then;
		clips.push(main);

		this.queue = clips;
		this.clip = null;
		this.advanceClip();

		return {
			then: (a, b) => finished.then(a, b),
			stop: () => this.stop(),
			finished
		};
	}

	/** Freeze on the current frame. */
	stop() {
		for (const c of this.queue) c.resolve();
		if (this.clip) this.clip.resolve();
		this.queue = [];
		this.clip = null;
	}

	/** Jump straight to a frame of an action without playing. */
	pose(name: string, frame = 0) {
		this.stop();
		this.action = this.library.action(name);
		this.frame = Math.max(0, Math.min(this.action.frames - 1, frame));
		this.hub = this.action.loop ? this.action.from : this.action.to;
		this.dirty = true;
	}

	private makeClip(action: ActionInfo, t: Transition, resolve: () => void): Clip {
		const fps = (t.fps ?? action.fps) * (t.speed ?? 1) / (t.onTwos ? 2 : 1);
		const repeat = t.repeat ?? (action.loop ? Infinity : 0);
		return {
			action,
			fps,
			frameMs: 1000 / fps,
			repeat,
			repeatType: t.repeatType ?? 'loop',
			repeatDelay: (t.repeatDelay ?? 0) * 1000,
			delay: (t.delay ?? 0) * 1000,
			inPlace: t.inPlace ?? false,
			resolve,
			startFrame: action.loop && t.phase ? Math.floor(t.phase * action.frames) % action.frames : 0
		};
	}

	private advanceClip() {
		const next = this.queue.shift() ?? null;
		this.clip = next;
		if (!next) return;
		this.action = next.action;
		this.frame = next.startFrame;
		this.dir = 1;
		this.plays = 0;
		this.acc = 0;
		this.waiting = next.delay;
		if (next.action.baseline[0]) this.y -= next.action.baseline[0] * this.scale;
		this.dirty = true;
		this.emit('start', { action: next.action.name, frame: this.frame });
		this.enterFrame(next);
	}

	private enterFrame(c: Clip) {
		const ev = c.action.events[this.frame];
		if (ev) this.emit(ev, { action: c.action.name, frame: this.frame, event: ev });
		this.emit('frame', { action: c.action.name, frame: this.frame, event: ev });
	}

	/** Advance by dt milliseconds. Called by the shared frameloop via a renderer. */
	update(dt: number) {
		const c = this.clip;
		if (!c) return;
		if (this.waiting > 0) {
			this.waiting -= dt;
			if (this.waiting > 0) return;
			dt = -this.waiting;
			this.waiting = 0;
		}
		this.acc += dt;
		// Cap catch-up so a background tab doesn't fast-forward a crowd.
		let guard = 8;
		while (this.acc >= c.frameMs && guard-- > 0 && this.clip === c) {
			this.acc -= c.frameMs;
			this.step(c);
		}
		if (guard <= 0) this.acc = 0;
	}

	private step(c: Clip) {
		const n = c.action.frames;
		let f = this.frame + this.dir;
		if (f >= n || f < 0) {
			this.plays++;
			if (this.plays > c.repeat) return this.finish(c);
			if (c.repeatType === 'loop') f = c.action.loop ? f - n * Math.sign(f) : 0;
			else {
				this.dir = -this.dir;
				f = this.frame + this.dir;
			}
			if (c.repeatDelay > 0) this.waiting = c.repeatDelay;
		}
		this.frame = Math.max(0, Math.min(n - 1, f));
		// Root motion: the baked dx carries the planted foot exactly.
		if (!c.inPlace) {
			const dx = c.action.dx[this.frame] * this.scale * this.facing * this.dir;
			this.x += dx;
			if (c.untilX !== undefined && (this.facing > 0 ? this.x >= c.untilX : this.x <= c.untilX)) {
				this.x = c.untilX;
				this.dirty = true;
				return this.finish(c);
			}
		}
		this.dirty = true;
		this.enterFrame(c);
	}

	private finish(c: Clip) {
		this.hub = c.action.loop ? c.action.from : c.action.to;
		if (c.action.baseline[1]) this.y -= c.action.baseline[1] * this.scale;
		this.emit('complete', { action: c.action.name, frame: this.frame });
		const settle = c.settle;
		c.resolve();
		if (this.queue.length) return this.advanceClip();
		this.clip = null;
		if (settle !== undefined) this.animate(settle);
		else if (c.action.next && this.library.has(c.action.next)) this.animate(c.action.next, { route: false });
		else if (c.untilX !== undefined) this.animate(this.variants.idle ?? (this.library.has('idle') ? 'idle' : c.action.name));
	}
}

export const createCharacter = (opts?: CharacterOptions) => new Character(opts);
