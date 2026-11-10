// Capture one canvas on /lab/scenes at several times: tsx scripts/_cap.ts <canvasIndex> <name> <t1,t2,...seconds>
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';
const [idx = '0', name = 'cap', times = '2,5,9'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: join(homedir(), 'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), args: ['--headless=new'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('[err]', m.text()));
await p.goto('http://localhost:5199/lab/scenes');
const el = p.locator('canvas').nth(+idx);
await el.scrollIntoViewIfNeeded();
const t0 = Date.now();
for (const t of times.split(',').map(Number)) {
	const dt = t * 1000 - (Date.now() - t0);
	if (dt > 0) await p.waitForTimeout(dt);
	await el.screenshot({ path: `.sheets/${name}-${t}.png` });
}
await b.close();
console.log('ok');
