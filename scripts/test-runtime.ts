// Headless runtime checks: hub routing, travel-to-x, ledge baselines,
// auto-next, events. Run: npx tsx scripts/test-runtime.ts
import assert from 'node:assert/strict';
import { Character } from '../src/lib/flipbook/core/character.ts';

const run = async (c: Character, ms: number) => {
	for (let t = 0; t < ms; t += 16) c.update(16);
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

console.log('runtime: all checks passed');
