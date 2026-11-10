// Pose-figure rig. Pure functions, no Node deps — imported by both
// scripts/generate-poses.ts (build-time) and the in-browser /forge editor.
//
// Visual grammar is anchored by inspo/frames.jpg: articulated joints (no
// visible orbs), limbs that lengthen on extension, a spine that leans with
// momentum. The output of figure() is a single SVG path "d" string whose
// sub-paths all wind clockwise so the figure composites cleanly under the
// non-zero fill rule.

export type Pt = [number, number];

export const HEAD_R = 80;
// Per inspo/run.png: every body part — neck, torso, arms, legs — renders at
// the same line weight. One uniform width drives all of them.
export const LIMB_W = 20;
// Shoulders sit a small distance below the keyframe's `neck` point so a short
// neck stub shows between head and torso. Hips are a single point at j.hips.
export const SHOULDER_DROP = 30;

export const BASE_ARM_LENGTH = 280;
export const BASE_LEG_LENGTH = 325;
export const DEFAULT_AUTO_BEND_PX = 60;
// Conventional ground line. Any keyframe whose foot is meant to be in contact
// with the ground should land its Y at this value. Lifted/mid-stride feet
// stay above (Y < FLOOR_Y).
export const FLOOR_Y = 880;

export interface Stretch {
	larm?: number;
	rarm?: number;
	lleg?: number;
	rleg?: number;
}

export interface Joints {
	head: Pt;
	headR?: number;
	neck: Pt;
	hips: Pt;
	lhand: Pt;
	rhand: Pt;
	lfoot: Pt;
	rfoot: Pt;
	// Optional explicit mid-joints — when absent, the rig auto-places them.
	lelbow?: Pt;
	relbow?: Pt;
	lknee?: Pt;
	rknee?: Pt;
	// Degrees, positive = lean forward in screen-x. Rotates head, neck, and
	// shoulders about hips. Hands stay at their literal positions so keyframes
	// can independently control gesture vs torso lean.
	spineLean?: number;
	// Per-limb length multiplier. 1.0 = resting. Stretch is applied along the
	// limb's current vector before mid-joint placement.
	stretch?: Stretch;
}

const round = (n: number) => Math.round(n * 10) / 10;

// ----- low-level primitives -----

// Clockwise in screen Y-down so it composites consistently with every other
// sub-path. The previous winding was CCW, which gave winding=0 at any overlap
// with the neck/torso (a CW path), rendering as a hole under non-zero fill.
export function headPath(cx: number, cy: number, r = HEAD_R): string {
	const k = r * 0.5523;
	return [
		`M ${round(cx - r)} ${round(cy)}`,
		`C ${round(cx - r)} ${round(cy - k)} ${round(cx - k)} ${round(cy - r)} ${round(cx)} ${round(cy - r)}`,
		`C ${round(cx + k)} ${round(cy - r)} ${round(cx + r)} ${round(cy - k)} ${round(cx + r)} ${round(cy)}`,
		`C ${round(cx + r)} ${round(cy + k)} ${round(cx + k)} ${round(cy + r)} ${round(cx)} ${round(cy + r)}`,
		`C ${round(cx - k)} ${round(cy + r)} ${round(cx - r)} ${round(cy + k)} ${round(cx - r)} ${round(cy)}`,
		'Z'
	].join(' ');
}

// Tapered stadium: w1 at the start, w2 at the end, semicircular caps. Wound clockwise.
export function capsule(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	w1: number,
	w2: number
): string {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy) || 1;
	const r1 = w1 / 2;
	const r2 = w2 / 2;
	const px = -dy / len;
	const py = dx / len;
	return [
		`M ${round(x1 - px * r1)} ${round(y1 - py * r1)}`,
		`L ${round(x2 - px * r2)} ${round(y2 - py * r2)}`,
		`A ${round(r2)} ${round(r2)} 0 0 1 ${round(x2 + px * r2)} ${round(y2 + py * r2)}`,
		`L ${round(x1 + px * r1)} ${round(y1 + py * r1)}`,
		`A ${round(r1)} ${round(r1)} 0 0 1 ${round(x1 - px * r1)} ${round(y1 - py * r1)}`,
		'Z'
	].join(' ');
}

export function disc(cx: number, cy: number, r: number): string {
	return [
		`M ${round(cx + r)} ${round(cy)}`,
		`A ${round(r)} ${round(r)} 0 0 1 ${round(cx - r)} ${round(cy)}`,
		`A ${round(r)} ${round(r)} 0 0 1 ${round(cx + r)} ${round(cy)}`,
		'Z'
	].join(' ');
}

