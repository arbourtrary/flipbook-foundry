import { STAND } from '../skeleton';
import type { ActionDef } from '../timeline';
import { mirrorCycle } from './helpers';

// Interactions are single-figure actions designed to meet something: a
// wall, a letter, another figure. The runtime syncs them through the
// per-frame hand/foot anchors and the `event` markers ('hit', 'grab', …).

const HIP: [number, number] = [-40, 86];

// Push — bent over and driving forward with straight arms at shoulder height.
// Leg heights are matched (front knee deep, back leg long + stretched) so
// both feet stay on the floor at contact; stance thigh sweeps evenly.
export const push: ActionDef = {
	name: 'push',
	category: 'interaction',
	description: 'Leaning hard into something, shoving it forward.',
	frames: 32,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	keys: mirrorCycle(
		[
			{ at: 0, ...STAND, legR: [34, 70], legL: [-38, 4], strideL: 1.06, strideR: 1, lean: 42, arch: 6, head: -16, armL: [94, 14], armR: [90, 18], squash: 1 },
			{ at: 5, legR: [16, 52], legL: [-28, 50], strideL: 1, squash: 0.97, head: -18, armL: [96, 22], armR: [92, 26] },
			{ at: 10, legR: [-8, 30], legL: [16, 84], strideR: 1.03, squash: 1, head: -16, armL: [94, 16], armR: [90, 20] }
		],
		16
	)
};

// Pull — leaning way back, hauling hand over fist, stepping backwards.
// Stance thigh sweeps −24° → +24° so root motion runs negative.
export const pull: ActionDef = {
	name: 'pull',
	category: 'interaction',
	description: 'Leaning back and hauling, stepping backwards.',
	frames: 24,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	keys: mirrorCycle(
		[
			{ at: 0, ...STAND, legL: [-24, 10], strideL: 1.1, legR: [24, 8], strideR: 1, lean: -26, arch: -10, head: 8, armL: [66, 20], armR: [58, 34], squash: 0.97 },
			{ at: 2, legR: [20, 64], strideL: 1.07 },
			{ at: 4, legL: [-8, 16], strideL: 1.03, legR: [12, 70], squash: 1, armL: [72, 4], armR: [64, 10] },
			{ at: 8, legL: [8, 10], strideL: 1, legR: [-10, 60], lean: -28, armL: [70, 8], armR: [62, 16] }
		],
		12
	)
};

// Carry — a laden walk with both hands meeting overhead (draw the cargo at
// handL/handR). Back arched under the load, elbows giving on each down.
export const carry: ActionDef = {
	name: 'carry',
	category: 'interaction',
	description: 'Walking with something held overhead.',
	frames: 28,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	keys: mirrorCycle(
		[
			{ at: 0, ...STAND, lean: 1, arch: -6, head: -4, legR: [24, 4], legL: [-20, 12], strideR: 1, strideL: 1.05, armL: [174, 8], armR: [182, 2], squash: 1 },
			{ at: 4, legR: [12, 14], legL: [-11, 36], strideL: 1, armL: [172, 22], armR: [180, 16], squash: 0.97, head: -2 },
			{ at: 7, legR: [1, 6], legL: [6, 58], armL: [174, 12], armR: [182, 6], squash: 0.99 },
			{ at: 11, legR: [-10, 4], legL: [22, 34], strideR: 1.06, armL: [175, 4], armR: [183, 0], squash: 1.01, head: -5 }
		],
		14
	)
};

// Lift — squat, grab, strain, clean to the chest, dip, jerk it overhead.
// Ends holding the load overhead in carry's pose (tagged 'ends-carrying').
export const lift: ActionDef = {
	name: 'lift',
	category: 'interaction',
	description: 'Squat, grab, and hoist something overhead.',
	next: 'carry',
	frames: 40,
	fps: 24,
	loop: false,
	from: 'stand',
	tags: ['ends-carrying'],
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		{ at: 8, legL: [70, 120], legR: [62, 112], lean: 46, arch: 16, head: 10, armL: [22, 4], armR: [30, 0], squash: 1 },
		{ at: 10, event: 'grab', head: 4 },
		{ at: 15, squash: 0.95, head: -10, lean: 40, armL: [20, 10], armR: [28, 6] },
		{ at: 22, legL: [20, 40], legR: [24, 44], lean: 6, arch: 0, head: -6, armL: [56, 112], armR: [62, 108], squash: 1 },
		{ at: 26, legL: [32, 56], legR: [36, 60], lean: 4, squash: 0.95, ease: 'snap' },
		{ at: 30, legL: [-2, 4], legR: [6, 6], strideL: 1.03, strideR: 1.03, lean: 1, arch: -8, head: -6, armL: [174, 8], armR: [182, 2], reachL: 1.06, reachR: 1.06, squash: 1.04, event: 'lifted' },
		{ at: 39, arch: -6, head: -4, reachL: 1, reachR: 1, strideL: 1, strideR: 1, squash: 1 }
	]
};

