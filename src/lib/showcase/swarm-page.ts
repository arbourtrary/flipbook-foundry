// Swarm, page mode: figures move into the page itself. They stand on the
// tops of letters, sit on rules and box tops with their legs hanging over,
// sleep on them, perch on corners, hang off
// ledges, lean against box walls and peek out from behind code
// blocks, and they scroll with the document because the canvas lives in
// it. The canvas is only a window a little taller than the viewport,
// slid along the document as you scroll, so it costs a viewport's worth
// of pixels however long the page is.
import { Stage, type Character, type Library } from 'flipbook-foundry';

type Role = 'stand' | 'sleep' | 'lean' | 'perch' | 'hang' | 'peek' | 'kilroy';

interface Box {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

interface Spot {
	role: Role;
	x: number;
	y: number;
	size: number;
	facing: 1 | -1;
	el: Element;
	/** Where this ledge runs, for running off it. */
	span: [number, number];
	/** The box a peeker hides behind. */
	box?: Element;
	partner?: number;
	/** A flat ledge (rule, box top) — standers walk along it. */
	ledge?: boolean;
}

interface Mind {
	role: Role;
	hx: number;
	hy: number;
	el: Element;
	ex: number;
	ey: number;
	span: [number, number];
	phase: 'wait' | 'fall' | 'rise' | 'live' | 'leave' | 'fly' | 'sink' | 'gone';
	at: number;
	next: number;
	vx: number;
	vy: number;
	aloft: number;
	partner?: Character;
	ledge?: boolean;
}

const mind = (c: Character) => c.data as unknown as Mind;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** What each role plays at rest. */
const REST: Record<Role, string> = {
	stand: 'idle',
	sleep: 'sleep',
	lean: 'lean-back',
	perch: 'perch-idle',
	hang: 'hang-idle',
	peek: 'idle',
	kilroy: 'idle'
};

// Only moves you can see from across the page — nothing that reads as
// standing still (no look-around, fidget, yawn, think, tap-foot).
const ACTS = ['wave', 'shrug', 'clap', 'dance', 'flex', 'wave-hello', 'laugh', 'bow', 'cheer', 'hop', 'jump', 'victory'];
const FLIPS = ['frontflip', 'backflip'];
const LOOPS = new Set(['clap', 'dance', 'laugh', 'cheer', 'hop']);

// Ink boxes per role, in units of size, facing right, origin at the root.
const SHAPE: Record<Role, [number, number, number, number][]> = {
	stand: [[-0.2, -0.98, 0.2, -0.03]],
	sleep: [[-0.4, -0.3, 0.4, -0.03]],
	lean: [[-0.1, -0.76, 0.2, -0.03]],
	perch: [
		[-0.1, -0.4, 0.12, -0.03],
		[0.05, 0.03, 0.2, 0.22]
	],
	hang: [[-0.12, 0.03, 0.12, 0.84]],
	kilroy: [[-0.1, -0.2, 0.1, -0.03]],
	peek: [[-0.3, -0.75, -0.15, -0.25]]
};

const SIZES_WIDE = [24, 32, 40, 48, 64];
const SIZES_NARROW = [20, 24, 32, 40];

// ---------------------------------------------------------------- measuring

class Grid {
	private rows = new Map<number, Box[]>();
	add(b: Box) {
		for (let k = Math.floor(b.y0 / 64); k <= Math.floor(b.y1 / 64); k++) {
			let r = this.rows.get(k);
			if (!r) this.rows.set(k, (r = []));
			r.push(b);
		}
	}
	hits(b: Box) {
		for (let k = Math.floor(b.y0 / 64); k <= Math.floor(b.y1 / 64); k++) {
			const r = this.rows.get(k);
			if (r) for (const o of r) if (b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) return true;
		}
		return false;
	}
}

interface Ledge {
	kind: 'rule' | 'top' | 'floor';
	x0: number;
	x1: number;
	y: number;
	el: Element;
	/** Walls at the ends (inside a bordered box). */
	walls?: boolean;
	/** Open ends you can perch on or hang from. */
	open?: boolean;
}

interface Letter {
	x: number;
	y: number;
	fs: number;
	el: Element;
	word: [number, number];
	first: boolean;
	last: boolean;
}

function docBox(r: DOMRect | DOMRectReadOnly): Box {
	return {
		x0: r.left + scrollX,
		y0: r.top + scrollY,
		x1: r.right + scrollX,
		y1: r.bottom + scrollY
	};
}

const clearColor = (c: string) => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);

