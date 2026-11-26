// Bakes the animated banner at the top of the README.
//
//   npx tsx scripts/readme-banner.ts      → .github/readme/banner-{light,dark}.svg
//
// GitHub strips scripts, styles and webfonts from README markdown, but an
// <img> of an SVG keeps its own CSS animation and an embedded data: font. So
// the banner is the library's own trick, frozen into CSS: each figure is one
// <text> run of frame glyphs, clipped to a single cell, and a steps() animation
// slides the run one glyph per frame. A second animation moves the cell
// through the scene. Two transforms per figure, no script.
//
// The figures are baked here from the rig (the same bake() as the fonts), only
// the frames the scene uses, plus a ladder climb the family doesn't have yet.
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import polygonClipping from 'polygon-clipping';
import { bake, type ActionDef, type BakedAction } from '../packages/rig/timeline.ts';
import { emit, removeOverlaps } from '../packages/rig/geometry.ts';
import { fk, POINT_NAMES, STAND, type Joints } from '../packages/rig/skeleton.ts';
import { settlesFor } from '../packages/rig/settle.ts';
import FAMILY from '../packages/stick/family.ts';
import { exportWoff2 } from '../src/lib/font/exportWoff2.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repo, '.github/readme');

// ----- scene constants -----

const FPS = 24;
const W = 880;
const H = 352;
// Figure scale: px per font unit in the scene, and in the title.
const K = 0.05;
// A frame's cell in the strip. Wider than any ink (±536) so neighbours stay clipped.
const CELL = 1200;
// Glyphs per <text> run in a strip (see main).
const RUN = 24;
const STAND_Y = 353; // pelvis height of STAND, feet on y = 0
const THEMES = {
	light: { ink: '#0F0F0E', line: '#9A9A96' },
	dark: { ink: '#ECECE8', line: '#6B6B68' }
};

// ----- actions -----

const build = FAMILY.build;
const opts = { build, weight: build.weight, parts: 'full' as const, skin: FAMILY.skin };
const SETTLE = settlesFor(FAMILY.actions, FAMILY.hubs, opts);

// Ladder climb, from behind. The ladder is drawn face on, so the climber
// turns their back to us: hands on both rails, knees out. The profile rig has
// no back view, so these frames are posed straight as joints (two-bone IK)
// and drawn with the family's skin. Gripping hands and feet slide down the
// glyph exactly as fast as the body rises, so they stay on their rungs; each
// half-cycle moves one hand and the opposite foot up a rung.
type V = [number, number];
const RUNG = 140;
const HALF = 10; // frames per rung
const RAIL = 115; // hands and feet sit on the rails, ±RAIL from the pelvis
const HAND_Y: [number, number] = [280, 420]; // low, high (pelvis-relative)
const FOOT_Y: [number, number] = [HAND_Y[0] - 4 * RUNG, HAND_Y[1] - 4 * RUNG];
// Pelvis above the floor on the first rung, and below the ledge on the last,
// where the hands hold the top rung of the ladder's extension.
const ON_Y = -FOOT_Y[0];
const TOP_RUNG = 240; // rail extension above the ledge, to the top rung
const OFF_Y = TOP_RUNG - HAND_Y[1];

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// Two bones from `root` toward `target`, the joint between them bent away
// from the body's centre line (elbows and knees out). Returns [joint, end].
function limb(root: V, target: V, l1: number, l2: number): [V, V] {
	const dx = target[0] - root[0];
	const dy = target[1] - root[1];
	const dist = Math.hypot(dx, dy);
	const d = Math.min(l1 + l2 - 1, Math.max(Math.abs(l1 - l2) + 1, dist));
	const [ux, uy] = [dx / dist, dy / dist];
	const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
	const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
	const c1: V = [root[0] + ux * a - uy * h, root[1] + uy * a + ux * h];
	const c2: V = [root[0] + ux * a + uy * h, root[1] + uy * a - ux * h];
	const side = Math.sign(target[0]) || 1;
	return [c1[0] * side > c2[0] * side ? c1 : c2, [root[0] + ux * d, root[1] + uy * d]];
}

