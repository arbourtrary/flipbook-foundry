// Keys → frames. An action is a list of sparse pose keys on a frame
// timeline; this module eases between them, plants the body on the ground,
// derives root motion from the planted foot (so feet never skate), and adds
// the comic extras — speed lines and impact puffs — directly into the glyph.

import { type Contour, type Vec, add, disc, len, mul, norm, orient, perp, stroke, sub } from './geometry';
import {
	BUILD,
	type Build,
	type JointName,
	type Joints,
	type Pose,
	type PoseInput,
	type Parts,
	STAND,
	drawFigure,
	fk,
	inkPoints,
	translate
} from './skeleton';

export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'snap' | 'hold' | [number, number, number, number];

export interface Key extends PoseInput {
	at: number;
	// Easing from this key to the next.
	ease?: Ease;
	// Spawn an impact puff at the lowest contact on this frame.
	puff?: boolean;
	// Override derived root velocity (units/frame) from this key on.
	vx?: number;
	// Named moment the runtime can sync to (e.g. 'hit', 'release', 'land').
	event?: string;
}

// Rest poses that one-shot actions start and end on. The runtime routes
// between hubs through transition actions (sit-down, get-up, …), so any
// action can follow any other without a pop.
export type Hub = 'stand' | 'crouch' | 'sit' | 'lie' | 'perch' | 'hang';

export type Category =
	| 'idle'
	| 'locomotion'
	| 'aerial'
	| 'gesture'
	| 'emote'
	| 'interaction'
	| 'pratfall'
	| 'transition'
	| 'presence';

export interface ActionDef {
	name: string;
	category: Category;
	description: string;
	frames: number;
	fps: number;
	loop: boolean;
	keys: Key[];
	// 'plant': solver puts the lowest contact on the floor and locks it.
	// 'free': pelvis height comes from the keys (y + lift), x root motion from
	// key x deltas. Both clamp ink to stay at or above the ground.
	ground?: 'plant' | 'free';
	// Which points can be the floor contact while planted.
	contacts?: 'feet' | 'any';
	// Joints that leave speed lines when they move fast.
	trails?: JointName[];
	// Minimum per-frame travel (units) before a trail draws.
	trailSpeed?: number;
	// Extra state carried over to the manifest (hub pose names, etc.)
	tags?: string[];
	// If false, root motion is zeroed (pure in-place action).
	travel?: boolean;
	// Hub this action starts from / ends on (default 'stand').
	from?: Hub;
	to?: Hub;
	// Ground-line moves (font units, + = up) for actions drawn relative to a
	// ledge: `start` applies before frame 0, `end` after the last frame.
	// sit-on is drawn with the ledge as baseline, so it starts 180 up;
	// hop-off lands on the floor 180 below, so it ends 180 down.
	baseline?: { start?: number; end?: number };
	// One-shot that hands straight on to another action (lift → carry).
	next?: string;
	// If false, ink may hang below the baseline — perching on a ledge or
	// hanging from one, where y = 0 is the ledge rather than the floor.
	floor?: boolean;
}

export interface Anchors {
	head: Vec;
	top: Vec;
	handL: Vec;
	handR: Vec;
	footL: Vec;
	footR: Vec;
	pelvis: Vec;
	shoulder: Vec;
	// Spine angle (deg, + = leaning forward) and head radii/rotation, so a
	// runtime can stand a letter in for the torso or head.
	spine: number;
	headR: [number, number];
	headRot: number;
}

export interface BakedFrame {
	contours: Contour[];
	anchors: Anchors;
	dx: number;
	// Lowest ink y relative to ground — 0 when touching, > 0 when airborne.
	air: number;
	event?: string;
}

export interface BakedAction {
	def: ActionDef;
	frames: BakedFrame[];
}

// ----- easing -----

