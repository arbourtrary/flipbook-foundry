import type { Pose } from '../skeleton';
import { STAND } from '../skeleton';
import type { Hub } from '../timeline';

// Canonical rest poses. Every one-shot action that declares `from`/`to` a
// hub must start/end EXACTLY on that hub's pose (spread it into the first or
// last key) so the runtime can cut between actions on the same hub with no pop.

export const CROUCH: Pose = {
	...STAND,
	lean: 24,
	arch: 14,
	head: -16,
	legL: [62, 118],
	legR: [70, 122],
	armL: [30, 40],
	armR: [40, 50]
};

// Sitting on the floor, legs out front, hands planted behind.
export const SIT: Pose = {
	...STAND,
	lean: -4,
	arch: 8,
	head: 2,
	legL: [80, 26],
	legR: [86, 14],
	armL: [-38, -6],
	armR: [-30, -4]
};

// Flat on the back, facing up — head toward −x, feet toward +x.
export const LIE: Pose = {
	...STAND,
	rot: -90,
	lean: 0,
	arch: -2,
	head: 6,
	legL: [4, 10],
	legR: [-2, 4],
	armL: [-10, 8],
	armR: [12, 10]
};

// Sitting on a ledge (a letter, a platform). Pelvis rests at y = 0, legs hang.
export const PERCH: Pose = {
	...STAND,
	lean: 6,
	arch: 10,
	head: -4,
	legL: [84, 96],
	legR: [76, 84],
	armL: [-14, 30],
	armR: [10, 40]
};

// Pelvis this far below the ledge so the hands grip it.
export const HANG_Y = -458;

// Hanging by both hands from a ledge at y = 0.
export const HANG: Pose = {
	...STAND,
	y: HANG_Y,
	lean: 0,
	head: -6,
	armL: [176, 0],
	armR: [184, 0],
	legL: [-4, 8],
	legR: [6, 16]
};

export const HUBS: Record<Hub, Pose> = {
	stand: STAND,
	crouch: CROUCH,
	sit: SIT,
	lie: LIE,
	perch: PERCH,
	hang: HANG
};