export function quad(a: Pt, b: Pt, c: Pt, d: Pt): string {
	return [
		`M ${round(a[0])} ${round(a[1])}`,
		`L ${round(b[0])} ${round(b[1])}`,
		`L ${round(c[0])} ${round(c[1])}`,
		`L ${round(d[0])} ${round(d[1])}`,
		'Z'
	].join(' ');
}

// ----- new primitives for the articulated grammar -----

// An articulated limb rendered as a SINGLE closed polygon — start → mid →
// end with uniform width w. One continuous boundary (round outer-join at the
// bend, bevel inner-join), no overlapping sub-paths inside the limb area.
//
// Why not two capsules + a fill disc? That earlier design assembled the limb
// from three overlapping sub-paths. Even with consistent CW winding and
// non-zero fill, the *internal* sub-path boundaries inside the filled limb
// region can produce sub-pixel rasterization artifacts in font rendering —
// visible as a flash near the elbow when an arm sweeps through colinear
// (forearm aligning with upper arm) during animation. A single closed
// polygon has no internal boundaries, so there's nothing for the rasterizer
// to disagree with frame to frame.
//
// Colinear edge cases (bones straight or fully folded back) make the polygon
// degenerate, so those fall back to the capsules+disc construction; the
// backup disc at the joint then covers any pathological inner-corner case.
export function articulatedLimb(start: Pt, mid: Pt, end: Pt, w: number): string {
	const r = w / 2;
	const d1x = mid[0] - start[0];
	const d1y = mid[1] - start[1];
	const l1 = Math.hypot(d1x, d1y);
	const d2x = end[0] - mid[0];
	const d2y = end[1] - mid[1];
	const l2 = Math.hypot(d2x, d2y);

	// Degenerate bone (zero length): just draw the non-degenerate one.
	if (l1 < 0.5) return capsule(mid[0], mid[1], end[0], end[1], w, w);
	if (l2 < 0.5) return capsule(start[0], start[1], mid[0], mid[1], w, w);

	const u1x = d1x / l1, u1y = d1y / l1;
	const u2x = d2x / l2, u2y = d2y / l2;
	const cross = u1x * u2y - u1y * u2x;

	// Near-colinear (straight arm OR fully folded back): the single-polygon
	// construction collapses, so use the original capsules+disc approach.
	if (Math.abs(cross) < 0.03) {
		return [
			capsule(start[0], start[1], mid[0], mid[1], w, w),
			capsule(mid[0], mid[1], end[0], end[1], w, w),
			disc(mid[0], mid[1], r + 1)
		].join(' ');
	}

	// Perpendiculars (same convention as capsule(): perp = (-dy, dx) / len).
	const p1x = -u1y, p1y = u1x;
	const p2x = -u2y, p2y = u2x;

	// outerSign picks which perpendicular direction is on the outside of the
	// bend. Cross > 0 ⇒ u2 is CCW (math) from u1 ⇒ outer is on -perp side.
	const outerSign = cross > 0 ? -1 : 1;
	const s = r * outerSign;

	// Eight corner points — outer/inner offsets at start, mid (×2 for each
	// bone's perpendicular), and end.
	const sOutX = start[0] + p1x * s, sOutY = start[1] + p1y * s;
	const sInX = start[0] - p1x * s, sInY = start[1] - p1y * s;
	const mOut1X = mid[0] + p1x * s, mOut1Y = mid[1] + p1y * s;
	const mIn1X = mid[0] - p1x * s, mIn1Y = mid[1] - p1y * s;
	const mOut2X = mid[0] + p2x * s, mOut2Y = mid[1] + p2y * s;
	const mIn2X = mid[0] - p2x * s, mIn2Y = mid[1] - p2y * s;
	const eOutX = end[0] + p2x * s, eOutY = end[1] + p2y * s;
	const eInX = end[0] - p2x * s, eInY = end[1] - p2y * s;

	// Trace the polygon CW (visually in y-down) so winding matches capsules:
	// start cap → outer of bone 1 → outer round join at mid → outer of bone 2
	// → end cap → back along inner of bone 2 → bevel inner join → back along
	// inner of bone 1 → start cap close.
	return [
		`M ${round(sOutX)} ${round(sOutY)}`,
		`L ${round(mOut1X)} ${round(mOut1Y)}`,
		`A ${round(r)} ${round(r)} 0 0 1 ${round(mOut2X)} ${round(mOut2Y)}`,
		`L ${round(eOutX)} ${round(eOutY)}`,
		`A ${round(r)} ${round(r)} 0 0 1 ${round(eInX)} ${round(eInY)}`,
		`L ${round(mIn2X)} ${round(mIn2Y)}`,
		`L ${round(mIn1X)} ${round(mIn1Y)}`,
		`L ${round(sInX)} ${round(sInY)}`,
		`A ${round(r)} ${round(r)} 0 0 1 ${round(sOutX)} ${round(sOutY)}`,
		'Z'
	].join(' ');
}