function measure(root: Element) {
	const grid = new Grid();
	const ledges: Ledge[] = [];
	const letters: Letter[] = [];
	const boxes: Element[] = [];
	const solids = new Set<Element>();
	const paper = getComputedStyle(document.body).backgroundColor;
	const ctx = document.createElement('canvas').getContext('2d')!;
	const ascents = new Map<string, number>();

	for (const el of root.querySelectorAll('*')) {
		if (el.closest('.flipbook-sr, [aria-hidden="true"] canvas')) continue;
		// data-swarm-skip: the whole element is one solid block, nobody inside.
		const skip = el.closest('[data-swarm-skip]');
		if (skip && skip !== el) continue;
		const r = el.getBoundingClientRect();
		if (r.width < 2 || r.height < 1) continue;
		if (skip) {
			grid.add(docBox(r));
			continue;
		}
		const cs = getComputedStyle(el);
		if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
		const b = docBox(r);
		const tag = el.tagName.toLowerCase();
		const bg = cs.backgroundColor;
		const solid = !clearColor(bg) && bg !== paper;

		if (tag === 'hr' || (solid && r.height <= 3)) {
			grid.add(b);
			ledges.push({
				kind: 'rule',
				x0: b.x0,
				x1: b.x1,
				y: b.y0,
				el,
				open: true
			});
			continue;
		}
		if (['canvas', 'img', 'svg', 'video', 'iframe'].includes(tag) || el.classList.contains('flipbook-figure')) {
			grid.add(b);
			continue;
		}
		const bw = (side: string) =>
			cs.getPropertyValue(`border-${side}-style`) !== 'none' && !clearColor(cs.getPropertyValue(`border-${side}-color`))
				? parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0
				: 0;
		const [bt, br, bb, bl] = [bw('top'), bw('right'), bw('bottom'), bw('left')];
		if (solid) {
			solids.add(el);
			grid.add(b);
			ledges.push({
				kind: 'top',
				x0: b.x0,
				x1: b.x1,
				y: b.y0,
				el,
				open: r.width > 60
			});
		} else if (bt || br || bb || bl || tag === 'textarea' || tag === 'input') {
			if (bt) grid.add({ ...b, y1: b.y0 + bt + 1 });
			if (bb) grid.add({ ...b, y0: b.y1 - bb });
			if (bl) grid.add({ ...b, x1: b.x0 + bl + 1 });
			if (br) grid.add({ ...b, x0: b.x1 - br - 1 });
			if (bt)
				ledges.push({
					kind: 'top',
					x0: b.x0,
					x1: b.x1,
					y: b.y0,
					el,
					open: !!(bl && br)
				});
			// A cell's floor is often the next cell's border, so a box with a
			// top and a side has a floor whether or not it draws one.
			if ((bb || (bt && (bl || br))) && r.height > 40)
				ledges.push({
					kind: 'floor',
					x0: b.x0 + bl,
					x1: b.x1 - br,
					y: b.y1 - bb,
					el,
					walls: !!(bl || br)
				});
			if (bt && bb && bl && br && r.width >= 120 && r.height >= 60) boxes.push(el);
			if (tag === 'textarea' || tag === 'input') grid.add(b);
		}
	}

	// Text: every word is an obstacle the size of its ink; the tallest
	// letters of each word are places to stand.
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const range = document.createRange();
	for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
		const parent = n.parentElement;
		if (!parent || !n.data.trim()) continue;
		if (parent.closest('.flipbook-sr, textarea, script, style, [data-swarm-skip]')) continue;
		let inSolid = false;
		for (let e: Element | null = parent; e && e !== root; e = e.parentElement) if (solids.has(e)) inSolid = true;
		if (inSolid) continue;
		const cs = getComputedStyle(parent);
		if (cs.visibility === 'hidden') continue;
		const fs = parseFloat(cs.fontSize);
		ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
		const fm = ctx.measureText('Hg');
		const fa = fm.fontBoundingBoxAscent ?? fs * 0.8;
		const fd = fm.fontBoundingBoxDescent ?? fs * 0.2;
		const ascent = (ch: string) => {
			const k = ctx.font + ch;
			let a = ascents.get(k);
			if (a === undefined) ascents.set(k, (a = ctx.measureText(ch).actualBoundingBoxAscent));
			return a;
		};
		for (const m of n.data.matchAll(/\S+/g)) {
			range.setStart(n, m.index!);
			range.setEnd(n, m.index! + m[0].length);
			const rects = range.getClientRects();
			if (!rects.length) continue;
			const wm = ctx.measureText(m[0]);
			for (const rr of rects) {
				if (rr.width < 1) continue;
				const base = rr.top + scrollY + (rr.height - fa - fd) / 2 + fa;
				const top = base - wm.actualBoundingBoxAscent;
				grid.add({
					x0: rr.left + scrollX,
					y0: top,
					x1: rr.right + scrollX,
					y1: base + wm.actualBoundingBoxDescent
				});
				if (rects.length > 1) continue;
				// One of each word's tallest letters (two on big type).
				const tall: number[] = [];
				for (let i = 0; i < m[0].length; i++) if (ascent(m[0][i]) >= wm.actualBoundingBoxAscent * 0.94) tall.push(i);
				const picks =
					fs >= 30 && tall.length > 1 ? [tall.splice(Math.floor(Math.random() * tall.length), 1)[0], pick(tall)] : tall.length ? [pick(tall)] : [];
				for (const i of picks) {
					range.setStart(n, m.index! + i);
					range.setEnd(n, m.index! + i + 1);
					const cr = range.getBoundingClientRect();
					letters.push({
						x: (cr.left + cr.right) / 2 + scrollX,
						y: base - ascent(m[0][i]),
						fs,
						el: parent,
						word: [rr.left + scrollX, rr.right + scrollX],
						first: i === 0,
						last: i === m[0].length - 1
					});
				}
			}
		}
	}
	range.detach();
	// A box inside another box can't hide anyone: keep the outermost.
	const peekBoxes = boxes.filter((b) => !boxes.some((o) => o !== b && o.contains(b)));
	return { grid, ledges, letters, boxes: peekBoxes };
}

