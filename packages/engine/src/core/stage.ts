// Canvas renderer for crowds and maps. Every figure is one fillText call of
// one glyph; letters, props and text flows are fillText too. Pretext does
// the paragraph layout (see textflow.ts), so nothing on a Stage ever touches
// DOM layout — that's what keeps thousands of figures cheap.

import { Character, type CharacterOptions, type Definition } from './character';
import { cancelFrame, frame, type FrameData } from './frameloop';
import { type Layer, type Library, getLibrary } from './library';

export interface Prop {
	id: number;
	text: string;
	font: string;
	x: number;
	y: number;
	color?: string;
	rotate?: number;
	align?: CanvasTextAlign;
	z?: number;
	/** 'back' draws before the figures (letters they walk in front of). Default 'front'. */
	layer?: 'back' | 'front';
	/**
	 * Erased spots, [dx, dy, radius] in stage px from (x, y). The letter's own
	 * ink is removed there (not painted over), so erasing works on any
	 * background.
	 */
	erase?: [number, number, number][];
	/** Ride along with a character's anchor (e.g. a letter carried overhead). */
	attach?: { to: Character; anchor: 'head' | 'top' | 'handL' | 'handR' | 'footL' | 'footR' | 'pelvis' | 'shoulder'; dx?: number; dy?: number };
	data?: Record<string, unknown>;
}

/**
 * A thing from the Flipbook Things font — a prop or a set piece. On the
 * ground it stands at (x, y) like a figure; held, it rides a figure's hand
 * (tools turn with the forearm, sacks hang). `frame` picks the drawing, so
 * a sack can fill and a hole can deepen just by counting up.
 */
export interface Thing {
	id: number;
	name: string;
	frame: number;
	x: number;
	y: number;
	/** Font size in px. Defaults to the size figures are drawn at. */
	size: number;
	facing: 1 | -1;
	/** On the ground: draw before ('back') or after ('front') the figures. A wall in front hides whoever is behind it. */
	layer: 'back' | 'front';
	held?: { by: Character; hand: 'L' | 'R'; behind?: boolean };
	color?: string;
	data?: Record<string, unknown>;
}

interface Flight {
	item: { x: number; y: number; rotate?: number };
	from: [number, number];
	to: [number, number];
	height: number;
	t: number;
	duration: number;
	spin: number;
	done: () => void;
}

export interface StageOptions {
	library?: Library;
	background?: string | null;
	color?: string;
	/** Device pixel ratio cap. */
	pixelRatio?: number;
	/** Size the canvas to its CSS box automatically. Default true. */
	autoResize?: boolean;
	/** Draw characters in y order so nearer figures overlap farther ones. Default true. */
	depthSort?: boolean;
	/** Skip drawing figures outside the viewport. Default true. */
	cull?: boolean;
	/** Paper colour for the halo around limbs drawn over letter bodies. Defaults to the background. */
	paper?: string;
}

export interface StageStats {
	characters: number;
	drawn: number;
	fps: number;
	updateMs: number;
	drawMs: number;
}

type Hook = (data: FrameData, stage: Stage) => void;

let propId = 1;

export class Stage {
	readonly canvas: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;
	readonly library: Library;
	readonly characters: Character[] = [];
	readonly props: Prop[] = [];
	readonly things: Thing[] = [];
	private flights: Flight[] = [];
	options: Required<Omit<StageOptions, 'library'>>;
	width = 0;
	height = 0;
	/** Camera offset in stage px (for scrolling maps). */
	camera = { x: 0, y: 0, zoom: 1 };
	stats: StageStats = { characters: 0, drawn: 0, fps: 0, updateMs: 0, drawMs: 0 };

	private dpr = 1;
	private ro: ResizeObserver | null = null;
	private io: IntersectionObserver | null = null;
	/** False while the canvas is scrolled out of view — drawing is skipped. */
	visible = true;
	private hooks = { update: new Set<Hook>(), before: new Set<Hook>(), after: new Set<Hook>() };
	private running = false;
	private fpsAcc = { t: 0, n: 0 };
	private exits = new Map<Character, () => void>();