// Move `end` outward along the (start -> end) vector by (factor - 1) * baseLen.
// Stretching at 1.0 is a no-op. Vector preserved, so the limb extends in its
// existing direction rather than rotating.
export function applyStretch(start: Pt, end: Pt, factor: number, baseLen: number): Pt {
	if (factor === 1) return end;
	const dx = end[0] - start[0];
	const dy = end[1] - start[1];
	const d = Math.hypot(dx, dy) || 1;
	const extra = (factor - 1) * baseLen;
	return [end[0] + (dx / d) * extra, end[1] + (dy / d) * extra];
}

// Auto-placement for an elbow or knee. Returns the segment midpoint nudged
// perpendicular to the limb axis, with magnitude proportional to how much
// the limb is flexed (resting limb fully extended → no bend; folded limb →
// max bend). Sign decided by `side`: 'inward' bends toward bodyCenterX (used
// for arms); 'outward' bends away (used for legs).
export function autoMidJoint(
	start: Pt,
	end: Pt,
	baseLen: number,
	bodyCenterX: number,
	side: 'inward' | 'outward',
	maxBendPx = DEFAULT_AUTO_BEND_PX
): Pt {
	const mx = (start[0] + end[0]) / 2;
	const my = (start[1] + end[1]) / 2;
	const dx = end[0] - start[0];
	const dy = end[1] - start[1];
	const d = Math.hypot(dx, dy) || 1;
	const flex = Math.max(0, Math.min(1, (baseLen - d) / baseLen));
	if (flex < 0.05) return [mx, my];
	// Perpendicular unit (rotate limb vector 90° CCW): (-dy, dx) / d
	const px = -dy / d;
	const py = dx / d;
	const towardCenter = bodyCenterX - mx;
	// Pick the perp direction whose x-component agrees with (or opposes)
	// the direction toward the body centerline.
	const innerSign = px * towardCenter >= 0 ? 1 : -1;
	const sign = side === 'inward' ? innerSign : -innerSign;
	const offset = flex * maxBendPx;
	return [mx + px * sign * offset, my + py * sign * offset];
}

// ----- math helpers -----

