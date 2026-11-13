// Forge model: an editable action is a list of keys that each carry a FULL
// pose (sparse inheritance is resolved on load and re-sparsified on export),
// plus the action-level fields. Pure functions only — IK lives here too.

import { STAND, swapLR, type Build, type Pose } from '$rig/skeleton';
import { resolveKeys, type ActionDef, type Ease, type Key } from '$rig/timeline';

export interface EditKey {
	at: number;
	pose: Pose;
	ease?: Ease;
	puff?: boolean;
	event?: string;
	vx?: number;
}

export type ActionMeta = Omit<ActionDef, 'keys'>;

export interface Model {
	meta: ActionMeta;
	keys: EditKey[];
}

export const clonePose = (p: Pose): Pose => ({
	...p,
	armL: [...p.armL],
	armR: [...p.armR],
	legL: [...p.legL],
	legR: [...p.legR]
});

export function toModel(def: ActionDef): Model {
	const { keys, ...meta } = def;
	return {
		meta: structuredClone(meta),
		keys: resolveKeys(keys).map(({ key, pose }) => ({
			at: key.at,
			pose: clonePose(pose),
			ease: key.ease,
			puff: key.puff,
			event: key.event,
			vx: key.vx
		}))
	};
}

export function toDef(m: Model): ActionDef {
	return {
		...m.meta,
		keys: [...m.keys]
			.sort((a, b) => a.at - b.at)
			.map((k) => {
				const out: Key = { at: k.at, ...clonePose(k.pose) };
				if (k.ease) out.ease = k.ease;
				if (k.puff) out.puff = true;
				if (k.event) out.event = k.event;
				if (k.vx !== undefined && !Number.isNaN(k.vx)) out.vx = k.vx;
				return out;
			})
	};
}

export function newModel(): Model {
	return {
		meta: {
			name: 'new-action',
			category: 'gesture',
			description: 'Describe the motion in one line.',
			frames: 24,
			fps: 24,
			loop: false,
			from: 'stand',
			to: 'stand'
		},
		keys: [
			{ at: 0, pose: clonePose(STAND) },
			{ at: 23, pose: clonePose(STAND) }
		]
	};
}

// Second half of a symmetric cycle: every key in the first half, mirrored
// left↔right, half a cycle later. Existing second-half keys are replaced.
export function mirrorSecondHalf(m: Model): EditKey[] {
	const half = Math.floor(m.meta.frames / 2);
	const first = m.keys.filter((k) => k.at < half);
	return [
		...first,
		...first.map((k) => ({ ...k, at: k.at + half, pose: swapLR(clonePose(k.pose)) }))
	].sort((a, b) => a.at - b.at);
}

// ----- angles & IK -----

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

/** Angle of v in the "from straight down, + = forward" convention. */
export const downAngle = (x: number, y: number) => Math.atan2(x, -y) * DEG;
/** Angle of v in the "from straight up, + = forward" convention. */
export const upAngle = (x: number, y: number) => Math.atan2(x, y) * DEG;

const wrap180 = (a: number) => {
	let x = ((a + 180) % 360 + 360) % 360 - 180;
	if (x === -180) x = 180;
	return x;
};
/** Shift `a` by whole turns so it lands closest to `ref` (keeps interpolation sane). */
const near = (a: number, ref: number) => a + Math.round((ref - a) / 360) * 360;

/**
 * Two-bone IK in the pose's local frame (pelvis at origin, before body
 * rot/squash). Returns [upper, bend] in skeleton conventions:
 *   arms: lower = upper + bend   (elbow + = hand forward)
 *   legs: lower = upper − bend   (knee  + = foot back)
 * The solution whose bend has the same sign as `prev` wins, so a knee never
 * flips backwards mid-drag.
 */
export function solveLimb(
	root: [number, number],
	target: [number, number],
	A: number,
	B: number,
	kind: 'arm' | 'leg',
	prev: [number, number]
): [number, number] {
	let tx = target[0] - root[0];
	let ty = target[1] - root[1];
	let D = Math.hypot(tx, ty) || 1e-6;
	const Dc = Math.min(A + B - 0.01, Math.max(Math.abs(A - B) + 0.5, D));
	tx *= Dc / D;
	ty *= Dc / D;
	D = Dc;
	const theta = downAngle(tx, ty);
	const alpha = Math.acos(Math.max(-1, Math.min(1, (A * A + D * D - B * B) / (2 * A * D)))) * DEG;
	const want = Math.abs(prev[1]) < 1 ? 1 : Math.sign(prev[1]);
	let best: [number, number] = prev;
	let bestScore = Infinity;
	for (const s of [1, -1]) {
		const upper = theta + s * alpha;
		const ex = Math.sin(upper * RAD) * A;
		const ey = -Math.cos(upper * RAD) * A;
		const lower = downAngle(tx - ex, ty - ey);
		const bend = wrap180(kind === 'arm' ? lower - upper : upper - lower);
		const u = near(upper, prev[0]);
		// Sign match dominates; closeness to the previous upper breaks ties.
		const score = (Math.sign(bend || want) === want ? 0 : 1000) + Math.abs(u - prev[0]);
		if (score < bestScore) {
			bestScore = score;
			best = [u, bend];
		}
	}
	return best;
}

