import type { ActionDef, Key } from '../timeline';
import { STAND } from '../skeleton';
import { CROUCH, HANG, HANG_Y, LIE, PERCH, SIT } from './hubs';
import { run } from './locomotion';

// First pose of the run cycle — start-run lands on it, skid-stop leaves
// from it, so both cut cleanly against `run`.
const { at: _at, ease: _e, puff: _p, vx: _v, event: _ev, ...RUN0 } = run.keys[0] as Key;

// Ledge geometry (floor:false actions; y = 0 is the ledge):
//   HANG  — pelvis HANG_Y (458) below the ledge so the hands grip it.
//   PERCH — sitting on a chair-height ledge; feet rest on the floor 180 below.
const SEAT_DROP = 180;
const STAND_Y = 353; // pelvis height of STAND with feet on y = 0

export const sitDown: ActionDef = {
	name: 'sit-down',
	category: 'transition',
	description: 'Lower down, hands back, plop onto the floor.',
	frames: 22,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'stand',
	to: 'sit',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: 22, arch: 10, head: -6, legL: [50, 100], legR: [56, 104], armL: [-20, 20], armR: [-10, 24] },
		{ at: 9, lean: 12, arch: 12, head: -2, legL: [70, 124], legR: [76, 126], armL: [-46, 4], armR: [-40, 6] },
		{ at: 12, lean: -2, arch: 8, head: 4, legL: [84, 84], legR: [88, 74], squash: 0.92, headSquash: 0.94, event: 'contact' },
		{ at: 15, legL: [82, 44], legR: [86, 30], squash: 1, headSquash: 1 },
		{ at: 21, ...SIT }
	]
};

export const standUp: ActionDef = {
	name: 'stand-up',
	category: 'transition',
	description: 'Pull the knees in, rock forward, rise.',
	frames: 22,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'sit',
	to: 'stand',
	keys: [
		{ at: 0, ...SIT },
		{ at: 4, lean: 26, arch: 14, head: -8, legL: [74, 130], legR: [80, 134], armL: [50, 30], armR: [60, 24] },
		{ at: 8, lean: 36, arch: 16, head: -14, legL: [62, 120], legR: [68, 124], armL: [80, 10], armR: [90, 10] },
		{ at: 13, lean: 16, arch: 6, head: -4, legL: [28, 48], legR: [32, 52], armL: [30, 20], armR: [40, 20] },
		{ at: 17, lean: -2, arch: -4, head: 2, legL: [-4, 4], legR: [2, 4], armL: [-4, 10], armR: [6, 12] },
		{ at: 21, ...STAND }
	]
};

export const lieDown: ActionDef = {
	name: 'lie-down',
	category: 'transition',
	description: 'Sit, then ease back flat.',
	frames: 28,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'stand',
	to: 'lie',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: 20, arch: 10, head: -6, legL: [56, 108], legR: [60, 110], armL: [-30, 10], armR: [-20, 14] },
		{ at: 10, lean: -8, arch: 8, head: 4, legL: [82, 70], legR: [86, 60], armL: [-50, 0], armR: [-44, 2], squash: 0.94, event: 'contact' },
		{ at: 15, rot: -40, lean: 0, arch: 4, head: 10, legL: [56, 40], legR: [50, 30], armL: [-30, 10], armR: [-10, 10], squash: 1 },
		{ at: 20, rot: -80, head: 10, legL: [14, 16], legR: [8, 10] },
		{ at: 27, ...LIE }
	]
};

// Get-up — comic scramble: kick the legs up for momentum, rock onto the
// bottom, lurch forward onto the feet, windmill for balance.
export const getUp: ActionDef = {
	name: 'get-up',
	category: 'transition',
	description: 'Kick, rock up, scramble to the feet.',
	frames: 32,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'lie',
	to: 'stand',
	keys: [
		{ at: 0, ...LIE },
		{ at: 4, legL: [80, 40], legR: [60, 90], armL: [-20, 30], armR: [20, 40] },
		{ at: 8, rot: -40, lean: 20, arch: 20, head: 10, legL: [100, 130], legR: [96, 136], armL: [100, 30], armR: [80, 40] },
		{ at: 12, rot: 0, lean: 40, arch: 18, head: -14, legL: [64, 124], legR: [70, 126], armL: [140, 20], armR: [60, 50], event: 'contact' },
		{ at: 16, lean: 30, arch: 10, head: -10, legL: [36, 70], legR: [44, 80], armL: [200, 30], armR: [100, 30] },
		{ at: 20, lean: -8, arch: -6, head: 8, legL: [-6, 8], legR: [6, 10], armL: [100, 10], armR: [80, 10] },
		{ at: 24, lean: 6, arch: 2, head: -4, armL: [30, 20], armR: [40, 20] },
		{ at: 31, ...STAND }
	]
};