function rotateAbout(p: Pt, pivot: Pt, deg: number): Pt {
	if (deg === 0) return p;
	const rad = (deg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const dx = p[0] - pivot[0];
	const dy = p[1] - pivot[1];
	return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
}

// ----- figure assembly -----

// Anchor points used to derive arm and leg origins. Both branch from single
// points (shoulders, hips), matching the inspo's single-square-per-joint look.
// Exported so the rig editor can mirror figure()'s anchor logic exactly.
export function shoulderPoint(j: Joints): Pt {
	return [j.neck[0], j.neck[1] + SHOULDER_DROP];
}

export function hipPoint(j: Joints): Pt {
	return [j.hips[0], j.hips[1]];
}

export function figure(j: Joints): string {
	const r = j.headR ?? HEAD_R;
	const lean = j.spineLean ?? 0;
	const stretch = j.stretch ?? {};

	// Spine lean rotates the upper body about the hips. Hands stay where the
	// keyframe put them — gesture and torso tilt are decoupled.
	const head = rotateAbout(j.head, j.hips, lean);
	const shoulder = rotateAbout(shoulderPoint(j), j.hips, lean);
	const hip = hipPoint(j);

	// Stretch endpoints first, then resolve mid-joints against the stretched limb.
	const lhand = applyStretch(shoulder, j.lhand, stretch.larm ?? 1, BASE_ARM_LENGTH);
	const rhand = applyStretch(shoulder, j.rhand, stretch.rarm ?? 1, BASE_ARM_LENGTH);
	const lfoot = applyStretch(hip, j.lfoot, stretch.lleg ?? 1, BASE_LEG_LENGTH);
	const rfoot = applyStretch(hip, j.rfoot, stretch.rleg ?? 1, BASE_LEG_LENGTH);

	const centerX = j.hips[0];

	const lelbow = j.lelbow ?? autoMidJoint(shoulder, lhand, BASE_ARM_LENGTH, centerX, 'inward');
	const relbow = j.relbow ?? autoMidJoint(shoulder, rhand, BASE_ARM_LENGTH, centerX, 'inward');
	const lknee = j.lknee ?? autoMidJoint(hip, lfoot, BASE_LEG_LENGTH, centerX, 'outward');
	const rknee = j.rknee ?? autoMidJoint(hip, rfoot, BASE_LEG_LENGTH, centerX, 'outward');

	// Neck stub anchors at the head's center so the head fills cleanly over the
	// joint and the neck never pops out under spineLean rotation.
	const neckTop: Pt = [head[0], head[1]];

	return [
		articulatedLimb(hip, lknee, lfoot, LIMB_W),
		articulatedLimb(hip, rknee, rfoot, LIMB_W),
		articulatedLimb(shoulder, lelbow, lhand, LIMB_W),
		articulatedLimb(shoulder, relbow, rhand, LIMB_W),
		capsule(neckTop[0], neckTop[1], shoulder[0], shoulder[1], LIMB_W, LIMB_W),
		capsule(shoulder[0], shoulder[1], hip[0], hip[1], LIMB_W, LIMB_W),
		// Explicit fill discs at the shoulder and hip — these are four-capsule
		// junctions (arms + neck/torso at shoulder, legs + torso at hip) with no
		// articulatedLimb disc to back them up. Without these, the overlapping
		// semicircular caps from the four capsules can leave sub-pixel gaps at
		// the seam, especially when an arm or leg swings through a position
		// that aligns its perpendicular with another capsule's edge.
		disc(shoulder[0], shoulder[1], LIMB_W / 2 + 1),
		disc(hip[0], hip[1], LIMB_W / 2 + 1),
		headPath(head[0], head[1], r)
	].join(' ');
}

export function wrapSvg(d: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path d="${d}"/></svg>\n`;
}

// ----- interpolation -----

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
	return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function lerpOptPt(a: Pt | undefined, b: Pt | undefined, t: number): Pt | undefined {
	if (a && b) return lerpPt(a, b, t);
	if (a) return a;
	if (b) return b;
	return undefined;
}

// spineLean defaults to 0 when undefined, so interpolating against undefined ramps
// from 0 (resting upright) rather than snapping to the defined value.
function lerpOptNum(a: number | undefined, b: number | undefined, t: number): number | undefined {
	if (a === undefined && b === undefined) return undefined;
	return lerp(a ?? 0, b ?? 0, t);
}

function lerpStretch(a: Stretch | undefined, b: Stretch | undefined, t: number): Stretch | undefined {
	if (!a && !b) return undefined;
	const merged: Stretch = {};
	const keys: (keyof Stretch)[] = ['larm', 'rarm', 'lleg', 'rleg'];
	for (const k of keys) {
		const av = a?.[k];
		const bv = b?.[k];
		if (av !== undefined && bv !== undefined) merged[k] = lerp(av, bv, t);
		else if (av !== undefined) merged[k] = lerp(av, 1, t);
		else if (bv !== undefined) merged[k] = lerp(1, bv, t);
	}
	return Object.keys(merged).length ? merged : undefined;
}

export function lerpJoints(a: Joints, b: Joints, t: number): Joints {
	return {
		head: lerpPt(a.head, b.head, t),
		headR: a.headR ?? b.headR,
		neck: lerpPt(a.neck, b.neck, t),
		hips: lerpPt(a.hips, b.hips, t),
		lhand: lerpPt(a.lhand, b.lhand, t),
		rhand: lerpPt(a.rhand, b.rhand, t),
		lfoot: lerpPt(a.lfoot, b.lfoot, t),
		rfoot: lerpPt(a.rfoot, b.rfoot, t),
		lelbow: lerpOptPt(a.lelbow, b.lelbow, t),
		relbow: lerpOptPt(a.relbow, b.relbow, t),
		lknee: lerpOptPt(a.lknee, b.lknee, t),
		rknee: lerpOptPt(a.rknee, b.rknee, t),
		spineLean: lerpOptNum(a.spineLean, b.spineLean, t),
		stretch: lerpStretch(a.stretch, b.stretch, t)
	};
}

// Cycle through keys around a loop: k[0] → k[1] → ... → k[last] → k[0].
export function interpolateLoop(keys: Joints[], frames: number): Joints[] {
	const result: Joints[] = [];
	for (let i = 0; i < frames; i++) {
		const t = (i / frames) * keys.length;
		const seg = Math.floor(t) % keys.length;
		const next = (seg + 1) % keys.length;
		const localT = t - Math.floor(t);
		result.push(lerpJoints(keys[seg], keys[next], localT));
	}
	return result;
}

// Palindrome: [a, b, c] becomes [a, b, c, b] before looping — smooth out-and-back.
export function palindrome(keys: Joints[]): Joints[] {
	if (keys.length < 3) return keys;
	const middle = keys.slice(1, -1);
	return [...keys, ...middle.reverse()];
}