function bezier(x1: number, y1: number, x2: number, y2: number) {
	const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
	const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
	const X = (t: number) => ((ax * t + bx) * t + cx) * t;
	const Y = (t: number) => ((ay * t + by) * t + cy) * t;
	const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
	return (x: number) => {
		let t = x;
		for (let i = 0; i < 8; i++) {
			const e = X(t) - x;
			const d = dX(t);
			if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
			t -= e / d;
		}
		return Y(Math.max(0, Math.min(1, t)));
	};
}

const EASES: Record<Exclude<Ease, number[]>, (t: number) => number> = {
	linear: (t) => t,
	in: (t) => t * t,
	out: (t) => 1 - (1 - t) * (1 - t),
	inOut: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
	// Fast departure, long settle — the comic "snap into the pose".
	snap: bezier(0.1, 0.9, 0.2, 1),
	hold: (t) => (t < 1 ? 0 : 1)
};

export function easeFn(e: Ease = 'inOut'): (t: number) => number {
	return Array.isArray(e) ? bezier(...e) : EASES[e];
}

// ----- interpolation -----

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [
	lerp(a[0], b[0], t),
	lerp(a[1], b[1], t)
];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
	return {
		x: lerp(a.x, b.x, t),
		y: lerp(a.y, b.y, t),
		lift: lerp(a.lift, b.lift, t),
		rot: lerp(a.rot, b.rot, t),
		lean: lerp(a.lean, b.lean, t),
		arch: lerp(a.arch, b.arch, t),
		head: lerp(a.head, b.head, t),
		armL: lerp2(a.armL, b.armL, t),
		armR: lerp2(a.armR, b.armR, t),
		legL: lerp2(a.legL, b.legL, t),
		legR: lerp2(a.legR, b.legR, t),
		squash: lerp(a.squash, b.squash, t),
		headSquash: lerp(a.headSquash, b.headSquash, t),
		reachL: lerp(a.reachL, b.reachL, t),
		reachR: lerp(a.reachR, b.reachR, t),
		strideL: lerp(a.strideL, b.strideL, t),
		strideR: lerp(a.strideR, b.strideR, t)
	};
}

// Resolve sparse keys: each key inherits every unspecified field from the
// key before it (the first inherits from STAND).
export function resolveKeys(keys: Key[]): { key: Key; pose: Pose }[] {
	const sorted = [...keys].sort((a, b) => a.at - b.at);
	let prev: Pose = STAND;
	return sorted.map((k) => {
		const { at: _a, ease: _e, puff: _p, vx: _v, event: _ev, ...fields } = k;
		const p = { ...prev, ...fields } as Pose;
		prev = p;
		return { key: k, pose: p };
	});
}

function toVec(p: Pose): number[] {
	return [
		p.x, p.y, p.lift, p.rot, p.lean, p.arch, p.head,
		p.armL[0], p.armL[1], p.armR[0], p.armR[1], p.legL[0], p.legL[1], p.legR[0], p.legR[1],
		p.squash, p.headSquash, p.reachL, p.reachR, p.strideL, p.strideR
	];
}

function fromVec(v: number[]): Pose {
	const [x, y, lift, rot, lean, arch, head, a0, a1, b0, b1, l0, l1, r0, r1, squash, headSquash, reachL, reachR, strideL, strideR] = v;
	return {
		x, y, lift, rot, lean, arch, head,
		armL: [a0, a1], armR: [b0, b1], legL: [l0, l1], legR: [r0, r1],
		squash, headSquash, reachL, reachR, strideL, strideR
	};
}

