import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';

export interface GraphemePosition {
	grapheme: string;
	index: number;
	x: number;
	y: number;
	width: number;
	lineIndex: number;
}

export interface FieldLayout {
	positions: GraphemePosition[];
	totalHeight: number;
	totalWidth: number;
	lineCount: number;
}

const EMPTY: FieldLayout = {
	positions: [],
	totalHeight: 0,
	totalWidth: 0,
	lineCount: 0
};

let _segmenter: Intl.Segmenter | null = null;
function graphemeSegmenter(): Intl.Segmenter {
	if (!_segmenter) _segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
	return _segmenter;
}

let _ctx: CanvasRenderingContext2D | null = null;
function measureCtx(font: string): CanvasRenderingContext2D | null {
	if (typeof document === 'undefined') return null;
	if (!_ctx) {
		const canvas = document.createElement('canvas');
		_ctx = canvas.getContext('2d');
	}
	if (!_ctx) return null;
	_ctx.font = font;
	return _ctx;
}

export function layoutText(
	text: string,
	font: string,
	maxWidth: number,
	lineHeight: number
): FieldLayout {
	if (!text || maxWidth <= 0) return EMPTY;
	const ctx = measureCtx(font);
	if (!ctx) return EMPTY;

	const prepared = prepareWithSegments(text, font);
	const { lines, height } = layoutWithLines(prepared, maxWidth, lineHeight);

	const positions: GraphemePosition[] = [];
	const seg = graphemeSegmenter();
	let runningIndex = 0;
	let maxLineWidth = 0;

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		const y = lineIndex * lineHeight;
		let x = 0;

		for (const s of seg.segment(line.text)) {
			const g = s.segment;
			const w = ctx.measureText(g).width;
			positions.push({ grapheme: g, index: runningIndex++, x, y, width: w, lineIndex });
			x += w;
		}
		if (line.width > maxLineWidth) maxLineWidth = line.width;
	}

	return { positions, totalHeight: height, totalWidth: maxLineWidth, lineCount: lines.length };
}
