import type { ActionDef } from '../timeline';
import { STAND } from '../skeleton';
import { HANG, HANG_Y, LIE } from './hubs';

// Hang convention shared with hang-idle: ledge at y = 0, pelvis this far
// below it so the hands meet the ledge.

// Type — hunched over an invisible keyboard, hands pecking in turn, head
// bobbing a beat behind the fingers.
export const type: ActionDef = {
	name: 'type',
	category: 'idle',
	description: 'Hunched over an invisible keyboard, pecking away.',
	frames: 24,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 18, arch: 14, head: -16, armL: [52, 42], armR: [46, 46], legL: [-4, 8], legR: [6, 9] },
		{ at: 3, armL: [48, 22], armR: [46, 50], head: -20, event: 'key', ease: 'snap' },
		{ at: 6, armL: [52, 44], armR: [42, 26], head: -15, event: 'key', ease: 'snap' },
		{ at: 9, armL: [48, 22], armR: [46, 48], head: -19, event: 'key', ease: 'snap' },
		{ at: 12, armL: [54, 46], armR: [46, 46], head: -14, lean: 19 },
		{ at: 15, armL: [52, 42], armR: [40, 22], head: -20, event: 'key', ease: 'snap' },
		{ at: 18, armL: [47, 20], armR: [46, 50], head: -16, event: 'key', ease: 'snap' },
		{ at: 21, armL: [52, 44], armR: [42, 26], head: -19, event: 'key', ease: 'snap', lean: 18 }
	]
};

// Sweat — wipe the brow, tug the collar, a guilty glance over the shoulder.
export const sweat: ActionDef = {
	name: 'sweat',
	category: 'idle',
	description: 'Nervous: wipes the brow, tugs the collar, glances about.',
	frames: 32,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 6, arch: 6, head: -4, armR: [30, 60], armL: [-10, 18] },
		{ at: 5, armR: [118, 84], head: -10, lean: 8 },
		{ at: 9, armR: [128, 70], head: -8 },
		{ at: 12, armR: [106, 96], head: -12, ease: 'out' },
		{ at: 16, armR: [20, 40], armL: [42, 128], head: -2, lean: 4 },
		{ at: 19, armL: [46, 122], head: 2 },
		{ at: 22, armL: [40, 132], head: -2 },
		{ at: 25, armL: [-10, 20], head: 12, lean: 2, ease: 'snap' },
		{ at: 29, head: -6, lean: 6, armR: [30, 60] }
	]
};

// Lean-back — propped against a wall behind, arms folded, one ankle crossed,
// breathing slow.
export const leanBack: ActionDef = {
	name: 'lean-back',
	category: 'idle',
	description: 'Leaning back on a wall, arms folded, ankles crossed.',
	frames: 32,
	fps: 12,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: -12, arch: -4, head: 6, armL: [22, 112], armR: [30, 104], legL: [16, 6], legR: [6, 34] },
		{ at: 10, lean: -13, arch: -7, head: 8, squash: 1.012 },
		{ at: 18, lean: -12, arch: -5, head: 4, squash: 1 },
		{ at: 26, lean: -11, arch: -3, head: 7, squash: 0.995 }
	]
};

// Hang-swing — both hands on the ledge, legs pumping like a pendulum.
export const hangSwing: ActionDef = {
	name: 'hang-swing',
	category: 'idle',
	description: 'Hanging from a ledge, swinging the legs like a pendulum.',
	frames: 32,
	fps: 24,
	loop: true,
	from: 'hang',
	to: 'hang',
	ground: 'free',
	floor: false,
	travel: false,
	keys: [
		{ at: 0, ...HANG, y: HANG_Y },
		{ at: 8, legL: [44, 24], legR: [50, 34], rot: -5, head: -12, arch: -6 },
		{ at: 16, legL: [2, 10], legR: [8, 16], rot: 0, head: -6, arch: 0 },
		{ at: 24, legL: [-34, 6], legR: [-28, 14], rot: 5, head: -2, arch: 6 }
	]
};

