// After svelte-package builds packages/engine/dist: compile the React
// bindings (svelte-package copies .tsx through untouched), give every
// relative import a full specifier so Node ESM and strict bundlers resolve
// it, and check that the package versions line up.
import { rm, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(repo, 'packages/engine/dist');

const tsx = join(dist, 'react/index.tsx');
const { outputText } = ts.transpileModule(await readFile(tsx, 'utf8'), {
	compilerOptions: {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ESNext,
		jsx: ts.JsxEmit.ReactJSX,
		verbatimModuleSyntax: true
	}
});
await writeFile(join(dist, 'react/index.js'), outputText);
await rm(tsx);

async function* walk(dir: string): AsyncGenerator<string> {
	for (const name of await readdir(dir)) {
		const p = join(dir, name);
		if ((await stat(p)).isDirectory()) yield* walk(p);
		else yield p;
	}
}
for await (const file of walk(dist)) {
	if (!/\.(js|d\.ts|svelte)$/.test(file)) continue;
	const src = await readFile(file, 'utf8');
	const out = src.replace(/(from\s+|import\()(['"])(\.\.?\/[^'"]+)\2/g, (m, pre, q, spec) => {
		if (/\.(js|json|svelte)$/.test(spec)) return m;
		const abs = resolve(dirname(file), spec);
		if (existsSync(abs + '.js')) return `${pre}${q}${spec}.js${q}`;
		if (existsSync(join(abs, 'index.js'))) return `${pre}${q}${spec}/index.js${q}`;
		throw new Error(`${file}: cannot resolve ${spec}`);
	});
	if (out !== src) await writeFile(file, out);
}

const read = async (p: string) => JSON.parse(await readFile(join(repo, p), 'utf8'));
const engine = await read('packages/engine/package.json');
const stick = await read('packages/stick/package.json');
const stickIndex = await readFile(join(repo, 'packages/stick/index.js'), 'utf8');
// The default font URL pins this version, so it must match the package.
if (!stickIndex.includes(`VERSION = '${stick.version}'`)) throw new Error(`packages/stick/index.js VERSION does not match ${stick.version}`);
if (!engine.dependencies['@flipbook-foundry/stick'].endsWith(stick.version))
	console.warn(`engine depends on @flipbook-foundry/stick ${engine.dependencies['@flipbook-foundry/stick']}, stick is ${stick.version}`);
console.log(`packed flipbook-foundry ${engine.version} (stick ${stick.version})`);
