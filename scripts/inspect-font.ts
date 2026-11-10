import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const otfPath = join(repo, 'static/fonts/flipbook.otf');

const bytes = await readFile(otfPath);
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

console.log('Names:', JSON.stringify(font.names, null, 2).slice(0, 300));
console.log('UnitsPerEm:', font.unitsPerEm);
console.log('Ascender/Descender:', font.ascender, font.descender);
console.log('Glyph count:', font.glyphs.length);
console.log('');
console.log('Glyphs by codepoint:');

const list: Array<[string, string, number]> = [];
for (let i = 0; i < font.glyphs.length; i++) {
	const g = font.glyphs.get(i);
	const cp = g.unicode;
	const hex = cp ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : '(none)';
	list.push([hex, g.name ?? '?', cp ?? -1]);
}
list.sort((a, b) => a[2] - b[2]);
for (const [hex, name, cp] of list) {
	console.log(`  ${hex}  ${name.padEnd(20)}  (decimal ${cp})`);
}
