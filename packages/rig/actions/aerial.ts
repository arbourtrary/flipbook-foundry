import type { ActionDef } from '../timeline';
import { STAND } from '../skeleton';

// Hop — small bunny hop in place, looping. Every landing absorbs into the
// next take-off so it reads as one springy motion.
export const hop: ActionDef = {
	name: 'hop',
	category: 'aerial',
	description: 'Springy little hop in place, looping.',
	frames: 12,
	fps: 24,
	loop: true,
	travel: false,
	keys: [
		{ at: 0, lean: 12, arch: 8, head: -6, lift: 0, legL: [34, 64], legR: [40, 70], armL: [-30, 30], armR: [-20, 36], squash: 0.93 },
		{ at: 2, lean: 2, arch: -6, head: -2, lift: 6, legL: [-2, 4], legR: [2, 6], strideL: 1.08, strideR: 1.08, armL: [60, 20], armR: [70, 26], squash: 1.07, event: 'launch' },
		{ at: 5, lean: 4, arch: 0, head: 0, lift: 78, legL: [24, 54], legR: [30, 60], strideL: 1, strideR: 1, armL: [74, 30], armR: [84, 36], squash: 1 },
		{ at: 8, lean: 6, arch: 2, lift: 4, legL: [12, 20], legR: [16, 24], armL: [40, 30], armR: [50, 30], squash: 1, event: 'land' },
		{ at: 10, lean: 14, arch: 10, head: -8, lift: 0, legL: [40, 76], legR: [46, 82], armL: [-10, 30], armR: [0, 34], squash: 0.9 }
	]
};

// Jump — full vertical jump. Big anticipation dip with arms thrown back, a
// stretched launch, tucked apex, squash-and-puff landing, settle.
export const jump: ActionDef = {
	name: 'jump',
	category: 'aerial',
	description: 'Wind up, spring high, tuck, land with a squash.',
	frames: 34,
	fps: 24,
	loop: false,
	travel: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 4, lean: 22, arch: 14, head: -8, legL: [46, 90], legR: [52, 96], armL: [-40, 20], armR: [-30, 24], squash: 0.95 },
		{ at: 8, lean: 30, arch: 18, head: -14, legL: [62, 118], legR: [68, 122], armL: [-72, 10], armR: [-64, 14], squash: 0.9 },
		{ at: 11, lean: -4, arch: -12, head: -10, lift: 30, legL: [-6, 2], legR: [-2, 4], strideL: 1.1, strideR: 1.1, armL: [160, 6], armR: [170, 10], squash: 1.06, event: 'launch' },
		{ at: 15, lean: 10, arch: 10, head: 4, lift: 250, legL: [72, 124], legR: [66, 116], strideL: 1, strideR: 1, armL: [130, 50], armR: [146, 40], squash: 1 },
		{ at: 20, lean: 2, arch: 0, head: -4, lift: 130, legL: [22, 30], legR: [16, 24], armL: [110, 20], armR: [124, 24] },
		{ at: 23, lean: 22, arch: 16, head: -12, lift: 0, legL: [44, 96], legR: [52, 100], armL: [70, 40], armR: [56, 44], squash: 0.84, headSquash: 0.9, puff: true, event: 'land' },
		{ at: 26, lean: 26, arch: 18, head: -14, legL: [54, 106], legR: [60, 110], armL: [30, 40], armR: [24, 44], squash: 0.94, headSquash: 1, ease: 'out' },
		{ at: 33, ...STAND }
	]
};