// Back view, pelvis at the origin. Left is −x: we're behind them.
function backJoints(hL: V, hR: V, fL: V, fR: V, sway = 0): Joints {
	const pelvis: V = [sway * 0.4, 0];
	const shoulder: V = [sway, build.torso];
	const [elbowL, handL] = limb(shoulder, hL, build.upperArm, build.foreArm);
	const [elbowR, handR] = limb(shoulder, hR, build.upperArm, build.foreArm);
	const [kneeL, footL] = limb(pelvis, fL, build.thigh, build.shin);
	const [kneeR, footR] = limb(pelvis, fR, build.thigh, build.shin);
	return {
		pelvis,
		shoulder,
		spineMid: lerpV(pelvis, shoulder, 0.5),
		head: [sway, build.torso + build.neck + build.headR],
		headRx: build.headR,
		headRy: build.headR,
		headRot: 0,
		elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR
	};
}

function climbJoints(frame: number): Joints {
	const half = Math.floor(frame / HALF) % 2;
	const u = (frame % HALF) / HALF;
	const e = smooth(u / 0.8);
	const grip = (y: [number, number], x: number): V => [x, y[1] - RUNG * u];
	const swing = (y: [number, number], x: number): V => [x * (1 - 0.12 * Math.sin(Math.PI * e)), y[0] + RUNG * e];
	// Half 0: left hand + right foot grip, the others reach. Half 1 swaps.
	const s = half === 0 ? 1 : -1;
	const hL = s > 0 ? grip(HAND_Y, -RAIL) : swing(HAND_Y, -RAIL);
	const hR = s > 0 ? swing(HAND_Y, RAIL) : grip(HAND_Y, RAIL);
	const fR = s > 0 ? grip(FOOT_Y, RAIL) : swing(FOOT_Y, RAIL);
	const fL = s > 0 ? swing(FOOT_Y, -RAIL) : grip(FOOT_Y, -RAIL);
	// The body leans a touch toward the hand that's pulling.
	return backJoints(hL, hR, fL, fR, -s * 14 * Math.sin(Math.PI * u));
}

function lerpJoints(a: Joints, b: Joints, t: number): Joints {
	const out = { ...a };
	for (const n of POINT_NAMES) out[n] = lerpV(a[n], b[n], t);
	out.headRx = lerp(a.headRx, b.headRx, t);
	out.headRy = lerp(a.headRy, b.headRy, t);
	out.headRot = lerp(a.headRot, b.headRot, t);
	return out;
}

// Each posed frame plus its pelvis height (units) over its reference line.
interface Posed {
	joints: Joints;
	pelvis: number;
}
const CLIMB0 = climbJoints(0);
// Standing with their back to us at the foot or the top of the ladder. Cutting
// to it from profile reads as turning to face the ladder.
const FOOT_DOWN = -(STAND_Y - build.weight / 2);
const BACK_STAND = backJoints([-62, -10], [62, -10], [-52, FOOT_DOWN], [52, FOOT_DOWN]);
const morph = (from: Joints, to: Joints, p0: number, p1: number, n: number): Posed[] =>
	Array.from({ length: n }, (_, i) => {
		const t = smooth(i / n);
		return { joints: lerpJoints(from, to, t), pelvis: lerp(p0, p1, t) };
	});
const hold = (j: Joints, p: number, n: number): Posed[] => Array.from({ length: n }, () => ({ joints: j, pelvis: p }));
// Bottom: turn to the ladder, step up onto the first rung.
const LADDER_ON: Posed[] = [...hold(BACK_STAND, STAND_Y, 3), ...morph(BACK_STAND, CLIMB0, STAND_Y, ON_Y, 6)];
// Top: from the last rung, a knee onto the ledge, stand up, turn round.
const MOUNT = backJoints([-RAIL, TOP_RUNG - 70], [RAIL, TOP_RUNG - 70], [30, -70], [RAIL, -70 - RUNG]);
const LADDER_OFF: Posed[] = [
	...morph(CLIMB0, MOUNT, OFF_Y, 70, 6),
	...morph(MOUNT, BACK_STAND, 70, STAND_Y, 7),
	...hold(BACK_STAND, STAND_Y, 4)
];

