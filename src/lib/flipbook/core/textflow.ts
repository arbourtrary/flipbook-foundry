// Real-font paragraphs that live in the same world as the figures.
//
// pretext (@chenglou/pretext) measures once in prepare(); after that every
// layout is arithmetic. So a paragraph can re-wrap around a running figure
// EVERY FRAME — each line asks for the free gaps between obstacles and fills
// them with layoutNextLineRange(). The resulting fragments double as
// platforms: each word is a ledge a figure can stand, sit or hang on.

import {
	layoutNextLineRange,
	materializeLineRange,
	prepareWithSegments,
	type LayoutCursor,
	type PreparedTextWithSegments
} from '@chenglou/pretext';

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Fragment {
	text: string;
	x: number;
	/** Baseline y. */
	y: number;
	width: number;
	line: number;
}

export interface TextFlowOptions {
	text: string;
	/** Canvas font shorthand, e.g. '600 22px "Fraunces"'. */
	font: string;
	x: number;
	y: number;
	width: number;
	lineHeight: number;
	/** Gaps narrower than this are left empty. */
	minGap?: number;
	/** Space kept between text and obstacles. */
	padding?: number;
	align?: 'left' | 'center';
}

export interface TextFlow {
	options: TextFlowOptions;
	fragments: Fragment[];
	height: number;
	/** Re-wrap around obstacles. Cheap enough to call every frame. */
	layout(obstacles?: Rect[]): Fragment[];
	draw(ctx: CanvasRenderingContext2D, color?: string): void;
	/** Ledges: the top edge of each word, for figures to stand on. */
	ledges(): { x0: number; x1: number; y: number; text: string }[];
	setText(text: string): void;
}

export function createTextFlow(opts: TextFlowOptions): TextFlow {
	let prepared: PreparedTextWithSegments = prepareWithSegments(opts.text, opts.font);
	const ascent = ascentOf(opts.font);
	const flow: TextFlow = {
		options: opts,
		fragments: [],
		height: 0,
		setText(text) {
			opts.text = text;
			prepared = prepareWithSegments(text, opts.font);
		},
		layout(obstacles = []) {
			const { x, y, width, lineHeight } = opts;
			const minGap = opts.minGap ?? lineHeight * 1.6;
			const pad = opts.padding ?? lineHeight * 0.3;
			const out: Fragment[] = [];
			let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
			let line = 0;
			let done = false;
			// Hard cap so a fully blocked column can't spin forever.
			for (let guard = 0; guard < 2000 && !done; guard++) {
				const top = y + line * lineHeight;
				const bottom = top + lineHeight;
				// Blocked intervals on this line band.
				const blocks: [number, number][] = [];
				for (const o of obstacles) {
					if (o.y < bottom && o.y + o.height > top) blocks.push([o.x - pad, o.x + o.width + pad]);
				}
				blocks.sort((a, b) => a[0] - b[0]);
				const gaps: [number, number][] = [];
				let cx = x;
				for (const [b0, b1] of blocks) {
					if (b0 > cx) gaps.push([cx, Math.min(b0, x + width)]);
					cx = Math.max(cx, b1);
					if (cx >= x + width) break;
				}
				if (cx < x + width) gaps.push([cx, x + width]);

				for (const [g0, g1] of gaps) {
					if (g1 - g0 < minGap) continue;
					const range = layoutNextLineRange(prepared, cursor, g1 - g0);
					if (!range) {
						done = true;
						break;
					}
					const l = materializeLineRange(prepared, range);
					const text = l.text.replace(/\s+$/, '');
					const fx = opts.align === 'center' ? g0 + (g1 - g0 - l.width) / 2 : g0;
					out.push({ text, x: fx, y: top + ascent + (lineHeight - ascent) * 0.35, width: l.width, line });
					cursor = range.end;
				}
				line++;
			}
			flow.fragments = out;
			flow.height = line * opts.lineHeight;
			return out;
		},
		draw(ctx, color) {
			ctx.font = opts.font;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			if (color) ctx.fillStyle = color;
			for (const f of flow.fragments) ctx.fillText(f.text, f.x, f.y);
			ctx.textAlign = 'center';
		},
		ledges() {
			// Word-level ledges, so a figure can stand on "quick" but fall
			// through the space between "quick" and "brown".
			const out: { x0: number; x1: number; y: number; text: string }[] = [];
			const ctx = measureCtx(opts.font);
			for (const f of flow.fragments) {
				let wx = f.x;
				for (const word of f.text.split(/(\s+)/)) {
					const w = ctx ? ctx.measureText(word).width : word.length * 10;
					if (word.trim()) out.push({ x0: wx, x1: wx + w, y: f.y - ascent * 0.72, text: word });
					wx += w;
				}
			}
			return out;
		}
	};
	return flow;
}

let _ctx: CanvasRenderingContext2D | null = null;
function measureCtx(font: string) {
	if (typeof document === 'undefined') return null;
	_ctx ??= document.createElement('canvas').getContext('2d');
	if (_ctx) _ctx.font = font;
	return _ctx;
}

function ascentOf(font: string) {
	const ctx = measureCtx(font);
	if (!ctx) return parseFloat(font.match(/(\d+(\.\d+)?)px/)?.[1] ?? '16') * 0.8;
	const m = ctx.measureText('Hg');
	return m.fontBoundingBoxAscent ?? parseFloat(font.match(/(\d+(\.\d+)?)px/)?.[1] ?? '16') * 0.8;
}
