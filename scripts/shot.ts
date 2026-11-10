// Screenshot a dev page and print console errors: tsx scripts/shot.ts /lab out.png [waitMs] [width] [height]
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';
const [path = '/', out = '.sheets/shot.png', wait = '1500', w = '1280', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({
	executablePath: join(homedir(), 'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
	args: ['--headless=new']
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR ?? 1) });
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log(`[${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('response', (r) => r.status() >= 400 && console.log('[http]', r.status(), r.url()));
await page.goto(`http://localhost:${process.env.PORT ?? 5199}${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: process.env.FULL === '1' });
const probe = process.env.PROBE;
if (probe) console.log(await page.evaluate(probe));
await browser.close();
console.log(out);
