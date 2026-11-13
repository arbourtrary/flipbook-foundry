// A page of text where some characters are stick figures.
//
//   createPage(canvas, { text: 'Bob {walk} met Sue {wave} by the door.', font: '20px Georgia' })
//
// pretext lays the paragraph out once — words in your font, figures in the
// Flipbook font, all just inline text. Every drawing of an action has the
// same advance width, so animating a figure is swapping its character for
// the next one; the layout never changes. Re-layout only happens on resize.

import {
	materializeRichInlineLineRange,
	prepareRichInline,
	walkRichInlineLineRanges,
	type RichInlineItem
} from '@chenglou/pretext/rich-inline';
import { clearCache } from '@chenglou/pretext';
import { Character, type Transition } from './character';
import { cancelFrame, frame, type FrameData } from './frameloop';
import { type Layer, type Library, getLibrary } from './library';

export interface PageOptions {
	/**
	 * Text with figures written as {action}, e.g. 'Bob {walk} home.'
	 * `{idle|sneak|run}` makes a figure that may switch between those actions
	 * (via page.figures[i].animate) — room is reserved for the widest, so the
	 * line never shifts. `{trip>get-up>dust-off}` plays a sequence on a loop.
	 * A newline starts a new paragraph.
	 */
	text: string;
	/** Canvas font shorthand for the words, e.g. '400 20px Georgia'. */
	font: string;
	/** Line height in px. Default 1.6 × the font size. */
	lineHeight?: number;
	/** Figure size relative to the text size. Default 1.3. */
	figureScale?: number;
	layer?: Layer;
	color?: string;
	transition?: Transition;
	/** Paragraph alignment. */
	align?: 'left' | 'center';
	/** Ink colour for figures (defaults to the text colour). */
	figureColor?: string;
	/**
	 * Start each looping figure at a phase (0–1) from its position on the
	 * page — e.g. ({ x, width }) => x / width for a stadium wave.
	 */
	phase?: (p: { x: number; y: number; index: number; width: number; height: number }) => number;
	library?: Library;
}

interface Run {
	text: string;
	font: string;
	x: number;
	/** Room reserved before a figure for ink that reaches behind it. */
	pad: number;
	y: number;
	figure: Character | null;
}

export class Page {
	readonly canvas: HTMLCanvasElement;
	readonly figures: Character[] = [];
	private ctx: CanvasRenderingContext2D;
	private opts: PageOptions;
	private library: Library;
	private paras: { items: RichInlineItem[]; pad: number[]; figure: (Character | null)[] }[] = [];
	/** Last paint duration in ms, for the curious. */
	stats = { paintMs: 0, figures: 0 };
	private runs: Run[] = [];
	private width = 0;
	private dpr = 1;
	private ro: ResizeObserver | null = null;
	private needsPaint = true;
	private ink: string | null = null;