// Leap — run-in, plant, and sail forward in a split with arms flung wide;
// lands on the lead foot and runs it out.
export const leap: ActionDef = {
	name: 'leap',
	category: 'aerial',
	description: 'Running split leap that sails forward.',
	frames: 34,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 3, lean: 14, arch: 4, legR: [30, 10], legL: [-22, 40], armL: [30, 50], armR: [-30, 40] },
		{ at: 6, lean: 20, arch: 10, head: -8, legR: [18, 48], legL: [-4, 96], armL: [-44, 30], armR: [-56, 30], squash: 0.92 },
		{ at: 9, lean: 12, arch: -4, head: -10, lift: 24, legR: [-28, 4], strideR: 1.14, legL: [74, 50], armL: [150, 10], armR: [118, 16], squash: 1.08, vx: 64, event: 'launch' },
		{ at: 14, lean: 14, arch: -8, head: -6, lift: 190, legL: [86, 4], strideL: 1.12, legR: [-64, 14], strideR: 1.12, armL: [116, 6], armR: [-70, 8], squash: 1 },
		{ at: 19, lean: 12, arch: 0, lift: 70, legL: [44, 8], strideL: 1.04, legR: [-44, 40], strideR: 1, armL: [80, 20], armR: [-40, 20] },
		{ at: 21, lean: 18, arch: 10, head: -8, lift: 0, legL: [28, 24], strideL: 1, legR: [-32, 70], armL: [50, 40], armR: [-30, 40], squash: 0.88, puff: true, vx: NaN, event: 'land' },
		{ at: 24, lean: 20, arch: 12, legL: [16, 50], legR: [-6, 96], armL: [20, 40], armR: [-10, 40], squash: 0.95 },
		{ at: 28, lean: 10, arch: 4, legL: [2, 10], legR: [20, 50], armL: [0, 20], armR: [10, 20], squash: 1 },
		{ at: 33, ...STAND }
	]
};

// Backflip — crouch, launch, tuck over backwards, stick the landing.
// rot −360 → 0 is the same picture, so a one-frame hold swaps it back to
// the exact STAND hub without a spin.
export const backflip: ActionDef = {
	name: 'backflip',
	category: 'aerial',
	description: 'Tucked backflip, sticks the landing.',
	frames: 34,
	fps: 24,
	loop: false,
	ground: 'free',
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: 24, arch: 16, head: -10, legL: [56, 110], legR: [60, 114], armL: [-62, 12], armR: [-56, 16], squash: 0.92 },
		{ at: 8, lean: -10, arch: -14, head: -16, legL: [-4, 2], legR: [-2, 4], strideL: 1.08, strideR: 1.08, armL: [178, 4], armR: [184, 6], squash: 1.04, y: 40, event: 'launch' },
		{ at: 11, rot: -80, lean: 10, arch: 20, head: 10, legL: [100, 140], legR: [96, 134], strideL: 1, strideR: 1, armL: [70, 80], armR: [64, 86], squash: 1, y: 560, x: -40 },
		{ at: 15, rot: -190, y: 660, x: -90 },
		{ at: 19, rot: -290, legL: [60, 90], legR: [54, 84], armL: [120, 30], armR: [110, 30], y: 540, x: -130, ease: 'in' },
		{ at: 22, rot: -360, lean: 20, arch: 14, head: -10, legL: [40, 76], legR: [46, 80], armL: [100, 10], armR: [80, 14], squash: 0.86, y: 0, x: -150, puff: true, event: 'land', ease: 'hold' },
		{ at: 23, rot: 0, ease: 'out' },
		{ at: 26, lean: 24, arch: 16, head: -12, legL: [46, 92], legR: [52, 96], armL: [90, 10], armR: [70, 10], squash: 0.94 },
		{ at: 33, ...STAND, x: -150 }
	]
};