const DEFS = new Map<string, ActionDef>([...FAMILY.actions, ...SETTLE.defs].map((d) => [d.name, d]));
const INFO = SETTLE.info;
const baked = new Map<string, BakedAction>();
// Posed frames go in as actions of their own, drawn by the skin, no travel.
function posed(name: string, frames: Joints[]) {
	const def = { name, category: 'transition', description: '', frames: frames.length, fps: FPS, loop: false, keys: [] } satisfies ActionDef;
	baked.set(name, {
		def,
		frames: frames.map((j) => ({ contours: FAMILY.skin.draw(j, opts.weight, 'full'), anchors: j as never, dx: 0, air: 0 }))
	});
}
posed('ladder-climb', Array.from({ length: HALF * 2 }, (_, i) => climbJoints(i)));
posed('ladder-on', LADDER_ON.map((p) => p.joints));
posed('ladder-off', LADDER_OFF.map((p) => p.joints));

function action(name: string): BakedAction {
	if (!baked.has(name)) {
		const def = DEFS.get(name);
		if (!def) throw new Error(`No action ${name}`);
		baked.set(name, bake(def, opts));
	}
	return baked.get(name)!;
}

// ----- glyphs used by the scene -----

const glyphs = new Map<string, number>(); // "action:frame" → codepoint
const BLANK = 0xe000;
let nextCp = BLANK + 1;
function cp(name: string, frame: number) {
	const key = `${name}:${frame}`;
	if (!glyphs.has(key)) glyphs.set(key, nextCp++);
	return glyphs.get(key)!;
}

// ----- sequencing -----

interface Tick {
	cp: number;
	x: number;
	y: number;
	facing: 1 | -1;
}

// A figure's whole loop, one entry per 1/24 s.
class Actor {
	ticks: Tick[] = [];
	facing: 1 | -1;
	constructor(
		public x: number,
		public y: number,
		facing: 1 | -1 = 1,
		/** Ground height under x, for anything walking. */
		public ground: ((x: number) => number) | null = null,
		/** Move with root motion (off for the title, which performs in place). */
		public travel = true,
		/** px per font unit. */
		public k = K
	) {
		this.facing = facing;
	}

	private put(code: number) {
		this.ticks.push({ cp: code, x: this.x, y: this.ground ? this.ground(this.x) : this.y, facing: this.facing });
	}

	/** Show one frame of an action for as long as its fps asks, moving by its dx × scale. */
	frame(name: string, i: number, scale = 1, dir: 1 | -1 = 1) {
		const a = action(name);
		const per = FPS / a.def.fps;
		if (this.travel) this.x += dir * a.frames[i].dx * this.k * scale * this.facing;
		for (let t = 0; t < per; t++) this.put(cp(name, i));
	}

	/** Play frames [from, to) of an action (or all), reversed if asked. */
	play(name: string, { from = 0, to, reverse = false, scale = 1 }: { from?: number; to?: number; reverse?: boolean; scale?: number } = {}) {
		const n = action(name).frames.length;
		const end = to ?? n;
		if (!reverse) for (let i = from; i < end; i++) this.frame(name, i, scale);
		else for (let i = end - 1; i >= from; i--) {
			// Backwards undoes the move that led into frame i+1.
			const a = action(name);
			if (this.travel && i + 1 < n) this.x -= a.frames[i + 1].dx * this.k * scale * this.facing;
			this.frame(name, i, 0);
		}
		return this;
	}

	/** Loop an in-place action for `ticks` ticks, starting at `from`. */
	loop(name: string, ticks: number, from = 0) {
		const a = action(name);
		const per = FPS / a.def.fps;
		let i = from;
		for (let t = 0; t < ticks; t++) {
			this.put(cp(name, i));
			if ((t + 1) % per === 0) i = (i + 1) % a.frames.length;
		}
		return this;
	}

