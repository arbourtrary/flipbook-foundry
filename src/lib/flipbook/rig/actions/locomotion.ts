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

export const LOCOMOTION = [walk, run];