// Frontflip — crouch, swing the arms up to launch, tuck over forwards,
// travel forward and stick it. Same beats as the backflip, rotating +360.
export const frontflip: ActionDef = {
	name: 'frontflip',
	category: 'aerial',
	description: 'Tucked frontflip, sticks the landing.',
	frames: 34,
	fps: 24,
	loop: false,
	ground: 'free',
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: 24, arch: 16, head: -10, legL: [56, 110], legR: [60, 114], armL: [-62, 12], armR: [-56, 16], squash: 0.92 },
		{ at: 8, lean: 14, arch: -6, head: -6, legL: [-4, 2], legR: [-2, 4], strideL: 1.08, strideR: 1.08, armL: [178, 4], armR: [184, 6], squash: 1.04, y: 40, x: 10, event: 'launch' },
		{ at: 11, rot: 80, lean: 20, arch: 22, head: -14, legL: [110, 140], legR: [104, 134], strideL: 1, strideR: 1, armL: [60, 80], armR: [54, 86], squash: 1, y: 560, x: 50 },
		{ at: 15, rot: 190, y: 660, x: 95 },
		{ at: 19, rot: 290, legL: [60, 90], legR: [54, 84], armL: [40, 30], armR: [30, 30], y: 540, x: 130, ease: 'in' },
		{ at: 22, rot: 360, lean: 20, arch: 14, head: -10, legL: [40, 76], legR: [46, 80], armL: [100, 10], armR: [80, 14], squash: 0.86, y: 0, x: 150, puff: true, event: 'land', ease: 'hold' },
		{ at: 23, rot: 0, ease: 'out' },
		{ at: 26, lean: 24, arch: 16, head: -12, legL: [46, 92], legR: [52, 96], armL: [90, 10], armR: [70, 10], squash: 0.94 },
		{ at: 33, ...STAND, x: 150 }
	]
};

// Fall — airborne tumble, looping while dropping. Linear rot so the wrap
// from 337.5° back to 0° has no in-between frames to spin through.
export const fall: ActionDef = {
	name: 'fall',
	category: 'aerial',
	description: 'Flailing, tumbling fall (loops while airborne).',
	frames: 16,
	fps: 24,
	loop: true,
	ground: 'free',
	travel: false,
	keys: [
		{ at: 0, y: 430, rot: 0, lean: -6, arch: -8, head: -14, legL: [30, 60], legR: [-20, 30], armL: [160, 40], armR: [120, 70], ease: 'linear' },
		{ at: 4, rot: 90, lean: 4, arch: 6, head: 6, legL: [60, 90], legR: [10, 80], armL: [100, 90], armR: [190, 30], ease: 'linear' },
		{ at: 8, rot: 180, lean: -4, arch: -6, head: -10, legL: [20, 30], legR: [50, 110], armL: [170, 60], armR: [90, 50], ease: 'linear' },
		{ at: 12, rot: 270, lean: 6, arch: 8, head: 8, legL: [-10, 70], legR: [40, 40], armL: [120, 30], armR: [150, 90], ease: 'linear' },
		{ at: 15, rot: 337.5, lean: -2, arch: -4, head: -8, legL: [24, 62], legR: [-12, 38], armL: [152, 46], armR: [132, 74], ease: 'linear' }
	]
};

// Land — the hard landing out of a fall: slam into a deep squash, dazed
// head wobble, push back up to standing.
export const land: ActionDef = {
	name: 'land',
	category: 'aerial',
	description: 'Hard landing: crunch, dazed wobble, stand.',
	frames: 26,
	fps: 24,
	loop: false,
	travel: false,
	to: 'stand',
	keys: [
		// fall's upright frame, so a fall hands straight into the landing.
		{ at: 0, ...STAND, lift: 140, lean: -6, arch: -8, head: -14, legL: [30, 60], legR: [-20, 30], armL: [160, 40], armR: [120, 70] },
		{ at: 2, lift: 0, lean: 30, arch: 20, head: -16, legL: [60, 124], legR: [66, 126], armL: [50, 30], armR: [70, 36], squash: 0.78, headSquash: 0.82, puff: true, event: 'land' },
		{ at: 5, lean: 34, arch: 22, head: -10, legL: [58, 118], legR: [64, 122], armL: [24, 30], armR: [36, 30], squash: 0.9, headSquash: 1 },
		{ at: 9, lean: 30, arch: 20, head: 10, squash: 0.92 },
		{ at: 13, lean: 28, arch: 18, head: -8, legL: [52, 104], legR: [58, 108] },
		{ at: 17, lean: 18, arch: 10, head: 4, legL: [30, 60], legR: [36, 64], armL: [0, 20], armR: [10, 24], squash: 1 },
		{ at: 25, ...STAND }
	]
};

export const AERIAL: ActionDef[] = [hop, jump, leap, frontflip, backflip, fall, land];