// Exhausted — doubles over, hands on knees, three big heaving breaths, then
// straightens up with a last puff.
export const exhausted: ActionDef = {
	name: 'exhausted',
	category: 'emote',
	description: 'Doubles over, hands on knees, gasping — then recovers.',
	frames: 48,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		{ at: 8, lean: 50, arch: 18, head: 14, legL: [26, 48], legR: [34, 54], armL: [-8, 10], armR: [-2, 12], squash: 0.98 },
		{ at: 13, lean: 46, arch: 26, head: 8, squash: 1.02 },
		{ at: 18, lean: 52, arch: 16, head: 16, squash: 0.97 },
		{ at: 23, lean: 46, arch: 26, head: 8, squash: 1.02 },
		{ at: 28, lean: 52, arch: 16, head: 16, squash: 0.97 },
		{ at: 33, lean: 47, arch: 24, head: 10, squash: 1.01 },
		{ at: 40, lean: -4, arch: -6, head: -10, legL: [-4, 6], legR: [6, 8], armL: [-14, 20], armR: [10, 28], squash: 1.03, ease: 'out' },
		{ at: 47, ...STAND }
	]
};

// Huddle — freezing: hunched, arms wrapped round, teeth chattering, stamping
// from foot to foot.
export const huddle: ActionDef = {
	name: 'huddle',
	category: 'emote',
	description: 'Freezing: arms wrapped round, shivering, stamping from foot to foot.',
	frames: 16,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 14, arch: 18, head: -16, armL: [28, 142], armR: [18, 150], legL: [4, 18], legR: [12, 22] },
		{ at: 2, lean: 16, head: -13, armL: [30, 138] },
		{ at: 4, lean: 13, head: -17, legL: [16, 44], armR: [20, 146] },
		{ at: 6, lean: 15, head: -14, legL: [4, 18] },
		{ at: 8, lean: 14, head: -16, armL: [28, 142], armR: [18, 150] },
		{ at: 10, lean: 16, head: -13, armL: [30, 138] },
		{ at: 12, lean: 13, head: -17, legR: [24, 50], armR: [20, 146] },
		{ at: 14, lean: 15, head: -14, legR: [12, 22] }
	]
};

// Cover — arms over the head against the rain, hunched, quick little steps.
export const cover: ActionDef = {
	name: 'cover',
	category: 'emote',
	description: 'Arms over the head against the rain, hunched and hurrying in place.',
	frames: 16,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 32, arch: 20, head: -22, armL: [204, -82], armR: [192, -72], legL: [2, 10], legR: [10, 16] },
		{ at: 4, legL: [38, 78], head: -18, lean: 30, armR: [196, -76] },
		{ at: 8, legL: [2, 10], head: -22, lean: 33, armR: [192, -72] },
		{ at: 12, legR: [44, 84], head: -18, lean: 30, armL: [208, -86] }
	]
};

// Wobble — teetering on an edge: pitching forward, arms flailing in big
// circles, a foot kicking up for balance, then rocking back.
export const wobble: ActionDef = {
	name: 'wobble',
	category: 'emote',
	description: 'Teetering on an edge, arms windmilling, one foot up for balance.',
	frames: 32,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 4, head: 0, armL: [60, 30], armR: [-60, 20], legL: [0, 4], legR: [4, 6] },
		{ at: 6, lean: 22, arch: -8, head: 14, armL: [170, 20], armR: [40, 30], legR: [-36, 50] },
		{ at: 12, lean: 28, arch: -10, head: 18, armL: [250, 10], armR: [150, 30], legR: [-44, 64] },
		{ at: 18, lean: 6, arch: 4, head: -4, armL: [120, 40], armR: [230, 10], legR: [-10, 30] },
		{ at: 24, lean: -14, arch: 12, head: -14, armL: [30, 30], armR: [130, 40], legR: [20, 40] },
		{ at: 29, lean: -6, arch: 6, head: -6, armL: [40, 30], armR: [-30, 20], legR: [8, 10] }
	]
};

// Shuffle-step — one patient step forward in a queue.
export const shuffleStep: ActionDef = {
	name: 'shuffle-step',
	category: 'locomotion',
	description: 'One small step forward, as in a queue.',
	frames: 16,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 3, lean: 5, head: -3, legR: [28, 54], legL: [-8, 6], armL: [6, 18], armR: [-2, 22], ease: 'out' },
		{ at: 5, legR: [22, 6], legL: [-12, 8], head: -5 },
		{ at: 8, lean: 6, head: -2, legR: [10, 6], legL: [-20, 30], armL: [-8, 16], armR: [12, 24] },
		{ at: 11, lean: 4, head: -3, legR: [4, 6], legL: [6, 44] },
		{ at: 14, ...STAND, head: -1 },
		{ at: 15, ...STAND }
	]
};

