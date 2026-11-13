// Headless runtime checks: hub routing, travel-to-x, ledge baselines,
// auto-next, events. Run: npx tsx scripts/test-runtime.ts
import assert from 'node:assert/strict';
import { Character } from '../packages/engine/src/core/character.ts';
import { getLibrary, setDefaultFamily, setFontBase } from '../packages/engine/src/core/library.ts';
import stick from '@flipbook-foundry/stick';

// Like a browser: a frame, then pending promise callbacks, then the next frame.
const run = async (c: Character, ms: number) => {
	for (let t = 0; t < ms; t += 16) {
		c.update(16);
		await Promise.resolve();
	}
	await new Promise((r) => setTimeout(r, 0));
};

// A lying figure asked to wave gets up first.
{
	const c = new Character({ animate: 'sleep' });
	const seen: string[] = [];
	c.on('start', (e) => seen.push(e.action));
	await run(c, 500);
	c.animate('wave');
	await run(c, 6000);
	assert.deepEqual(seen, ['get-up', 'wave']);
}

// Travel stops exactly on target and resolves.
{
	const c = new Character({ x: 0, size: 100 });
	let done = false;
	c.animate({ action: 'walk', x: 300 }).then(() => (done = true));
	await run(c, 8000);
	assert.equal(Math.round(c.x), 300);
	assert.ok(done);
}

// Ledges move the ground line by 180 units and back.
{
	const c = new Character({ y: 500, size: 100, animate: 'idle' });
	c.animate('sit-on');
	await run(c, 2000);
	assert.equal(Math.round(c.y), 482);
	c.animate('hop-off');
	await run(c, 2000);
	assert.equal(Math.round(c.y), 500);
}

// lift hands straight on to carry.
{
	const c = new Character({ animate: 'idle' });
	c.animate('lift');
	await run(c, 3000);
	assert.equal(c.action.name, 'carry');
}

// Baked events fire on their frames.
{
	const c = new Character({ animate: 'idle' });
	const hits: number[] = [];
	c.on('hit', (p) => hits.push(p.frame));
	c.animate('knock');
	await run(c, 2000);
	assert.deepEqual(hits, [8, 13, 18]);
}

// Repeating a one-shot that ends on another hub routes home between plays.
{
	const c = new Character({ animate: 'idle' });
	const seen: string[] = [];
	c.on('start', (e) => seen.push(e.action));
	c.animate('trip', { repeat: 1, repeatDelay: 0.2 });
	await run(c, 12000);
	assert.deepEqual(seen, ['trip', 'get-up', 'trip']);
}

// Sequences chain actions and route between rest poses on their own.
{
	const c = new Character({ animate: 'idle' });
	const seen: string[] = [];
	c.on('start', (e) => seen.push(e.action));
	let done = false;
	c.sequence(['trip', 'wave', 'walk']).then(() => (done = true));
	await run(c, 15000);
	assert.deepEqual(seen, ['trip', 'get-up', 'wave', 'walk']);
	assert.ok(done);
}

// Travel-to-x works for actions that move backwards.
{
	const c = new Character({ x: 300, size: 100 });
	let done = false;
	c.animate({ action: 'backpedal', x: 200 }).then(() => (done = true));
	await run(c, 8000);
	assert.equal(Math.round(c.x), 200);
	assert.equal(c.facing, 1);
	assert.ok(done);
}

// Families: one library each, chosen per character or by default.
{
	const other = { ...stick, id: 'other', fontBase: 'https://example.com/other/' };
	assert.equal(getLibrary().family, stick);
	assert.notEqual(getLibrary(other), getLibrary());
	assert.equal(new Character({ library: getLibrary(other) }).library.family.id, 'other');
	setFontBase('/self/', other);
	assert.equal(getLibrary(other).fontBase, '/self/');
	assert.match(getLibrary().fontBase, /@flipbook-foundry\/stick@/);
	setDefaultFamily(other);
	assert.equal(new Character().library.family.id, 'other');
	setDefaultFamily(stick);
}

console.log('runtime: all checks passed');
