// Shared rest state. Every action starts and ends on a hub's rest pose, but a
// loop (walk, dance, idle…) is mid-motion on almost every frame, so cutting
// out of one snaps. For each loop the baker finds its exit frames, the
// moments closest to rest, and generates short settle moves from them back
// to rest, plus a rise from rest into the loop if it starts far from it. The
// runtime plays to the next exit, settles, then starts what's next.
import type { Pose } from './skeleton';
import { bake, sample, type ActionDef, type BakeOptions, type BakedFrame, type Hub } from './timeline';

export interface SettleInfo {
	/** Frames where the loop can hand back to rest. */
	exits: number[];
	/** Settle move for each exit (null when that frame already is rest). */
	settle: (string | null)[];
	/** Frame to start on when entering from rest. */
	enter: number;
	/** Move from rest into the loop's enter frame (null when not needed). */
	rise: string | null;
}

const PTS = ['head', 'handL', 'handR', 'footL', 'footR', 'pelvis', 'shoulder'] as const;
/** Largest anchor distance between two frames, font units. */
export const poseDistance = (a: BakedFrame, b: BakedFrame) =>
	Math.max(...PTS.map((p) => Math.hypot(a.anchors[p][0] - b.anchors[p][0], a.anchors[p][1] - b.anchors[p][1])));

/** Within this, a frame counts as the rest pose. */
const CLOSE = 40;
/** Settles run at roughly this many units per frame, 4–9 frames long. */
const PACE = 45;

export function restFrame(hub: Hub, pose: Pose, opts: BakeOptions): BakedFrame {
	const hanging = hub === 'perch' || hub === 'hang';
	return bake(
		{ name: `rest-${hub}`, category: 'presence', description: '', frames: 1, fps: 24, loop: false, keys: [{ at: 0, ...pose }], floor: !hanging, ground: hanging ? 'free' : 'plant' },
		opts
	).frames[0];
}

export function settlesFor(
	actions: ActionDef[],
	hubs: Record<string, Pose>,
	opts: BakeOptions
): { defs: ActionDef[]; info: Map<string, SettleInfo> } {
	const defs: ActionDef[] = [];
	const info = new Map<string, SettleInfo>();
	const rests = new Map<string, BakedFrame>();
	for (const def of actions) {
		if (!def.loop) continue;
		const hub = def.from ?? 'stand';
		const hubPose = hubs[hub];
		if (!hubPose) continue;
		if (!rests.has(hub)) rests.set(hub, restFrame(hub, hubPose, opts));
		const rest = rests.get(hub)!;
		const frames = bake(def, opts).frames;
		const n = frames.length;
		const d = frames.map((f) => poseDistance(f, rest));
		const best = d.indexOf(Math.min(...d));
		// Any frame already at rest is an exit with nothing to play. Then add
		// settle exits until no two are more than half a second apart, so a
		// figure never waits long to change what it's doing.
		const maxGap = Math.max(4, Math.round(def.fps / 2));
		const exitSet = new Set<number>([best]);
		for (let i = 0; i < n; i++) if (d[i] <= CLOSE) exitSet.add(i);
		for (let guard = 0; guard < n; guard++) {
			const list = [...exitSet].sort((a, b) => a - b);
			let widest = -1, from = 0;
			list.forEach((e, k) => {
				const next = k + 1 < list.length ? list[k + 1] : list[0] + n;
				if (next - e > widest) [widest, from] = [next - e, e];
			});
			if (widest <= maxGap) break;
			// The calmest frame in the middle half of the gap.
			let pick = -1;
			for (let o = Math.ceil(widest / 4); o <= Math.floor((widest * 3) / 4); o++) {
				const f = (from + o) % n;
				if (pick < 0 || d[f] < d[pick]) pick = f;
			}
			exitSet.add(pick);
		}
		const exits = [...exitSet].sort((a, b) => a - b);

		const poses = sample(def).map((s) => s.pose);
		const move = (name: string, from: Pose, to: Pose, dist: number): ActionDef => {
			const len = Math.max(4, Math.min(9, Math.ceil(dist / PACE)));
			return {
				name,
				category: 'settle',
				description: `${def.name} ↔ ${hub}`,
				frames: len + 1,
				fps: def.fps,
				loop: false,
				travel: false,
				from: hub,
				to: hub,
				ground: def.ground,
				contacts: def.contacts,
				floor: def.floor,
				keys: [
					{ at: 0, ...from, ease: 'inOut' },
					{ at: len, ...to }
				]
			};
		};
		const settle = exits.map((e) => {
			if (d[e] <= CLOSE) return null;
			const m = move(`${def.name}~settle${e}`, poses[e], hubPose, d[e]);
			defs.push(m);
			return m.name;
		});
		let rise: string | null = null;
		if (d[best] > CLOSE) {
			const m = move(`${def.name}~rise`, hubPose, poses[best], d[best]);
			defs.push(m);
			rise = m.name;
		}
		info.set(def.name, { exits, settle, enter: best, rise });
	}
	return { defs, info };
}
