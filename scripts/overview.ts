// All actions at a glance: one row each, frames sampled evenly. Pages of 14.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { chromium } from 'playwright-core';
import { ACTIONS } from '../src/lib/flipbook/rig/actions/index.ts';
import { bake } from '../src/lib/flipbook/rig/timeline.ts';
import { toSvgD } from '../src/lib/flipbook/rig/geometry.ts';
const PER = 14, COLS = 16, CELL = 1100, BASE = 850, S = 0.105;
const filter = process.argv.slice(2);
const list = filter.length ? ACTIONS.filter((a) => filter.includes(a.name) || filter.includes(a.category)) : ACTIONS;
await mkdir('.sheets', { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), 'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), args: ['--headless=new'] });
const page = await browser.newPage({ viewport: { width: 140 + COLS * CELL * S, height: 600 } });
for (let p = 0; p * PER < list.length; p++) {
	let rows = '';
	for (const def of list.slice(p * PER, p * PER + PER)) {
		const b = bake(def);
		const n = b.frames.length;
		const idx = Array.from({ length: Math.min(COLS, n) }, (_, i) => Math.floor((i * n) / Math.min(COLS, n)));
		let cells = '';
		idx.forEach((fi, k) => {
			const f = b.frames[fi];
			cells += `<g transform="translate(${k * CELL * S} 0) scale(${S})"><line x1="0" x2="${CELL}" y1="${BASE}" y2="${BASE}" stroke="#ccc" stroke-width="6"/><path d="${toSvgD(f.contours, BASE, CELL / 2)}"/><text x="10" y="90" font-size="70" fill="#aaa">${fi}</text></g>`;
		});
		rows += `<div class="r"><div class="n">${def.name}<br><small>${def.category} ${n}f ${def.loop ? 'loop' : (def.from ?? 'stand') + '→' + (def.to ?? def.from ?? 'stand')}</small></div><svg width="${COLS * CELL * S}" height="${CELL * S}" style="overflow:visible">${cells}</svg></div>`;
	}
	await page.setContent(`<style>body{margin:8px;font:12px system-ui}.r{display:flex;align-items:center;border-bottom:1px solid #eee}.n{width:130px;font-weight:600}small{font-weight:400;color:#888}</style>${rows}`);
	const out = `.sheets/overview-${p + 1}.png`;
	await page.screenshot({ path: out, fullPage: true });
	console.log(out);
}
await browser.close();
