// Behaviours: small composable brains for crowds. A behaviour is a function
// run once per frame per character; it only ever calls character.animate()
// — so everything a crowd does is still just glyph sequencing.
//
//   stage.add({ x, y }).use(wander({ area: [0, 1200] }), greet())

import type { Character, Definition } from './character';
import type { Stage } from './stage';

/** `now` is the frameloop timestamp in ms. */
export type Behavior = (c: Character, stage: Stage, now: number) => void;

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const range = ([a, b]: [number, number]) => a + Math.random() * (b - a);

interface Mind {
	busy: boolean;
	until: number;
	lastGreet: number;
	partner: Character | null;
}

const mind = (c: Character): Mind =>
	((c.data.mind as Mind) ??= { busy: false, until: 0, lastGreet: -1e9, partner: null });

export interface WanderOptions {
	/** Horizontal range in stage px. */
	area?: [number, number];
	/** Gaits picked per trip, weighted by repetition. */
	gaits?: string[];
	/** One-shots/loops played on arrival. */
	idles?: Definition[];
	/** Seconds spent idling between trips. */
	pause?: [number, number];
	/** Chance per trip of a pratfall on the way (0–1). */
	clumsiness?: number;
	pratfalls?: string[];
}

export function wander(opts: WanderOptions = {}): Behavior {
	const gaits = opts.gaits ?? ['walk', 'walk', 'walk', 'jog', 'run', 'skip', 'march', 'sneak'];
	const idles = opts.idles ?? ['idle', 'look-around', 'tap-foot', 'yawn', 'shrug', 'think', 'dance', 'fidget', 'wave', 'flex'];
	const pause = opts.pause ?? [0.8, 4];
	const clumsy = opts.clumsiness ?? 0.08;
	const falls = opts.pratfalls ?? ['trip', 'stumble', 'slip', 'faceplant'];
	return (c, stage, now) => {
		const m = mind(c);
		if (m.busy || now < m.until) return;
		const [x0, x1] = opts.area ?? [20, stage.width - 20];
		const lib = c.library;
		const gait = pick(gaits.filter((g) => lib.has(g)));
		const target = range([x0, x1]);
		m.busy = true;
		const arrive = () => {
			const idle = pick(idles);
			const name = typeof idle === 'string' ? idle : idle.action;
			if (!lib.has(name)) return done();
			const a = lib.action(name);
			c.animate(idle).then(done);
			// Loops never finish on their own — idle for a while instead.
			if (a.loop) setTimer(range(pause) * 1000, done);
		};
		const done = () => {
			m.busy = false;
			m.until = now + range(pause) * 1000 * 0.3;
		};
		if (Math.random() < clumsy) {
			// Head off, and come a cropper partway there.
			const mid = c.x + (target - c.x) * range([0.3, 0.7]);
			c.animate({ action: gait, x: mid })
				.then(() => c.animate(pick(falls.filter((f) => lib.has(f)))))
				.then(() => c.animate('idle'))
				.then(done);
			return;
		}
		c.animate({ action: gait, x: target, then: 'idle' }).then(arrive);
	};
}

export interface GreetOptions {
	/** Distance (px) at which two figures notice each other. */
	radius?: number;
	/** Max ground-line difference (px) to count as the same row. */
	row?: number;
	/** Seconds before the same figure greets again. */
	cooldown?: number;
	actions?: string[];
}

export function greet(opts: GreetOptions = {}): Behavior {
	const radius = opts.radius ?? 70;
	const row = opts.row ?? 10;
	const cooldown = (opts.cooldown ?? 8) * 1000;
	const actions = opts.actions ?? ['wave', 'high-five', 'bow', 'salute', 'shrug'];
	return (c, stage, now) => {
		const m = mind(c);
		if (m.partner || now - m.lastGreet < cooldown) return;
		const lib = c.library;
		const scaledRadius = radius * (c.size / 64);
		for (const o of stage.characters) {
			if (o === c) continue;
			const om = mind(o);
			if (om.partner || now - om.lastGreet < cooldown) continue;
			if (Math.abs(o.y - c.y) > row) continue;
			const d = o.x - c.x;
			if (Math.abs(d) > scaledRadius || Math.abs(d) < scaledRadius * 0.4) continue;
			// Face each other and greet in sync. High-fives need a matching pair.
			const act = pick(actions.filter((a) => lib.has(a)));
			m.partner = o;
			om.partner = c;
			m.lastGreet = om.lastGreet = now;
			m.busy = om.busy = true;
			c.facing = d > 0 ? 1 : -1;
			o.facing = d > 0 ? -1 : 1;
			const reply = act === 'high-five' ? 'high-five' : pick(actions.filter((a) => lib.has(a)));
			const finish = (k: Character) => () => {
				const km = mind(k);
				km.partner = null;
				km.busy = false;
				km.until = now;
			};
			c.animate(act).then(finish(c));
			o.animate(reply, { delay: act === 'high-five' ? 0 : 0.25 }).then(finish(o));
			return;
		}
	};
}

// Timers driven off the frameloop clock would be ideal; setTimeout is fine
// for idle durations and keeps behaviours free of extra bookkeeping.
function setTimer(ms: number, fn: () => void) {
	setTimeout(fn, ms);
}
