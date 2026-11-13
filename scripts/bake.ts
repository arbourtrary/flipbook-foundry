// Bakes a figure family into its fonts + the runtime manifest.
//
//   npx tsx scripts/bake.ts [family] [--variant <id>]     (family defaults to stick)
//
//   packages/<family>/fonts/flipbook-<family>-<layer>.{woff2,otf} (+ chunks/)
//   packages/<family>/generated/{manifest,anchors}.js
//
// Each action gets a contiguous run of Private Use codepoints, so frame i of
// an action is simply String.fromCodePoint(start + i). All four fonts share
// the same codepoints; they differ only in line weight / which parts draw.
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import opentype from 'opentype.js';
import { bake, type BakedAction } from '../packages/rig/timeline.ts';
import { emit, bounds, removeOverlaps } from '../packages/rig/geometry.ts';
import polygonClipping from 'polygon-clipping';
import type { Parts } from '../packages/rig/skeleton.ts';
import type { FamilyConfig } from '../packages/rig/family.ts';
import type { ThingDef } from '../packages/stick/things.ts';
import { exportWoff2 } from '../src/lib/font/exportWoff2.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const vi = args.indexOf('--variant');
const variant = vi >= 0 ? args[vi + 1] : null;
const familyId = args.find((a, i) => !a.startsWith('--') && i !== vi + 1) ?? 'stick';
const pkgDir = join(repo, 'packages', familyId);
const FAMILY: FamilyConfig<ThingDef> = (await import(join(pkgDir, 'family.ts'))).default;
const ACTIONS = FAMILY.actions;
const THINGS = FAMILY.things ?? [];

// `--variant <id>` bakes an alternate build (proportions / weight) from the
// family's config into static/lab/<id>/ for side-by-side review in /lab.
// Regular layer only.
const VARIANTS = FAMILY.variants ?? {};
if (variant && !VARIANTS[variant]) throw new Error(`Unknown variant ${variant}`);
const build = { ...FAMILY.build, ...(variant ? VARIANTS[variant].build : {}) };
const prefix = `flipbook-${FAMILY.id}`;
// Name-table metadata for every font: the fonts are SIL Open Font License 1.1 (see OFL.txt).
const FONT_META = {
	copyright: 'Copyright 2026 The Flipbook Foundry Project Authors (https://github.com/arbourtrary/flipbook-foundry)',
	license: 'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
	licenseURL: 'https://openfontlicense.org',
	manufacturer: 'Flipbook Foundry',
	designer: 'Flipbook Foundry',
	designerURL: 'https://github.com/arbourtrary/flipbook-foundry'
};
const fontDir = variant ? join(repo, 'static/lab', variant) : join(pkgDir, 'fonts');
const genDir = variant ? fontDir : join(pkgDir, 'generated');

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

