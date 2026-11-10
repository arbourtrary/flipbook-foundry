import type { ActionDef } from '../timeline';
import { mirrorCycle } from './helpers';

// Walk — Richard Williams' four positions per step: contact, down (weight
// lands, body lowest), passing, up (push-off, body highest). The solver
// derives the bob and the root motion from these leg angles alone.
export const walk: ActionDef = {
	name: 'walk',
	category: 'locomotion',
	description: 'An easy, bouncy stroll.',
	frames: 24,
	fps: 24,
	loop: true,
	// Stance thigh sweeps 26° → −22° at an even 4°/frame so the body glides;
	// the push-off leg stretches (heel rise) so the swing foot clears.
	keys: mirrorCycle(
		[
			{
				at: 0,
				lean: 5,
				head: 0,
				arch: 0,
				legR: [26, 4],
				legL: [-22, 12],
				strideR: 1,
				strideL: 1.05,
				armL: [26, 22],
				armR: [-24, 12]
			},
			{
				at: 3,
				lean: 6,
				head: -3,
				arch: 5,
				legR: [14, 11],
				legL: [-12, 36],
				strideL: 1,
				armL: [14, 26],
				armR: [-12, 14]
			},
			{
				at: 6,
				lean: 5,
				head: -1,
				arch: 2,
				legR: [2, 5],
				legL: [6, 58],
				armL: [1, 18],
				armR: [1, 16]
			},
			{
				at: 9,
				lean: 4,
				head: 1,
				arch: -2,
				legR: [-10, 4],
				legL: [24, 34],
				strideR: 1.06,
				armL: [-12, 12],
				armR: [14, 22]
			}
		],
		12
	)
};

// Run — lean into it, elbows locked near 90°, real flight phase. Down frame
// squashes, push-off stretches the support leg long.
export const run: ActionDef = {
	name: 'run',
	category: 'locomotion',
	description: 'Leaning, arm-pumping run with a flight phase.',
	frames: 16,
	fps: 24,
	loop: true,
	keys: mirrorCycle(
		[
			{
				at: 0,
				lean: 16,
				arch: 4,
				head: -8,
				lift: 0,
				legR: [32, 14],
				legL: [-30, 78],
				armL: [42, 88],
				armR: [-46, 84],
				squash: 1
			},
			{
				at: 2,
				lean: 18,
				arch: 8,
				legR: [14, 42],
				legL: [-6, 112],
				armL: [18, 92],
				armR: [-22, 88],
				squash: 0.96
			},
			{
				at: 4,
				lean: 18,
				arch: 2,
				legR: [-26, 8],
				legL: [52, 82],
				armL: [-34, 74],
				armR: [46, 96],
				squash: 1.02
			},
			{
				at: 6,
				lean: 16,
				lift: 46,
				legR: [-34, 54],
				legL: [44, 34],
				armL: [-44, 82],
				armR: [48, 90],
				squash: 1
			}
		],
		8
	)
};

// Jog — a softer run: less lean, low flight, loose arms.
export const jog: ActionDef = {
	name: 'jog',
	category: 'locomotion',
	description: 'Easy jog with a small float between steps.',
	frames: 20,
	fps: 24,
	loop: true,
	keys: mirrorCycle(
		[
			{ at: 0, lean: 9, arch: 4, head: -4, lift: 0, legR: [26, 12], legL: [-24, 64], armL: [30, 80], armR: [-30, 72], squash: 1 },
			{ at: 3, lean: 10, arch: 7, head: -6, legR: [12, 32], legL: [-4, 96], armL: [12, 84], armR: [-14, 76], squash: 0.97 },
			{ at: 5, lean: 10, arch: 3, legR: [-18, 8], legL: [38, 74], armL: [-22, 70], armR: [30, 86], squash: 1.01, strideR: 1.06 },
			{ at: 8, lean: 9, lift: 22, legR: [-26, 44], legL: [34, 30], armL: [-30, 74], armR: [32, 82], squash: 1, strideR: 1 }
		],
		10
	)
};

// Sprint — everything pushed: deep lean, knees driven to the chest, hands
// slicing big arcs. Speed lines off the hands only at peak swing.
export const sprint: ActionDef = {
	name: 'sprint',
	category: 'locomotion',
	description: 'All-out sprint, deep lean and high knees.',
	frames: 12,
	fps: 24,
	loop: true,
	keys: mirrorCycle(
		[
			{ at: 0, lean: 26, arch: 6, head: -16, lift: 0, legR: [38, 18], legL: [-38, 96], armL: [70, 96], armR: [-56, 70], squash: 1 },
			{ at: 2, lean: 28, arch: 10, head: -18, legR: [12, 44], legL: [10, 130], armL: [30, 100], armR: [-26, 80], squash: 0.94 },
			{ at: 3, lean: 28, arch: 4, legR: [-24, 6], legL: [66, 110], armL: [-30, 70], armR: [56, 104], squash: 1, strideR: 1.06 },
			{ at: 5, lean: 26, lift: 64, legR: [-46, 70], legL: [62, 40], armL: [-58, 72], armR: [70, 96], squash: 1, strideR: 1 }
		],
		6
	)
};

