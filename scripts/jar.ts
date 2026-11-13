// Finds jarring motion: pops between frames, loops whose last frame doesn't
// flow into the first, and one-shots that don't start/end on their hub's rest
// pose (so repeating or chaining them snaps).
//
//   npx tsx scripts/jar.ts [names…] [--all] [--fail]
//
// Distances are font units on the anchors (head, hands, feet, pelvis,
// shoulder), in glyph space: the pelvis is always at x = 0, so a jump here is
// a jump on screen whether the figure travels or plays in place.
import { ACTIONS } from '../packages/rig/actions/index.ts';
import { HUBS } from '../packages/rig/actions/hubs.ts';
import { bake, type BakedFrame } from '../packages/rig/timeline.ts';

const args = process.argv.slice(2);
const names = args.filter((a) => !a.startsWith('--'));
const showAll = args.includes('--all');

const PTS = ['head', 'handL', 'handR', 'footL', 'footR', 'pelvis', 'shoulder'] as const;
const dist = (a: BakedFrame, b: BakedFrame) =>
	Math.max(...PTS.map((p) => Math.hypot(a.anchors[p][0] - b.anchors[p][0], a.anchors[p][1] - b.anchors[p][1])));
const worldDist = (a: BakedFrame, b: BakedFrame) =>
	Math.max(...PTS.map((p) => Math.hypot(b.anchors[p][0] + b.dx - a.anchors[p][0], b.anchors[p][1] - a.anchors[p][1])));
const median = (xs: number[]) => {
	const s = [...xs].sort((a, b) => a - b);
	return s.length ? s[Math.floor(s.length / 2)] : 0;
};

// Rest frame of each hub, baked the same way an action would be.
const rest = Object.fromEntries(
	Object.entries(HUBS).map(([hub, pose]) => {
		const b = bake({ name: `rest-${hub}`, category: 'presence', description: '', frames: 1, fps: 24, loop: false, keys: [{ at: 0, ...pose }], floor: hub !== 'perch' && hub !== 'hang', ground: hub === 'perch' || hub === 'hang' ? 'free' : 'plant' });
		return [hub, b.frames[0]];
	})
);

// A pop is a step well above this action's typical step, and big enough to see.
const POP_RATIO = 3;
const POP_MIN = 70;
// Off a hub by more than this and the next action visibly snaps.
const HUB_MAX = 40;

// Actions built to follow or lead into another one rather than a rest pose.
const HANDOFF: Record<string, { at: 'start' | 'end'; with: string }> = {
	land: { at: 'start', with: 'fall' },
	'skid-stop': { at: 'start', with: 'run' },
	'climb-up': { at: 'start', with: 'hang-idle' },
	'start-run': { at: 'end', with: 'run' }
};
const byName = Object.fromEntries(ACTIONS.map((a) => [a.name, a]));

