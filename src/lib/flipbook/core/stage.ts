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
	/** Ride along with a character's anchor (e.g. a letter carried overhead). */
	attach?: { to: Character; anchor: 'head' | 'top' | 'handL' | 'handR' | 'footL' | 'footR' | 'pelvis' | 'shoulder'; dx?: number; dy?: number };
	data?: Record<string, unknown>;
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
			if (col !== fill) ctx.fillStyle = fill = col;
			const f = this.fontFor(c.layer, c.size);
			if (f !== font) ctx.font = font = f;
			if (c.body) {
				// Letter first, then the limbs over it with a paper halo, so
				// arms read in front of the body like a comic panel.
				this.drawBody(c);
				ctx.font = f;
				ctx.lineJoin = 'round';
				ctx.lineWidth = (this.library.manifest.layers[c.layer]?.weight ?? 30) * c.scale * 1.1;
				ctx.strokeStyle = this.options.paper;
				ctx.strokeText(c.glyph, 0, 0);
			}
			ctx.fillText(c.glyph, 0, 0);
			c.dirty = false;
			drawn++;
		}
		ctx.globalAlpha = 1;
		base();

		for (const p of this.props) {
			let x = p.x, y = p.y;
			if (p.attach) {
				const [ax, ay] = p.attach.to.anchor(p.attach.anchor);
				x = p.x = ax + (p.attach.dx ?? 0);
				y = p.y = ay + (p.attach.dy ?? 0);
			}
			ctx.font = p.font;
			ctx.fillStyle = p.color ?? this.options.color;
			ctx.textAlign = p.align ?? 'center';
			if (p.rotate) {
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(p.rotate);
				ctx.fillText(p.text, 0, 0);
				ctx.restore();
			} else ctx.fillText(p.text, x, y);
		}
		ctx.textAlign = 'center';

		for (const h of this.hooks.after) {
			h(data, this);
			base();
		}
		this.stats.characters = this.characters.length;
		this.stats.drawn = drawn;
		this.stats.drawMs = performance.now() - t0;
	};

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
