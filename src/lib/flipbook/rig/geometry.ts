// Outline geometry for build-time glyph generation. Pure math, no deps.
//
// Coordinates are font-native: y-up, baseline (ground) at y = 0. Every
// contour is normalised to the same winding (counter-clockwise, positive
// area) so overlapping parts union cleanly under the non-zero fill rule —
// a limb crossing the torso never punches a hole.

export type Vec = [number, number];

export type Seg = { t: 'L'; p: Vec } | { t: 'C'; c1: Vec; c2: Vec; p: Vec };

export interface Contour {
	start: Vec;
	segs: Seg[];
}

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
export const len = (a: Vec) => Math.hypot(a[0], a[1]);
export const norm = (a: Vec): Vec => {
	const l = len(a) || 1;
	return [a[0] / l, a[1] / l];
};
export const cross = (a: Vec, b: Vec) => a[0] * b[1] - a[1] * b[0];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
// Left-hand normal in y-up space (rotate 90° CCW).
export const perp = (a: Vec): Vec => [-a[1], a[0]];
export const lerpV = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Append a circular arc around `c` from angle a0 to a1 (radians, CCW positive)
// as cubic segments of at most 90° each.
function arcTo(segs: Seg[], c: Vec, r: number, a0: number, a1: number) {
	const total = a1 - a0;
	const n = Math.max(1, Math.ceil(Math.abs(total) / (Math.PI / 2) - 1e-6));
	const step = total / n;
	const k = (4 / 3) * Math.tan(step / 4);
	for (let i = 0; i < n; i++) {
		const s = a0 + step * i;
		const e = s + step;
		const p0: Vec = [c[0] + r * Math.cos(s), c[1] + r * Math.sin(s)];
		const p3: Vec = [c[0] + r * Math.cos(e), c[1] + r * Math.sin(e)];
		const c1: Vec = [p0[0] - k * r * Math.sin(s), p0[1] + k * r * Math.cos(s)];
		const c2: Vec = [p3[0] + k * r * Math.sin(e), p3[1] - k * r * Math.cos(e)];
		segs.push({ t: 'C', c1, c2, p: p3 });
	}
}

const ang = (v: Vec) => Math.atan2(v[1], v[0]);

// Shortest signed sweep from a0 to a1 in the requested rotational direction.
function sweep(a0: number, a1: number, ccw: boolean) {
	let d = a1 - a0;
	if (ccw) {
		while (d < 0) d += Math.PI * 2;
		while (d >= Math.PI * 2) d -= Math.PI * 2;
	} else {
		while (d > 0) d -= Math.PI * 2;
		while (d <= -Math.PI * 2) d += Math.PI * 2;
	}
	return d;
}

export function ellipse(c: Vec, rx: number, ry: number, rot = 0): Contour {
	const k = 0.5523;
	const cos = Math.cos(rot);
	const sin = Math.sin(rot);
	const P = (x: number, y: number): Vec => [c[0] + x * cos - y * sin, c[1] + x * sin + y * cos];
	const segs: Seg[] = [
		{ t: 'C', c1: P(rx, ry * k), c2: P(rx * k, ry), p: P(0, ry) },
		{ t: 'C', c1: P(-rx * k, ry), c2: P(-rx, ry * k), p: P(-rx, 0) },
		{ t: 'C', c1: P(-rx, -ry * k), c2: P(-rx * k, -ry), p: P(0, -ry) },
		{ t: 'C', c1: P(rx * k, -ry), c2: P(rx, -ry * k), p: P(rx, 0) }
	];
	return { start: P(rx, 0), segs };
}

export const disc = (c: Vec, r: number) => ellipse(c, r, r);

// A thick polyline as ONE closed outline: round caps, round outer joins,
// mitred inner joins. Internal sub-path seams are what made earlier glyphs
// shimmer at the elbow, so each limb is a single boundary. Very sharp inner
// folds can't be mitred cleanly; those return an extra disc at the joint.
export function stroke(pts: Vec[], w: number): Contour[] {
	const P = dedupe(pts);
	const r = w / 2;
	if (P.length === 1) return [disc(P[0], r)];

	const extra: Contour[] = [];
	const segs: Seg[] = [];

	// Walks the polyline in `order`, always offsetting to the walker's left.
	const walk = (order: number[]) => {
		const D = (i: number): Vec => {
			const a = P[order[i]];
			const b = P[order[i + 1]];
			return norm(sub(b, a));
		};
		const L = (i: number): number => len(sub(P[order[i + 1]], P[order[i]]));
		const n = order.length;
		for (let i = 1; i < n - 1; i++) {
			const pt = P[order[i]];
			const d0 = D(i - 1);
			const d1 = D(i);
			const n0 = perp(d0);
			const n1 = perp(d1);
			const c = cross(d0, d1);
			const a0: Vec = add(pt, mul(n0, r));
			const a1: Vec = add(pt, mul(n1, r));
			if (Math.abs(c) < 1e-4 && dot(d0, d1) > 0) {
				segs.push({ t: 'L', p: a0 });
				continue;
			}
			if (c < 0) {
				// Turning right: our left side is the outside of the bend.
				segs.push({ t: 'L', p: a0 });
				arcTo(segs, pt, r, ang(n0), ang(n0) + sweep(ang(n0), ang(n1), false));
			} else {
				// Turning left: our left side is the inside. Mitre point is where
				// the two offset lines meet; valid only if it lies within both
				// neighbouring segments.
				const half = Math.acos(Math.max(-1, Math.min(1, dot(n0, n1)))) / 2;
				const back = r * Math.tan(half);
				if (back < L(i - 1) * 0.95 && back < L(i) * 0.95 && half < 1.35) {
					const m = add(add(pt, mul(n0, r)), mul(d0, -back));
					segs.push({ t: 'L', p: m });
				} else {
					segs.push({ t: 'L', p: a0 });
					segs.push({ t: 'L', p: pt });
					segs.push({ t: 'L', p: a1 });
					extra.push(disc(pt, r));
				}
			}
		}
		// end cap: last point, semicircle from left normal to right normal
		const last = P[order[n - 1]];
		const dl = D(n - 2);
		const nl = perp(dl);
		segs.push({ t: 'L', p: add(last, mul(nl, r)) });
		arcTo(segs, last, r, ang(nl), ang(nl) - Math.PI);
	};

	const fwd = P.map((_, i) => i);
	// Start on the left of the first point; walk the left side forward, cap,
	// walk back along the other side (the reverse walk's left), cap home.
	const s0: Vec = add(P[0], mul(perp(norm(sub(P[1], P[0]))), r));
	walk(fwd);
	walk([...fwd].reverse());
	const out: Contour = { start: s0, segs };
	return [orient(out), ...extra.map(orient)];
}

