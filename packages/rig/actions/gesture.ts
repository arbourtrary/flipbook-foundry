import { STAND } from '../skeleton';
import type { ActionDef } from '../timeline';

// Arm targets solved for the default build (shoulder-relative):
const BROW: [number, number] = [110, 114]; // fingertips at the brow
const CHIN: [number, number] = [55, 152]; // knuckles under the chin
const FACE: [number, number] = [70, 130]; // palm over the face
const HIP: [number, number] = [-40, 86]; // hand on hip

// Wave — big comic wave: wind down, fling the arm up, three wags with the
// whole body swaying into it, other hand on hip.
export const wave: ActionDef = {
	name: 'wave',
	category: 'gesture',
	description: 'Big, friendly, whole-body wave.',
	frames: 40,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: 4, head: 4, squash: 0.97, armR: [30, 70], armL: [-20, 40] },
		{ at: 10, lean: -6, arch: -8, head: -10, squash: 1.03, armR: [158, 28], armL: HIP, reachR: 1.08, ease: 'snap' },
		{ at: 14, lean: -2, armR: [146, -28], head: -6 },
		{ at: 18, lean: -7, armR: [164, 34], head: -10 },
		{ at: 22, lean: -2, armR: [146, -28], head: -6 },
		{ at: 26, lean: -7, armR: [164, 34], head: -10 },
		{ at: 30, lean: -3, armR: [140, 8], head: -4, squash: 1, reachR: 1 },
		{ at: 39, ...STAND }
	]
};

// Point — cock the arm back, then snap it out long with the body leaning in.
export const point: ActionDef = {
	name: 'point',
	category: 'gesture',
	description: 'Wind back and jab a finger forward, leaning in.',
	frames: 32,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, lean: -6, arch: -4, head: -2, armR: [-30, 100], armL: [-10, 30], squash: 0.98, ease: 'snap' },
		{ at: 10, lean: 16, arch: 4, head: -8, armR: [90, 0], reachR: 1.18, armL: [-40, 20], squash: 1.02, event: 'point' },
		{ at: 13, lean: 13, armR: [92, 2], reachR: 1.12 },
		{ at: 22, lean: 12, armR: [91, 4], reachR: 1.1, head: -6 },
		{ at: 31, ...STAND }
	]
};

// Beckon — "c'mere": arm out, forearm curling in twice, head tilted.
export const beckon: ActionDef = {
	name: 'beckon',
	category: 'gesture',
	description: 'Come-here curl of the arm, head cocked.',
	frames: 24,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: -3, head: 6, armR: [70, 20], armL: HIP },
		{ at: 4, armR: [64, 110], lean: -6, head: 10 },
		{ at: 8, armR: [72, 30], lean: -3, head: 6 },
		{ at: 12, armR: [64, 114], lean: -7, head: 12 },
		{ at: 18, armR: [70, 24], lean: -3, head: 4 }
	]
};

// Shrug — palms up, head sinks and tips, hold the beat, then drop.
export const shrug: ActionDef = {
	name: 'shrug',
	category: 'gesture',
	description: 'Who knows? Palms up, head tipped.',
	frames: 30,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, lean: -8, arch: -12, head: 24, squash: 0.92, armL: [-44, 168], armR: [28, 104], ease: 'snap' },
		{ at: 18, lean: -7, head: 26, squash: 0.93, armL: [-42, 172], armR: [30, 108] },
		{ at: 22, lean: 2, head: 4, squash: 1.01, armL: [-8, 16], armR: [4, 20], ease: 'out' },
		{ at: 29, ...STAND }
	]
};

// Clap — hands meet at chest height, a little bounce on each clap.
export const clap: ActionDef = {
	name: 'clap',
	category: 'gesture',
	description: 'Enthusiastic applause.',
	frames: 16,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 4, head: -6, armL: [36, 124], armR: [56, 14], squash: 1.01 },
		{ at: 4, armL: [54, 72], armR: [56, 68], squash: 0.97, head: 2, event: 'clap', ease: 'out' },
		{ at: 8, armL: [36, 124], armR: [56, 14], squash: 1.01, head: -6 },
		{ at: 12, armL: [54, 72], armR: [56, 68], squash: 0.97, head: 2, event: 'clap', ease: 'out' }
	]
};

// Salute — chest out, hand snaps to the brow, crisp hold, snaps down.
export const salute: ActionDef = {
	name: 'salute',
	category: 'gesture',
	description: 'Snappy military salute.',
	frames: 30,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 4, lean: 2, arch: 2, armR: [40, 80], squash: 0.98, ease: 'snap' },
		{ at: 8, lean: -3, arch: -10, head: -4, armR: BROW, armL: [-2, 0], squash: 1.03 },
		{ at: 20, lean: -3, arch: -10, head: -4, armR: BROW },
		{ at: 24, lean: 0, arch: -4, armR: [6, 10], ease: 'snap' },
		{ at: 29, ...STAND }
	]
};

