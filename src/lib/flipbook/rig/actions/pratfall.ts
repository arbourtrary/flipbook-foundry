import type { ActionDef } from '../timeline';
import { STAND } from '../skeleton';
import { CROUCH, LIE } from './hubs';

// Trip — the inspo/frames.jpg sequence: a step, the back foot snags, the
// body pitches into a flailing dive, belly-flops and skids, then somersaults
// forward over its head and ends flat on its back. rot 270 and −90 are the
// same picture; a one-frame hold swaps to the exact LIE hub.
export const trip: ActionDef = {
	name: 'trip',
	category: 'pratfall',
	description: 'Snag, flailing dive, belly-skid, flip over onto the back.',
	frames: 42,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'stand',
	to: 'lie',
	keys: [
		{ at: 0, ...STAND },
		{ at: 3, lean: 12, arch: 2, legR: [28, 6], legL: [-22, 30], armL: [30, 30], armR: [-30, 20] },
		{ at: 6, lean: 26, arch: -8, head: -22, rot: 14, legR: [12, 20], legL: [-44, 70], armL: [90, 30], armR: [60, 50], headSquash: 1.1, event: 'contact' },
		{ at: 9, lean: 18, arch: -10, head: -16, rot: 44, lift: 50, legR: [-14, 8], strideR: 1.1, legL: [-36, 96], armL: [150, 40], armR: [110, 70], headSquash: 1, vx: 34 },
		{ at: 12, lean: 6, arch: -14, head: -10, rot: 76, lift: 120, legR: [-22, 24], strideR: 1, legL: [-12, 50], armL: [176, 8], armR: [164, 20], vx: 40 },
		{ at: 15, lean: 0, arch: -8, head: -18, rot: 92, lift: 0, legR: [0, 8], legL: [-6, 18], armL: [180, 4], armR: [176, 8], squash: 0.86, headSquash: 0.82, puff: true, event: 'land', vx: 26 },
		{ at: 18, arch: -16, head: -12, rot: 90, legR: [-40, 80], legL: [-30, 96], squash: 1, headSquash: 1, vx: 14 },
		{ at: 22, arch: -6, head: -6, legR: [-6, 20], legL: [-4, 30], armL: [170, 20], armR: [160, 30], vx: 0 },
		{ at: 25, lean: 14, arch: 26, head: 30, rot: 120, lift: 30, legR: [94, 136], legL: [100, 140], armL: [110, 60], armR: [100, 70], vx: 16 },
		{ at: 29, rot: 200, lift: 60, vx: 18 },
		{ at: 33, lean: 0, arch: 4, head: 6, rot: 262, lift: 0, legR: [10, 20], legL: [16, 30], armL: [-20, 10], armR: [10, 20], squash: 0.9, puff: true, event: 'land', vx: 0, ease: 'out' },
		{ at: 36, ...LIE, rot: 270, ease: 'hold' },
		{ at: 37, ...LIE, ease: 'hold' },
		{ at: 41, ...LIE }
	]
};

// Tumble — duck into a tight ball, roll forward over the shoulders, pop
// up into a crouch and stand.
export const tumble: ActionDef = {
	name: 'tumble',
	category: 'pratfall',
	description: 'Forward roll that travels, pops up to standing.',
	frames: 32,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 4, lean: 34, arch: 16, head: -10, legL: [60, 110], legR: [66, 114], armL: [60, 20], armR: [70, 24], squash: 0.94 },
		{ at: 7, lean: 30, arch: 30, head: 34, rot: 40, legL: [100, 140], legR: [96, 136], armL: [70, 100], armR: [60, 104], squash: 1, vx: 30 },
		{ at: 10, rot: 120 },
		{ at: 13, rot: 200 },
		{ at: 16, rot: 280 },
		{ at: 19, lean: 30, arch: 20, head: 0, rot: 350, legL: [70, 124], legR: [76, 128], armL: [60, 40], armR: [70, 44], vx: 22 },
		{ at: 20, rot: 360, puff: true, event: 'land', ease: 'hold', vx: NaN },
		{ at: 21, ...CROUCH, ease: 'out' },
		{ at: 24, lean: 20, arch: 10, head: -16, legL: [44, 80], legR: [50, 84], armL: [110, 20], armR: [130, 20] },
		{ at: 31, ...STAND }
	]
};

