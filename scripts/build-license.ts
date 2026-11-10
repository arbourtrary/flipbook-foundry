import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderLicenseText } from '../src/lib/license.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repo, 'static');
const outPath = join(outDir, 'license.txt');

await mkdir(outDir, { recursive: true });
const text = renderLicenseText();
await writeFile(outPath, text, 'utf8');

console.log(`Wrote ${text.length} chars → static/license.txt`);
