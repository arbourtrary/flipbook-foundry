import { STAND } from '../skeleton';
import type { ActionDef } from '../timeline';
import { mirrorCycle } from './helpers';

// Cheer — crouch, spring up into a V, tuck at the apex, land soft, again.
export const cheer: ActionDef = {
	name: 'cheer',
	category: 'emote',
	description: 'Jumping for joy, arms in a V.',
	frames: 20,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, legL: [38, 74], legR: [42, 78], lean: 12, arch: 8, head: 6, armL: [-24, 30], armR: [-14, 40], squash: 0.94, lift: 0 },
		{
			at: 4,
			legL: [-2, 2],
			legR: [4, 4],
			strideL: 1.06,
			strideR: 1.06,
			armL: [158, 10],
			armR: [204, -10],
			reachL: 1.08,
			reachR: 1.08,
			lean: -6,
			arch: -12,
			head: -18,
			squash: 1.07,
			lift: 24
		},
		{ at: 8, legL: [34, 76], legR: [44, 86], strideL: 1, strideR: 1, armL: [166, 2], armR: [196, 0], squash: 1, lift: 96, head: -14 },
		{ at: 12, legL: [32, 62], legR: [38, 66], armL: [146, 24], armR: [192, 12], reachL: 1, reachR: 1, lean: 8, arch: 4, head: 0, squash: 0.93, lift: 0, puff: true, event: 'land' },
		{ at: 16, legL: [12, 22], legR: [16, 26], armL: [40, 60], armR: [60, 50], lean: 4, squash: 1.01 }
	]
};

// Laugh — doubled over holding the belly, shaking, one big head-throw.
export const laugh: ActionDef = {
	name: 'laugh',
	category: 'emote',
	description: 'Doubled over, belly-shaking laughter.',
	frames: 16,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 38, arch: 20, head: -14, armL: [-80, 136], armR: [-68, 128], legL: [16, 28], legR: [22, 32], squash: 1, ease: 'linear' },
		{ at: 2, lean: 44, head: -6, squash: 0.95, ease: 'linear' },
		{ at: 4, lean: 37, head: -16, squash: 1.01, ease: 'linear' },
		{ at: 6, lean: 44, head: -6, squash: 0.95, ease: 'linear' },
		{ at: 9, lean: 24, arch: 6, head: -32, squash: 1.04, armR: [-50, 150] },
		{ at: 12, lean: 42, arch: 20, head: -8, squash: 0.95, armR: [-68, 128], ease: 'linear' },
		{ at: 14, lean: 38, head: -14, squash: 1, ease: 'linear' }
	]
};

// Cry — slumped, face in hands, sobbing in heaves.
export const cry: ActionDef = {
	name: 'cry',
	category: 'emote',
	description: 'Face in hands, sobbing.',
	frames: 24,
	fps: 12,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 22, arch: 24, head: 30, armL: [62, 134], armR: [72, 128], legL: [12, 22], legR: [16, 26], squash: 0.98 },
		{ at: 4, head: 36, lean: 26, squash: 0.95 },
		{ at: 6, head: 22, lean: 18, squash: 1.01 },
		{ at: 10, head: 32, lean: 23, squash: 0.97 },
		{ at: 14, head: 36, lean: 27, squash: 0.94 },
		{ at: 16, head: 24, lean: 19, squash: 1.01 },
		{ at: 20, head: 30, lean: 22, squash: 0.98 }
	]
};

// Panic — high-knee running on the spot, arms windmilling, head thrown back.
export const panic: ActionDef = {
	name: 'panic',
	category: 'emote',
	description: 'Arms flailing, running on the spot.',
	frames: 12,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: mirrorCycle(
		[
			{ at: 0, ...STAND, legR: [72, 104], legL: [-6, 4], armL: [176, 34], armR: [104, -64], lean: -10, arch: -10, head: -22, lift: 8, squash: 1.02 },
			{ at: 3, legR: [28, 46], legL: [12, 30], armL: [126, -44], armR: [192, 40], lift: 18, squash: 1 }
		],
		6
	)
};

// Angry — stomping tantrum: fists rigid at the sides, knee up, STOMP.
export const angry: ActionDef = {
	name: 'angry',
	category: 'emote',
	description: 'Fists clenched, stomping tantrum.',
	frames: 16,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: mirrorCycle(
		[
			{ at: 0, ...STAND, legR: [4, 8], legL: [1, 6], squash: 0.93, lean: 14, arch: 10, head: 16, armL: [-28, 8], armR: [-18, 12], puff: true, event: 'stomp' },
			{ at: 3, squash: 1.02, legR: [4, 10], head: 10 },
			{ at: 5, legL: [64, 98], armL: [-40, 30], armR: [-10, 24], lean: 8, head: 8, squash: 1.01, ease: 'in' }
		],
		8
	)
};

