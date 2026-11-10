// Bakes every action into the Flipbook fonts + the runtime manifest.
//
//   static/fonts/flipbook-{regular,bold,limbs,limbs-bold}.{woff2,otf}
//   src/lib/flipbook/generated/manifest.json
//
// Each action gets a contiguous run of Private Use codepoints, so frame i of
// an action is simply String.fromCodePoint(start + i). All four fonts share
// the same codepoints; they differ only in line weight / which parts draw.
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import opentype from 'opentype.js';
import { ACTIONS } from '../src/lib/flipbook/rig/actions/index.ts';
import { bake, type BakedAction } from '../src/lib/flipbook/rig/timeline.ts';
import { emit } from '../src/lib/flipbook/rig/geometry.ts';
import { BUILD, type Parts } from '../src/lib/flipbook/rig/skeleton.ts';
import { exportWoff2 } from '../src/lib/font/exportWoff2.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(repo, 'static/fonts');
const genDir = join(repo, 'src/lib/flipbook/generated');

const UPM = 1000;
const ASCENDER = 900;
const DESCENDER = -300;
// Advance is one "figure width"; the pelvis sits on the advance centre.
const ADVANCE = 560;
const START_CP = 0xe000;

interface Layer {
	id: string;
	family: string;
	style: string;
	weight: number;
	parts: Parts;
}

const LAYERS: Layer[] = [
	{ id: 'regular', family: 'Flipbook', style: 'Regular', weight: BUILD.weight, parts: 'full' },
	{ id: 'bold', family: 'Flipbook', style: 'Bold', weight: 46, parts: 'full' },
	{ id: 'limbs', family: 'Flipbook Limbs', style: 'Regular', weight: BUILD.weight, parts: 'limbs' },
	{ id: 'limbs-bold', family: 'Flipbook Limbs', style: 'Bold', weight: 46, parts: 'limbs' }
];

function glyphFor(name: string, cp: number, frame: BakedAction['frames'][number]) {
	const path = new opentype.Path();
	emit(frame.contours, path, ADVANCE / 2);
	return new opentype.Glyph({ name, unicode: cp, advanceWidth: ADVANCE, path });
}

function notdef() {
	return new opentype.Glyph({ name: '.notdef', advanceWidth: ADVANCE, path: new opentype.Path() });
}

async function main() {
	await mkdir(fontDir, { recursive: true });
	await mkdir(genDir, { recursive: true });

	// Allocate codepoints once (identical across layers).
	const starts = new Map<string, number>();
	let cp = START_CP;
	for (const def of ACTIONS) {
		starts.set(def.name, cp);
		cp += def.frames;
	}
	if (cp > 0xf8ff) throw new Error(`Out of BMP private-use space (${cp.toString(16)})`);

	const manifestActions: Record<string, unknown> = {};
	const files: Record<string, string> = {};

	for (const layer of LAYERS) {
		const glyphs = [notdef(), new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: ADVANCE / 2, path: new opentype.Path() })];
		for (const def of ACTIONS) {
			const baked = bake(def, { weight: layer.weight, parts: layer.parts });
			const start = starts.get(def.name)!;
			baked.frames.forEach((f, i) => glyphs.push(glyphFor(`${def.name}.${i}`, start + i, f)));

			if (layer.id === 'regular') {
				const events: Record<number, string> = {};
				baked.frames.forEach((f, i) => {
					if (f.event) events[i] = f.event;
				});
				manifestActions[def.name] = {
					start,
					frames: def.frames,
					fps: def.fps,
					loop: def.loop,
					category: def.category,
					description: def.description,
					from: def.from ?? 'stand',
					to: def.to ?? def.from ?? 'stand',
					floor: def.floor !== false,
					baseline: [def.baseline?.start ?? 0, def.baseline?.end ?? 0],
					next: def.next ?? null,
					dx: baked.frames.map((f) => Math.round(f.dx * 10) / 10),
					air: baked.frames.map((f) => Math.round(f.air)),
					events,
					// Flattened per frame: head(x,y) top(x,y) handL handR footL footR
					// pelvis shoulder → 16 ints, then spine°, headRot°, headRx, headRy.
					anchors: baked.frames.map((f) => {
						const a = f.anchors;
						return [
							...a.head, ...a.top, ...a.handL, ...a.handR,
							...a.footL, ...a.footR, ...a.pelvis, ...a.shoulder,
							a.spine, a.headRot, a.headR[0], a.headR[1]
						];
					})
				};
			}
		}
		const font = new opentype.Font({
			familyName: layer.family,
			styleName: layer.style,
			unitsPerEm: UPM,
			ascender: ASCENDER,
			descender: DESCENDER,
			glyphs
		});
		const otf = new Uint8Array(font.toArrayBuffer());
		const woff2 = await exportWoff2(otf);
		await writeFile(join(fontDir, `flipbook-${layer.id}.otf`), otf);
		await writeFile(join(fontDir, `flipbook-${layer.id}.woff2`), woff2);
		files[layer.id] = `flipbook-${layer.id}.woff2`;
		console.log(`${layer.id}: ${glyphs.length} glyphs · ${(otf.byteLength / 1024).toFixed(0)}KB otf · ${(woff2.byteLength / 1024).toFixed(0)}KB woff2`);
	}

	const manifest = {
		version: '',
		unitsPerEm: UPM,
		ascender: ASCENDER,
		descender: DESCENDER,
		advance: ADVANCE,
		build: BUILD,
		layers: Object.fromEntries(LAYERS.map((l) => [l.id, { family: l.family, style: l.style, weight: l.weight, parts: l.parts, file: files[l.id] }])),
		actions: manifestActions
	};
	const json = JSON.stringify(manifest);
	manifest.version = createHash('sha256').update(json).digest('hex').slice(0, 10);
	await writeFile(join(genDir, 'manifest.json'), JSON.stringify(manifest));
	console.log(`${ACTIONS.length} actions, ${cp - START_CP} frames → manifest v${manifest.version}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
