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
import { emit, bounds, removeOverlaps } from '../src/lib/flipbook/rig/geometry.ts';
import polygonClipping from 'polygon-clipping';
import { BUILD, type Parts } from '../src/lib/flipbook/rig/skeleton.ts';
import { exportWoff2 } from '../src/lib/font/exportWoff2.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

// `--variant <id>` bakes an alternate figure build (proportions / weight)
// into static/lab/<id>/ for side-by-side review in /lab. Regular layer only.
const VARIANTS: Record<string, { label: string; build: Partial<typeof BUILD> }> = {
	a: { label: 'Classic', build: {} },
	b: { label: 'Inspo — small head, fine line', build: { headR: 62, weight: 22, thigh: 180, shin: 176 } },
	c: { label: 'Chunky comic', build: { headR: 96, weight: 40, thigh: 150, shin: 144, torso: 180, upperArm: 116, foreArm: 110 } },
	d: { label: 'Lanky', build: { headR: 60, weight: 24, thigh: 196, shin: 192, torso: 224, upperArm: 146, foreArm: 140 } }
};
const vi = process.argv.indexOf('--variant');
const variant = vi > 0 ? process.argv[vi + 1] : null;
if (variant && !VARIANTS[variant]) throw new Error(`Unknown variant ${variant}`);
const build = { ...BUILD, ...(variant ? VARIANTS[variant].build : {}) };
const fontDir = variant ? join(repo, 'static/lab', variant) : join(repo, 'static/fonts');
const genDir = variant ? fontDir : join(repo, 'src/lib/flipbook/generated');

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

const ALL_LAYERS: Layer[] = [
	{ id: 'regular', family: 'Flipbook', style: 'Regular', weight: build.weight, parts: 'full' },
	{ id: 'bold', family: 'Flipbook', style: 'Bold', weight: Math.round(build.weight * 1.55), parts: 'full' },
	{ id: 'limbs', family: 'Flipbook Limbs', style: 'Regular', weight: build.weight, parts: 'limbs' },
	{ id: 'limbs-bold', family: 'Flipbook Limbs', style: 'Bold', weight: Math.round(build.weight * 1.55), parts: 'limbs' }
];
const LAYERS = variant
	? ALL_LAYERS.slice(0, 1).map((l) => ({ ...l, family: `Flipbook ${variant.toUpperCase()}` }))
	: ALL_LAYERS;