// Keys default to a smooth spline (time-aware Catmull-Rom / Hermite): speed
// carries THROUGH a key instead of stopping at it. Easing every segment
// in-and-out — the old default — made cycles stutter at every key. A key with
// an explicit `ease` uses that curve instead and comes to rest at both ends,
// which is what you want for holds, hits, and takes.
export function sample(def: ActionDef): { pose: Pose; key: Key | null; vx?: number }[] {
	const ks = resolveKeys(def.keys);
	const m = ks.length;
	const V = ks.map((k) => toVec(k.pose));
	const T = ks.map((k) => k.key.at);
	// Neighbour lookup with loop wrap (time shifted by ±frames).
	const at = (i: number): { v: number[]; t: number } | null => {
		if (i >= 0 && i < m) return { v: V[i], t: T[i] };
		if (!def.loop) return null;
		const wrap = Math.floor(i / m);
		const idx = ((i % m) + m) % m;
		return { v: V[idx], t: T[idx] + wrap * def.frames };
	};
	const tangent = (i: number): number[] => {
		const prev = at(i - 1);
		const next = at(i + 1);
		const cur = at(i)!;
		if (!prev || !next) return cur.v.map(() => 0);
		const dt = next.t - prev.t;
		return cur.v.map((_, k) => (next.v[k] - prev.v[k]) / dt);
	};

	const out: { pose: Pose; key: Key | null; vx?: number }[] = [];
	for (let f = 0; f < def.frames; f++) {
		let i = -1;
		for (let k = 0; k < m; k++) if (T[k] <= f) i = k;
		if (i < 0) {
			if (def.loop) i = m - 1; // before the first key: still in the wrap segment
			else {
				out.push({ pose: ks[0].pose, key: null });
				continue;
			}
		}
		const a = at(i)!;
		const fa = i === m - 1 && f < T[0] ? f + def.frames : f;
		const b = at(i + 1);
		let vx: number | undefined;
		// vx: NaN on a later key releases the override back to foot-lock.
		for (const k of ks) if (k.key.at <= f && k.key.vx !== undefined) vx = Number.isNaN(k.key.vx) ? undefined : k.key.vx;
		const key = T[i] === f ? ks[i].key : null;
		if (!b) {
			out.push({ pose: ks[i].pose, key, vx });
			continue;
		}
		const span = b.t - a.t;
		const u = span > 0 ? (fa - a.t) / span : 0;
		const ease = ks[i].key.ease;
		let v: number[];
		if (ease) {
			const e = easeFn(ease)(u);
			v = a.v.map((x, k) => x + (b.v[k] - x) * e);
		} else {
			// Cubic Hermite with tangents scaled to the segment span.
			const m0 = tangent(i).map((d) => d * span);
			const m1 = tangent(i + 1).map((d) => d * span);
			const u2 = u * u;
			const u3 = u2 * u;
			const h00 = 2 * u3 - 3 * u2 + 1;
			const h10 = u3 - 2 * u2 + u;
			const h01 = -2 * u3 + 3 * u2;
			const h11 = u3 - u2;
			v = a.v.map((x, k) => h00 * x + h10 * m0[k] + h01 * b.v[k] + h11 * m1[k]);
		}
		out.push({ pose: fromVec(v), key, vx });
	}
	return out;
}

// ----- solving -----

const FEET: JointName[] = ['footL', 'footR'];

function lowest(j: Joints, w: number, any: boolean) {
	let best = { name: '', y: Infinity, x: 0 };
	for (const pt of inkPoints(j, w)) {
		if (!any && !FEET.includes(pt.name as JointName)) continue;
		const y = pt.p[1] - pt.r;
		if (y < best.y) best = { name: pt.name, y, x: pt.p[0] };
	}
	return best;
}

function minInk(j: Joints, w: number) {
	let m = Infinity;
	for (const pt of inkPoints(j, w)) m = Math.min(m, pt.p[1] - pt.r);
	return m;
}

export interface BakeOptions {
	build?: Build;
	weight?: number;
	parts?: Parts;
}

