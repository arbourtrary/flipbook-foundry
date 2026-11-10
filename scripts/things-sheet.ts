// Every frame of every thing, on a ground line. Usage: tsx scripts/things-sheet.ts
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { THINGS } from '../src/lib/flipbook/rig/things.ts';
import { toSvgD } from '../src/lib/flipbook/rig/geometry.ts';
const S = 0.14, CELL = 1100, BASE = 760;
let rows = '';
for (const t of THINGS) {
	let cells = '';
	for (let i = 0; i < t.frames; i++) {
		const [gx, gy] = t.grip(i);
		cells += `<g transform="translate(${i * CELL * S} 0) scale(${S})"><line x1="0" x2="${CELL}" y1="${BASE}" y2="${BASE}" stroke="#bbb" stroke-width="5"/><path d="${toSvgD(t.draw(i), BASE, CELL / 2)}"/><circle cx="${CELL / 2 + gx}" cy="${BASE - gy}" r="14" fill="#e33"/></g>`;
	}
	rows += `<div style="display:flex;align-items:center;border-bottom:1px solid #eee"><b style="width:90px;font:13px system-ui">${t.name}</b><svg width="${t.frames * CELL * S}" height="${CELL * S}">${cells}</svg></div>`;
}
const b = await chromium.launch({ executablePath: join(homedir(), 'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), args: ['--headless=new'] });
const p = await b.newPage({ viewport: { width: 1980, height: 600 } });
await p.setContent(`<body style="margin:8px">${rows}</body>`);
await p.screenshot({ path: '.sheets/things.png', fullPage: true });
await b.close();
console.log('.sheets/things.png');
