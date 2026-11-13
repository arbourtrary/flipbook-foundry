import { STAND } from '../skeleton';
import type { ActionDef } from '../timeline';
import { HANG, HANG_Y, LIE, PERCH, SIT } from './hubs';

// Hand to brow (shading the eyes), solved for the default build.
const BROW: [number, number] = [110, 114];
// Hands on hips: elbows flared back, forearms folding forward to the pelvis.
const HIP: [number, number] = [-40, 86];

// Idle — breathing plus a slow weight drift. Feet never move; everything
// lives in the spine, head and arms, so the loop can sit under anything.
export const idle: ActionDef = {
	name: 'idle',
	category: 'idle',
	description: 'Breathing, settling weight, alive but still.',
	frames: 32,
	fps: 12,
	loop: true,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 8, lean: 3, arch: -4, head: -3, squash: 1.018, armL: [-8, 12], armR: [4, 17] },
		{ at: 16, lean: 1, arch: 2, head: 2, squash: 0.992, armL: [-5, 8], armR: [8, 12] },
		{ at: 24, lean: 4, arch: 0, head: 0, squash: 1.006, armL: [-7, 14], armR: [5, 18] }
	]
};

// Look around — shade the eyes and peer ahead, then lean back to scan the sky.
export const lookAround: ActionDef = {
	name: 'look-around',
	category: 'idle',
	description: 'Shades the eyes, peers forward, then cranes up.',
	frames: 48,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: -2, head: -4, squash: 0.98, armR: [40, 60] },
		{ at: 11, lean: 14, arch: 8, head: 8, squash: 1.02, armR: BROW, armL: [-14, 20] },
		{ at: 20, lean: 16, arch: 10, head: 10 },
		{ at: 24, lean: 12, head: 4 },
		{ at: 32, lean: -8, arch: -10, head: -22, armR: [118, 110], armL: [-20, 14] },
		{ at: 38, lean: -6, head: -18 },
		{ at: 47, ...STAND }
	]
};

// Tap-foot — hands on hips, the front foot slapping the floor twice, the
// head ticking with each tap.
export const tapFoot: ActionDef = {
	name: 'tap-foot',
	category: 'idle',
	description: 'Hands on hips, impatient foot tapping.',
	frames: 24,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: -3, arch: -4, head: -6, armL: HIP, armR: HIP, legR: [4, 4], squash: 1 },
		{ at: 3, legR: [18, 34], head: -8, ease: 'in' },
		{ at: 6, legR: [4, 4], head: -4, squash: 0.985, ease: 'out' },
		{ at: 9, legR: [16, 30], head: -8, squash: 1, ease: 'in' },
		{ at: 12, legR: [4, 4], head: -4, squash: 0.985 },
		{ at: 18, legR: [4, 4], head: -10, squash: 1, lean: -4 }
	]
};

// Yawn — a little sink, then a huge stretch up onto the toes, arms high,
// head tipped back; drops loose.
export const yawn: ActionDef = {
	name: 'yawn',
	category: 'idle',
	description: 'Big full-body stretch-yawn.',
	frames: 40,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 7, lean: 6, arch: 10, head: 10, squash: 0.96, armL: [10, 30], armR: [16, 36] },
		{
			at: 17,
			lean: -8,
			arch: -14,
			head: -26,
			squash: 1.07,
			headSquash: 1.1,
			armL: [168, 22],
			armR: [192, 14],
			reachL: 1.1,
			reachR: 1.1,
			strideL: 1.04,
			strideR: 1.04
		},
		{ at: 25, lean: -10, arch: -16, head: -28, armL: [172, 18], armR: [196, 12] },
		{
			at: 31,
			lean: 6,
			arch: 8,
			head: 8,
			squash: 0.98,
			headSquash: 1,
			armL: [-10, 10],
			armR: [2, 14],
			reachL: 1,
			reachR: 1,
			strideL: 1,
			strideR: 1
		},
		{ at: 39, ...STAND }
	]
};

// Sleep — flat on the back, one knee up, chest rising and falling.
export const sleep: ActionDef = {
	name: 'sleep',
	category: 'idle',
	description: 'Asleep on the back, slow breathing.',
	frames: 32,
	fps: 12,
	loop: true,
	from: 'lie',
	to: 'lie',
	contacts: 'any',
	travel: false,
	keys: [
		{ at: 0, ...LIE },
		{ at: 6, legL: [26, 50], armR: [40, 70] },
		{ at: 14, arch: -9, head: 0, armR: [46, 74] },
		{ at: 22, arch: -2, head: 8, armR: [40, 70] },
		{ at: 28, legL: [10, 22], armR: [20, 30] }
	]
};

// Fidget — scratches the back of the head, shifts weight, scuffs a foot.
export const fidget: ActionDef = {
	name: 'fidget',
	category: 'idle',
	description: 'Scratches head, shifts weight, scuffs a foot.',
	frames: 40,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, armR: [150, 78], head: 12, lean: 6, arch: 6 },
		{ at: 9, armR: [144, 98], ease: 'linear' },
		{ at: 12, armR: [152, 76], ease: 'linear' },
		{ at: 15, armR: [144, 98], ease: 'linear' },
		{ at: 18, armR: [150, 80], head: 8, arch: 0 },
		{ at: 24, armR: [10, 16], head: -2, lean: 0, legR: [16, 36] },
		{ at: 29, legR: [10, 10], head: 2 },
		{ at: 33, legR: [16, 30] },
		{ at: 39, ...STAND }
	]
};

// Sit-idle — sitting on the floor, swinging one knee, glancing about.
export const sitIdle: ActionDef = {
	name: 'sit-idle',
	category: 'idle',
	description: 'Sitting on the floor, knee bobbing, glancing around.',
	frames: 32,
	fps: 12,
	loop: true,
	from: 'sit',
	to: 'sit',
	contacts: 'any',
	travel: false,
	keys: [
		{ at: 0, ...SIT },
		{ at: 8, legR: [70, 60], head: -6, lean: -2, arch: 6 },
		{ at: 16, legR: [84, 26], head: 6, lean: -6, arch: 10 },
		{ at: 24, legR: [72, 54], head: -2, lean: -3 }
	]
};

// Perch-idle — on a ledge (y = 0), legs swinging out of phase.
export const perchIdle: ActionDef = {
	name: 'perch-idle',
	category: 'idle',
	description: 'Sitting on a ledge, legs dangling and swinging.',
	frames: 24,
	fps: 24,
	loop: true,
	from: 'perch',
	to: 'perch',
	ground: 'free',
	floor: false,
	travel: false,
	keys: [
		{ at: 0, ...PERCH, y: 15 },
		{ at: 6, legL: [86, 44], legR: [74, 118], head: -2, lean: 8 },
		{ at: 12, legL: [84, 112], legR: [76, 56], head: -6, lean: 4 },
		{ at: 18, legL: [82, 60], legR: [78, 116], head: -3, lean: 7 }
	]
};

// Hang-idle — dangling from a ledge at y = 0, legs pendulum-swinging.
export const hangIdle: ActionDef = {
	name: 'hang-idle',
	category: 'idle',
	description: 'Hanging from a ledge by both hands, legs swinging.',
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
		{ at: 8, legL: [24, 30], legR: [32, 44], head: -10 },
		{ at: 16, legL: [2, 14], legR: [10, 24], head: -6 },
		{ at: 24, legL: [-18, 4], legR: [-12, 10], head: -2 }
	]
};

export const IDLE: ActionDef[] = [idle, lookAround, tapFoot, yawn, sleep, fidget, sitIdle, perchIdle, hangIdle];
