// Glyph atlas. The browser's text engine rasterises each (glyph, pixel size,
// colour) once into a shared canvas; after that a figure is one drawImage.
// It's a cache of the font's own rendering — nothing is drawn that the font
// didn't draw — and it's what lets a Stage carry thousands of figures.

const PAGE = 2048;

export interface Extents {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

const DEFAULT_EXT: Extents = { left: -0.85, right: 0.85, top: 1.1, bottom: -0.5 };

interface Cell {
	page: number;
	sx: number;
	sy: number;
	w: number;
	h: number;
	/** Baseline / pelvis offset inside the cell. */
	ox: number;
	oy: number;
}

interface Page {
	canvas: HTMLCanvasElement | OffscreenCanvas;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	shelfY: number;
	shelfH: number;
	x: number;
}

export class GlyphAtlas {
	private pages: Page[] = [];
	private cells = new Map<string, Cell>();
	/** Cap on cached glyphs before the atlas resets (sizes churning under zoom). */
	maxCells = 12000;

	private newPage(): Page {
		const canvas =
			typeof OffscreenCanvas !== 'undefined'
				? new OffscreenCanvas(PAGE, PAGE)
				: Object.assign(document.createElement('canvas'), { width: PAGE, height: PAGE });
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		const p: Page = { canvas, ctx, shelfY: 0, shelfH: 0, x: 0 };
		this.pages.push(p);
		return p;
	}

	/**
	 * `ext` is the font's ink extents in em (pelvis-relative, y-up), from the
	 * manifest — cells are sized to fit the widest sprawl and highest jump.
	 */
	get(glyph: string, font: string, px: number, color: string, ext: Extents = DEFAULT_EXT): { cell: Cell; source: CanvasImageSource } | null {
		const key = `${font}|${color}|${glyph}`;
		let cell = this.cells.get(key);
		if (!cell) {
			if (this.cells.size >= this.maxCells) this.clear();
			const made = this.rasterise(glyph, font, px, color, ext);
			if (!made) return null;
			cell = made;
			this.cells.set(key, cell);
		}
		return { cell, source: this.pages[cell.page].canvas as CanvasImageSource };
	}

	private rasterise(glyph: string, font: string, px: number, color: string, ext: Extents): Cell | null {
		const pad = 2;
		const w = Math.ceil(px * (ext.right - ext.left)) + pad * 2;
		const h = Math.ceil(px * (ext.top - ext.bottom)) + pad * 2;
		if (w > PAGE || h > PAGE) return null;
		let page = this.pages[this.pages.length - 1] ?? this.newPage();
		if (page.x + w > PAGE) {
			page.shelfY += page.shelfH;
			page.shelfH = 0;
			page.x = 0;
		}
		if (page.shelfY + h > PAGE) {
			page = this.newPage();
		}
		const sx = page.x;
		const sy = page.shelfY;
		page.x += w;
		page.shelfH = Math.max(page.shelfH, h);
		const ox = Math.round(-ext.left * px) + pad;
		const oy = Math.round(ext.top * px) + pad;
		const ctx = page.ctx;
		ctx.font = font;
		ctx.fillStyle = color;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(glyph, sx + ox, sy + oy);
		return { page: this.pages.indexOf(page), sx, sy, w, h, ox, oy };
	}

	clear() {
		this.cells.clear();
		for (const p of this.pages) {
			p.ctx.clearRect(0, 0, PAGE, PAGE);
			p.shelfY = p.shelfH = p.x = 0;
		}
		this.pages.length = Math.min(this.pages.length, 1);
	}
}

// One atlas for every Stage on the page: a gallery of fifty small stages
// shouldn't allocate fifty texture pages for the same glyphs.
let shared: GlyphAtlas | null = null;
export const sharedAtlas = () => (shared ??= new GlyphAtlas());