// Sneak — the cartoon tiptoe-burglar: hunched, peering, knees lifted high and
// placed with exaggerated care; hands up front with drooping wrists.
export const sneak: ActionDef = {
	name: 'sneak',
	category: 'locomotion',
	description: 'Hunched cartoon sneak, high careful steps.',
	frames: 32,
	fps: 24,
	loop: true,
	keys: mirrorCycle(
		[
			{ at: 0, lean: 20, arch: 18, head: 8, legR: [34, 46], legL: [-22, 56], armL: [54, 96], armR: [36, 104], strideL: 1.08, strideR: 1 },
			{ at: 4, lean: 22, arch: 20, head: 12, legR: [22, 64], legL: [-10, 92], armL: [50, 100], armR: [40, 100], strideL: 1 },
			{ at: 8, lean: 20, arch: 18, head: 10, legR: [6, 52], legL: [64, 118], armL: [44, 104], armR: [48, 96] },
			{ at: 12, lean: 18, arch: 16, head: 6, legR: [-12, 34], legL: [54, 50], armL: [40, 100], armR: [54, 96], strideR: 1.1 }
		],
		16
	)
};

// Tiptoe — upright and dainty: up on the toes (legs stretched), quick
// small steps, elbows tucked with the hands lifted.
export const tiptoe: ActionDef = {
	name: 'tiptoe',
	category: 'locomotion',
	description: 'Dainty, upright tiptoe on stretched legs.',
	frames: 16,
	fps: 24,
	loop: true,
	keys: mirrorCycle(
		[
			{ at: 0, lean: 1, arch: -4, head: -4, legR: [14, 4], legL: [-12, 10], strideR: 1.1, strideL: 1.12, armL: [-22, 96], armR: [-14, 104] },
			{ at: 2, lean: 2, arch: -2, legR: [8, 10], legL: [-4, 40], strideL: 1.04, armL: [-20, 100], armR: [-16, 100] },
			{ at: 4, lean: 1, arch: -4, legR: [0, 6], legL: [18, 56], strideR: 1.12, strideL: 1, armL: [-18, 104], armR: [-18, 96] },
			{ at: 6, lean: 0, arch: -5, legR: [-8, 4], legL: [18, 18], strideR: 1.14, strideL: 1.06, armL: [-16, 100], armR: [-20, 100] }
		],
		8
	)
};

// March — chest out, chin up, knees to the hip, straight-armed swing.
export const march: ActionDef = {
	name: 'march',
	category: 'locomotion',
	description: 'Proud parade march, high knees, stiff arm swing.',
	frames: 24,
	fps: 24,
	loop: true,
	keys: mirrorCycle(
		[
			{ at: 0, lean: -2, arch: -10, head: -8, legR: [24, 4], legL: [-16, 14], armL: [58, 6], armR: [-34, 4], strideL: 1.05 },
			{ at: 3, lean: -1, arch: -10, legR: [14, 10], legL: [10, 70], armL: [38, 6], armR: [-20, 4], strideL: 1 },
			{ at: 6, lean: -2, arch: -12, legR: [2, 4], legL: [76, 84], armL: [4, 4], armR: [6, 4] },
			{ at: 9, lean: -3, arch: -11, legR: [-10, 2], legL: [52, 26], armL: [-30, 4], armR: [44, 6], strideR: 1.06 }
		],
		12
	)
};

// Skip — step, hop on the same foot, swing through to the other. Big
// opposite-arm pumps and a sunny lean back at the top.
export const skip: ActionDef = {
	name: 'skip',
	category: 'locomotion',
	description: 'Happy step-hop skip with big arm pumps.',
	frames: 24,
	fps: 24,
	loop: true,
	keys: mirrorCycle(
		[
			{ at: 0, lean: 6, arch: 2, head: -2, lift: 0, legR: [24, 8], legL: [-24, 34], armL: [30, 50], armR: [-24, 20], squash: 1, strideR: 1 },
			{ at: 2, lean: 8, arch: 6, head: -4, legR: [14, 30], legL: [0, 80], armL: [8, 50], armR: [-4, 30], squash: 0.94 },
			{ at: 3, lean: 4, arch: -2, head: -6, legR: [-4, 6], legL: [60, 96], armL: [-24, 30], armR: [74, 50], squash: 1.04, strideR: 1.1 },
			{ at: 5, lean: -2, arch: -6, head: -8, lift: 52, legR: [-2, 30], legL: [62, 90], armL: [-36, 34], armR: [100, 40], squash: 1, strideR: 1 },
			{ at: 7, lean: 4, arch: 2, head: -2, lift: 0, legR: [4, 22], legL: [56, 84], armL: [-26, 30], armR: [60, 46], squash: 0.96 },
			{ at: 9, lean: 6, arch: 0, legR: [-8, 16], legL: [40, 50], armL: [0, 40], armR: [10, 36], squash: 1 },
			{ at: 10, legR: [-14, 18], legL: [30, 14], strideR: 1.06, armL: [14, 44], armR: [-8, 28] }
		],
		12
	)
};

// Backpedal — the walk played in reverse with a nervous lean back and arms
// held forward. Root motion comes out negative on its own.
export const backpedal: ActionDef = {
	name: 'backpedal',
	category: 'locomotion',
	description: 'Nervous walk backward, arms up in front.',
	frames: 24,
	fps: 24,
	loop: true,
	keys: walk.keys.map((k) => ({
		...k,
		at: (24 - k.at) % 24,
		lean: -6,
		arch: -4,
		head: 6,
		armL: [k.armL![0] * 0.4 + 40, 70],
		armR: [k.armR![0] * 0.4 + 30, 80]
	}))
};

export const LOCOMOTION = [walk, run, jog, sprint, sneak, tiptoe, march, skip, backpedal];