function dedupe(pts: Vec[]): Vec[] {
	const out: Vec[] = [pts[0]];
	for (let i = 1; i < pts.length; i++) {
		if (len(sub(pts[i], out[out.length - 1])) > 0.5) out.push(pts[i]);
	}
	return out;
}

export function signedArea(c: Contour): number {
	let a = 0;
	let prev = c.start;
	for (const s of c.segs) {
		const pts = s.t === 'L' ? [s.p] : [s.c1, s.c2, s.p];
		for (const p of pts) {
			a += prev[0] * p[1] - p[0] * prev[1];
			prev = p;
		}
	}
	a += prev[0] * c.start[1] - c.start[0] * prev[1];
	return a / 2;
}

export function reverse(c: Contour): Contour {
	// Rebuild the point chain backwards; cubic control points swap order.
	const nodes: Vec[] = [c.start, ...c.segs.map((s) => s.p)];
	const segs: Seg[] = [];
	for (let i = c.segs.length - 1; i >= 0; i--) {
		const s = c.segs[i];
		const target = nodes[i];
		if (s.t === 'L') segs.push({ t: 'L', p: target });
		else segs.push({ t: 'C', c1: s.c2, c2: s.c1, p: target });
	}
	return { start: nodes[nodes.length - 1], segs };
}

export function orient(c: Contour): Contour {
	return signedArea(c) < 0 ? reverse(c) : c;
}

export function transform(cs: Contour[], f: (p: Vec) => Vec): Contour[] {
	return cs.map((c) => ({
		start: f(c.start),
		segs: c.segs.map((s) =>
			s.t === 'L' ? { t: 'L' as const, p: f(s.p) } : { t: 'C' as const, c1: f(s.c1), c2: f(s.c2), p: f(s.p) }
		)
	}));
}

// Mirror flips winding; re-orient afterwards.
export const mirrorX = (cs: Contour[], axis: number) =>
	transform(cs, (p) => [2 * axis - p[0], p[1]]).map(orient);

const r1 = (n: number) => Math.round(n * 10) / 10;

// SVG path in a y-down viewBox where font y=0 sits at `baselineY`.
export function toSvgD(cs: Contour[], baselineY: number, dx = 0): string {
	const X = (p: Vec) => r1(p[0] + dx);
	const Y = (p: Vec) => r1(baselineY - p[1]);
	const out: string[] = [];
	for (const c of cs) {
		out.push(`M${X(c.start)} ${Y(c.start)}`);
		for (const s of c.segs) {
			if (s.t === 'L') out.push(`L${X(s.p)} ${Y(s.p)}`);
			else out.push(`C${X(s.c1)} ${Y(s.c1)} ${X(s.c2)} ${Y(s.c2)} ${X(s.p)} ${Y(s.p)}`);
		}
		out.push('Z');
	}
	return out.join('');
}

export interface PathSink {
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
	close(): void;
}

// Emit into an opentype.js Path (or anything shaped like one). Font units
// are integers; rounding here keeps the CFF compact.
export function emit(cs: Contour[], sink: PathSink, dx = 0) {
	const R = Math.round;
	for (const c of cs) {
		sink.moveTo(R(c.start[0] + dx), R(c.start[1]));
		for (const s of c.segs) {
			if (s.t === 'L') sink.lineTo(R(s.p[0] + dx), R(s.p[1]));
			else sink.curveTo(R(s.c1[0] + dx), R(s.c1[1]), R(s.c2[0] + dx), R(s.c2[1]), R(s.p[0] + dx), R(s.p[1]));
		}
		sink.close();
	}
}

export function bounds(cs: Contour[]) {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const c of cs) {
		for (const p of [c.start, ...c.segs.map((s) => s.p)]) {
			if (p[0] < x0) x0 = p[0];
			if (p[0] > x1) x1 = p[0];
			if (p[1] < y0) y0 = p[1];
			if (p[1] > y1) y1 = p[1];
		}
	}
	return { x0, y0, x1, y1 };
}