export function bake(def: ActionDef, opts: BakeOptions = {}): BakedAction {
	const build = opts.build ?? BUILD;
	const weight = opts.weight ?? build.weight;
	const parts = opts.parts ?? 'full';
	const samples = sample(def);
	const mode = def.ground ?? 'plant';
	const any = def.contacts === 'any';
	const n = samples.length;

	// Pass 1: place every frame vertically.
	const placed: Joints[] = samples.map(({ pose }) => {
		const j = fk(pose, build);
		if (mode === 'plant') {
			const lo = lowest(j, weight, any);
			const placedJ = translate(j, [0, -lo.y + pose.lift]);
			// Even planted, nothing else may sink through the floor.
			const m = minInk(placedJ, weight);
			return m < 0 ? translate(placedJ, [0, -m]) : placedJ;
		}
		const lifted = translate(j, [0, pose.y + pose.lift]);
		if (def.floor === false) return lifted;
		const m = minInk(lifted, weight);
		return m < 0 ? translate(lifted, [0, -m]) : lifted;
	});

	// Pass 2: root motion.
	const air = placed.map((j) => (def.floor === false ? 0 : Math.max(0, minInk(j, weight))));
	const dx: number[] = new Array(n).fill(0);
	// Overall direction of travel, from the pelvis-relative drift of the
	// lowest foot — backward walks (pull, backpedal) lock the right foot too.
	let drift = 0;
	for (let i = 1; i < n; i++) {
		const a = lowest(placed[i - 1], weight, false);
		const b = lowest(placed[i], weight, false);
		if (a.name === b.name) drift += a.x - b.x;
	}
	const travelSign = drift < 0 ? -1 : 1;
	if (mode === 'plant') {
		const grounded: number[] = [];
		for (let i = 0; i < n; i++) {
			const pi = def.loop ? (i - 1 + n) % n : i - 1;
			if (pi < 0) continue;
			if (air[i] > 4 || air[pi] > 4) continue;
			// The contact that stayed lowest across both frames is the one
			// that's actually bearing weight — lock it.
			const cands: JointName[] = any
				? (['footL', 'footR', 'kneeL', 'kneeR', 'handL', 'handR', 'pelvis', 'shoulder', 'head'] as JointName[])
				: FEET;
			// Among contacts within a few units of the floor in both frames,
			// the one sliding opposite to the direction of travel under the
			// body is the one bearing weight; a swing foot still travelling
			// with the body is just landing.
			let best: JointName = cands[0];
			let score = Infinity;
			for (const c of cands) {
				const y = Math.max(placed[pi][c][1], placed[i][c][1]);
				const along = (placed[i][c][0] - placed[pi][c][0]) * travelSign;
				const s = y + Math.max(0, along) * 0.6;
				if (s < score) {
					score = s;
					best = c;
				}
			}
			dx[i] = placed[pi][best][0] - placed[i][best][0];
			grounded.push(dx[i]);
		}
		const avg = grounded.length ? grounded.reduce((a, b) => a + b, 0) / grounded.length : 0;
		for (let i = 0; i < n; i++) {
			const pi = def.loop ? (i - 1 + n) % n : i - 1;
			if (pi >= 0 && (air[i] > 4 || air[pi] > 4)) dx[i] = avg;
		}
	} else {
		for (let i = 0; i < n; i++) {
			const pi = def.loop ? (i - 1 + n) % n : i - 1;
			dx[i] = pi < 0 ? 0 : samples[i].pose.x - samples[pi].pose.x;
		}
	}
	for (let i = 0; i < n; i++) {
		if (samples[i].vx !== undefined) dx[i] = samples[i].vx!;
		if (def.travel === false) dx[i] = 0;
	}

	// Pass 3: draw, with effects.
	const trails = def.trails ?? [];
	const trailSpeed = def.trailSpeed ?? 70;
	const puffs: { at: number; x: number }[] = [];
	const frames: BakedFrame[] = placed.map((j, i) => {
		const cs = drawFigure(j, weight, parts);

		// Speed lines: trace where each trailing joint was over the last two
		// frames (in this frame's glyph space, so subtract root motion).
		for (const t of trails) {
			const p0 = j[t];
			const i1 = def.loop ? (i - 1 + n) % n : i - 1;
			const i2 = def.loop ? (i - 2 + n) % n : i - 2;
			if (i1 < 0) continue;
			const p1: Vec = sub(placed[i1][t], [dx[i], 0]);
			const speed = len(sub(p0, p1));
			if (speed < trailSpeed) continue;
			const p2: Vec | null = i2 >= 0 ? sub(placed[i2][t], [dx[i] + dx[i1], 0]) : null;
			cs.push(...speedLines(p0, p1, p2, speed, weight));
		}

		if (samples[i].key?.puff) {
			const lo = lowest(j, weight, any);
			puffs.push({ at: i, x: lo.x });
		}
		return {
			contours: cs,
			anchors: anchorsOf(j),
			dx: dx[i],
			air: air[i],
			event: samples[i].key?.event
		};
	});

	// Impact puffs live in world space for three frames after the hit, so
	// they stay put on the ground while the body moves on.
	for (const pf of puffs) {
		let shift = 0;
		for (let k = 0; k < 3; k++) {
			const fi = pf.at + k;
			if (fi >= n && !def.loop) break;
			const idx = fi % n;
			if (k > 0) shift += dx[idx];
			frames[idx].contours.push(...puff(pf.x - shift, k, weight));
		}
	}

	return { def, frames };
}