// ---------------------------------------------------------------- placing

function shapeAt(role: Role, x: number, y: number, s: number, facing: 1 | -1): Box[] {
	return SHAPE[role].map(([a, b, c, d]) =>
		facing > 0 ? { x0: x + a * s, y0: y + b * s, x1: x + c * s, y1: y + d * s } : { x0: x - c * s, y0: y + b * s, x1: x - a * s, y1: y + d * s }
	);
}

function place(root: Element, narrow: boolean, budget: number): { spots: Spot[]; boxes: Element[] } {
	const { grid, ledges, letters, boxes } = measure(root);
	const sizes = narrow ? SIZES_NARROW : SIZES_WIDE;
	const snap = (v: number) => sizes.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
	const spots: Spot[] = [];
	const W = document.documentElement.clientWidth;

	const fits = (role: Role, x: number, y: number, s: number, facing: 1 | -1) => {
		const parts = shapeAt(role, x, y, s, facing);
		if (parts.some((p) => p.x0 < 2 || p.x1 > W - 2)) return false;
		return !parts.some((p) => grid.hits(p));
	};
	const claim = (spot: Spot) => {
		// Figures keep a little air between them.
		for (const p of shapeAt(spot.role, spot.x, spot.y, spot.size, spot.facing)) {
			const pad = spot.size * 0.08;
			grid.add({
				x0: p.x0 - pad,
				y0: p.y0 - pad,
				x1: p.x1 + pad,
				y1: p.y1 + pad
			});
		}
		spots.push(spot);
		return spots.length - 1;
	};
	const tryRoles = (opts: [Role, number, number, 1 | -1, number][], s: number, el: Element, span: [number, number], extra?: Partial<Spot>) => {
		// [role, x, y, facing, weight] — weighted pick, falling back to whatever fits.
		const order = opts
			.map((o) => ({ o, k: Math.random() ** (1 / o[4]) }))
			.sort((a, b) => b.k - a.k)
			.map((e) => e.o);
		for (const [role, x, y, facing] of order) {
			if (fits(role, x, y, s, facing)) return claim({ role, x, y, size: s, facing, el, span, ...extra });
		}
		return -1;
	};
	const face = (): 1 | -1 => (Math.random() < 0.5 ? 1 : -1);

	// Peekers first: they need the box corners free.
	for (const el of boxes) {
		const b = docBox(el.getBoundingClientRect());
		const s = snap(narrow ? 24 : rand(28, 40));
		const span: [number, number] = [b.x0, b.x1];
		if (Math.random() < 0.8) {
			const x = rand(b.x0 + s * 0.4, b.x1 - s * 0.4);
			if (fits('kilroy', x, b.y0, s, 1))
				claim({
					role: 'kilroy',
					x,
					y: b.y0 + s * 0.56,
					size: s,
					facing: face(),
					el,
					span,
					box: el
				});
		}
		for (const side of [-1, 1] as const) {
			if (Math.random() < 0.45) continue;
			const edge = side < 0 ? b.x0 : b.x1;
			const x = edge - side * s * 0.14;
			const facing = side as 1 | -1;
			if (fits('peek', x, b.y1, s, facing)) claim({ role: 'peek', x, y: b.y1, size: s, facing, el, span, box: el });
		}
	}

	// Rules, box tops and floors.
	for (const l of ledges.sort(() => Math.random() - 0.5)) {
		const span: [number, number] = [l.x0, l.x1];
		const base = l.kind === 'rule' ? (narrow ? 30 : 40) : l.kind === 'floor' ? 30 : 32;
		if (l.open && l.kind !== 'rule') {
			// Corners: perch on them or hang off them.
			for (const side of [-1, 1] as const) {
				if (Math.random() < 0.5) continue;
				const s = snap(base * rand(0.8, 1.1));
				const edge = side < 0 ? l.x0 : l.x1;
				tryRoles(
					[
						['perch', edge - side * s * 0.04, l.y, side, 3],
						['hang', edge + side * s * 0.12, l.y, -side as 1 | -1, 2]
					],
					s,
					l.el,
					span
				);
			}
		}
		const step = l.kind === 'rule' ? (narrow ? 1.6 : 2.2) : 1.4;
		let x = l.x0 + rand(0.3, 2) * base;
		while (x < l.x1 - base * 0.3) {
			const s = snap(base * rand(0.75, 1.25));
			if (l.kind === 'floor') {
				const nearWall = l.walls && (x - l.x0 < s * 0.6 || l.x1 - x < s * 0.6);
				const wallSide: 1 | -1 = x - l.x0 < l.x1 - x ? 1 : -1;
				tryRoles(
					nearWall
						? [
								['lean', wallSide > 0 ? l.x0 + s * 0.2 : l.x1 - s * 0.2, l.y, wallSide, 4],
								['stand', x, l.y, face(), 1]
							]
						: [
								['stand', x, l.y, face(), 3]
							],
					s,
					l.el,
					span,
					{ ledge: true }
				);
			} else {
				const f = face();
				const opts: [Role, number, number, 1 | -1, number][] = [
					['stand', x, l.y, f, 5],
					// Sitting is a perch: seat on the line, legs hanging over it.
					['perch', x, l.y, f, 2]
				];
				if (l.kind === 'rule') opts.push(['perch', x, l.y, f, 2], ['hang', x, l.y, f, 2]);
				const i = tryRoles(opts, s, l.el, span, { ledge: true });
				// Some arrive in pairs that face each other.
				if (i >= 0 && spots[i].role === 'stand' && Math.random() < 0.25) {
					spots[i].facing = 1;
					const j = tryRoles([['stand', x + s * 0.6, l.y, -1, 1]], s, l.el, span, { ledge: true });
					if (j >= 0) spots[i].partner = j;
				}
			}
			x += s * rand(step * 0.7, step * 2.4);
		}
	}

	// Letters: stand on them, perch on a word's end, hang off it.
	for (const t of letters.sort(() => Math.random() - 0.5)) {
		// Big type is where they show best; small text gets a sprinkling.
		if (Math.random() < (t.fs >= 30 ? 0.1 : t.fs < 20 ? 0.75 : 0.45)) continue;
		const s = snap(Math.max(narrow ? 20 : 24, Math.min(64, t.fs * rand(0.55, 1.0))));
		const span = t.word;
		const opts: [Role, number, number, 1 | -1, number][] = [['stand', t.x, t.y, face(), 8]];
		if (t.last) opts.push(['perch', t.word[1] - s * 0.05, t.y, 1, 2], ['hang', t.word[1] + s * 0.1, t.y, -1, 1]);
		if (t.first) opts.push(['perch', t.word[0] + s * 0.05, t.y, -1, 2]);
		tryRoles(opts, s, t.el, span);
	}

	// Keep the crowd to the budget, spread down the whole page.
	if (spots.length > budget) {
		const keep = new Set<number>();
		const order = spots.map((_, i) => i).sort(() => Math.random() - 0.5);
		for (const i of order) {
			if (keep.size >= budget) break;
			keep.add(i);
			const p = spots[i].partner;
			if (p !== undefined) keep.add(p);
		}
		const remap = new Map<number, number>();
		const kept: Spot[] = [];
		spots.forEach((s, i) => {
			if (keep.has(i)) {
				remap.set(i, kept.length);
				kept.push(s);
			}
		});
		for (const s of kept) s.partner = s.partner !== undefined ? remap.get(s.partner) : undefined;
		return { spots: kept, boxes };
	}
	return { spots, boxes };
}

