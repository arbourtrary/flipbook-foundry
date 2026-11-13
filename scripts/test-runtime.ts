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

// Changing action hands over through the rest pose: no frame-to-frame jump.
{
	await getLibrary().loadAnchors();
	const lib = getLibrary();
	const PTS = ['head', 'handL', 'handR', 'footL', 'footR', 'pelvis'] as const;
	const typicalStep = (a: typeof lib extends { action(n: string): infer A } ? A : never) => {
		const steps: number[] = [];
		for (let f = 1; f < a.frames; f++)
			steps.push(Math.max(...PTS.map((p) => Math.hypot(lib.anchor(a, f, p)[0] - lib.anchor(a, f - 1, p)[0], lib.anchor(a, f, p)[1] - lib.anchor(a, f - 1, p)[1]))));
		return steps.sort((x, y) => x - y)[Math.floor(steps.length / 2)] ?? 0;
	};
	const watch = async (c: Character, ms: number) => {
		let worst = 0;
		let prev = lib.anchor(c.action, c.frame, 'pelvis') && PTS.map((p) => lib.anchor(c.action, c.frame, p));
		let was = c.action;
		for (let t = 0; t < ms; t += 16) {
			c.update(16);
			await Promise.resolve();
			const cur = PTS.map((p) => lib.anchor(c.action, c.frame, p));
			// Only hand-overs between clips (each action's own motion is the
			// audit's job), measured against the outgoing action's usual step.
			// Into a settle is the loop's own next step (its frame 0 is the exit
			// frame; scripts/jar.ts checks that), so it's not a hand-over.
			if (c.action !== was && !c.action.name.includes('~settle')) {
				const d = Math.max(...cur.map((q, i) => Math.hypot(q[0] - prev[i][0], q[1] - prev[i][1])));
				worst = Math.max(worst, d / Math.max(60, typicalStep(was) * 1.4));
			}
			was = c.action;
			prev = cur;
		}
		return worst;
	};
	for (const [from, to] of [['walk', 'wave'], ['run', 'sit-idle'], ['dance', 'shrug'], ['cheer', 'walk'], ['wave', 'jump']]) {
		const c = new Character({ animate: 'idle', size: 100 });
		await run(c, 100);
		c.animate(from);
		await run(c, 430);
		const seen: string[] = [];
		c.on('start', (e) => seen.push(e.action));
		c.animate(to);
		const worst = await watch(c, 2500);
		assert.ok(worst <= 1, `${from} → ${to}: a hand-over jumps ${worst.toFixed(1)}× a normal step`);
		assert.equal(seen.at(-1), to);
		assert.ok(seen.every((n) => !n.includes('~')), 'settle moves are silent');
	}
}

// A one-shot finishes before the next action; 'cut' switches at once.
{
	const c = new Character({ animate: 'idle' });
	await run(c, 100);
	c.animate('wave');
	await run(c, 300);
	let waveEnded = false;
	c.on('complete', (e) => e.action === 'wave' && (waveEnded = true));
	c.animate('shrug');
	await run(c, 100);
	assert.equal(c.action.name, 'wave');
	await run(c, 2500);
	assert.ok(waveEnded);
	c.animate('wave');
	await run(c, 300);
	c.animate('jump', { interrupt: 'cut' });
	await run(c, 50);
	assert.equal(c.action.name, 'jump');
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
