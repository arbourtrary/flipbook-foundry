// The figure. A pose is a handful of angles on a skeleton with FIXED bone
// lengths — interpolating angles sweeps hands and feet along arcs instead of
// cutting straight through the body, which is what made the old joint-lerp
// frames read as rubbery. Everything here runs at build time only; the
// runtime never sees a skeleton, just the glyphs it produced.
//
// Conventions (font units, y-up, ground at y = 0, figure faces +x):
//   limb angles   0 = hanging straight down, + = swung forward (toward +x)
//   lean / head   0 = upright,               + = pitched forward
//   rot           whole-body pitch about the pelvis, + = forward (tumbles)
//   knee          + = flexed (foot travels back behind the knee)
//   elbow         + = flexed (hand comes forward/up)

import { type Contour, type Vec, add, ellipse, mul, orient, stroke } from './geometry';

export interface Build {
	thigh: number;
	shin: number;
	torso: number;
	neck: number;
	headR: number;
	upperArm: number;
	foreArm: number;
	weight: number;
}

// Proportions follow inspo/frames.jpg: a big solid head (~1/5 of height),
// short neck, legs about half the height, hands reaching mid-thigh.
export const BUILD: Build = {
	thigh: 172,
	shin: 166,
	torso: 200,
	neck: 22,
	headR: 76,
	upperArm: 128,
	foreArm: 122,
	weight: 30
};

export interface Pose {
	// Pelvis offset inside the glyph. Grounded actions ignore y (the solver
	// plants the body); airborne frames add `lift` on top of the solve.
	x: number;
	y: number;
	lift: number;
	rot: number;
	lean: number;
	// Spine curvature: + hunches (back bows out behind), − arches (chest out).
	arch: number;
	head: number;
	armL: [number, number];
	armR: [number, number];
	legL: [number, number];
	legR: [number, number];
	// Vertical squash/stretch of the whole body about the ground (1 = none).
	squash: number;
	// Head-only squash, for impact frames and takes.
	headSquash: number;
	// Per-limb length multipliers for smear/extension frames.
	reachL: number;
	reachR: number;
	strideL: number;
	strideR: number;
}

// Relaxed, not at attention: a hair of forward lean, weight a touch onto
// the back leg, arms hanging just clear of the torso so they read in profile.
export const STAND: Pose = {
	x: 0,
	y: 0,
	lift: 0,
	rot: 0,
	lean: 3,
	arch: 3,
	head: -2,
	armL: [-12, 16],
	armR: [9, 22],
	legL: [-6, 5],
	legR: [6, 7],
	squash: 1,
	headSquash: 1,
	reachL: 1,
	reachR: 1,
	strideL: 1,
	strideR: 1
};

export type PoseInput = Partial<Pose>;

export const pose = (p: PoseInput, base: Pose = STAND): Pose => ({ ...base, ...p });

// Swap left/right limbs — the other half of any symmetric cycle.
export const swapLR = (p: Pose): Pose => ({
	...p,
	armL: p.armR,
	armR: p.armL,
	legL: p.legR,
	legR: p.legL,
	reachL: p.reachR,
	reachR: p.reachL,
	strideL: p.strideR,
	strideR: p.strideL
});

const rad = (d: number) => (d * Math.PI) / 180;
// Direction from straight-down, + rotates forward (CCW in y-up when facing +x).
const down = (a: number): Vec => [Math.sin(rad(a)), -Math.cos(rad(a))];
// Direction from straight-up, + rotates forward (CW in y-up when facing +x).
const up = (a: number): Vec => [Math.sin(rad(a)), Math.cos(rad(a))];

export interface Joints {
	pelvis: Vec;
	shoulder: Vec;
	spineMid: Vec;
	head: Vec;
	headRx: number;
	headRy: number;
	headRot: number;
	elbowL: Vec;
	handL: Vec;
	elbowR: Vec;
	handR: Vec;
	kneeL: Vec;
	footL: Vec;
	kneeR: Vec;
	footR: Vec;
}

export type JointName = Exclude<keyof Joints, 'headRx' | 'headRy' | 'headRot'>;

export const POINT_NAMES: JointName[] = [
	'pelvis',
	'shoulder',
	'spineMid',
	'head',
	'elbowL',
	'handL',
	'elbowR',
	'handR',
	'kneeL',
	'footL',
	'kneeR',
	'footR'
];

