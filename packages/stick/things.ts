// Things: props and set pieces, baked into the "Flipbook Things" font the
// same way figures are. A thing can have frames too — a sack fills, a hole
// deepens, a pile grows — and each frame is just another glyph.
//
// Coordinates: font units, y-up, origin at bottom-centre on the ground.
// Held things also declare a grip; the runtime puts the grip on a figure's
// hand and, for tools, turns the thing to follow the forearm.

import { type Contour, type Vec, disc, orient, stroke } from '../rig/geometry';

export interface ThingDef {
	name: string;
	description: string;
	frames: number;
	/**
	 * 'forearm' — a tool: its +x axis lines up with the forearm (shovel, broom).
	 * 'hang'    — hangs straight down from the hand (sack).
	 * 'none'    — not held; stands on the ground (hole, pile, wall).
	 */
	hold: 'forearm' | 'hang' | 'none';
	grip: (i: number) => Vec;
	draw: (i: number) => Contour[];
}

const W = 22; // line weight for tools, close to the figure's 30

// Filled polygon from points (any winding; normalised).
function poly(pts: Vec[]): Contour {
	return orient({ start: pts[0], segs: pts.slice(1).map((p) => ({ t: 'L' as const, p })) });
}

// Ellipse sampled between two angles (radians), as points.
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): Vec[] {
	const pts: Vec[] = [];
	for (let i = 0; i <= n; i++) {
		const a = a0 + ((a1 - a0) * i) / n;
		pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
	}
	return pts;
}

const ease = (t: number) => 1 - (1 - t) * (1 - t);

export const shovel: ThingDef = {
	name: 'shovel',
	description: 'A garden spade. Held along the forearm; the blade leads.',
	frames: 1,
	hold: 'forearm',
	grip: () => [0, 0],
	draw: () => [
		...stroke([[-170, 0], [330, 0]], W),
		// D-handle
		...stroke([[-170, -38], [-215, -38], [-215, 38], [-170, 38], [-170, -38]], W * 0.8),
		// Blade
		poly([[318, -58], [420, -62], [478, -18], [482, 0], [478, 18], [420, 62], [318, 58]])
	]
};

export const broom: ThingDef = {
	name: 'broom',
	description: 'A broom. Held along the forearm; the bristles lead.',
	frames: 1,
	hold: 'forearm',
	grip: () => [0, 0],
	draw: () => {
		const out: Contour[] = [...stroke([[-170, 0], [360, 0]], W)];
		out.push(poly([[350, -40], [370, -46], [520, -95], [530, 95], [370, 46], [350, 40]]));
		return out;
	}
};

const SACK_FRAMES = 12;

// A sack that fills up: 0 is a limp empty bag, the last frame is bulging.
function sackShape(i: number) {
	const f = ease(i / (SACK_FRAMES - 1));
	const rx = 70 + f * 200;
	const ry = 60 + f * 190;
	return { rx, ry, top: ry * 2 };
}

export const sack: ThingDef = {
	name: 'sack',
	description: 'A drawstring sack in 12 fullnesses. Hangs from the hand by its neck.',
	frames: SACK_FRAMES,
	hold: 'hang',
	grip: (i) => [0, sackShape(i).top + 70],
	draw: (i) => {
		const { rx, ry, top } = sackShape(i);
		// Body: an ellipse, flattened where it meets the floor and tapering
		// toward the neck — a pear of a sack.
		const body = arc(0, ry, rx, ry, 0, Math.PI * 2, 40).map(([x, y]) => {
			const up = Math.max(0, (y - ry) / ry); // 0 at the waist, 1 at the top
			return [x * (1 - 0.55 * up * up), Math.max(ry * 0.08, y)] as Vec;
		});
		const lifted = body.map(([x, y]) => [x, y - ry * 0.08] as Vec);
		const neckW = 26 + rx * 0.12;
		return [
			poly(lifted),
			poly([[-neckW, top - 6], [neckW, top - 6], [neckW * 0.55, top + 40], [-neckW * 0.55, top + 40]]),
			// Drawstring ears
			...stroke([[0, top + 40], [-38, top + 78]], W * 0.7),
			...stroke([[0, top + 40], [40, top + 72]], W * 0.7)
		];
	}
};

const DIG_FRAMES = 12;

export const hole: ThingDef = {
	name: 'hole',
	description: 'A hole in the ground, 12 depths. Sits on the ground line; the pit is below it.',
	frames: DIG_FRAMES,
	hold: 'none',
	grip: () => [0, 0],
	draw: (i) => {
		const f = ease(i / (DIG_FRAMES - 1));
		const w = 110 + f * 420;
		const d = 18 + f * 300;
		// The pit: lower half of an ellipse, flush with the ground.
		return [poly(arc(0, 0, w / 2, d, Math.PI, Math.PI * 2, 28))];
	}
};

export const pile: ThingDef = {
	name: 'pile',
	description: 'A heap of dug earth, 12 sizes, with a few clods on top.',
	frames: DIG_FRAMES,
	hold: 'none',
	grip: () => [0, 0],
	draw: (i) => {
		const f = ease(i / (DIG_FRAMES - 1));
		const rx = 60 + f * 240;
		const ry = 16 + f * 150;
		const out: Contour[] = [poly(arc(0, 0, rx, ry, 0, Math.PI, 24))];
		// Clods tumble onto the heap as it grows.
		const clods: [number, number, number][] = [
			[-0.55, 0.62, 16], [0.3, 0.86, 13], [0.62, 0.48, 18], [-0.15, 1.02, 11], [0.05, 1.12, 14]
		];
		clods.slice(0, Math.round(f * clods.length)).forEach(([u, v, r]) => out.push(disc([u * rx, v * ry + r * 0.4], r * (0.6 + f * 0.6))));
		return out.map(orient);
	}
};

export const wall: ThingDef = {
	name: 'wall',
	description: 'The edge of a wall — wide and tall enough to hide a figure. Draw it after a figure to hide them.',
	frames: 1,
	hold: 'none',
	grip: () => [0, 0],
	draw: () => [poly([[-190, 0], [190, 0], [190, 1060], [-190, 1060]])]
};

export const clod: ThingDef = {
	name: 'clod',
	description: 'A flying lump of earth, for arcs.',
	frames: 1,
	hold: 'none',
	grip: () => [0, 0],
	draw: () => [poly(arc(0, 40, 46, 34, 0, Math.PI * 2, 14))]
};

export const eraser: ThingDef = {
	name: 'eraser',
	description: 'A block eraser with a paper sleeve. Held like a tool; the bare rubber end leads.',
	frames: 1,
	hold: 'forearm',
	grip: () => [0, 0],
	draw: () => [
		// Sleeve: solid, gripped in the hand.
		poly([[-30, -52], [95, -52], [95, 52], [-30, 52]]),
		// Rubber end: an outline, so it reads as the soft working part.
		...stroke([[95, -52], [215, -52], [215, 52], [95, 52], [95, -52]], 20)
	]
};

export const THINGS: ThingDef[] = [shovel, broom, sack, hole, pile, wall, clod, eraser];