	constructor(canvas: HTMLCanvasElement, opts: PageOptions) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.opts = opts;
		this.library = opts.library ?? getLibrary();
		this.setText(opts.text);
		this.ro = new ResizeObserver(() => this.layout());
		this.ro.observe(canvas);
		// Canvas-only web fonts aren't fetched until asked for. Ask for the
		// exact font, and re-measure whenever any font finishes loading.
		// pretext caches widths by font string, and the string is the same
		// before and after the font arrives — so the cache must be cleared,
		// or it keeps the fallback font's widths and the spacing goes wrong.
		document.fonts.load(opts.font).then(this.relayout);
		document.fonts.addEventListener('loadingdone', this.relayout);
		frame.update(this.tick, true);
		frame.render(this.paint, true);
	}

	get fontSize() {
		return parseFloat(this.opts.font.match(/(\d+(\.\d+)?)px/)?.[1] ?? '16');
	}

	setText(text: string) {
		this.opts.text = text;
		for (const c of this.figures) c.stop();
		this.figures.length = 0;
		this.paras = [];
		const { family, weight } = this.library.css(this.opts.layer ?? 'regular');
		const figurePx = Math.round(this.fontSize * (this.opts.figureScale ?? 1.3));
		const figureFont = `${weight} ${figurePx}px "${family}"`;
		const unit = figurePx / this.library.unitsPerEm;
		const half = this.library.advance / 2;
		let n = 0;
		for (const paragraph of text.split('\n')) {
			const para = { items: [] as RichInlineItem[], pad: [] as number[], figure: [] as (Character | null)[] };
			this.paras.push(para);
			// Split on {action} / {a|b|c} tokens; everything else is ordinary text.
			for (const part of paragraph.split(/(\{[a-z-]+(?:[|>][a-z-]+)*\})/g)) {
				const m = part.match(/^\{([a-z->|]+)\}$/);
				const isSeq = !!m && m[1].includes('>');
				const alts = m ? m[1].split(/[|>]/).filter((a) => this.library.has(a)) : [];
				if (alts.length) {
					const a = this.library.action(alts[0]);
					const base: Transition = { inPlace: true, ...this.opts.transition };
					const c = new Character({
						library: this.library,
						animate: isSeq ? undefined : alts[0],
						initial: isSeq ? alts[0] : undefined,
						transition: { ...base, phase: (n++ * 0.37) % 1, ...(a.loop || isSeq ? {} : { repeat: Infinity, repeatDelay: 0.8 }) }
					});
					if (isSeq) c.sequence(alts, { loop: true, transition: base });
					c.data.alts = alts;
					this.figures.push(c);
					// Every drawing shares one advance, but a sprawl or a stride
					// can reach past it. Reserve the widest reach of any action
					// this figure may play, so it never touches the words beside
					// it and the layout never changes from frame to frame.
					let back = 0, ahead = 0;
					for (const name of alts) {
						const r = this.library.action(name).reach;
						back = Math.max(back, r[0]);
						ahead = Math.max(ahead, r[1]);
					}
					const padL = Math.max(0, back - half) * unit;
					const padR = Math.max(0, ahead - half) * unit;
					para.items.push({ text: c.glyph, font: figureFont, break: 'never', extraWidth: padL + padR });
					para.figure.push(c);
					para.pad.push(padL);
				} else if (part) {
					para.items.push({ text: part, font: this.opts.font });
					para.figure.push(null);
					para.pad.push(0);
				}
			}
		}
		this.stats.figures = this.figures.length;
		// Fetch only the font chunks these actions live in.
		const used = this.figures.flatMap((c) => c.data.alts as string[]);
		this.library.load([this.opts.layer ?? 'regular'], undefined, used).then(this.relayout);
		this.layout();
	}

	/** pretext line breaking. Runs on text change and resize only. */
	layout() {
		this.ink = null;
		const r = this.canvas.getBoundingClientRect();
		this.dpr = Math.min(2, devicePixelRatio || 1);
		this.width = r.width;
		const lh = this.opts.lineHeight ?? this.fontSize * 1.6;
		const runs: Run[] = [];
		let line = 0;
		for (const para of this.paras) {
			if (!para.items.length) {
				line++; // blank line
				continue;
			}
			const prepared = prepareRichInline(para.items);
			walkRichInlineLineRanges(prepared, this.width, (range) => {
				const l = materializeRichInlineLineRange(prepared, range);
				let x = this.opts.align === 'center' ? Math.max(0, (this.width - l.width) / 2) : 0;
				const baseline = line * lh + lh * 0.75;
				for (const f of l.fragments) {
					x += f.gapBefore;
					const pad = para.pad[f.itemIndex];
					const figure = para.figure[f.itemIndex];
					runs.push({ text: f.text, font: para.items[f.itemIndex].font, x: x + pad, pad, y: baseline, figure });
					if (figure) {
						figure.data.pageX = x + pad;
						figure.data.pageY = baseline;
					}
					x += f.occupiedWidth;
				}
				line++;
			});
		}
		this.runs = runs;
		const h = Math.ceil(line * lh);
		this.canvas.style.height = `${h}px`;
		this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
		this.canvas.height = Math.max(1, Math.round(h * this.dpr));
		if (this.opts.phase) {
			this.figures.forEach((c, index) => {
				if (!c.action.loop) return;
				const phase = this.opts.phase!({ x: c.data.pageX as number, y: c.data.pageY as number, index, width: this.width, height: h });
				c.animate(c.action.name, { inPlace: true, ...this.opts.transition, phase: ((phase % 1) + 1) % 1 });
			});
		}
		this.needsPaint = true;
	}

	private tick = (d: FrameData) => {
		for (const c of this.figures) {
			c.update(d.delta);
			if (c.dirty) this.needsPaint = true;
		}
	};

	// Paint only when a figure turned a page.
	private paint = () => {
		if (!this.needsPaint) return;
		this.needsPaint = false;
		const t0 = performance.now();
		const { ctx } = this;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.clearRect(0, 0, this.width, this.canvas.height);
		const ink = (this.ink ??= this.opts.color ?? getComputedStyle(this.canvas).color);
		ctx.fillStyle = ink;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		let font = '';
		for (const r of this.runs) {
			if (r.font !== font) ctx.font = font = r.font;
			if (r.figure) {
				if (this.opts.figureColor) ctx.fillStyle = this.opts.figureColor;
				ctx.fillText(r.figure.glyph, r.x, r.y);
				if (this.opts.figureColor) ctx.fillStyle = ink;
				r.figure.dirty = false;
			} else ctx.fillText(r.text, r.x, r.y);
		}
		this.stats.paintMs = performance.now() - t0;
	};

	private relayout = () => {
		clearCache();
		this.layout();
	};

	destroy() {
		document.fonts.removeEventListener('loadingdone', this.relayout);
		this.ro?.disconnect();
		cancelFrame(this.tick);
		cancelFrame(this.paint);
		for (const c of this.figures) c.stop();
	}
}

export const createPage = (canvas: HTMLCanvasElement, opts: PageOptions) => new Page(canvas, opts);

/** The page's words without its {action} tokens, for screen readers. */
export function plainText(text: string) {
	return text.replace(/\s*\{[a-z->|]+\}/g, '').trim();
}