	constructor(canvas: HTMLCanvasElement, opts: StageOptions = {}) {
		this.canvas = canvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('[flipbook] Canvas 2D context unavailable');
		this.ctx = ctx;
		this.library = opts.library ?? getLibrary();
		this.options = {
			background: opts.background ?? null,
			color: opts.color ?? '#111',
			pixelRatio: opts.pixelRatio ?? 2,
			autoResize: opts.autoResize ?? true,
			depthSort: opts.depthSort ?? true,
			cull: opts.cull ?? true,
			paper: opts.paper ?? opts.background ?? paperBehind(canvas)
		};
		if (this.options.autoResize && typeof ResizeObserver !== 'undefined') {
			this.ro = new ResizeObserver(() => this.resize());
			this.ro.observe(canvas);
		}
		if (typeof IntersectionObserver !== 'undefined') {
			this.io = new IntersectionObserver((entries) => {
				for (const e of entries) this.visible = e.isIntersecting;
			});
			this.io.observe(canvas);
		}
		// Stages are where figures carry things and meet hands: fetch anchors.
		this.library.loadAnchors();
		this.resize();
		this.start();
	}

	resize() {
		const r = this.canvas.getBoundingClientRect();
		this.dpr = Math.min(this.options.pixelRatio, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
		this.width = r.width;
		this.height = r.height;
		this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
		this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
	}

	add(opts: CharacterOptions | Character = {}): Character {
		const c = opts instanceof Character ? opts : new Character({ library: this.library, ...opts });
		this.characters.push(c);
		return c;
	}

	/** Remove, optionally playing an exit action first (AnimatePresence-style). */
	async remove(c: Character, exit?: Definition) {
		if (exit !== undefined) {
			const done = new Promise<void>((r) => this.exits.set(c, r));
			c.animate(exit).then(() => this.exits.get(c)?.());
			await done;
			this.exits.delete(c);
		}
		const i = this.characters.indexOf(c);
		if (i >= 0) this.characters.splice(i, 1);
		for (let k = this.props.length - 1; k >= 0; k--) if (this.props[k].attach?.to === c) this.props[k].attach = undefined;
	}

	addProp(p: Omit<Prop, 'id'>): Prop {
		const prop = { id: propId++, ...p };
		this.props.push(prop);
		return prop;
	}

	addThing(t: Partial<Thing> & { name: string }): Thing {
		this.library.thing(t.name); // validate early
		const thing: Thing = { id: propId++, frame: 0, x: 0, y: 0, size: 64, facing: 1, layer: 'back', ...t };
		this.things.push(thing);
		return thing;
	}

	removeThing(t: Thing) {
		const i = this.things.indexOf(t);
		if (i >= 0) this.things.splice(i, 1);
	}

	/** Put a thing in a figure's hand. `behind` draws it behind the figure. */
	hold(t: Thing, by: Character, hand: 'L' | 'R' = 'R', behind = false) {
		t.held = { by, hand, behind };
	}

	/** Let go: the thing lands on the ground under the hand that held it. */
	drop(t: Thing) {
		if (!t.held) return;
		const { by, hand } = t.held;
		t.x = by.anchor(hand === 'L' ? 'handL' : 'handR')[0];
		t.y = by.y;
		t.facing = by.facing;
		t.held = undefined;
	}

	/**
	 * Throw a prop or thing along an arc to `to` (stage px). `height` is how
	 * far above the higher end the arc peaks; `spin` is turns per flight.
	 */
	fly(item: Prop | Thing, opts: { to: [number, number]; height?: number; duration?: number; spin?: number }): Promise<void> {
		if ('held' in item && item.held) this.drop(item);
		if ('attach' in item) item.attach = undefined;
		return new Promise((done) =>
			this.flights.push({
				item: item as Flight['item'],
				from: [item.x, item.y],
				to: opts.to,
				height: opts.height ?? 80,
				t: 0,
				duration: (opts.duration ?? 0.6) * 1000,
				spin: opts.spin ?? 0,
				done
			})
		);
	}

	removeProp(p: Prop) {
		const i = this.props.indexOf(p);
		if (i >= 0) this.props.splice(i, 1);
	}

	/** Game logic runs here, once per frame, after characters advance. */
	onUpdate(fn: Hook) {
		this.hooks.update.add(fn);
		return () => this.hooks.update.delete(fn);
	}
	/** Draw under the figures (terrain, text flows). Context is in stage space. */
	onBeforeDraw(fn: Hook) {
		this.hooks.before.add(fn);
		return () => this.hooks.before.delete(fn);
	}
	/** Draw over the figures. */
	onAfterDraw(fn: Hook) {
		this.hooks.after.add(fn);
		return () => this.hooks.after.delete(fn);
	}

	/** Topmost character under a stage-space point. */
	hitTest(x: number, y: number): Character | null {
		for (let i = this.characters.length - 1; i >= 0; i--) {
			const c = this.characters[i];
			const b = c.bounds();
			if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return c;
		}
		return null;
	}

	/** Convert a client (mouse) point to stage space. */
	toStage(clientX: number, clientY: number): [number, number] {
		const r = this.canvas.getBoundingClientRect();
		return [
			(clientX - r.left) / this.camera.zoom + this.camera.x,
			(clientY - r.top) / this.camera.zoom + this.camera.y
		];
	}

	start() {
		if (this.running) return;
		this.running = true;
		frame.update(this.tick, true);
		frame.render(this.draw, true);
	}

	stop() {
		this.running = false;
		cancelFrame(this.tick);
		cancelFrame(this.draw);
	}

	destroy() {
		this.stop();
		this.ro?.disconnect();
		this.io?.disconnect();
		this.characters.length = 0;
		this.props.length = 0;
	}

	private tick = (data: FrameData) => {
		const t0 = performance.now();
		for (const c of this.characters) c.update(data.delta);
		for (let i = this.flights.length - 1; i >= 0; i--) {
			const f = this.flights[i];
			f.t += data.delta;
			const u = Math.min(1, f.t / f.duration);
			const top = Math.min(f.from[1], f.to[1]) - f.height;
			// Quadratic Bézier through a control point that peaks at `top`.
			const cx = (f.from[0] + f.to[0]) / 2;
			const cy = 2 * top - (f.from[1] + f.to[1]) / 2;
			f.item.x = (1 - u) * (1 - u) * f.from[0] + 2 * (1 - u) * u * cx + u * u * f.to[0];
			f.item.y = (1 - u) * (1 - u) * f.from[1] + 2 * (1 - u) * u * cy + u * u * f.to[1];
			if (f.spin) f.item.rotate = u * f.spin * Math.PI * 2;
			if (u >= 1) {
				this.flights.splice(i, 1);
				f.done();
			}
		}
		for (const c of this.characters) for (const b of c.behaviors) b(c, this, data.timestamp);
		for (const h of this.hooks.update) h(data, this);
		this.stats.updateMs = performance.now() - t0;
		this.fpsAcc.t += data.delta;
		this.fpsAcc.n++;
		if (this.fpsAcc.t > 500) {
			this.stats.fps = Math.round((this.fpsAcc.n * 1000) / this.fpsAcc.t);
			this.fpsAcc = { t: 0, n: 0 };
		}
	};

	private fontCache = new Map<string, string>();
	private fontFor(layer: Layer, size: number) {
		const key = `${layer}|${size}`;
		let f = this.fontCache.get(key);
		if (!f) {
			const { family, weight } = this.library.css(layer);
			f = `${weight} ${size}px "${family}"`;
			this.fontCache.set(key, f);
		}
		return f;
	}

	private sorted: Character[] = [];

	private draw = (data: FrameData) => {
		// Offscreen stages keep simulating (cheap) but don't paint.
		if (!this.visible) return;
		const t0 = performance.now();
		const { ctx, dpr, camera } = this;
		const z = camera.zoom * dpr;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if (this.options.background) {
			ctx.fillStyle = this.options.background;
			ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		} else ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		const base = (): void => ctx.setTransform(z, 0, 0, z, -camera.x * z, -camera.y * z);
		base();
		for (const h of this.hooks.before) {
			h(data, this);
			base();
		}

		// Depth order: by z, then ground y. Insertion sort on a persistent
		// array is ~linear for crowds whose order barely changes per frame.
		const list = this.sorted;
		if (list.length !== this.characters.length || !this.options.depthSort) {
			list.length = 0;
			list.push(...this.characters);
		}
		if (this.options.depthSort) {
			for (let i = 1; i < list.length; i++) {
				const c = list[i];
				let j = i - 1;
				while (j >= 0 && (list[j].z > c.z || (list[j].z === c.z && list[j].y > c.y))) {
					list[j + 1] = list[j];
					j--;
				}
				list[j + 1] = c;
			}
		}

		// Who's holding what this frame.
		const held = new Map<Character, Thing[]>();
		for (const t of this.things) if (t.held) held.set(t.held.by, [...(held.get(t.held.by) ?? []), t]);
		for (const t of this.things) if (!t.held && t.layer === 'back') this.drawThing(t, z);
		base();
		this.drawProps('back', z);

		const vx0 = camera.x - 200, vx1 = camera.x + this.width / camera.zoom + 200;
		const vy0 = camera.y - 200, vy1 = camera.y + this.height / camera.zoom + 400;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		let font = '';
		let fill = '';
		let alpha = 1;
		let drawn = 0;
		for (const c of list) {
			if (this.options.cull && (c.x < vx0 || c.x > vx1 || c.y < vy0 || c.y > vy1)) continue;
			const col = c.color === 'currentColor' ? this.options.color : c.color;
			if (c.opacity !== alpha) ctx.globalAlpha = alpha = c.opacity;
			const X = (c.x - camera.x) * z;
			const Y = (c.y - camera.y) * z;
			// A figure is a character: set the font, fillText the glyph.
			// Mirroring is a flipped x axis around the figure's root.
			ctx.setTransform(z * c.facing, 0, 0, z, X, Y);
			const hands = held.get(c);
			if (hands) {
				for (const t of hands) if (t.held!.behind) this.drawHeld(t, c);
				ctx.textAlign = 'center';
				font = '';
				fill = '';
			}
			if (col !== fill) ctx.fillStyle = fill = col;
			const f = this.fontFor(c.layer, c.size);
			if (f !== font) ctx.font = font = f;
			if (c.body?.front) {
				// Limbs behind the letter: at rest it's a letter on legs, and
				// arms show only where they reach past it.
				ctx.fillText(c.glyph, 0, 0);
				this.drawBody(c);
				ctx.font = font = f;
				fill = '';
			} else if (c.body) {
				// Letter first, then the limbs over it with a paper halo, so
				// arms read in front of the body like a comic panel.
				this.drawBody(c);
				ctx.font = f;
				ctx.lineJoin = 'round';
				ctx.lineWidth = (this.library.manifest.layers[c.layer]?.weight ?? 30) * c.scale * 1.1;
				ctx.strokeStyle = this.options.paper;
				ctx.strokeText(c.glyph, 0, 0);
			} else if (c.halo) {
				ctx.lineJoin = 'round';
				ctx.lineWidth = (this.library.manifest.layers[c.layer]?.weight ?? 30) * c.scale * 1.6;
				ctx.strokeStyle = this.options.paper;
				ctx.strokeText(c.glyph, 0, 0);
			}
			if (!c.body?.front) ctx.fillText(c.glyph, 0, 0);
			if (hands) {
				for (const t of hands) if (!t.held!.behind) this.drawHeld(t, c);
				font = '';
				fill = '';
			}
			c.dirty = false;
			drawn++;
		}
		ctx.globalAlpha = 1;
		for (const t of this.things) if (!t.held && t.layer === 'front') this.drawThing(t, z);
		base();

		this.drawProps('front', z);
		ctx.textAlign = 'center';

		for (const h of this.hooks.after) {
			h(data, this);
			base();
		}
		this.stats.characters = this.characters.length;
		this.stats.drawn = drawn;
		this.stats.drawMs = performance.now() - t0;
	};

	private drawProps(pass: 'back' | 'front', z: number) {
		const { ctx } = this;
		for (const p of this.props) {
			if ((p.layer ?? 'front') !== pass) continue;
			let x = p.x, y = p.y;
			if (p.attach) {
				const [ax, ay] = p.attach.to.anchor(p.attach.anchor);
				x = p.x = ax + (p.attach.dx ?? 0);
				y = p.y = ay + (p.attach.dy ?? 0);
			}
			ctx.font = p.font;
			ctx.fillStyle = p.color ?? this.options.color;
			ctx.textAlign = p.align ?? 'center';
			if (p.erase?.length) {
				this.drawErased(p, x, y, z);
				continue;
			}
			if (p.rotate) {
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(p.rotate);
				ctx.fillText(p.text, 0, 0);
				ctx.restore();
			} else ctx.fillText(p.text, x, y);
		}
		ctx.textAlign = 'center';
	}

	private scratch: HTMLCanvasElement | null = null;

	// Draw a prop's text into a scratch canvas, cut the erased spots out of
	// its ink with destination-out, and stamp the result.
	private drawErased(p: Prop, x: number, y: number, z: number) {
		const { ctx } = this;
		const m = ctx.measureText(p.text);
		const pad = 4;
		const left = (p.align === 'left' ? 0 : p.align === 'right' ? m.width : m.width / 2) + pad;
		const w = m.width + pad * 2;
		const up = m.actualBoundingBoxAscent + pad;
		const h = up + m.actualBoundingBoxDescent + pad;
		const c = (this.scratch ??= document.createElement('canvas'));
		const cw = Math.ceil(w * z), ch = Math.ceil(h * z);
		if (c.width < cw) c.width = cw;
		if (c.height < ch) c.height = ch;
		const s = c.getContext('2d')!;
		s.setTransform(1, 0, 0, 1, 0, 0);
		s.clearRect(0, 0, cw, ch);
		s.setTransform(z, 0, 0, z, 0, 0);
		s.font = p.font;
		s.textAlign = 'left';
		s.textBaseline = 'alphabetic';
		s.fillStyle = p.color ?? this.options.color;
		s.fillText(p.text, pad, up);
		s.globalCompositeOperation = 'destination-out';
		s.beginPath();
		for (const [dx, dy, r] of p.erase!) {
			s.moveTo(left + dx + r, up + dy);
			s.arc(left + dx, up + dy, r, 0, Math.PI * 2);
		}
		s.fill();
		s.globalCompositeOperation = 'source-over';
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		const cam = this.camera;
		ctx.drawImage(c, 0, 0, cw, ch, Math.round((x - left - cam.x) * z), Math.round((y - up - cam.y) * z), cw, ch);
		ctx.restore();
	}

	private drawThing(t: Thing, z: number) {
		const { ctx, camera } = this;
		const info = this.library.thing(t.name);
		ctx.setTransform(z * t.facing, 0, 0, z, (t.x - camera.x) * z, (t.y - camera.y) * z);
		ctx.font = this.fontFor('things', t.size);
		ctx.fillStyle = t.color ?? this.options.color;
		ctx.textAlign = 'center';
		ctx.fillText(this.library.thingGlyph(info, t.frame), 0, 0);
	}

	// Context is in the holder's (mirrored) space, origin at their root.
	private drawHeld(t: Thing, c: Character) {
		const { ctx } = this;
		const lib = this.library;
		const info = lib.thing(t.name);
		const s = c.scale;
		const ts = t.size / lib.unitsPerEm;
		const [hx, hy] = lib.anchor(c.action, c.frame, t.held!.hand === 'L' ? 'handL' : 'handR');
		const [gx, gy] = info.grip[Math.max(0, Math.min(info.frames - 1, Math.round(t.frame)))];
		ctx.save();
		ctx.translate(hx * s, -hy * s);
		if (info.hold === 'forearm') ctx.rotate((-lib.forearm(c.action, c.frame, t.held!.hand) * Math.PI) / 180);
		// A hanging thing heavier than the arm is long — a full sack being
		// dragged — rests on the ground instead of sinking through it.
		const sink = info.hold === 'hang' ? Math.max(0, gy * ts - hy * s) : 0;
		ctx.translate(-gx * ts, gy * ts - sink);
		ctx.font = this.fontFor('things', t.size);
		ctx.fillStyle = t.color ?? this.options.color;
		ctx.textAlign = 'center';
		ctx.fillText(lib.thingGlyph(info, t.frame), 0, 0);
		ctx.restore();
	}

	// Letter-as-body: the letter stands between pelvis and head-top, tilted
	// with the spine. Context is already in the character's mirrored space.
	private drawBody(c: Character) {
		const b = c.body!;
		const { ctx } = this;
		const lib = this.library;
		const s = c.scale;
		const [px, py] = lib.anchor(c.action, c.frame, 'pelvis');
		const [tx, ty] = lib.anchor(c.action, c.frame, 'top');
		const h = Math.hypot(tx - px, ty - py) * s;
		const spine = (lib.spine(c.action, c.frame) * Math.PI) / 180;
		ctx.save();
		ctx.translate(px * s, -py * s);
		ctx.rotate(spine);
		// The letter is torso and head in one: its cap height spans a bit past
		// pelvis → head-top (cap height ≈ 0.7em in most text faces), sitting
		// just below the hips so the legs grow out of its base.
		const cap = h * 1.18;
		ctx.font = b.font.replace(/(\d+(\.\d+)?)px/, `${(cap / 0.7).toFixed(1)}px`);
		if (b.color) ctx.fillStyle = b.color;
		// Un-mirror so the letter reads correctly when facing left.
		if (c.facing < 0) ctx.scale(-1, 1);
		if (b.front) {
			// Limbs are already drawn behind: blank the letter's box first so
			// they don't show through its counters (the hole in an o).
			const m = ctx.measureText(b.char);
			const fill = ctx.fillStyle;
			ctx.fillStyle = this.options.paper;
			ctx.fillRect(-m.actualBoundingBoxLeft, h * 0.1 - m.actualBoundingBoxAscent, m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
			ctx.fillStyle = fill;
		}
		ctx.fillText(b.char, 0, h * 0.1);
		ctx.restore();
	}
}

export const createStage = (canvas: HTMLCanvasElement, opts?: StageOptions) => new Stage(canvas, opts);

// First opaque background colour behind an element.
function paperBehind(el: Element): string {
	if (typeof getComputedStyle === 'undefined') return '#fff';
	for (let e: Element | null = el; e; e = e.parentElement) {
		const bg = getComputedStyle(e).backgroundColor;
		if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
	}
	return '#fff';
}