let flagged = 0;
for (const def of ACTIONS.filter((a) => !names.length || names.includes(a.name))) {
	const fr = bake(def).frames;
	const n = fr.length;
	// Worst of in place (glyph space) and travelling (glyph + root motion).
	const step = (a: BakedFrame, b: BakedFrame) => Math.max(dist(a, b), worldDist(a, b));
	const steps = fr.slice(1).map((f, i) => step(fr[i], f));
	// For a loop the seam (last → first) is just another step.
	if (def.loop) steps.push(step(fr[n - 1], fr[0]));
	const typical = Math.max(median(steps), 8);
	const issues: string[] = [];

	// A teleport is one big step between calm neighbours. A run of big steps
	// is a fast swing (a punch, a flip), which is drawn that way on purpose.
	const wrapStep = (i: number) => (def.loop ? steps[(i + steps.length) % steps.length] : steps[i] ?? 0);
	steps.forEach((s, i) => {
		const near = Math.max(wrapStep(i - 1), wrapStep(i + 1));
		if (s > POP_MIN && s > typical * POP_RATIO && s > near * 2.2) {
			const a = fr[i], b = fr[(i + 1) % n];
			const worst = PTS.map((p) => ({ p, d: Math.hypot(b.anchors[p][0] - a.anchors[p][0], b.anchors[p][1] - a.anchors[p][1]) })).sort((x, y) => y.d - x.d)[0];
			const dy = b.anchors.pelvis[1] - a.anchors.pelvis[1];
			issues.push(`teleport ${i}→${(i + 1) % n}: ${Math.round(s)} (${worst.p}; pelvis dy ${Math.round(dy)}; typical ${Math.round(typical)}, neighbours ${Math.round(near)})`);
		}
	});
	// Root motion: a travelling figure shouldn't step backward or surge.
	const dxs = fr.map((f) => f.dx);
	const mean = dxs.reduce((a, b) => a + b, 0) / n;
	if (Math.abs(mean) > 5) {
		const dir = Math.sign(mean);
		const back = dxs.map((d, i) => [d * dir, i] as const).filter(([d]) => d < -2);
		if (back.length) issues.push(`steps backward at ${back.map(([d, i]) => `${i} (${Math.round(d)})`).join(', ')} (mean ${Math.round(mean)})`);
		const surge = Math.max(...dxs.map((d) => d * dir)) / Math.abs(mean);
		if (def.loop && surge > 2.6) issues.push(`surges to ${surge.toFixed(1)}× mean speed`);
	}
	if (def.loop) {
		// Root motion across the seam should match its neighbours.
		const around = (dxs[1] + dxs[n - 1]) / 2;
		if (Math.abs(dxs[0] - around) > Math.max(25, Math.abs(around) * 0.8)) issues.push(`loop dx jump at seam: ${Math.round(dxs[0])} vs ~${Math.round(around)}`);
	} else if (HANDOFF[def.name]) {
		// Played straight after / before another action: compare with that.
		const h = HANDOFF[def.name];
		const other = bake(byName[h.with]).frames;
		// A loop hands over at whichever of its frames is closest.
		const d = h.at === 'start'
			? Math.min(...(byName[h.with].loop ? other : [other[other.length - 1]]).map((o) => dist(fr[0], o)))
			: Math.min(...(byName[h.with].loop ? other : [other[0]]).map((o) => dist(fr[n - 1], o)));
		if (d > HUB_MAX) issues.push(`${h.at === 'start' ? 'starts' : 'ends'} ${Math.round(d)} off ${h.with}`);
	} else {
		const from = def.from ?? 'stand';
		const to = def.to ?? from;
		const s = dist(fr[0], rest[from]);
		const e = dist(fr[n - 1], rest[to]);
		if (!def.baseline && s > HUB_MAX) issues.push(`starts ${Math.round(s)} off ${from}`);
		if (!def.baseline && !def.next && e > HUB_MAX) issues.push(`ends ${Math.round(e)} off ${to}`);
	}
	if (issues.length) flagged++;
	if (issues.length || showAll) {
		console.log(`${def.name} (${def.category}, ${def.loop ? 'loop' : 'once'}, ${n}f @${def.fps})`);
		for (const s of issues) console.log(`  ${s}`);
	}
}
// Settle moves must start exactly on their loop's exit frame and end on
// rest; rises the other way round. Otherwise the hand-over itself pops.
import { settlesFor, poseDistance, restFrame } from '../packages/rig/settle.ts';
if (!names.length) {
	const { defs, info } = settlesFor(ACTIONS, HUBS, {});
	const baked = new Map(defs.map((d) => [d.name, bake(d).frames]));
	let bad = 0;
	for (const [name, si] of info) {
		const def = byName[name];
		const loop = bake(def).frames;
		const rest = restFrame(def.from ?? 'stand', HUBS[def.from ?? 'stand'], {});
		si.exits.forEach((e, k) => {
			const m = si.settle[k] && baked.get(si.settle[k]!);
			if (!m) return;
			const a = poseDistance(loop[e], m[0]), b = poseDistance(m[m.length - 1], rest);
			if (a > 6 || b > 6) (bad++, console.log(`${si.settle[k]}: starts ${Math.round(a)} off ${name}[${e}], ends ${Math.round(b)} off rest`));
		});
		const r = si.rise && baked.get(si.rise);
		if (r) {
			const a = poseDistance(r[0], rest), b = poseDistance(r[r.length - 1], loop[si.enter]);
			if (a > 6 || b > 6) (bad++, console.log(`${si.rise}: starts ${Math.round(a)} off rest, ends ${Math.round(b)} off ${name}[${si.enter}]`));
		}
	}
	console.log(`settle moves: ${defs.length}, ${bad} misaligned`);
	flagged += bad;
}
console.log(`\n${flagged} of ${names.length || ACTIONS.length} actions flagged`);
if (args.includes('--fail') && flagged) process.exit(1);