// Slip — banana peel: the front foot shoots out, both legs fly up, a beat
// of horizontal hang-time, thud flat on the back.
export const slip: ActionDef = {
	name: 'slip',
	category: 'pratfall',
	description: 'Banana-peel: feet fly up, thud onto the back.',
	frames: 28,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'stand',
	to: 'lie',
	keys: [
		{ at: 0, ...STAND },
		{ at: 3, lean: 6, legR: [30, 4], legL: [-16, 20], armL: [20, 20], armR: [-20, 20] },
		{ at: 5, lean: -12, arch: -6, head: 18, rot: -24, lift: 30, legR: [84, 0], strideR: 1.12, legL: [24, 30], armL: [160, 20], armR: [196, 30], headSquash: 1.12, event: 'contact' },
		{ at: 8, lean: -6, arch: 4, head: 20, rot: -72, lift: 170, legR: [104, 10], strideR: 1, legL: [84, 34], armL: [210, 40], armR: [150, 30] },
		{ at: 11, lean: 0, arch: -2, head: 10, rot: -90, lift: 0, legR: [64, 20], legL: [54, 30], armL: [-30, 10], armR: [30, 10], squash: 0.84, headSquash: 0.86, puff: true, event: 'land' },
		{ at: 14, head: 4, legR: [22, 10], legL: [30, 20], squash: 1, headSquash: 1 },
		{ at: 17, legR: [36, 30], legL: [10, 10] },
		{ at: 27, ...LIE }
	]
};

// Stumble — toe catches, a couple of panicked hop-steps with windmilling
// arms, an overcorrecting lean back, and composure regained.
export const stumble: ActionDef = {
	name: 'stumble',
	category: 'pratfall',
	description: 'Catch a toe, windmill, recover.',
	frames: 34,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 3, lean: 26, arch: -6, head: -18, legR: [10, 20], legL: [-34, 60], armL: [100, 30], armR: [70, 50], headSquash: 1.1, event: 'contact' },
		{ at: 6, lean: 36, arch: 4, head: -10, legR: [42, 12], legL: [-40, 70], armL: [170, 30], armR: [-40, 20], headSquash: 1 },
		{ at: 9, lean: 32, legR: [-20, 30], legL: [42, 20], armL: [230, 30], armR: [40, 40] },
		{ at: 12, lean: 24, legR: [36, 20], legL: [-30, 50], armL: [120, 30], armR: [160, 30] },
		{ at: 16, lean: 4, arch: -4, head: 4, legR: [10, 10], legL: [-12, 20], armL: [90, 10], armR: [100, 14] },
		{ at: 20, lean: -8, arch: -8, head: 10, legR: [6, 6], legL: [-4, 8], armL: [100, 10], armR: [80, 10] },
		{ at: 24, lean: 4, arch: 2, head: -2, armL: [30, 20], armR: [40, 20] },
		{ at: 33, ...STAND }
	]
};

// Faceplant — stiff as a plank: tiny rock back, then timber! Accelerates
// forward, splat with heels kicking up, a dazed beat, push up to a crouch.
export const faceplant: ActionDef = {
	name: 'faceplant',
	category: 'pratfall',
	description: 'Topple forward like a plank, splat, push up to a crouch.',
	frames: 42,
	fps: 24,
	loop: false,
	contacts: 'any',
	from: 'stand',
	to: 'crouch',
	keys: [
		{ at: 0, ...STAND },
		{ at: 3, rot: -5, lean: 0, arch: 0, head: 0, legL: [0, 0], legR: [0, 0], armL: [0, 0], armR: [0, 0] },
		{ at: 7, rot: 8, ease: 'in' },
		{ at: 15, rot: 90, squash: 0.88, headSquash: 0.8, puff: true, event: 'land' },
		{ at: 17, rot: 88, legL: [-36, 50], legR: [-24, 40], armL: [10, 10], armR: [-6, 6], squash: 1, headSquash: 1 },
		{ at: 20, rot: 90, legL: [-2, 4], legR: [0, 2], armL: [0, 0], armR: [0, 0] },
		{ at: 25, head: 10, vx: -34 },
		{ at: 29, rot: 70, lean: 10, arch: 10, head: -10, legL: [40, 90], legR: [30, 80], armL: [80, 40], armR: [90, 40] },
		{ at: 34, rot: 30, lean: 30, arch: 16, head: -20, legL: [70, 130], legR: [64, 124], armL: [50, 30], armR: [60, 40] },
		{ at: 41, ...CROUCH }
	]
};

export const PRATFALL: ActionDef[] = [trip, tumble, slip, stumble, faceplant];