function speedLines(p0: Vec, p1: Vec, p2: Vec | null, speed: number, w: number): Contour[] {
	// Gap behind the moving point, then a tapering streak along its path.
	const thin = Math.max(6, w * 0.32);
	const dir = norm(sub(p0, p1));
	const gap = w * 1.4;
	const length = Math.min(speed * 0.9, 220);
	const start = sub(p0, mul(dir, gap));
	const pts: Vec[] = [start];
	// Bend toward p2 for a curved streak when the motion is arcing.
	if (p2) {
		const mid = sub(start, mul(dir, length * 0.5));
		const bendDir = norm(sub(p1, p2));
		const curve = sub(mid, mul(sub(bendDir, dir), length * 0.12));
		pts.push(curve);
	}
	pts.push(sub(start, mul(dir, length)));
	const off = mul(perp(dir), w * 0.9);
	const out: Contour[] = [];
	out.push(...stroke(pts, thin));
	out.push(...stroke(pts.slice(0, 2).map((p, k) => add(add(p, off), mul(dir, -k * length * 0.15))), thin));
	return out;
}

function puff(x: number, step: number, w: number): Contour[] {
	// Three little clouds that grow then break apart.
	const r = w * (0.45 + step * 0.25);
	const spread = w * (1.2 + step * 1.3);
	const y = r * 0.9 + step * w * 0.25;
	const cs: Contour[] = [];
	if (step < 2) cs.push(orient(disc([x, y], r * 0.8)));
	cs.push(orient(disc([x - spread, y * 0.9], r)));
	cs.push(orient(disc([x + spread, y * 0.9], r)));
	return cs;
}

const R = (v: Vec): Vec => [Math.round(v[0]), Math.round(v[1])];

function anchorsOf(j: Joints): Anchors {
	return {
		head: R(j.head),
		top: R([j.head[0], j.head[1] + j.headRy]),
		handL: R(j.handL),
		handR: R(j.handR),
		footL: R(j.footL),
		footR: R(j.footR),
		pelvis: R(j.pelvis),
		shoulder: R(j.shoulder),
		spine: Math.round((Math.atan2(j.shoulder[0] - j.pelvis[0], j.shoulder[1] - j.pelvis[1]) * 1800) / Math.PI) / 10,
		headR: [Math.round(j.headRx), Math.round(j.headRy)],
		headRot: Math.round((-j.headRot * 1800) / Math.PI) / 10
	};
}

// Smooth hand-off between two poses (used for generated in/out bridges).
export function bridge(name: string, from: PoseInput, to: PoseInput, frames: number, ease: Ease = 'inOut'): ActionDef {
	return {
		name,
		category: 'presence',
		description: `bridge ${name}`,
		frames: frames + 1,
		fps: 24,
		loop: false,
		keys: [
			{ at: 0, ...STAND, ...from, ease },
			{ at: frames, ...STAND, ...to }
		]
	};
}
