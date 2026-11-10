// The baked font + manifest, as a queryable library of actions.

import defaultManifest from '../generated/manifest.json';

export type Hub = 'stand' | 'crouch' | 'sit' | 'lie' | 'perch' | 'hang';
export type Layer = 'regular' | 'bold' | 'limbs' | 'limbs-bold';
export type AnchorName = 'head' | 'top' | 'handL' | 'handR' | 'footL' | 'footR' | 'pelvis' | 'shoulder';

export interface ActionInfo {
	name: string;
	start: number;
	frames: number;
	fps: number;
	loop: boolean;
	category: string;
	description: string;
	from: Hub;
	to: Hub;
	floor: boolean;
	dx: number[];
	air: number[];
	events: Record<number, string>;
	anchors: number[][];
}

export interface Manifest {
	version: string;
	unitsPerEm: number;
	ascender: number;
	descender: number;
	advance: number;
	layers: Record<Layer, { family: string; style: string; weight: number; parts: string; file: string }>;
	actions: Record<string, Omit<ActionInfo, 'name'>>;
}

const ANCHOR_INDEX: Record<AnchorName, number> = {
	head: 0,
	top: 2,
	handL: 4,
	handR: 6,
	footL: 8,
	footR: 10,
	pelvis: 12,
	shoulder: 14
};

export interface Library {
	manifest: Manifest;
	unitsPerEm: number;
	advance: number;
	names(): string[];
	has(name: string): boolean;
	action(name: string): ActionInfo;
	byCategory(): Record<string, ActionInfo[]>;
	glyph(action: ActionInfo, frame: number): string;
	/** Anchor in font units, glyph-local (pelvis x = 0, ground y = 0, y-up). */
	anchor(action: ActionInfo, frame: number, name: AnchorName): [number, number];
	spine(action: ActionInfo, frame: number): number;
	headRot(action: ActionInfo, frame: number): number;
	/** Transition actions that carry a figure from one hub to another. */
	route(from: Hub, to: Hub): ActionInfo[];
	/** CSS font-family + weight for a layer. */
	css(layer: Layer): { family: string; weight: number };
	load(layers?: Layer[], baseUrl?: string): Promise<void>;
}

export function createLibrary(manifest: Manifest = defaultManifest as unknown as Manifest): Library {
	const actions = new Map<string, ActionInfo>();
	for (const [name, a] of Object.entries(manifest.actions)) actions.set(name, { name, ...a });
	const glyphCache = new Map<ActionInfo, string[]>();

	// Hub graph: one-shot actions whose from ≠ to are edges. Prefer the
	// shortest (fewest frames) when two actions connect the same hubs.
	const edges = new Map<Hub, ActionInfo[]>();
	for (const a of actions.values()) {
		if (a.loop || a.from === a.to) continue;
		const list = edges.get(a.from) ?? [];
		list.push(a);
		edges.set(a.from, list);
	}
	for (const list of edges.values()) list.sort((a, b) => routeCost(a) - routeCost(b));
	const routes = new Map<string, ActionInfo[]>();
	const loading = new Map<string, Promise<void>>();

	const lib: Library = {
		manifest,
		unitsPerEm: manifest.unitsPerEm,
		advance: manifest.advance,
		names: () => [...actions.keys()],
		has: (n) => actions.has(n),
		action(name) {
			const a = actions.get(name);
			if (!a) throw new Error(`[flipbook] Unknown action "${name}". Try one of: ${[...actions.keys()].join(', ')}`);
			return a;
		},
		byCategory() {
			const out: Record<string, ActionInfo[]> = {};
			for (const a of actions.values()) (out[a.category] ??= []).push(a);
			return out;
		},
		glyph(action, frame) {
			let g = glyphCache.get(action);
			if (!g) {
				g = Array.from({ length: action.frames }, (_, i) => String.fromCharCode(action.start + i));
				glyphCache.set(action, g);
			}
			return g[frame];
		},
		anchor(action, frame, name) {
			const a = action.anchors[frame];
			const i = ANCHOR_INDEX[name];
			return [a[i], a[i + 1]];
		},
		spine: (action, frame) => action.anchors[frame][16],
		headRot: (action, frame) => action.anchors[frame][17],
		route(from, to) {
			if (from === to) return [];
			const key = `${from}>${to}`;
			const hit = routes.get(key);
			if (hit) return hit;
			// BFS over hubs.
			const prev = new Map<Hub, ActionInfo>();
			const seen = new Set<Hub>([from]);
			const q: Hub[] = [from];
			while (q.length) {
				const h = q.shift()!;
				if (h === to) break;
				for (const e of edges.get(h) ?? []) {
					if (seen.has(e.to)) continue;
					seen.add(e.to);
					prev.set(e.to, e);
					q.push(e.to);
				}
			}
			const path: ActionInfo[] = [];
			let cur: Hub = to;
			while (cur !== from) {
				const e = prev.get(cur);
				if (!e) return [];
				path.unshift(e);
				cur = e.from;
			}
			routes.set(key, path);
			return path;
		},
		css(layer) {
			const l = manifest.layers[layer];
			return { family: l.family, weight: l.style === 'Bold' ? 700 : 400 };
		},
		async load(layers = ['regular'], baseUrl = '/fonts/') {
			if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
			await Promise.all(
				layers.map((id) => {
					const key = `${baseUrl}|${id}`;
					let p = loading.get(key);
					if (!p) loading.set(key, (p = loadOne(id)));
					return p;
				})
			);
			async function loadOne(id: Layer) {
				const l = manifest.layers[id];
				const { family, weight } = lib.css(id);
				const face = new FontFace(family, `url(${baseUrl}${l.file}?v=${manifest.version})`, {
					weight: String(weight),
					display: 'block'
				});
				document.fonts.add(await face.load());
			}
		}
	};
	return lib;
}

// Transitions that are pure hub hops (sit-down, get-up…) beat expressive
// one-shots that happen to change hub (slip ends lying down, but nobody wants
// to slip on the way to lying down).
function routeCost(a: ActionInfo) {
	return a.frames + (a.category === 'presence' || a.category === 'transition' ? 0 : 1000);
}

let _default: Library | null = null;
export function getLibrary(): Library {
	return (_default ??= createLibrary());
}