/** Placed (glyph) point → the pose's local frame, undoing squash then rot. */
export function toLocal(p: Pose, pelvis: [number, number], pt: [number, number]): [number, number] {
	let x = pt[0] - pelvis[0];
	let y = pt[1] - pelvis[1];
	const sy = p.squash || 1;
	const sx = 1 / Math.sqrt(sy);
	x /= sx;
	y /= sy;
	const r = p.rot * RAD;
	return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}

export const shoulderLocal = (p: Pose, b: Build): [number, number] => [
	Math.sin(p.lean * RAD) * b.torso,
	Math.cos(p.lean * RAD) * b.torso
];

// ----- export -----

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
// Scale multipliers need two decimals (1.05 stride); angles and units one.
const FINE = new Set(['squash', 'headSquash', 'reachL', 'reachR', 'strideL', 'strideR']);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function roundPose(p: Pose): Pose {
	const o: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(p)) o[k] = Array.isArray(v) ? v.map(r1) : FINE.has(k) ? r2(v as number) : r1(v as number);
	return o as unknown as Pose;
}

const FIELD_ORDER: (keyof Pose)[] = [
	'x', 'y', 'lift', 'rot', 'lean', 'arch', 'head',
	'armL', 'armR', 'legL', 'legR',
	'squash', 'headSquash', 'reachL', 'reachR', 'strideL', 'strideR'
];

const lit = (v: unknown): string =>
	typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : Array.isArray(v) ? `[${v.map(lit).join(', ')}]` : typeof v === 'object' && v ? `{ ${Object.entries(v).map(([k, x]) => `${k}: ${lit(x)}`).join(', ')} }` : String(v);

const RESERVED = new Set(['throw', 'catch', 'new', 'delete', 'class', 'function', 'return', 'switch', 'default', 'case', 'break', 'continue', 'do', 'if', 'else', 'for', 'while', 'var', 'let', 'const', 'import', 'export', 'try', 'finally', 'void', 'with', 'yield', 'in', 'of', 'typeof', 'instanceof', 'this', 'super', 'enum']);

export function identFor(name: string) {
	let id = name.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^[^a-zA-Z_$]+/, '');
	if (!id) id = 'action';
	return RESERVED.has(id) ? `${id}It` : id;
}

/** A clean, sparse ActionDef literal ready to paste into rig/actions/*.ts. */
export function exportTS(m: Model): string {
	const { meta } = m;
	const lines: string[] = [];
	lines.push(`export const ${identFor(meta.name)}: ActionDef = {`);
	const order = ['name', 'category', 'description', 'frames', 'fps', 'loop', 'ground', 'contacts', 'floor', 'from', 'to', 'trails', 'trailSpeed', 'travel', 'baseline', 'next', 'tags'];
	const metaRec = meta as unknown as Record<string, unknown>;
	for (const k of order) {
		const v = metaRec[k];
		if (v === undefined || (Array.isArray(v) && v.length === 0)) continue;
		lines.push(`\t${k}: ${lit(v)},`);
	}
	lines.push('\tkeys: [');
	let prev: Pose = roundPose(STAND);
	const keys = [...m.keys].sort((a, b) => a.at - b.at);
	keys.forEach((k, i) => {
		const p = roundPose(k.pose);
		const parts: string[] = [`at: ${k.at}`];
		for (const f of FIELD_ORDER) if (!same(p[f], prev[f])) parts.push(`${f}: ${lit(p[f])}`);
		if (k.ease) parts.push(`ease: ${lit(k.ease)}`);
		if (k.puff) parts.push('puff: true');
		if (k.event) parts.push(`event: ${lit(k.event)}`);
		if (k.vx !== undefined && !Number.isNaN(k.vx)) parts.push(`vx: ${r1(k.vx)}`);
		lines.push(`\t\t{ ${parts.join(', ')} }${i < keys.length - 1 ? ',' : ''}`);
		prev = p;
	});
	lines.push('\t]');
	lines.push('};');
	return lines.join('\n');
}

// ----- drafts -----

const DRAFTS = 'flipbook-forge:drafts';

export function loadDrafts(): Record<string, Model> {
	try {
		return JSON.parse(localStorage.getItem(DRAFTS) ?? '{}');
	} catch {
		return {};
	}
}

export function saveDraft(m: Model) {
	try {
		const all = loadDrafts();
		all[m.meta.name] = m;
		localStorage.setItem(DRAFTS, JSON.stringify(all));
		return true;
	} catch {
		return false;
	}
}

export function deleteDraft(name: string) {
	try {
		const all = loadDrafts();
		delete all[name];
		localStorage.setItem(DRAFTS, JSON.stringify(all));
	} catch {
		/* storage unavailable */
	}
}

/** Accept either a Model (from drafts) or a raw ActionDef JSON. */
export function parseImport(text: string): Model {
	const data = JSON.parse(text);
	if (data && data.meta && Array.isArray(data.keys)) return data as Model;
	if (data && Array.isArray(data.keys) && typeof data.frames === 'number') return toModel(data as ActionDef);
	throw new Error('Expected an ActionDef or a forge draft');
}
