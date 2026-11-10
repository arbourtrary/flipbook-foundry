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
import { Character, type Transition } from './character';
import { cancelFrame, frame, type FrameData } from './frameloop';
import { type Layer, type Library, getLibrary } from './library';

export interface PageOptions {
	/** Text with figures written as {action}, e.g. 'Bob {walk} home.' */
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
	library?: Library;
}

interface Run {
	text: string;
	font: string;
	x: number;
	y: number;
	figure: Character | null;
}

export class Page {
	readonly canvas: HTMLCanvasElement;
	readonly figures: Character[] = [];
	private ctx: CanvasRenderingContext2D;
	private opts: PageOptions;
	private library: Library;
	private items: RichInlineItem[] = [];
	private itemFigure: (Character | null)[] = [];
	private runs: Run[] = [];
	private width = 0;
	private dpr = 1;
	private ro: ResizeObserver | null = null;
	private needsPaint = true;

	constructor(canvas: HTMLCanvasElement, opts: PageOptions) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.opts = opts;
		this.library = opts.library ?? getLibrary();
		this.setText(opts.text);
		this.ro = new ResizeObserver(() => this.layout());
		this.ro.observe(canvas);
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
		this.items = [];
		this.itemFigure = [];
		const { family, weight } = this.library.css(this.opts.layer ?? 'regular');
		const figureFont = `${weight} ${Math.round(this.fontSize * (this.opts.figureScale ?? 1.3))}px "${family}"`;
		// Split on {action} tokens; everything else is ordinary text.
		const parts = text.split(/(\{[a-z-]+\})/g);
		parts.forEach((part, i) => {
			const m = part.match(/^\{([a-z-]+)\}$/);
			if (m && this.library.has(m[1])) {
				const a = this.library.action(m[1]);
				const c = new Character({
					library: this.library,
					animate: m[1],
					transition: { inPlace: true, phase: (i * 0.37) % 1, ...(a.loop ? {} : { repeat: Infinity, repeatDelay: 0.8 }), ...this.opts.transition }
				});
				this.figures.push(c);
				this.items.push({ text: c.glyph, font: figureFont, break: 'never' });
				this.itemFigure.push(c);
			} else if (part) {
				this.items.push({ text: part, font: this.opts.font });
				this.itemFigure.push(null);
			}
		});
		this.layout();
	}

	/** pretext line breaking. Runs on text change and resize only. */
	layout() {
		const r = this.canvas.getBoundingClientRect();
		this.dpr = Math.min(2, devicePixelRatio || 1);
		this.width = r.width;
		const lh = this.opts.lineHeight ?? this.fontSize * 1.6;
		const prepared = prepareRichInline(this.items);
		const runs: Run[] = [];
		let line = 0;
		walkRichInlineLineRanges(prepared, this.width, (range) => {
			const l = materializeRichInlineLineRange(prepared, range);
			let x = 0;
			const baseline = line * lh + lh * 0.75;
			for (const f of l.fragments) {
				x += f.gapBefore;
				const item = this.items[f.itemIndex];
				runs.push({ text: f.text, font: item.font, x, y: baseline, figure: this.itemFigure[f.itemIndex] });
				x += f.occupiedWidth;
			}
			line++;
		});
		this.runs = runs;
		const h = Math.ceil(line * lh);
		this.canvas.style.height = `${h}px`;
		this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
		this.canvas.height = Math.max(1, Math.round(h * this.dpr));
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
		const { ctx } = this;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.clearRect(0, 0, this.width, this.canvas.height);
		ctx.fillStyle = this.opts.color ?? getComputedStyle(this.canvas).color;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		let font = '';
		for (const r of this.runs) {
			if (r.font !== font) ctx.font = font = r.font;
			ctx.fillText(r.figure ? r.figure.glyph : r.text, r.x, r.y);
			if (r.figure) r.figure.dirty = false;
		}
	};

	destroy() {
		this.ro?.disconnect();
		cancelFrame(this.tick);
		cancelFrame(this.paint);
		for (const c of this.figures) c.stop();
	}
}

export const createPage = (canvas: HTMLCanvasElement, opts: PageOptions) => new Page(canvas, opts);
