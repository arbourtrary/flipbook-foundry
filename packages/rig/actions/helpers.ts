import { type Pose, swapLR, STAND } from '../skeleton';
import { type Key, resolveKeys } from '../timeline';

// Author one step of a symmetric cycle; the second step is the mirror image
// (left/right swapped) offset by `half` frames. Sparse inheritance is resolved
// before swapping so the mirrored keys are complete poses.
export function mirrorCycle(step: Key[], half: number): Key[] {
	const resolved = resolveKeys(step);
	const out: Key[] = [];
	for (const { key, pose } of resolved) {
		out.push({ ...pose, at: key.at, ease: key.ease, puff: key.puff, vx: key.vx, event: key.event });
	}
	for (const { key, pose } of resolved) {
		out.push({ ...swapLR(pose), at: key.at + half, ease: key.ease, puff: key.puff, vx: key.vx, event: key.event });
	}
	return out;
}

export const stand = (p: Partial<Pose> = {}): Pose => ({ ...STAND, ...p });