// Throw — overhead wind-up, whip through, release, follow-through.
export const throwIt: ActionDef = {
	name: 'throw',
	category: 'interaction',
	description: 'Overhead wind-up and throw.',
	frames: 32,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	trails: ['handR'],
	trailSpeed: 90,
	keys: [
		{ at: 0, ...STAND },
		{ at: 7, lean: -18, arch: -14, head: -10, armR: [204, 50], armL: [80, 10], squash: 0.98 },
		{ at: 10, lean: -6, armR: [176, 24] },
		{ at: 13, lean: 28, arch: 6, head: -4, armR: [90, 0], reachR: 1.15, armL: [-40, 20], squash: 1.03, event: 'release', ease: 'out' },
		{ at: 18, lean: 36, arch: 14, head: 10, armR: [10, 20], reachR: 1, armL: [-60, 20], squash: 0.98 },
		{ at: 24, lean: 8, arch: 4, head: 2, armR: [4, 16], armL: [-14, 12], squash: 1 },
		{ at: 31, ...STAND }
	]
};

// Catch — ready with arms out, the hit drives the arms to the chest and
// the body back, then settle holding it.
export const catchIt: ActionDef = {
	name: 'catch',
	category: 'interaction',
	description: 'Ready, catch, absorb the impact.',
	frames: 28,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, armL: [80, 30], armR: [70, 40], squash: 0.96, lean: 10, legL: [14, 28], legR: [18, 30], head: -6, ease: 'in' },
		{ at: 10, armL: [58, 104], armR: [52, 112], squash: 0.92, lean: -10, arch: -6, head: 6, event: 'catch' },
		{ at: 14, squash: 1, lean: 2, arch: 0, head: -2, armL: [56, 106], armR: [50, 112], legL: [6, 10], legR: [8, 12] },
		{ at: 20, lean: 3, head: 0 },
		{ at: 27, ...STAND }
	]
};

// Kick — chamber the leg back, snap it out long, hold, retract.
export const kick: ActionDef = {
	name: 'kick',
	category: 'interaction',
	description: 'Big wind-up and a long snapping kick.',
	frames: 28,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	trails: ['footR'],
	trailSpeed: 100,
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, legR: [-40, 90], lean: 10, arch: 8, armL: [40, 40], armR: [-30, 30], head: 4, squash: 0.97, ease: 'snap' },
		{ at: 10, legR: [96, 0], strideR: 1.15, lean: -24, arch: -10, head: -6, armL: [-50, 20], armR: [70, 20], squash: 1.02, event: 'hit' },
		{ at: 13, legR: [92, 6], strideR: 1.12 },
		{ at: 18, legR: [50, 90], strideR: 1, lean: -6, arch: 0, armL: [-10, 20], armR: [20, 20], squash: 1 },
		{ at: 23, legR: [10, 10], lean: 2 },
		{ at: 27, ...STAND }
	]
};

// Punch — chamber at the ribs, snap the arm out long, hold, retract.
export const punch: ActionDef = {
	name: 'punch',
	category: 'interaction',
	description: 'Chambered straight punch.',
	frames: 22,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	trails: ['handR'],
	trailSpeed: 90,
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, armR: [-40, 120], armL: [60, 110], lean: -6, head: -4, squash: 0.97, ease: 'snap' },
		{ at: 8, armR: [90, 0], reachR: 1.18, armL: [-20, 90], lean: 18, arch: 4, head: -4, squash: 1.02, event: 'hit' },
		{ at: 11, armR: [90, 2], reachR: 1.15 },
		{ at: 15, armR: [20, 110], reachR: 1, armL: [30, 80], lean: 4, squash: 1 },
		{ at: 21, ...STAND }
	]
};

// High-five — cock the arm, slap high and forward, recoil.
export const highFive: ActionDef = {
	name: 'high-five',
	category: 'interaction',
	description: 'Up high! Slap and recoil.',
	frames: 24,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, armR: [126, 40], lean: -6, head: -6, squash: 0.97, ease: 'snap' },
		{ at: 9, armR: [150, 6], reachR: 1.12, lean: 10, head: -8, squash: 1.03, event: 'hit' },
		{ at: 12, armR: [140, 34], reachR: 1, lean: 4, squash: 1 },
		{ at: 16, armR: [80, 40], head: -2 },
		{ at: 23, ...STAND }
	]
};

// Lean — propped on a wall in front with one straight arm, ankles crossed,
// idly breathing.
export const lean: ActionDef = {
	name: 'lean',
	category: 'interaction',
	description: 'Casually propped against a wall.',
	frames: 32,
	fps: 12,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 18, arch: -4, armR: [104, 2], armL: HIP, legL: [-6, 2], legR: [10, 48], head: -4 },
		{ at: 8, squash: 1.012, head: -6 },
		{ at: 16, squash: 1, head: 2, armL: [-34, 78] },
		{ at: 24, squash: 0.996, head: -2, armL: HIP }
	]
};

// Knock — three raps on a door in front, then lean in to listen.
export const knock: ActionDef = {
	name: 'knock',
	category: 'interaction',
	description: 'Knock-knock-knock, then listen.',
	frames: 30,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, armR: [70, 84], lean: 6, head: -4, ease: 'in' },
		{ at: 8, armR: [78, 38], event: 'hit' },
		{ at: 10, armR: [70, 86], ease: 'in' },
		{ at: 13, armR: [78, 38], event: 'hit' },
		{ at: 15, armR: [70, 86], ease: 'in' },
		{ at: 18, armR: [78, 38], event: 'hit' },
		{ at: 23, armR: [58, 92], head: 12, lean: 12, arch: 6 },
		{ at: 29, ...STAND }
	]
};

export const INTERACTION: ActionDef[] = [push, pull, carry, lift, throwIt, catchIt, kick, punch, highFive, lean, knock];