	/** Rise into a loop, play it `cycles` times, settle back to rest. */
	cycles(name: string, cycles: number) {
		const info = INFO.get(name)!;
		const n = action(name).frames.length;
		if (info.rise) this.play(info.rise);
		for (let k = 0; k < cycles * n; k++) this.frame(name, (info.enter + k) % n);
		const ei = info.exits.indexOf(info.enter);
		const settle = info.settle[ei];
		if (settle) this.play(settle);
		return this;
	}

	/** Stand still for `ticks`, breathing. */
	idle(ticks: number) {
		return this.loop('idle', ticks);
	}

	turn() {
		this.facing = this.facing === 1 ? -1 : 1;
		return this;
	}

	/**
	 * Walk (or jog…) to x and stop there: rise into the gait, loop to the exit
	 * that lands closest, settle. Strides are scaled by a few percent so the
	 * stop is exact — a ladder needs the hands on the rails.
	 */
	go(x: number, gait = 'walk') {
		const want = x - this.x;
		const dir = Math.sign(want) as 1 | -1;
		if (dir !== this.facing) this.turn();
		const info = INFO.get(gait)!;
		const a = action(gait);
		const n = a.frames.length;
		const riseDx = info.rise ? action(info.rise).frames.reduce((s, f) => s + f.dx, 0) : 0;
		// Find the run of frames whose distance best matches.
		let best = { frames: 0, exit: 0, scale: 0, err: Infinity };
		let dist = riseDx;
		for (let k = 0; k < n * 40; k++) {
			const i = (info.enter + k) % n;
			dist += a.frames[i].dx;
			const next = (i + 1) % n;
			const ei = info.exits.indexOf(next);
			if (ei < 0 || k < n / 2) continue;
			const scale = Math.abs(want) / (dist * this.k);
			const err = Math.abs(scale - 1);
			if (err < best.err) best = { frames: k + 1, exit: ei, scale, err };
			if (scale < 0.85) break;
		}
		if (info.rise) this.play(info.rise, { scale: best.scale });
		for (let k = 0; k < best.frames; k++) this.frame(gait, (info.enter + k) % n, best.scale);
		const settle = info.settle[best.exit];
		if (settle) this.play(settle);
		this.x = x;
		return this;
	}

	/**
	 * Climb the ladder at `lx` from the floor at `bottom` to the ledge at `top`
	 * (px), or back down. Ladder frames are anchored at the pelvis, so y here
	 * is the pelvis; `arrive` is the ground at the other end.
	 */
	climb(lx: number, bottom: number, top: number, arrive: (x: number) => number, down = false) {
		const halves = ((bottom - top) / K - ON_Y + OFF_Y) / RUNG;
		if (Math.abs(halves - Math.round(halves)) > 0.01 || Math.round(halves) % 2) throw new Error(`Ladder at ${lx} doesn't fit whole climb cycles (${halves} rungs)`);
		if (Math.abs(this.x - lx) > 0.5) throw new Error(`Not at the ladder at ${lx} (x ${this.x.toFixed(1)})`);
		const steps = Math.round(halves) * HALF;
		if (process.env.DEBUG) console.log(`climb ${down ? "down" : "up"} at ${lx}: ${(this.ticks.length / FPS).toFixed(3)}s`);
		const seq: [string, number, number][] = [];
		LADDER_ON.forEach((p, i) => seq.push(['ladder-on', i, bottom - p.pelvis * K]));
		for (let s = 0; s < steps; s++) seq.push(['ladder-climb', s % (HALF * 2), bottom - (ON_Y + (s * RUNG) / HALF) * K]);
		LADDER_OFF.forEach((p, i) => seq.push(['ladder-off', i, top - p.pelvis * K]));
		if (down) seq.reverse();
		this.ground = null;
		this.x = lx;
		for (const [name, i, y] of seq) {
			this.y = y;
			this.put(cp(name, i));
		}
		this.ground = arrive;
		return this;
	}