export const crouchDown: ActionDef = {
	name: 'crouch-down',
	category: 'transition',
	description: 'Drop into a crouch with a little overshoot.',
	frames: 12,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'crouch',
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, ...CROUCH, lean: 28, legL: [66, 124], legR: [74, 128], squash: 0.95 },
		{ at: 11, ...CROUCH }
	]
};

export const rise: ActionDef = {
	name: 'rise',
	category: 'transition',
	description: 'Spring up from a crouch, settle tall.',
	frames: 14,
	fps: 24,
	loop: false,
	from: 'crouch',
	to: 'stand',
	keys: [
		{ at: 0, ...CROUCH },
		{ at: 4, lean: 12, arch: 4, head: -4, legL: [30, 50], legR: [34, 54], armL: [10, 20], armR: [20, 20] },
		{ at: 7, lean: -2, arch: -6, head: -4, legL: [-4, 2], legR: [2, 2], strideL: 1.04, strideR: 1.04, armL: [-10, 10], armR: [0, 10] },
		{ at: 13, ...STAND }
	]
};

// Climb-up — from hanging on a ledge to standing on top of it. y = 0 is the
// ledge; the figure starts BELOW it and ends standing on it.
// Root motion: +190 x (exported), +450 up from pelvis-at-hang to
// pelvis-at-stand (not exported as dy yet; the glyph itself carries it).
export const climbUp: ActionDef = {
	name: 'climb-up',
	category: 'transition',
	description: 'Hang → pull up → knee over → stand on the ledge. Ledge is y=0; ends 190 forward.',
	frames: 28,
	fps: 24,
	loop: false,
	ground: 'free',
	floor: false,
	from: 'hang',
	to: 'stand',
	keys: [
		{ at: 0, ...HANG, y: HANG_Y },
		{ at: 5, y: -300, x: 10, lean: 6, head: -8, armL: [100, 117], armR: [108, 112], legL: [30, 50], legR: [10, 30] },
		{ at: 9, y: -100, x: 60, lean: 44, arch: 14, head: -14, armL: [140, -160], armR: [136, -150], legL: [-20, 60], legR: [30, 84] },
		{ at: 13, y: -20, x: 120, lean: 50, arch: 18, head: -10, armL: [-40, 125], armR: [-34, 120], legL: [96, 140], legR: [-10, 40] },
		{ at: 17, ...CROUCH, y: 188, x: 170 },
		{ at: 21, y: 300, x: 186, lean: 10, arch: 2, head: -2, legL: [20, 30], legR: [24, 34], armL: [10, 20], armR: [20, 20] },
		{ at: 27, ...STAND, y: STAND_Y, x: 190 }
	]
};

// Hop-off — from perching on a chair-height ledge (y = 0) down onto the
// floor in front, SEAT_DROP below. Root: +110 x, −180 y (dy not exported).
export const hopOff: ActionDef = {
	name: 'hop-off',
	category: 'transition',
	description: 'Scoot forward off a ledge onto the floor 180 below. Ledge is y=0.',
	baseline: { end: -180 },
	frames: 20,
	fps: 24,
	loop: false,
	ground: 'free',
	floor: false,
	from: 'perch',
	to: 'stand',
	keys: [
		{ at: 0, ...PERCH, y: 0 },
		{ at: 4, y: 0, x: 20, lean: 24, arch: 14, head: -8, armL: [-30, 20], armR: [-20, 20], legL: [70, 80], legR: [64, 70] },
		{ at: 8, y: 40, x: 70, lean: 8, arch: -4, head: -6, armL: [80, 20], armR: [90, 20], legL: [20, 20], legR: [10, 20] },
		{ at: 11, y: 61, x: 100, lean: 20, arch: 12, head: -10, legL: [50, 96], legR: [56, 100], armL: [60, 30], armR: [50, 30], squash: 0.9, event: 'land' },
		{ at: 14, y: 127, x: 108, lean: 14, arch: 6, legL: [34, 60], legR: [40, 64], squash: 1 },
		{ at: 19, ...STAND, y: STAND_Y - SEAT_DROP, x: 110 }
	]
};

