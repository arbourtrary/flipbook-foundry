import opentype from 'opentype.js';
import svgpath from 'svgpath';
import type { PosesManifest } from './types.js';
import { parseCodepoint } from './types.js';

function extractPathD(svg: string): string {
	const match = svg.match(/<path[^>]*\sd="([^"]+)"/);
	if (!match) throw new Error('No <path d="..."> element found in SVG');
	return match[1];
}

function svgPathToOpentypePath(d: string, ascender: number): opentype.Path {
	const path = new opentype.Path();
	const normalized = svgpath(d).abs().unarc().unshort();
	const flipY = (y: number) => ascender - y;

	normalized.iterate((segment, _i, x, y) => {
		const cmd = segment[0];
		switch (cmd) {
			case 'M':
				path.moveTo(segment[1], flipY(segment[2]));
				break;
			case 'L':
				path.lineTo(segment[1], flipY(segment[2]));
				break;
			case 'H':
				path.lineTo(segment[1], flipY(y));
				break;
			case 'V':
				path.lineTo(x, flipY(segment[1]));
				break;
			case 'C':
				path.curveTo(
					segment[1],
					flipY(segment[2]),
					segment[3],
					flipY(segment[4]),
					segment[5],
					flipY(segment[6])
				);
				break;
			case 'Q':
				path.quadraticCurveTo(segment[1], flipY(segment[2]), segment[3], flipY(segment[4]));
				break;
			case 'Z':
				path.close();
				break;
			default:
				throw new Error(`Unsupported path command after normalization: ${cmd}`);
		}
	});

	return path;
}

function makeNotdef(advanceWidth: number, ascender: number): opentype.Glyph {
	const p = new opentype.Path();
	const top = ascender * 0.75;
	const left = advanceWidth * 0.15;
	const right = advanceWidth * 0.85;
	const bottom = 0;
	p.moveTo(left, bottom);
	p.lineTo(left, top);
	p.lineTo(right, top);
	p.lineTo(right, bottom);
	p.close();
	p.moveTo(left + 60, bottom + 60);
	p.lineTo(right - 60, bottom + 60);
	p.lineTo(right - 60, top - 60);
	p.lineTo(left + 60, top - 60);
	p.close();
	return new opentype.Glyph({ name: '.notdef', advanceWidth, path: p });
}

export async function buildFont(
	manifest: PosesManifest,
	loadSvg: (file: string) => Promise<string>
): Promise<opentype.Font> {
	const glyphs: opentype.Glyph[] = [];

	glyphs.push(makeNotdef(manifest.defaultAdvanceWidth, manifest.ascender));

	glyphs.push(
		new opentype.Glyph({
			name: 'space',
			unicode: 32,
			advanceWidth: Math.floor(manifest.defaultAdvanceWidth / 2),
			path: new opentype.Path()
		})
	);

	for (const pose of manifest.poses) {
		const svg = await loadSvg(pose.file);
		const d = extractPathD(svg);
		const path = svgPathToOpentypePath(d, manifest.ascender);
		glyphs.push(
			new opentype.Glyph({
				name: pose.name,
				unicode: parseCodepoint(pose.codepoint),
				advanceWidth: pose.advanceWidth ?? manifest.defaultAdvanceWidth,
				path
			})
		);
	}

	return new opentype.Font({
		familyName: manifest.fontFamily,
		styleName: manifest.styleName,
		unitsPerEm: manifest.unitsPerEm,
		ascender: manifest.ascender,
		descender: manifest.descender,
		glyphs
	});
}