// Forward kinematics with the pelvis at the origin; rot/squash applied here,
// ground placement happens in the solver.
export function fk(p: Pose, b: Build = BUILD): Joints {
	const pelvis: Vec = [0, 0];
	const shoulder = mul(up(p.lean), b.torso);
	// Spine bow: offset the midpoint perpendicular to the chord. Positive
	// arch pushes the midpoint backward (−x when upright).
	const chordMid = mul(shoulder, 0.5);
	const back: Vec = [-Math.cos(rad(p.lean)), Math.sin(rad(p.lean))];
	const spineMid = add(chordMid, mul(back, p.arch));
	const neckDir = up(p.lean + p.head);
	const head = add(shoulder, mul(neckDir, b.neck + b.headR * p.headSquash));

	const arm = (a: [number, number], reach: number) => {
		const e = add(shoulder, mul(down(a[0]), b.upperArm * reach));
		const h = add(e, mul(down(a[0] + a[1]), b.foreArm * reach));
		return [e, h] as const;
	};
	const leg = (l: [number, number], reach: number) => {
		const k = add(pelvis, mul(down(l[0]), b.thigh * reach));
		const f = add(k, mul(down(l[0] - l[1]), b.shin * reach));
		return [k, f] as const;
	};
	const [elbowL, handL] = arm(p.armL, p.reachL);
	const [elbowR, handR] = arm(p.armR, p.reachR);
	const [kneeL, footL] = leg(p.legL, p.strideL);
	const [kneeR, footR] = leg(p.legR, p.strideR);

	const j: Joints = {
		pelvis,
		shoulder,
		spineMid,
		head,
		headRx: b.headR / Math.sqrt(p.headSquash),
		headRy: b.headR * p.headSquash,
		headRot: -rad(p.lean + p.head),
		elbowL,
		handL,
		elbowR,
		handR,
		kneeL,
		footL,
		kneeR,
		footR
	};

	// Whole-body pitch (CW positive), then squash. Squash scales about the
	// pelvis here; the ground solver re-plants afterwards, so a squashed frame
	// still touches the floor.
	const cos = Math.cos(-rad(p.rot));
	const sin = Math.sin(-rad(p.rot));
	const sy = p.squash;
	const sx = 1 / Math.sqrt(sy);
	const T = (v: Vec): Vec => {
		const x = v[0] * cos - v[1] * sin;
		const y = v[0] * sin + v[1] * cos;
		return [x * sx, y * sy];
	};
	for (const n of POINT_NAMES) j[n] = T(j[n]);
	j.headRot += -rad(p.rot);
	j.headRx *= sx;
	j.headRy *= sy;
	return j;
}

export function translate(j: Joints, d: Vec): Joints {
	const out = { ...j };
	for (const n of POINT_NAMES) out[n] = add(j[n], d);
	return out;
}

// Quadratic spine sampled into a short polyline so the torso can curve.
function spinePoints(j: Joints): Vec[] {
	// Control point such that the curve passes through spineMid at t=0.5.
	const c: Vec = [
		2 * j.spineMid[0] - (j.pelvis[0] + j.shoulder[0]) / 2,
		2 * j.spineMid[1] - (j.pelvis[1] + j.shoulder[1]) / 2
	];
	const pts: Vec[] = [];
	const N = 6;
	for (let i = 0; i <= N; i++) {
		const t = i / N;
		const a = (1 - t) * (1 - t);
		const bb = 2 * (1 - t) * t;
		const cc = t * t;
		pts.push([
			a * j.pelvis[0] + bb * c[0] + cc * j.shoulder[0],
			a * j.pelvis[1] + bb * c[1] + cc * j.shoulder[1]
		]);
	}
	return pts;
}

// 'full' is the figure. 'limbs' drops torso, neck and head so a letter from
// any font can be drawn in their place — the letter becomes the body.
export type Parts = 'full' | 'limbs';

export function drawFigure(j: Joints, weight: number, parts: Parts = 'full'): Contour[] {
	const w = weight;
	const out: Contour[] = [];
	out.push(...stroke([j.pelvis, j.kneeL, j.footL], w));
	out.push(...stroke([j.pelvis, j.kneeR, j.footR], w));
	// Torso and neck share one outline so the spine has no seams.
	if (parts === 'full') out.push(...stroke([...spinePoints(j), j.head], w));
	out.push(...stroke([j.shoulder, j.elbowL, j.handL], w));
	out.push(...stroke([j.shoulder, j.elbowR, j.handR], w));
	if (parts === 'full') out.push(orient(ellipse(j.head, j.headRx, j.headRy, j.headRot)));
	return out;
}

// Every point that could touch the floor, with the radius of ink around it.
export function inkPoints(j: Joints, weight: number): { name: string; p: Vec; r: number }[] {
	const r = weight / 2;
	const pts: { name: string; p: Vec; r: number }[] = POINT_NAMES.filter((n) => n !== 'head').map(
		(n) => ({ name: n, p: j[n], r })
	);
	pts.push({ name: 'head', p: j.head, r: Math.max(j.headRx, j.headRy) });
	return pts;
}

/**
 * How a family draws the skeleton: the ink for a posed body, and the points
 * the ground solver plants. A new look on the same motion is a new Skin.
 */
export interface Skin {
	draw(j: Joints, weight: number, parts: Parts): Contour[];
	ink(j: Joints, weight: number): { name: string; p: Vec; r: number }[];
}

/** The original look: round-capped strokes and an elliptical head. */
export const STICK_SKIN: Skin = { draw: drawFigure, ink: inkPoints };