// Sit-on — back up onto a chair-height ledge behind you. Starts standing on
// the floor SEAT_DROP below the ledge (y = 0). Root: −60 x, +180 y.
export const sitOn: ActionDef = {
	name: 'sit-on',
	category: 'transition',
	description: 'Back onto a ledge behind and perch. Ledge is y=0; floor is 180 below.',
	baseline: { start: 180 },
	frames: 20,
	fps: 24,
	loop: false,
	ground: 'free',
	floor: false,
	from: 'stand',
	to: 'perch',
	keys: [
		{ at: 0, ...STAND, y: STAND_Y - SEAT_DROP },
		{ at: 5, y: 110, x: -30, lean: 24, arch: 10, head: -6, legL: [40, 70], legR: [46, 74], armL: [50, 20], armR: [40, 24] },
		{ at: 10, y: 8, x: -58, lean: 14, arch: 10, head: -2, legL: [80, 92], legR: [72, 80], armL: [30, 30], armR: [20, 30], squash: 0.95, event: 'contact' },
		{ at: 13, y: 0, x: -60, squash: 1 },
		{ at: 19, ...PERCH, y: 0, x: -60 }
	]
};

// Skid-stop — out of a run: heels dig in, body leans way back, dust flies,
// a wobble forward, then composure.
export const skidStop: ActionDef = {
	name: 'skid-stop',
	category: 'locomotion',
	description: 'Brake out of a run: lean-back skid, dust, wobble, stand.',
	frames: 26,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...RUN0 },
		{ at: 3, lean: -18, arch: -8, head: 10, legR: [46, 8], strideR: 1.04, legL: [-6, 64], armL: [-50, 40], armR: [-30, 50], squash: 1, vx: 60, puff: true, event: 'contact' },
		{ at: 7, lean: -26, arch: -10, head: 14, legR: [52, 6], legL: [10, 50], armL: [150, 30], armR: [-60, 40], vx: 34, puff: true },
		{ at: 11, lean: -18, legR: [40, 10], legL: [20, 30], armL: [200, 30], armR: [100, 40], vx: 10 },
		{ at: 14, lean: -8, arch: -4, head: 6, legR: [22, 14], legL: [4, 24], strideR: 1, armL: [120, 20], armR: [60, 30], vx: NaN },
		{ at: 18, lean: 14, arch: 6, head: -10, legR: [12, 20], legL: [-4, 20], armL: [60, 30], armR: [80, 30] },
		{ at: 25, ...STAND }
	]
};

// Start-run — rock back, coil, explode forward into the run's first frame.
export const startRun: ActionDef = {
	name: 'start-run',
	category: 'locomotion',
	description: 'Rock back, coil, burst into a run (ends on run frame 0).',
	frames: 16,
	fps: 24,
	loop: false,
	from: 'stand',
	next: 'run',
	keys: [
		{ at: 0, ...STAND },
		{ at: 4, lean: -8, arch: -6, head: 6, legL: [-8, 8], legR: [6, 10], armL: [60, 40], armR: [40, 50], squash: 1.03, ease: 'in', vx: 0 },
		{ at: 7, lean: 30, arch: 12, head: -14, legL: [50, 90], legR: [30, 60], armL: [-60, 40], armR: [40, 80], squash: 0.92, vx: 14 },
		{ at: 10, lean: 22, arch: 4, head: -10, legR: [-24, 6], strideR: 1.1, legL: [50, 80], armL: [-40, 80], armR: [50, 90], squash: 1.04, vx: 62 },
		{ at: 15, ...RUN0 }
	]
};

export const TRANSITIONS: ActionDef[] = [
	sitDown,
	standUp,
	lieDown,
	getUp,
	crouchDown,
	rise,
	climbUp,
	hopOff,
	sitOn,
	skidStop,
	startRun
];