// Search — bent double, hand shading the eyes, peering about the floor,
// shifting weight from foot to foot.
export const search: ActionDef = {
	name: 'search',
	category: 'idle',
	description: 'Bent over, hand shading the eyes, scanning the ground.',
	frames: 40,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 38, arch: 16, head: -10, armR: [70, 110], armL: [-24, 28], legL: [-6, 10], legR: [16, 24] },
		{ at: 10, lean: 44, head: 4, arch: 20, legL: [-10, 12], legR: [20, 30] },
		{ at: 20, lean: 34, head: -18, arch: 14, armR: [74, 106], legL: [2, 20], legR: [10, 18] },
		{ at: 30, lean: 42, head: 0, arch: 18, armR: [68, 112], legL: [-4, 12], legR: [18, 26] }
	]
};

// Peek — a careful lean round a corner, neck stretched, a hold, then a
// guilty snap back upright.
export const peek: ActionDef = {
	name: 'peek',
	category: 'gesture',
	description: 'Leans out head-first as if round a corner, holds, snaps back.',
	frames: 36,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: -6, arch: 4, head: -4, legL: [-4, 14], legR: [6, 16], squash: 0.98 },
		{ at: 12, lean: 34, arch: -10, head: 22, armL: [-36, 34], armR: [-28, 40], legL: [-14, 6], legR: [10, 8], headSquash: 1.04, ease: 'out' },
		{ at: 17, lean: 36, head: 16, headSquash: 1.04 },
		{ at: 22, lean: 35, head: 24 },
		{ at: 25, lean: -10, arch: 8, head: -10, armL: [-10, 30], armR: [6, 34], headSquash: 1, ease: 'snap' },
		{ at: 30, lean: 2, arch: 2, head: -4 },
		{ at: 35, ...STAND }
	]
};

// Topple — stiff as a board, over backward like a domino: a teeter, an
// accelerating fall, a bounce on the back, then lying still.
export const topple: ActionDef = {
	name: 'topple',
	category: 'pratfall',
	description: 'Stiff as a board, falls backward like a domino.',
	frames: 30,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'lie',
	contacts: 'any',
	keys: [
		{ at: 0, ...STAND },
		{ at: 4, lean: 0, arch: 0, head: 0, armL: [-2, 2], armR: [2, 2], legL: [0, 0], legR: [0, 0], rot: 3, headSquash: 1.03 },
		{ at: 6, rot: 0, ease: 'in' },
		{ at: 16, rot: -90, event: 'impact', puff: true, squash: 0.94, armL: [-14, 4], armR: [10, 4] },
		{ at: 19, rot: -84, lift: 30, squash: 1.03, head: 10, legL: [6, 10], legR: [-2, 6] },
		{ at: 23, rot: -90, lift: 0, squash: 1, head: 4 },
		{ at: 29, ...LIE }
	]
};

// Dust-off — brush the shoulder, slap the knees clean, chin up.
export const dustOff: ActionDef = {
	name: 'dust-off',
	category: 'gesture',
	description: 'Brushes off shoulder and knees, then a small proud nod.',
	frames: 32,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, armR: [36, 144], head: 8, lean: 4 },
		{ at: 8, armR: [64, 86], head: 4, ease: 'snap' },
		{ at: 11, armR: [36, 144], head: 8 },
		{ at: 14, armR: [62, 84], head: 2, ease: 'snap' },
		{ at: 18, lean: 34, arch: 14, head: 10, armR: [14, 24], armL: [4, 20], legL: [-4, 14], legR: [8, 18] },
		{ at: 21, armR: [40, 20], armL: [28, 16], ease: 'snap' },
		{ at: 25, lean: -4, arch: -10, head: -14, armR: [8, 26], armL: [-14, 18], legL: [-6, 5], legR: [6, 7], squash: 1.02 },
		{ at: 28, head: 8, squash: 1 },
		{ at: 31, ...STAND }
	]
};

export const MORE: ActionDef[] = [
	type,
	sweat,
	leanBack,
	hangSwing,
	exhausted,
	huddle,
	cover,
	wobble,
	shuffleStep,
	search,
	peek,
	topple,
	dustOff
];