// ---------------------------------------------------------------- running

export interface Inhabited {
	leave(): void;
	destroy(): void;
}

export interface InhabitOptions {
	library: Library;
	root: Element;
	reduced: boolean;
	/** Seconds before they leave on their own. */
	linger?: number;
	onStats?: (s: { figures: number; fps: number }) => void;
	onGone?: () => void;
}

export function inhabit(opts: InhabitOptions): Inhabited {
	const { library, root, reduced } = opts;
	const linger = opts.linger ?? 30;
	const de = document.documentElement;
	const ink = getComputedStyle(document.body).color;
	const paper = getComputedStyle(de).getPropertyValue('--paper').trim() || '#fafaf7';

	// Two canvases sharing one window: figures, and peekers clipped to stay
	// behind their boxes.
	const make = () => {
		const c = document.createElement('canvas');
		c.className = 'flipbook-swarm-page';
		c.setAttribute('aria-hidden', 'true');
		c.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;z-index:5;will-change:transform;${reduced ? 'opacity:0;transition:opacity 300ms ease-out;' : ''}`;
		document.body.appendChild(c);
		return c;
	};
	const canvas = make();
	const peekCanvas = make();
	const stageOpts = {
		library,
		color: ink,
		paper,
		pixelRatio: 2,
		autoResize: false
	};
	const stage = new Stage(canvas, stageOpts);
	const peekStage = new Stage(peekCanvas, stageOpts);

	// The window: a viewport and a margin either side.
	let top = 0;
	let winH = 0;
	let margin = 0;
	const sizeWindow = () => {
		const H = innerHeight;
		const docH = de.scrollHeight;
		margin = Math.round(H * 0.4);
		winH = Math.min(docH, H + margin * 2);
		const w = de.clientWidth;
		for (const c of [canvas, peekCanvas]) {
			c.style.width = `${w}px`;
			c.style.height = `${winH}px`;
		}
		stage.resize();
		peekStage.resize();
		top = -1;
	};
	const slide = () => {
		const y = scrollY;
		const H = innerHeight;
		const docH = de.scrollHeight;
		if (top >= 0 && y - top >= margin * 0.3 && top + winH - (y + H) >= margin * 0.3) return;
		const next = Math.max(0, Math.min(Math.max(0, docH - winH), y - margin));
		if (next === top) return;
		top = next;
		const t = `translate3d(0,${top}px,0)`;
		canvas.style.transform = t;
		peekCanvas.style.transform = t;
		stage.camera.y = top;
		peekStage.camera.y = top;
	};

	// Peekers are drawn with their boxes cut out of the canvas.
	let clipBoxes: Element[] = [];
	const offClip = peekStage.onBeforeDraw((_, s) => {
		const ctx = s.ctx;
		ctx.save();
		ctx.beginPath();
		ctx.rect(-10, top - 10, s.width + 20, s.height + 20);
		for (const el of clipBoxes) {
			const r = el.getBoundingClientRect();
			ctx.rect(r.left + scrollX, r.top + scrollY, r.width, r.height);
		}
		ctx.clip('evenodd');
	});
	const offUnclip = peekStage.onAfterDraw((_, s) => s.ctx.restore());

	const narrow = () => innerWidth < 640;
	const budget = () => (reduced ? 120 : narrow() ? 220 : 420);

	let figures: Character[] = [];
	let t = 0;
	let leaving = false;

	const populate = (arrive: boolean) => {
		for (const c of figures) {
			const s = mind(c).role === 'peek' || mind(c).role === 'kilroy' ? peekStage : stage;
			s.remove(c);
		}
		figures = [];
		const { spots, boxes } = place(root, narrow(), budget());
		clipBoxes = boxes;
		const H = innerHeight;
		const y0 = scrollY;
		const made: Character[] = [];
		for (const sp of spots) {
			const hidden = sp.role === 'peek' || sp.role === 'kilroy';
			const s = hidden ? peekStage : stage;
			const c = s.add({
				x: sp.x,
				y: sp.y,
				size: sp.size,
				facing: sp.facing,
				halo: true,
				initial: REST[sp.role]
			});
			const er = sp.el.getBoundingClientRect();
			const inView = sp.y > y0 - 40 && sp.y < y0 + H + 80;
			const m: Mind = {
				role: sp.role,
				hx: sp.x,
				hy: sp.y,
				el: sp.el,
				ex: er.left + scrollX,
				ey: er.top + scrollY,
				span: sp.span,
				phase: 'live',
				at: 0,
				next: t + rand(0.3, 3),
				ledge: sp.ledge,
				vx: 0,
				vy: 0,
				aloft: 0
			};
			c.data = m as unknown as Record<string, unknown>;
			made.push(c);
			if (reduced) {
				c.pose(REST[sp.role], sp.role === 'sleep' ? 0 : Math.floor(rand(0, 6)));
			} else if (arrive && inView) {
				// They drop in from the top of the screen, top of the page first.
				m.phase = hidden ? 'rise' : 'wait';
				m.at = t + rand(0, 0.55) + ((sp.y - y0) / H) * 0.35;
				if (hidden) c.y = sp.y + sp.size * 0.9;
				else {
					c.y = y0 - rand(30, 160);
					m.vy = rand(0, 250);
				}
			} else rest(c);
		}
		spots.forEach((sp, i) => {
			if (sp.partner !== undefined) {
				mind(made[i]).partner = made[sp.partner];
				mind(made[sp.partner]).partner = made[i];
			}
		});
		figures = made;
	};

	const rest = (c: Character) => {
		const m = mind(c);
		m.phase = 'live';
		c.x = m.hx;
		c.y = m.hy;
		c.animate(REST[m.role], {
			interrupt: 'cut',
			route: false,
			phase: Math.random()
		});
	};

	const touchDown = (c: Character) => {
		const m = mind(c);
		m.phase = 'live';
		c.y = m.hy;
		if (m.role === 'perch' || m.role === 'hang') {
			c.animate(REST[m.role], {
				interrupt: 'cut',
				route: false,
				phase: Math.random()
			});
			return;
		}
		c.animate('land', { interrupt: 'cut', speed: 1.6 }).then(() => {
			if (m.phase === 'live') c.animate(REST[m.role]);
		});
	};

	// What a figure does when its turn comes round.
	const act = (c: Character) => {
		const m = mind(c);
		const settle = () => {
			if (m.phase === 'live') c.animate(REST[m.role]);
		};
		switch (m.role) {
			case 'stand': {
				const p = m.partner;
				if (p && mind(p).phase === 'live' && Math.random() < 0.5) {
					c.animate('high-five').then(settle);
					p.animate('high-five').then(() => {
						if (mind(p).phase === 'live') p.animate('idle');
					});
					mind(p).next = t + rand(4, 10);
					return;
				}
				// On a ledge, mostly stroll or jog somewhere along it.
				const lo = m.span[0] + c.size * 0.3;
				const hi = m.span[1] - c.size * 0.3;
				if (m.ledge && hi - lo > c.size * 1.5 && Math.random() < 0.6) {
					const x = rand(lo, hi);
					c.animate({ action: Math.random() < 0.7 ? 'walk' : 'jog', x, then: 'idle' }).then(() => {
						if (m.phase === 'live') m.hx = c.x;
					});
					return;
				}
				if (Math.random() < 0.2) {
					c.animate(pick(FLIPS), { inPlace: true }).then(settle);
					return;
				}
				const a = pick(ACTS);
				c.animate(a, LOOPS.has(a) ? { repeat: 1 } : {}).then(settle);
				return;
			}
			case 'hang':
				c.animate('hang-swing', { repeat: 1 }).then(settle);
				return;
			case 'peek':
				c.animate('peek-out').then(settle);
				return;
			case 'kilroy':
				c.animate('hop', { repeat: 0 }).then(settle);
				return;
		}
	};

	// Leaving, each in its own way.
	const fly = (c: Character, vx: number, vy: number) => {
		const m = mind(c);
		m.phase = 'fly';
		m.vx = vx;
		m.vy = vy;
		m.aloft = 0;
		c.animate('fall', { interrupt: 'cut', phase: Math.random() });
	};
	const depart = (c: Character) => {
		const m = mind(c);
		const s = c.size;
		const out = () => (c.x < (m.span[0] + m.span[1]) / 2 ? -1 : 1);
		switch (m.role) {
			case 'peek':
			case 'kilroy':
				m.phase = 'sink';
				return;
			case 'hang':
				c.y = m.hy + s * 0.79;
				fly(c, 0, 0);
				return;
			case 'perch':
				c.animate('hop-off', {
					interrupt: 'cut',
					route: false,
					speed: 1.4
				}).then(() => fly(c, c.facing * 60, 0));
				return;
			case 'sleep':
			case 'lean':
				c.animate('jump', { interrupt: 'cut', speed: 1.5 });
				setTimeout(() => m.phase === 'leave' && fly(c, out() * rand(80, 200), -rand(500, 800)), 220);
				return;
		}
		const roll = Math.random();
		const dir = out();
		const end = dir < 0 ? m.span[0] - s * 0.1 : m.span[1] + s * 0.1;
		if (Math.abs(end - c.x) < s * 3 && roll < 0.5) {
			// Close to the edge: run off it.
			c.animate({
				action: roll < 0.15 ? 'sneak-off' : 'sprint',
				x: end,
				transition: { interrupt: 'cut', speed: 2.2 }
			}).then(() => {
				if (m.phase === 'leave') fly(c, dir * 160, -120);
			});
		} else if (roll < 0.75) {
			// A flip off the page.
			c.facing = dir as 1 | -1;
			c.animate(pick(['frontflip', 'backflip']), {
				interrupt: 'cut',
				speed: 1.5
			});
			setTimeout(() => m.phase === 'leave' && fly(c, dir * rand(120, 260), -rand(300, 600)), 260);
		} else fly(c, dir * rand(60, 180), -rand(600, 950));
	};

	const leave = () => {
		if (leaving) return;
		leaving = true;
		clearTimeout(lingerTimer);
		if (reduced) {
			canvas.style.opacity = peekCanvas.style.opacity = '0';
			endTimer = setTimeout(destroy, 350);
			return;
		}
		const y0 = scrollY;
		const H = innerHeight;
		for (const c of figures) {
			const m = mind(c);
			const inView = m.hy > y0 - 60 && m.hy < y0 + H + 120;
			if (!inView || m.phase === 'wait') {
				m.phase = 'gone';
				continue;
			}
			m.phase = 'leave';
			m.at = t + rand(0, 0.45);
		}
		sweep();
		// Whatever is still about after this is faded out with the canvas.
		endTimer = setTimeout(() => {
			canvas.style.transition = peekCanvas.style.transition = 'opacity 200ms ease-out';
			canvas.style.opacity = peekCanvas.style.opacity = '0';
			endTimer = setTimeout(destroy, 220);
		}, 2600);
	};

	const sweep = () => {
		const keep: Character[] = [];
		for (const c of figures) {
			if (mind(c).phase === 'gone') {
				const role = mind(c).role;
				(role === 'peek' || role === 'kilroy' ? peekStage : stage).remove(c);
			} else keep.push(c);
		}
		figures = keep;
		if (leaving && !figures.length) destroy();
	};

	const G = 2600;
	const update = (data: { delta: number }) => {
		slide();
		const dt = Math.min(0.05, data.delta / 1000);
		t += dt;
		if (reduced) return;
		const y0 = scrollY;
		const H = innerHeight;
		let swept = false;
		for (const c of figures) {
			const m = mind(c);
			switch (m.phase) {
				case 'wait':
					if (t >= m.at) {
						m.phase = 'fall';
						c.animate('fall', { interrupt: 'cut', phase: Math.random() });
					}
					break;
				case 'fall': {
					m.vy += G * dt;
					c.y += m.vy * dt;
					const feet = m.role === 'hang' ? m.hy + c.size * 0.79 : m.hy;
					if (c.y >= feet) touchDown(c);
					break;
				}
				case 'rise':
					if (t >= m.at) {
						c.y -= Math.max(0.5, (c.y - m.hy) * Math.min(1, dt * 14));
						if (c.y <= m.hy) rest(c);
					}
					break;
				case 'live':
					// Only figures near the screen pick new things to do.
					if (t >= m.next) {
						m.next = t + rand(1, 4);
						if (m.hy > y0 - H * 0.5 && m.hy < y0 + H * 1.5 && c.action.loop) act(c);
					}
					break;
				case 'leave':
					if (t >= m.at) {
						m.at = Infinity;
						depart(c);
					}
					break;
				case 'fly':
					m.aloft += dt;
					m.vy += G * dt;
					c.x += m.vx * dt;
					c.y += m.vy * dt;
					if (m.aloft > 0.25) c.opacity = Math.max(0, c.opacity - dt * 2.2);
					if (c.opacity <= 0 || c.y > y0 + H + 200) {
						m.phase = 'gone';
						swept = true;
					}
					break;
				case 'sink':
					c.y += c.size * dt * 5;
					if (c.y > m.hy + c.size) {
						m.phase = 'gone';
						swept = true;
					}
					break;
			}
		}
		if (swept) sweep();
	};
	const offUpdate = stage.onUpdate(update);

	// Layout shifts (a demo grows, a font lands) carry everyone with their
	// element; a new width means a fresh crowd.
	let width = de.clientWidth;
	let relayout: ReturnType<typeof setTimeout> | undefined;
	const reanchor = () => {
		sizeWindow();
		slide();
		if (de.clientWidth !== width) {
			width = de.clientWidth;
			if (!leaving) populate(false);
			return;
		}
		for (const c of figures) {
			const m = mind(c);
			if (!m.el.isConnected) continue;
			const r = m.el.getBoundingClientRect();
			const dx = r.left + scrollX - m.ex;
			const dy = r.top + scrollY - m.ey;
			if (!dx && !dy) continue;
			m.ex += dx;
			m.ey += dy;
			m.hx += dx;
			m.hy += dy;
			m.span = [m.span[0] + dx, m.span[1] + dx];
			c.x += dx;
			c.y += dy;
		}
	};
	const schedule = () => {
		clearTimeout(relayout);
		relayout = setTimeout(reanchor, 150);
	};
	const ro = new ResizeObserver(schedule);
	ro.observe(root);
	addEventListener('resize', schedule);

	const ticker = setInterval(() => opts.onStats?.({ figures: figures.length, fps: stage.stats.fps }), 250);

	sizeWindow();
	slide();
	populate(true);
	if (reduced) requestAnimationFrame(() => (canvas.style.opacity = peekCanvas.style.opacity = '1'));
	let lingerTimer = setTimeout(leave, linger * 1000);
	let endTimer: ReturnType<typeof setTimeout> | undefined;

	let dead = false;
	function destroy() {
		if (dead) return;
		dead = true;
		clearTimeout(lingerTimer);
		clearTimeout(endTimer);
		clearTimeout(relayout);
		clearInterval(ticker);
		ro.disconnect();
		removeEventListener('resize', schedule);
		offUpdate();
		offClip();
		offUnclip();
		stage.destroy();
		peekStage.destroy();
		canvas.remove();
		peekCanvas.remove();
		figures = [];
		opts.onGone?.();
	}

	return { leave, destroy };
}