const ALL_LAYERS: Layer[] = FAMILY.layers.map((l) => ({
	id: l.id,
	family: FAMILY.name + (l.suffix ?? ''),
	style: l.style,
	weight: Math.round(build.weight * l.weight),
	parts: l.parts
}));
const LAYERS = variant
	? ALL_LAYERS.slice(0, 1).map((l) => ({ ...l, family: `${FAMILY.name} ${variant.toUpperCase()}` }))
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
	// Start clean so renamed or removed fonts don't linger.
	await rm(fontDir, { recursive: true, force: true });
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
			const baked = bake(def, { build, weight: layer.weight, parts: layer.parts, skin: FAMILY.skin });
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
				// pelvis shoulder → 16 ints, then spine°, headRot°, headRx, headRy,
				// forearmL°, forearmR°.
				anchorsOut[def.name] = baked.frames.map((f) => {
					const a = f.anchors;
					return [
						...a.head, ...a.top, ...a.handL, ...a.handR,
						...a.footL, ...a.footR, ...a.pelvis, ...a.shoulder,
						a.spine, a.headRot, a.headR[0], a.headR[1], a.forearmL, a.forearmR
					];
				});
			}
		}
		const font = new opentype.Font({
			familyName: layer.family,
			styleName: layer.style,
			...FONT_META,
			unitsPerEm: UPM,
			ascender: ASCENDER,
			descender: DESCENDER,
			glyphs
		});
		const otf = new Uint8Array(font.toArrayBuffer());
		const woff2 = await exportWoff2(otf);
		await writeFile(join(fontDir, `${prefix}-${layer.id}.otf`), otf);
		await writeFile(join(fontDir, `${prefix}-${layer.id}.woff2`), woff2);
		files[layer.id] = `${prefix}-${layer.id}.woff2`;
		if (!variant) {
			chunkFiles[layer.id] = [];
			for (const c of chunkDefs) {
				const sub = new opentype.Font({
					familyName: layer.family,
					styleName: layer.style,
					...FONT_META,
					unitsPerEm: UPM,
					ascender: ASCENDER,
					descender: DESCENDER,
					glyphs: [notdef(), ...c.actions.flatMap((d) => byAction.get(d.name)!)]
				});
				const w = await exportWoff2(new Uint8Array(sub.toArrayBuffer()));
				const file = `chunks/${prefix}-${layer.id}.${chunkDefs.indexOf(c)}-${c.id}.woff2`;
				await mkdir(join(fontDir, 'chunks'), { recursive: true });
				await writeFile(join(fontDir, file), w);
				chunkFiles[layer.id].push({ file, from: c.from, to: c.to });
			}
		}
		console.log(`${layer.id}: ${glyphs.length} glyphs · ${(otf.byteLength / 1024).toFixed(0)}KB otf · ${(woff2.byteLength / 1024).toFixed(0)}KB woff2`);
	}

	// Things: props and set pieces in their own font, after the figures.
	const thingsOut: Record<string, unknown> = {};
	if (!variant && THINGS.length) {
		const glyphs = [notdef()];
		let tcp = 0xf000;
		for (const t of THINGS) {
			thingsOut[t.name] = {
				start: tcp,
				frames: t.frames,
				hold: t.hold,
				description: t.description,
				grip: Array.from({ length: t.frames }, (_, i) => t.grip(i).map(Math.round))
			};
			for (let i = 0; i < t.frames; i++) {
				const path = new opentype.Path();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				emit(removeOverlaps(t.draw(i), polygonClipping.union as any), path, ADVANCE / 2);
				glyphs.push(new opentype.Glyph({ name: `${t.name}.${i}`, unicode: tcp++, advanceWidth: ADVANCE, path }));
			}
		}
		const font = new opentype.Font({ familyName: `${FAMILY.name} Things`, styleName: 'Regular', ...FONT_META, unitsPerEm: UPM, ascender: ASCENDER, descender: DESCENDER, glyphs });
		const otf = new Uint8Array(font.toArrayBuffer());
		const woff2 = await exportWoff2(otf);
		await writeFile(join(fontDir, `${prefix}-things.otf`), otf);
		await writeFile(join(fontDir, `${prefix}-things.woff2`), woff2);
		files.things = `${prefix}-things.woff2`;
		console.log(`things: ${glyphs.length} glyphs · ${(woff2.byteLength / 1024).toFixed(0)}KB woff2`);
	}

	const manifest = {
		version: '',
		unitsPerEm: UPM,
		ascender: ASCENDER,
		descender: DESCENDER,
		advance: ADVANCE,
		extents: { left: Math.floor(ext.left), right: Math.ceil(ext.right), top: Math.ceil(ext.top), bottom: Math.floor(ext.bottom) },
		build,
		label: variant ? VARIANTS[variant].label : FAMILY.name,
		layers: {
			...Object.fromEntries(
				LAYERS.map((l) => [l.id, { family: l.family, style: l.style, weight: l.weight, parts: l.parts, file: files[l.id], chunks: chunkFiles[l.id] ?? null }])
			),
			...(files.things ? { things: { family: `${FAMILY.name} Things`, style: 'Regular', weight: 22, parts: 'things', file: files.things, chunks: null } } : {})
		},
		actions: manifestActions,
		things: thingsOut
	};
	const json = JSON.stringify(manifest);
	manifest.version = createHash('sha256').update(json).digest('hex').slice(0, 10);
	if (variant) {
		// /lab fetches variant manifests at runtime.
		await writeFile(join(genDir, 'manifest.json'), JSON.stringify(manifest));
	} else {
		// JS modules, so plain Node ESM imports them without import attributes.
		const mod = (data: unknown) => `// Generated by scripts/bake.ts. Do not edit.\nexport default ${JSON.stringify(data)};\n`;
		await writeFile(join(genDir, 'manifest.js'), mod(manifest));
		await writeFile(join(genDir, 'anchors.js'), mod(anchorsOut));
	}
	console.log(`${ACTIONS.length} actions, ${cp - START_CP} frames → manifest v${manifest.version}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