	/** Pad with idle to exactly `ticks` long. */
	fill(ticks: number, name = 'idle') {
		if (this.ticks.length > ticks) throw new Error(`Actor runs ${this.ticks.length} ticks, loop is ${ticks}`);
		return this.loop(name, ticks - this.ticks.length);
	}
}

// ----- the title -----

const TITLE = { size: 66, baseline: 92, tracking: -0.035, fig: 1.15 };

async function interTight(): Promise<opentype.Font> {
	const cache = join(repo, 'node_modules/.cache/readme-banner/inter-tight-800.ttf');
	let bytes: Buffer;
	try {
		bytes = await readFile(cache);
	} catch {
		const css = await (await fetch('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@800&text=FlipbookFoundry')).text();
		const url = css.match(/url\((.+?)\)/)?.[1];
		if (!url) throw new Error('No Inter Tight in the Google Fonts response');
		bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
		await mkdir(dirname(cache), { recursive: true });
		await writeFile(cache, bytes);
	}
	return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

/** Set a word in Inter Tight 800 as one path; returns it and its advance. */
function word(font: opentype.Font, text: string, x: number, y: number, size: number) {
	const s = size / font.unitsPerEm;
	let d = '';
	let prev: opentype.Glyph | null = null;
	for (const ch of text) {
		const g = font.charToGlyph(ch);
		if (prev) x += font.getKerningValue(prev, g) * s;
		// @types/opentype.js predates the options object; flipY: false keeps y-down.
		d += font.getPath(ch, x, y, size, { kerning: false }).toPathData({ decimalPlaces: 1, flipY: false } as unknown as number);
		x += (g.advanceWidth ?? 0) * s + TITLE.tracking * size;
		prev = g;
	}
	return { d, end: x - TITLE.tracking * size };
}

// ----- the scene -----

// Girders: y at x = 0 and slope, spanning [x0, x1]. Slight alternating
// slopes; ladders sit where the gap between two girders is a whole number of
// climb cycles.
interface Girder {
	y: number;
	slope: number;
	x0: number;
	x1: number;
}
const at = (g: Girder) => (x: number) => g.y + g.slope * x;
const GAP = (ON_Y - OFF_Y + RUNG * 6) * K; // floor to ledge for a six-rung climb, px
const SLOPE = 0.018;
const BOTTOM: Girder = { y: 322 - 0 * SLOPE, slope: 0, x0: 40, x1: 840 };
const L1 = 612; // bottom → middle
const MIDDLE: Girder = { y: at(BOTTOM)(L1) - GAP - SLOPE * L1, slope: SLOPE, x0: 96, x1: 840 };
const L2 = 236; // middle → top
const TOP: Girder = { y: at(MIDDLE)(L2) - GAP + SLOPE * L2, slope: -SLOPE, x0: 96, x1: 700 };

const FIVE = 320 * K; // pelvis gap for a high-five (hands meet at 160 each)

function choreograph(title: { x: number; y: number; k: number }) {
	const bottom = at(BOTTOM);
	const middle = at(MIDDLE);
	const top = at(TOP);

	// The climber: up both ladders, a cheer at the top, back down both, a
	// high-five at the bottom, home.
	const climber = new Actor(470, 0, 1, bottom);
	const meet = L1 + 22;
	climber.idle(24);
	climber.go(L1);
	climber.climb(L1, bottom(L1), middle(L1), middle);
	climber.go(L2, 'jog');
	climber.climb(L2, middle(L2), top(L2), top);
	climber.go(168).idle(8).turn().idle(6);
	climber.cycles('cheer', 2);
	climber.go(L2).idle(10);
	climber.climb(L2, middle(L2), top(L2), middle, true);
	climber.go(L1, 'jog');
	climber.idle(4);
	climber.climb(L1, bottom(L1), middle(L1), bottom, true);
	climber.go(meet);
	const hiFive = climber.ticks.length;
	climber.play('high-five');
	climber.idle(10);
	climber.go(470).idle(12).turn();

	// The friend at the bottom: waits, high-fives on the climber's return.
	const friend = new Actor(meet + FIVE, 0, -1, bottom);
	friend.idle(60).play('look-around').idle(30).play('yawn');
	friend.idle(Math.max(0, hiFive - friend.ticks.length - 70));
	friend.cycles('tap-foot', 2);
	friend.idle(hiFive - friend.ticks.length).play('high-five');

	// Sitting on the end of the top girder, legs over the edge.
	const sitter = new Actor(TOP.x1 - 4, top(TOP.x1), 1);
	// Hanging under the middle girder near its left end.
	const hanger = new Actor(150, middle(150), 1);

	// The figure in the title, between the words.
	const star = new Actor(title.x, title.y, 1, null, false, title.k);
	star.idle(36).play('wave-hello').idle(60).play('backflip').idle(48).play('shrug').idle(40);
	star.cycles('clap', 2).idle(36).play('bow');

	return { actors: [star, sitter, hanger, friend, climber], loops: new Map<Actor, string>([[sitter, 'perch-idle'], [hanger, 'hang-swing']]) };
}

// DEBUG=1: the biggest tick-to-tick jumps of any head, hand or foot, in px —
// where a cut between actions pops.
function jumps(actors: Actor[]) {
	const byCp = new Map([...glyphs].map(([k, v]) => [v, k]));
	const PTS = ['head', 'handL', 'handR', 'footL', 'footR', 'pelvis'] as const;
	const world = (a: Actor, t: Tick) => {
		const [name, i] = byCp.get(t.cp)!.split(':');
		const an = action(name).frames[+i].anchors as unknown as Record<string, [number, number]>;
		return PTS.map((p) => [t.x + an[p][0] * a.k * t.facing, t.y - an[p][1] * a.k]);
	};
	const out: { d: number; at: string; what: string }[] = [];
	actors.forEach((a, ai) => {
		const n = a.ticks.length;
		for (let i = 0; i < n; i++) {
			const t0 = a.ticks[i];
			const t1 = a.ticks[(i + 1) % n];
			const p0 = world(a, t0);
			const p1 = world(a, t1);
			// Left and right can swap names across a turn; compare as sets.
			const d = Math.max(...p1.map((q) => Math.min(...p0.map((r) => Math.hypot(q[0] - r[0], q[1] - r[1])))));
			const cut = byCp.get(t0.cp)!.split(':')[0] !== byCp.get(t1.cp)!.split(':')[0] || t0.facing !== t1.facing;
			if (cut || i === n - 1) out.push({ d, at: `actor ${ai} @${((i + 1) / FPS).toFixed(2)}s`, what: `${byCp.get(t0.cp)} → ${byCp.get(t1.cp)}${t0.facing !== t1.facing ? ' (turn)' : ''}${i === n - 1 ? ' (loop)' : ''}` });
		}
	});
	out.sort((a, b) => b.d - a.d);
	for (const o of out.slice(0, 25)) console.log(o.d.toFixed(1).padStart(5), o.at.padEnd(18), o.what);
}

// ----- output -----

// A turn, or a jump in position (a frame anchored at the pelvis after one
// anchored at the feet), happens at once: tweening it would slide the old
// frame across the gap for a tick.
const cut = (a: Tick, b: Tick) => a.facing !== b.facing || Math.hypot(b.x - a.x, b.y - a.y) > 4;

function keyframes(name: string, ticks: Tick[], total: number) {
	// Keep a tick only where the motion bends or the figure turns.
	const keep: number[] = [0];
	const tol = 0.25;
	for (let i = 1; i < ticks.length - 1; i++) {
		const a = ticks[keep[keep.length - 1]];
		const b = ticks[i];
		const c = ticks[i + 1];
		if (cut(b, c) || cut(ticks[i - 1], b)) {
			keep.push(i);
			continue;
		}
		// Would dropping b (interpolating a → c) misplace any tick in between?
		const i0 = keep[keep.length - 1];
		let ok = true;
		for (let j = i0 + 1; j <= i + 1 && ok; j++) {
			const t = (j - i0) / (i + 1 - i0);
			const x = a.x + (c.x - a.x) * t;
			const y = a.y + (c.y - a.y) * t;
			if (Math.abs(ticks[j].x - x) > tol || Math.abs(ticks[j].y - y) > tol) ok = false;
		}
		if (!ok) keep.push(i);
	}
	keep.push(ticks.length - 1);
	const r = (v: number) => Math.round(v * 100) / 100;
	const pct = (i: number) => Math.round((i / total) * 1e6) / 1e4;
	const tf = (t: Tick) => `translate(${r(t.x)}px,${r(t.y)}px) scale(${t.facing},1)`;
	// At a cut, hold the old transform until the instant of the new one.
	const frames = keep.flatMap((i, n) => {
		const at = `${pct(i)}%{transform:${tf(ticks[i])}}`;
		const prev = ticks[keep[n - 1]];
		return n > 0 && keep[n - 1] === i - 1 && cut(prev, ticks[i]) ? [`${(pct(i) - 0.0001).toFixed(4)}%{transform:${tf(prev)}}`, at] : [at];
	});
	// Hold the last tick until the loop restarts.
	frames.push(`100%{transform:${tf(ticks[ticks.length - 1])}}`);
	return { css: `@keyframes ${name}{${frames.join('')}}`, first: tf(ticks[0]).replace(/px/g, '').replace(/,/g, ' ') };
}

async function fontFace() {
	const glyphList = [
		new opentype.Glyph({ name: '.notdef', advanceWidth: CELL, path: new opentype.Path() }),
		new opentype.Glyph({ name: 'blank', unicode: BLANK, advanceWidth: CELL, path: new opentype.Path() })
	];
	for (const [key, code] of glyphs) {
		const [name, i] = key.split(':');
		const path = new opentype.Path();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		emit(removeOverlaps(action(name).frames[+i].contours, polygonClipping.union as any), path, CELL / 2);
		glyphList.push(new opentype.Glyph({ name: key.replace(/[^a-z0-9]/gi, '_'), unicode: code, advanceWidth: CELL, path }));
	}
	const font = new opentype.Font({ familyName: 'Banner Stick', styleName: 'Regular', unitsPerEm: 1000, ascender: 1100, descender: -900, glyphs: glyphList });
	const woff2 = await exportWoff2(new Uint8Array(font.toArrayBuffer()));
	return { css: `@font-face{font-family:B;src:url(data:font/woff2;base64,${Buffer.from(woff2).toString('base64')}) format("woff2")}`, bytes: woff2.byteLength };
}

function girderSvg(g: Girder) {
	const y = at(g);
	const line = (dy: number) => `M${g.x0} ${(y(g.x0) + dy).toFixed(2)}L${g.x1} ${(y(g.x1) + dy).toFixed(2)}`;
	// Two rails with a zigzag truss between them.
	let truss = `M${g.x0} ${y(g.x0).toFixed(2)}`;
	for (let x = g.x0, k = 0; x <= g.x1; x += 8, k++) truss += `L${x} ${(y(x) + (k % 2 ? 5 : 0)).toFixed(2)}`;
	return `<path d="${line(0)}${line(5)}"/><path d="${truss}" class="t"/>`;
}

function ladderSvg(lx: number, yBottom: number, yTop: number) {
	const half = RAIL * K;
	// Rails run past the ledge so there's something to hold climbing off it.
	const end = yTop - (TOP_RUNG + 20) * K;
	let d = `M${lx - half} ${end}V${yBottom}M${lx + half} ${end}V${yBottom}`;
	// Rungs where the climb grips them, every RUNG up from the floor.
	for (let y = yBottom - RUNG * K; y >= yTop - TOP_RUNG * K - 0.01; y -= RUNG * K) d += `M${lx - half} ${y.toFixed(2)}h${(half * 2).toFixed(2)}`;
	return `<path d="${d}"/>`;
}

async function main() {
	const inter = await interTight();

	// Title: "Flipbook", a figure, "Foundry", centred.
	const t0 = word(inter, 'Flipbook', 0, 0, TITLE.size);
	const figGap = (0.04 + 0.56 * TITLE.fig + 0.14) * TITLE.size;
	const t1 = word(inter, 'Foundry', 0, 0, TITLE.size);
	const titleW = t0.end + figGap + t1.end;
	const left = (W - titleW) / 2;
	const figK = (TITLE.size * TITLE.fig) / 1000;
	const { actors, loops } = choreograph({
		x: left + t0.end + (0.04 + 0.28 * TITLE.fig) * TITLE.size,
		y: TITLE.baseline + 0.02 * TITLE.size * TITLE.fig,
		k: figK
	});
	// Whole cycles of the 32-frame loops, so the restart doesn't pop.
	const total = Math.ceil(Math.max(...actors.map((a) => a.ticks.length)) / 96) * 96;
	for (const a of actors) a.fill(total, loops.get(a));
	if (process.env.DEBUG) jumps(actors);
	const font = await fontFace();
	const seconds = (total / FPS).toFixed(4);
	const titleSvg =
		word(inter, 'Flipbook', left, TITLE.baseline, TITLE.size).d + word(inter, 'Foundry', left + t0.end + figGap, TITLE.baseline, TITLE.size).d;

	const css: string[] = [font.css];
	const bodies: string[] = [];
	actors.forEach((a, i) => {
		const k = keyframes(`m${i}`, a.ticks, total);
		css.push(k.css, `@keyframes s${i}{to{transform:translateX(${-total * CELL}px)}}`);
		css.push(`.m${i}{animation:m${i} ${seconds}s linear infinite}.s${i}{animation:s${i} ${seconds}s steps(${total}) infinite}`);
		// The strip is cut into short runs, each placed exactly. Firefox rounds
		// every glyph advance a hair, and over a thousand frames one long run
		// drifts several px off its cell.
		const runs: string[] = [];
		for (let r = 0; r < a.ticks.length; r += RUN) {
			const text = a.ticks.slice(r, r + RUN).map((t) => String.fromCodePoint(t.cp)).join('');
			runs.push(`<text x="${r * CELL - CELL / 2}">${text}</text>`);
		}
		bodies.push(`<g class="m${i}" transform="${k.first}"><g transform="scale(${a.k})" clip-path="url(#c)"><g class="s${i}">${runs.join('')}</g></g></g>`);
	});

	await mkdir(outDir, { recursive: true });
	for (const [theme, c] of Object.entries(THEMES)) {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Flipbook Foundry: stick figures climbing ladders between girders">
<style>${css.join('')}
text{font:1000px B;fill:${c.ink}}.g{fill:none;stroke:${c.line};stroke-width:1.25;stroke-linecap:round}.g .t{stroke-width:.75}
@media (prefers-reduced-motion:reduce){[class^=m],[class^=s]{animation:none}}</style>
<defs><clipPath id="c"><rect x="${-CELL / 2}" y="-1100" width="${CELL}" height="2050"/></clipPath></defs>
<path d="${titleSvg}" fill="${c.ink}"/>
<g class="g">${[BOTTOM, MIDDLE, TOP].map(girderSvg).join('')}${ladderSvg(L1, at(BOTTOM)(L1), at(MIDDLE)(L1))}${ladderSvg(L2, at(MIDDLE)(L2), at(TOP)(L2))}</g>
${bodies.join('\n')}
</svg>`;
		await writeFile(join(outDir, `banner-${theme}.svg`), svg);
		console.log(`banner-${theme}.svg: ${(svg.length / 1024).toFixed(0)} KB (font ${(font.bytes / 1024).toFixed(0)} KB, ${glyphs.size} glyphs, ${seconds}s loop)`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
