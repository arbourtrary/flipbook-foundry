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
	/**
	 * What happens to the action already playing. 'settle' (default) lets a
	 * one-shot finish and plays a loop on to its next exit, then settles into
	 * the rest pose before this one starts. 'cut' switches on the next frame.
	 */
	interrupt?: 'settle' | 'cut';
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
	body?: {
		char: string;
		font: string;
		color?: string;
		/** Draw the letter over the limbs instead of under them. */
		front?: boolean;
	};
	/** Outline the figure in paper colour so it stays legible over ink (Stage only). */
	halo?: boolean;
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
	/** Direction (±1) we're travelling toward untilX in world space. */
	untilDir?: number;
	resolve: () => void;
	settle?: Definition;
	startFrame: number;
	/** Finish on reaching this frame (a loop's exit, or frame 0 of a reversed rise). */
	stopAt?: number;
	/** Generated settle/rise move: plays without start/complete events. */
	silent?: boolean;
	rise?: boolean;
	/** Facing to take when this clip starts. */
	facing?: 1 | -1;
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
	halo: boolean;
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
	/** Nothing to settle out of until something has played. */
	private played = false;
	/** Remaining x correction after travel-to-x stops on an exit frame. */
	private slide = { per: 0, left: 0 };

	constructor(opts: CharacterOptions = {}) {
		this.library = opts.library ?? getLibrary();
		this.x = opts.x ?? 0;
		this.y = opts.y ?? 0;
		this.size = opts.size ?? 32;
		this.facing = opts.facing ?? 1;
		this.layer = opts.layer ?? (opts.body ? 'limbs' : 'regular');
		this.color = opts.color ?? 'currentColor';
		this.opacity = opts.opacity ?? 1;
		this.z = opts.z ?? 0;
		this.body = opts.body;
		this.halo = opts.halo ?? false;
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

	/** Approximate ink box in stage px — from anchors when loaded, else from the action's reach. */
	bounds() {
		const s = this.scale;
		const a = this.action.anchors?.[this.frame];
		if (!a) {
			const [back, ahead] = this.action.reach;
			const x0 = this.facing > 0 ? this.x - back * s : this.x - ahead * s;
			return { x: x0, y: this.y - this.action.height * s, width: (back + ahead) * s, height: this.action.height * s };
		}
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
	 * Play an action (or a variant name). Whatever is playing hands over
	 * through the shared rest pose (see Transition.interrupt), routing
	 * through hub transitions if needed. Resolves when a one-shot (or finite
	 * repeat, or travel-to-x) completes.
	 */
	animate(def: Definition, override: Transition = {}, fromSequence = false): PlaybackControls {
		if (!fromSequence) this.seqId++;
		const target = this.resolve(def);
		const t: Transition = { ...this.transition, ...target.transition, ...override };
		const action = this.library.action(target.action);
		let facing = target.facing ?? this.facing;
		if (target.x !== undefined) {
			// Face so the action's own travel carries us toward x — forward for
			// a walk, away from x for a backpedal.
			const backwards = action.dx.reduce((a, b) => a + b, 0) < 0;
			const toward = target.x >= this.x ? 1 : -1;
			facing = (backwards ? -toward : toward) as 1 | -1;
		}

		// Flush the queue; anything waiting on it resolves now (interrupted).
		for (const c of this.queue) c.resolve();
		this.queue = [];
		const cur = this.clip;
		if (cur) cur.resolve();

		let resolve!: () => void;
		const finished = new Promise<void>((r) => (resolve = r));
		const cut = t.interrupt === 'cut' || !this.played;

		// The same loop again: keep stepping and just take the new target.
		if (!cut && cur && cur.action === action && action.loop && cur.stopAt === undefined && !cur.silent && facing === this.facing) {
			cur.resolve = resolve;
			cur.untilX = target.x;
			cur.untilDir = target.x !== undefined ? (target.x >= this.x ? 1 : -1) : 0;
			cur.settle = target.then;
			return { then: (a, b) => finished.then(a, b), stop: () => this.stop(), finished };
		}

		// Leave what's playing through the shared rest pose: a one-shot
		// finishes, a loop plays on to its next exit (then settles), and a
		// half-played rise runs back down to rest.
		let here = this.hub;
		let draining = false;
		if (!cut && cur) {
			cur.settle = undefined;
			cur.untilX = undefined;
			if (cur.rise) {
				this.dir = -1;
				cur.stopAt = 0;
				draining = this.frame > 0;
				here = cur.action.from;
			} else if (cur.action.loop) {
				here = cur.action.from;
				if (cur.action.exits?.length) {
					cur.stopAt = this.nextExit(cur.action, this.frame);
					draining = true;
				}
			} else {
				cur.repeat = this.plays;
				draining = true;
				here = cur.action.to;
			}
		} else if (cur) {
			here = cur.action.loop ? cur.action.from : this.hub;
		}

		const clips: Clip[] = [];
		const route = t.route !== false;
		if (route && here !== action.from) {
			for (const hop of this.library.route(here, action.from)) clips.push(this.makeClip(hop, {}, () => {}));
		}
		const main = this.makeClip(action, t, resolve);
		// Turn when this action starts, not mid-way through the last one.
		main.facing = facing;
		main.untilX = target.x;
		main.untilDir = target.x !== undefined ? (target.x >= this.x ? 1 : -1) : 0;
		main.settle = target.then;
		if (cut) this.facing = facing;
		// Coming from rest, a loop starts on its calmest frame, risen into.
		if (!cut && action.loop && t.phase === undefined) {
			if (action.rise && this.library.has(action.rise)) {
				const r = this.makeClip(this.library.action(action.rise), {}, () => {});
				r.silent = true;
				r.rise = true;
				clips.push(r);
			}
			main.startFrame = action.enter ?? 0;
		}
		clips.push(main);
		this.queue = clips;

		if (draining && cur) {
			if (cur.action.loop && cur.stopAt === this.frame) this.finish(cur);
		} else {
			this.clip = null;
			this.advanceClip();
		}

		return {
			then: (a, b) => finished.then(a, b),
			stop: () => this.stop(),
			finished
		};
	}

	private seqId = 0;

	/**
	 * Play actions one after another — each loop action plays one cycle —
	 * routing between rest poses as needed. `loop` repeats the whole chain.
	 *   bob.sequence(['sneak', 'trip', 'get-up', 'dust-off'], { loop: true })
	 * Calling animate() or sequence() again cancels it.
	 */
	sequence(defs: Definition[], opts: { loop?: boolean; transition?: Transition } = {}): PlaybackControls {
		const id = ++this.seqId;
		let resolve!: () => void;
		const finished = new Promise<void>((r) => (resolve = r));
		const step = (i: number): void => {
			if (id !== this.seqId) return resolve();
			if (i >= defs.length) {
				if (!opts.loop) return resolve();
				i = 0;
			}
			this.animate(defs[i], { repeat: 0, ...opts.transition }, true).then(() => step(i + 1));
		};
		step(0);
		return { then: (a, b) => finished.then(a, b), stop: () => this.stop(), finished };
	}

	/** Freeze on the current frame. */
	stop() {
		this.seqId++;
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
		if (next.facing) this.facing = next.facing;
		this.dirty = true;
		this.played = true;
		if (!next.silent) this.emit('start', { action: next.action.name, frame: this.frame });
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
			if (this.plays > c.repeat) {
				// A loop that has played its cycles still leaves on an exit.
				if (!c.action.loop || !c.action.exits?.length || c.stopAt !== undefined) return this.finish(c);
				c.repeat = Infinity;
				c.stopAt = this.nextExit(c.action, 0);
			}
			// A one-shot that ends somewhere else (trip ends lying down) can't
			// just restart at frame 0 — that snaps. Rest for repeatDelay, take
			// the inverse route home (get-up), then play it again.
			if (!c.action.loop && c.repeatType === 'loop' && c.action.to !== c.action.from) {
				return this.replayVia(c);
			}
			if (c.repeatType === 'loop') f = c.action.loop ? f - n * Math.sign(f) : 0;
			else {
				this.dir = -this.dir;
				f = this.frame + this.dir;
			}
			if (c.repeatDelay > 0) this.waiting = c.repeatDelay;
		}
		this.frame = Math.max(0, Math.min(n - 1, f));
		if (this.slide.left > 0) {
			this.x += this.slide.per;
			this.slide.left--;
		}
		// Root motion: the baked dx carries the planted foot exactly.
		if (!c.inPlace) {
			const dx = c.action.dx[this.frame] * this.scale * this.facing * this.dir;
			this.x += dx;
			if (c.untilX !== undefined) {
				const left = (c.untilX - this.x) * c.untilDir!;
				if (c.action.loop && c.action.exits?.includes(this.frame)) {
					// Stop on the exit nearest the target and glide the rest.
					if (left <= this.travelToNextExit(c) / 2) {
						this.slide = { per: (c.untilX - this.x) / 6, left: 6 };
						this.dirty = true;
						this.enterFrame(c);
						return this.finish(c);
					}
				} else if (left <= 0) {
					// Overshot between exits: hold x, step on to an exit in place.
					this.x = c.untilX;
					if (c.action.loop && c.action.exits?.length) {
						c.inPlace = true;
						c.stopAt = this.nextExit(c.action, this.frame);
					} else {
						this.dirty = true;
						return this.finish(c);
					}
				}
			}
		}
		this.dirty = true;
		this.enterFrame(c);
		if (c.stopAt === this.frame) this.finish(c);
	}

	/** First exit at or after this frame, in play order. */
	private nextExit(action: ActionInfo, frame: number) {
		const n = action.frames;
		for (let k = 0; k < n; k++) {
			const f = (((frame + k * this.dir) % n) + n) % n;
			if (action.exits!.includes(f)) return f;
		}
		return frame;
	}

	/** Stage px this clip covers between the current frame and its next exit. */
	private travelToNextExit(c: Clip) {
		const n = c.action.frames;
		let sum = 0;
		for (let k = 1; k <= n; k++) {
			const f = (this.frame + k) % n;
			sum += Math.abs(c.action.dx[f]) * this.scale;
			if (c.action.exits!.includes(f)) break;
		}
		return sum;
	}

	private replayVia(c: Clip) {
		const hops = this.library.route(c.action.to, c.action.from).map((a) => this.makeClip(a, {}, () => {}));
		if (hops.length) hops[0].delay = c.repeatDelay;
		// The replay keeps the original promise and the repeats still owed.
		const again: Clip = { ...c, repeat: c.repeat - this.plays, delay: hops.length ? 0 : c.repeatDelay, startFrame: 0 };
		this.queue.unshift(...hops, again);
		this.advanceClip();
	}

	private finish(c: Clip) {
		this.hub = c.action.loop ? c.action.from : c.action.to;
		if (c.action.baseline[1]) this.y -= c.action.baseline[1] * this.scale;
		if (!c.silent) this.emit('complete', { action: c.action.name, frame: this.frame });
		const settle = c.settle;
		c.resolve();
		// A loop leaves through its settle move into the rest pose.
		const out = c.action.loop ? this.settleFrom(c.action, this.frame) : null;
		if (out) {
			const s = this.makeClip(out, {}, () => {});
			s.silent = true;
			s.settle = settle ?? (c.untilX !== undefined && !this.queue.length ? this.restDef(c) : undefined);
			this.queue.unshift(s);
			return this.advanceClip();
		}
		if (this.queue.length) return this.advanceClip();
		this.clip = null;
		if (settle !== undefined) this.animate(settle);
		else if (c.action.next && this.library.has(c.action.next)) this.animate(c.action.next, { route: false });
		else if (c.untilX !== undefined) this.animate(this.restDef(c));
	}

	private restDef(c: Clip): Definition {
		return this.variants.idle ?? (this.library.has('idle') ? 'idle' : c.action.name);
	}

	private settleFrom(action: ActionInfo, frame: number): ActionInfo | null {
		const i = action.exits?.indexOf(frame) ?? -1;
		const name = i >= 0 ? action.settle?.[i] : null;
		return name && this.library.has(name) ? this.library.action(name) : null;
	}
}

export const createCharacter = (opts?: CharacterOptions) => new Character(opts);