// Dance — a four-beat groove: knees bounce on the beat, disco point,
// arm roll, hands-on-hips shimmy, swing out.
const HIPS: [number, number] = [-40, 86];
export const dance: ActionDef = {
	name: 'dance',
	category: 'emote',
	description: 'Four-beat groove: disco point, arm roll, shimmy.',
	frames: 32,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, legL: [20, 40], legR: [26, 44], squash: 0.96, lean: 8, head: 8, armR: [152, 0], armL: [-34, 10] },
		{ at: 4, legL: [2, 6], legR: [8, 10], squash: 1.02, lean: -4, head: -6, armR: [130, 34], armL: [-20, 40] },
		{ at: 8, legL: [20, 40], legR: [26, 44], squash: 0.96, lean: 10, head: 8, armR: [-34, 10], armL: [152, 0] },
		{ at: 12, legL: [2, 6], legR: [8, 10], squash: 1.02, lean: 0, head: -4, armR: [64, 90], armL: [52, 100] },
		{ at: 16, legL: [20, 40], legR: [26, 44], squash: 0.96, lean: 4, head: 6, armR: [84, 104], armL: [40, 100] },
		{ at: 20, legL: [2, 6], legR: [8, 10], squash: 1.02, lean: -2, head: -2, armR: [24, 118], armL: [100, 80] },
		{ at: 24, legL: [20, 40], legR: [26, 44], squash: 0.96, lean: -8, arch: -8, head: 12, armR: HIPS, armL: HIPS },
		{ at: 26, lean: 6, arch: 4, head: 4 },
		{ at: 28, legL: [2, 6], legR: [8, 10], squash: 1.02, lean: -6, arch: -6, head: -8, armR: [90, 20], armL: [-60, 20] }
	]
};

// Flex — wind up small, SNAP into a double-biceps, pump twice.
export const flex: ActionDef = {
	name: 'flex',
	category: 'emote',
	description: 'Double-biceps pose with pumps.',
	frames: 36,
	fps: 24,
	loop: false,
	travel: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, squash: 0.94, lean: 12, arch: 14, head: 10, armL: [10, 60], armR: [16, 70], ease: 'snap' },
		{ at: 12, armR: [92, 92], armL: [80, 100], arch: -16, lean: -6, head: -12, squash: 1.05 },
		{ at: 17, armR: [98, 114], armL: [86, 120], squash: 1.03 },
		{ at: 21, armR: [92, 90], armL: [80, 98], squash: 1.05 },
		{ at: 25, armR: [98, 114], armL: [86, 120], squash: 1.03 },
		{ at: 35, ...STAND }
	]
};

// Shiver — hunched, arms hugging the body, teeth-chattering jitter.
export const shiver: ActionDef = {
	name: 'shiver',
	category: 'emote',
	description: 'Hunched and hugging, shivering.',
	frames: 8,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 12, arch: 22, head: 16, armL: [24, 140], armR: [34, 132], legL: [14, 30], legR: [18, 34], squash: 1, ease: 'linear' },
		{ at: 2, lean: 9, head: 19, squash: 0.975, ease: 'linear' },
		{ at: 4, lean: 13, head: 14, squash: 1, ease: 'linear' },
		{ at: 6, lean: 9, head: 18, squash: 0.975, ease: 'linear' }
	]
};

// Victory — coil, leap with a fist punched skyward, land yanking it down. YES.
export const victory: ActionDef = {
	name: 'victory',
	category: 'emote',
	description: 'Leaping fist-pump, landing with a YES.',
	frames: 30,
	fps: 24,
	loop: false,
	travel: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, squash: 0.92, legL: [32, 62], legR: [36, 66], lean: 16, arch: 12, armR: [-30, 130], armL: [-10, 40], head: 10, ease: 'snap' },
		{
			at: 10,
			armR: [178, 0],
			reachR: 1.16,
			lift: 50,
			legL: [-8, 20],
			legR: [6, 10],
			strideL: 1.05,
			strideR: 1.05,
			lean: -8,
			arch: -14,
			head: -22,
			squash: 1.08,
			armL: [-34, 20]
		},
		{ at: 14, lift: 0, squash: 0.94, armR: [30, 140], reachR: 1, strideL: 1, strideR: 1, lean: 20, arch: 10, head: 8, legL: [24, 46], legR: [28, 50], puff: true, event: 'land' },
		{ at: 21, squash: 1, armR: [34, 136], lean: 12, head: 2, legL: [8, 14], legR: [12, 16] },
		{ at: 29, ...STAND }
	]
};

export const EMOTE: ActionDef[] = [cheer, laugh, cry, panic, angry, dance, flex, shiver, victory];