function glyphFor(name: string, cp: number, frame: BakedAction['frames'][number]) {
	const path = new opentype.Path();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	emit(removeOverlaps(frame.contours, polygonClipping.union as any), path, ADVANCE / 2);
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
	// Anchors are only needed for canvas interactions (carrying, letter
	// bodies, hit-tests); they ship as a separate file the Stage lazy-loads.
	const anchorsOut: Record<string, number[][]> = {};
	// Categories are contiguous runs of codepoints, so each becomes a font
	// chunk with its own unicode-range — pages download only what they show.
	const chunkDefs: { id: string; from: number; to: number; actions: typeof ACTIONS }[] = [];
	for (const def of ACTIONS) {
		const last = chunkDefs[chunkDefs.length - 1];
		const start = starts.get(def.name)!;
		if (last && last.id === def.category) {
			last.to = start + def.frames - 1;
			last.actions.push(def);
		} else chunkDefs.push({ id: def.category, from: start, to: start + def.frames - 1, actions: [def] });
	}
	const chunkFiles: Record<string, { file: string; from: number; to: number }[]> = {};
	// Ink extents across every glyph of every layer, pelvis-relative, so
	// renderers can size raster caches without clipping jumps or hangs.
	const ext = { left: 0, right: 0, top: 0, bottom: 0 };
	const files: Record<string, string> = {};

	for (const layer of LAYERS) {
		const glyphs = [notdef(), new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: ADVANCE / 2, path: new opentype.Path() })];
		const byAction = new Map<string, opentype.Glyph[]>();
		for (const def of ACTIONS) {
			const baked = bake(def, { build, weight: layer.weight, parts: layer.parts });
			const start = starts.get(def.name)!;
			const mine: opentype.Glyph[] = [];
			byAction.set(def.name, mine);
			baked.frames.forEach((f, i) => {
				const g = glyphFor(`${def.name}.${i}`, start + i, f);
				glyphs.push(g);
				mine.push(g);
				const b = bounds(f.contours);
				ext.left = Math.min(ext.left, b.x0);
				ext.right = Math.max(ext.right, b.x1);
				ext.bottom = Math.min(ext.bottom, b.y0);
				ext.top = Math.max(ext.top, b.y1);
			});

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
					events,
					// Furthest ink [behind, ahead] of the pelvis and above the
					// ground, over all frames — enough to lay a figure out in text.
					reach: [
						Math.ceil(Math.max(...baked.frames.map((f) => -bounds(f.contours).x0))),
						Math.ceil(Math.max(...baked.frames.map((f) => bounds(f.contours).x1)))
					],
					height: Math.ceil(Math.max(...baked.frames.map((f) => bounds(f.contours).y1)))
				};
				// Flattened per frame: head(x,y) top(x,y) handL handR footL footR
				// pelvis shoulder → 16 ints, then spine°, headRot°, headRx, headRy.
				anchorsOut[def.name] = baked.frames.map((f) => {
					const a = f.anchors;
					return [
						...a.head, ...a.top, ...a.handL, ...a.handR,
						...a.footL, ...a.footR, ...a.pelvis, ...a.shoulder,
						a.spine, a.headRot, a.headR[0], a.headR[1]
					];
				});
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
		if (!variant) {
			chunkFiles[layer.id] = [];
			for (const c of chunkDefs) {
				const sub = new opentype.Font({
					familyName: layer.family,
					styleName: layer.style,
					unitsPerEm: UPM,
					ascender: ASCENDER,
					descender: DESCENDER,
					glyphs: [notdef(), ...c.actions.flatMap((d) => byAction.get(d.name)!)]
				});
				const w = await exportWoff2(new Uint8Array(sub.toArrayBuffer()));
				const file = `chunks/flipbook-${layer.id}.${chunkDefs.indexOf(c)}-${c.id}.woff2`;
				await mkdir(join(fontDir, 'chunks'), { recursive: true });
				await writeFile(join(fontDir, file), w);
				chunkFiles[layer.id].push({ file, from: c.from, to: c.to });
			}
		}
		console.log(`${layer.id}: ${glyphs.length} glyphs · ${(otf.byteLength / 1024).toFixed(0)}KB otf · ${(woff2.byteLength / 1024).toFixed(0)}KB woff2`);
	}

	const manifest = {
		version: '',
		unitsPerEm: UPM,
		ascender: ASCENDER,
		descender: DESCENDER,
		advance: ADVANCE,
		extents: { left: Math.floor(ext.left), right: Math.ceil(ext.right), top: Math.ceil(ext.top), bottom: Math.floor(ext.bottom) },
		build,
		label: variant ? VARIANTS[variant].label : 'Flipbook',
		layers: Object.fromEntries(
			LAYERS.map((l) => [l.id, { family: l.family, style: l.style, weight: l.weight, parts: l.parts, file: files[l.id], chunks: chunkFiles[l.id] ?? null }])
		),
		actions: manifestActions
	};
	const json = JSON.stringify(manifest);
	manifest.version = createHash('sha256').update(json).digest('hex').slice(0, 10);
	await writeFile(join(genDir, 'manifest.json'), JSON.stringify(manifest));
	await writeFile(join(genDir, 'anchors.json'), JSON.stringify(anchorsOut));
	console.log(`${ACTIONS.length} actions, ${cp - START_CP} frames → manifest v${manifest.version}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