// Bow — hips back, deep fold with one arm across the belly, the other behind
// the back; rises with a tiny overshoot.
export const bow: ActionDef = {
	name: 'bow',
	category: 'gesture',
	description: 'Deep, theatrical bow.',
	frames: 40,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 6, lean: -4, arch: -6, head: -6, armR: [40, 92], armL: [-50, -10] },
		{ at: 16, lean: 58, arch: 14, head: 22, armR: [52, 100], armL: [-70, -20], legL: [8, 6], legR: [14, 8] },
		{ at: 24, lean: 60, arch: 16, head: 24 },
		{ at: 32, lean: -5, arch: -4, head: -6, armR: [20, 40], armL: [-14, 10], legL: [-3, 2], legR: [4, 4] },
		{ at: 39, ...STAND }
	]
};

// Think — hand to chin, other arm folded under it, slow weight shift and a
// head tilt up as the idea simmers.
export const think: ActionDef = {
	name: 'think',
	category: 'gesture',
	description: 'Hand to chin, pondering.',
	frames: 32,
	fps: 12,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 4, arch: 6, head: -6, armR: CHIN, armL: [34, 104] },
		{ at: 10, lean: 2, head: -14, armR: [57, 150], squash: 1.01 },
		{ at: 18, lean: 6, head: -10, squash: 1 },
		{ at: 26, lean: 5, head: -4, armR: [54, 154], squash: 0.995 }
	]
};

// Facepalm — the head drops INTO the hand, holds, slow disappointed shake.
export const facepalm: ActionDef = {
	name: 'facepalm',
	category: 'gesture',
	description: 'Hand to face. Sigh.',
	frames: 40,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: -4, head: -10, armR: [30, 40] },
		{ at: 10, lean: 14, arch: 12, head: 22, squash: 0.96, armR: FACE, armL: [-6, 20], ease: 'snap', event: 'hit' },
		{ at: 18, lean: 15, arch: 14, head: 18, squash: 0.97 },
		{ at: 23, lean: 15, head: 26 },
		{ at: 28, lean: 14, head: 18 },
		{ at: 33, lean: 6, head: 6, squash: 1, armR: [14, 24] },
		{ at: 39, ...STAND }
	]
};

// Wave hello — turn to face the viewer, give a big overhead wave, turn back.
// The figure has no face, so "facing us" is the symmetric front pose:
// upright, arms flared evenly, feet apart. Arm angles that swing the hand
// over the head read as a side-to-side wave seen from the front.
const FRONT = {
	lean: 0,
	arch: 0,
	head: 0,
	armL: [-24, 10] as [number, number],
	armR: [24, -10] as [number, number],
	legL: [-11, 0] as [number, number],
	legR: [11, 0] as [number, number]
};
export const waveHello: ActionDef = {
	name: 'wave-hello',
	category: 'gesture',
	description: 'Turn to face the viewer, wave overhead, turn back.',
	frames: 64,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	keys: [
		{ at: 0, ...STAND },
		// Turn: a small dip as the weight shifts, feet step apart.
		{ at: 4, lean: 1.5, arch: 1, head: -1, squash: 0.98, armL: [-15, 12], armR: [13, 6], legL: [-8, 2], legR: [8, 3] },
		{ at: 9, ...FRONT, squash: 1 },
		// Wind up and fling the right hand overhead.
		{ at: 13, ...FRONT, squash: 0.98, armR: [60, 60] },
		{ at: 17, ...FRONT, lean: -2, squash: 1.02, armR: [132, 28], reachR: 1.05, ease: 'snap' },
		// Three wags, the body swaying with the hand.
		{ at: 22, ...FRONT, lean: 2, armR: [192, -28], head: 4 },
		{ at: 27, ...FRONT, lean: -2, armR: [132, 28], head: -4 },
		{ at: 32, ...FRONT, lean: 2, armR: [192, -28], head: 4 },
		{ at: 37, ...FRONT, lean: -2, armR: [132, 28], head: -4 },
		{ at: 42, ...FRONT, lean: 1, armR: [180, -20], head: 2, reachR: 1 },
		// Bring it down and hold a beat facing us.
		{ at: 49, ...FRONT },
		{ at: 53, ...FRONT },
		// Turn back to profile.
		{ at: 58, lean: 1.5, arch: 1, head: -1, squash: 0.98, armL: [-15, 12], armR: [13, 6], legL: [-8, 2], legR: [8, 3] },
		{ at: 63, ...STAND }
	]
};

export const GESTURE: ActionDef[] = [wave, point, beckon, shrug, clap, salute, bow, think, facepalm];
