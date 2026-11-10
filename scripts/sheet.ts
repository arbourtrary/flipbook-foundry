// Contact sheets for eyeballing motion. For each action renders:
//   1. the frame strip, one cell per frame, ground line drawn
//   2. a world track — frames laid along x by their accumulated root motion,
//      so a planted foot that skates shows up as a smear instead of a dot
//   3. an onion skin of the whole cycle in place
// Usage: tsx scripts/sheet.ts walk run ...   (no args = every action)
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { ACTIONS } from '../src/lib/flipbook/rig/actions/index.ts';
import { HUBS } from '../src/lib/flipbook/rig/actions/hubs.ts';
import { bake } from '../src/lib/flipbook/rig/timeline.ts';
import { toSvgD } from '../src/lib/flipbook/rig/geometry.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.SHEET_OUT ?? join(repo, '.sheets');

const names = process.argv.slice(2);
// `hubs` is a pseudo-action: every hub pose held for one frame.
const hubSheet = {
	name: 'hubs',
	category: 'idle' as const,
	description: Object.keys(HUBS).join(' · '),
	frames: Object.keys(HUBS).length,
	fps: 4,
	loop: false,
	contacts: 'any' as const,
	travel: false,
	keys: Object.values(HUBS).map((p, i) => ({ ...p, at: i, ease: 'hold' as const }))
};
const all = [...ACTIONS, hubSheet];
const list = names.length ? all.filter((a) => names.includes(a.name)) : ACTIONS;

const CELL = 1000;
const BASE = 820; // baseline y inside a cell

function sheet(def: (typeof ACTIONS)[number]) {
	const baked = bake(def);
	const n = baked.frames.length;
	const cols = Math.min(n, 12);
	const rows = Math.ceil(n / cols);
	const scale = 0.16;
	const cw = CELL * scale;

	let strip = '';
	baked.frames.forEach((f, i) => {
		const x = (i % cols) * cw;
		const y = Math.floor(i / cols) * cw;
		strip += `<g transform="translate(${x} ${y}) scale(${scale})">
			<rect width="${CELL}" height="${CELL}" fill="none" stroke="#ddd" stroke-width="4"/>
			<line x1="0" x2="${CELL}" y1="${BASE}" y2="${BASE}" stroke="#bbb" stroke-width="4"/>
			<path d="${toSvgD(f.contours, BASE, CELL / 2)}" fill="#111"/>
			<text x="20" y="70" font-size="60" fill="#999" font-family="monospace">${i}</text>
		</g>`;
	});

	// World track: accumulate dx; draw every frame at low opacity, highlight
	// planted feet as red dots so skating is obvious.
	let wx = 0;
	const xs: number[] = [];
	for (const f of baked.frames) {
		wx += f.dx;
		xs.push(wx);
	}
	const minX = Math.min(0, ...xs) - 500;
	const maxX = Math.max(...xs) + 500;
	const trackScale = Math.min(0.16, 1900 / (maxX - minX));
	let track = '';
	baked.frames.forEach((f, i) => {
		const tx = (xs[i] - minX) * trackScale;
		track += `<g transform="translate(${tx} 0) scale(${trackScale})" opacity="${i % 2 ? 0.28 : 0.55}">
			<path d="${toSvgD(f.contours, BASE, 0)}" fill="#111"/></g>`;
		for (const foot of ['footL', 'footR'] as const) {
			const a = f.anchors[foot];
			if (a[1] < 40)
				track += `<circle cx="${(xs[i] + a[0] - minX) * trackScale}" cy="${(BASE - a[1]) * trackScale}" r="2.2" fill="${foot === 'footL' ? '#e33' : '#36f'}"/>`;
		}
	});
	const trackW = (maxX - minX) * trackScale;

	let onion = '';
	baked.frames.forEach((f, i) => {
		onion += `<path d="${toSvgD(f.contours, BASE, CELL / 2)}" fill="hsl(${(i / n) * 300} 70% 40%)" opacity="0.18"/>`;
	});

	const stripH = rows * cw;
	const stride = xs[xs.length - 1];
	return `<section>
		<h2>${def.name} <small>${def.category} · ${n}f @${def.fps}fps · stride ${Math.round(stride)}u · ${def.description}</small></h2>
		<svg width="${cols * cw}" height="${stripH}">${strip}</svg>
		<div class="row">
			<svg width="${trackW}" height="${CELL * trackScale}"><line x1="0" x2="${trackW}" y1="${BASE * trackScale}" y2="${BASE * trackScale}" stroke="#999"/>${track}</svg>
			<svg width="${CELL * 0.3}" height="${CELL * 0.3}" viewBox="0 0 ${CELL} ${CELL}"><line x1="0" x2="${CELL}" y1="${BASE}" y2="${BASE}" stroke="#bbb" stroke-width="4"/>${onion}</svg>
		</div>
	</section>`;
}

async function main() {
	await mkdir(out, { recursive: true });
	const browser = await chromium.launch({
		executablePath:
			process.env.CHROME ??
			join(
				homedir(),
				'Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'
			)
	}).catch(async () =>
		chromium.launch({
			executablePath: join(
				homedir(),
				'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
			)
		})
	);
	const page = await browser.newPage({ viewport: { width: 1960, height: 800 }, deviceScaleFactor: 1 });
	for (const def of list) {
		const html = `<!doctype html><meta charset="utf-8"><style>body{margin:12px;font:13px system-ui;background:#fff}h2{font-size:15px;margin:0 0 6px}small{color:#888;font-weight:400}.row{display:flex;gap:16px;align-items:end;margin-top:8px}</style>${sheet(def)}`;
		await page.setContent(html);
		const file = join(out, `${def.name}.png`);
		await page.screenshot({ path: file, fullPage: true });
		await writeFile(join(out, `${def.name}.html`), html);
		console.log(file);
	}
	await browser.close();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
