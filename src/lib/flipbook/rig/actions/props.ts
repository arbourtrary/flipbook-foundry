import { STAND } from '../skeleton';
import type { ActionDef, Key } from '../timeline';
import { mirrorCycle } from './helpers';

// Prop actions: poses designed around a held thing (things.ts). The runtime
// draws a 'forearm' tool along the right forearm with its grip at the hand,
// and hangs a 'hang' thing (the sack) straight down from the hand. So the
// FOREARM angle is the prop: for digging it points down-forward to drive the
// blade into the ground in front of the feet; for the toss it swings up and
// back over the shoulder.

// Dig — raise, drive the blade in (stamp on it), lever back, lift the load
// and pitch it over the shoulder behind. Right hand holds the shovel; the
// left rides along the shaft.
export const dig: ActionDef = {
	name: 'dig',
	category: 'interaction',
	description: 'Shovel in hand: drive, stamp, lever, and pitch the dirt over the shoulder.',
	frames: 32,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		// Ready: shovel held up in front, blade off the ground, weight back.
		{ at: 0, ...STAND, lean: 4, arch: 2, head: -6, armR: [20, 70], armL: [30, 62], legL: [-8, 8], legR: [10, 12], squash: 1 },
		// Anticipation: rise, lift the shovel higher and back toward you.
		{ at: 4, lean: -4, arch: -4, head: -4, armR: [36, 80], armL: [44, 74], legR: [14, 8], squash: 1.03 },
		// Drive: hands snap down to the hips, shaft steep, front foot lifts to stamp.
		{ at: 8, lean: 12, arch: 6, head: -16, armR: [-4, 44], armL: [6, 40], legR: [40, 66], legL: [-8, 8], squash: 1, ease: 'in' },
		// Deepest: stamp down, everything behind the blade.
		{ at: 11, lean: 18, arch: 10, head: -20, armR: [-10, 46], armL: [0, 42], legR: [24, 30], legL: [-8, 8], squash: 0.96, event: 'scoop', puff: true },
		{ at: 14, lean: 16, arch: 8, head: -16, armR: [-8, 46], armL: [2, 42], legR: [22, 28], legL: [-8, 8], squash: 0.98 },
		// Lever back: weight onto the back foot, hands drop and pull, blade comes up loaded.
		{ at: 18, lean: -4, arch: -8, head: -6, armR: [6, 66], armL: [14, 62], legR: [22, 14], legL: [-8, 8], squash: 1 },
		// Lift the load high in front.
		{ at: 21, lean: -6, arch: -12, head: 4, armR: [118, 34], armL: [100, 40], legR: [16, 8], legL: [-8, 8], squash: 1.04 },
		// Pitch it over the shoulder behind.
		{ at: 24, lean: -18, arch: -16, head: 12, armR: [196, 18], armL: [168, 30], legR: [10, 6], legL: [-8, 8], reachR: 1.08, event: 'toss', ease: 'out' },
		// Follow-through, then settle back to ready.
		{ at: 27, lean: -10, arch: -10, head: 6, armR: [178, 34], armL: [150, 40], reachR: 1, squash: 1 },
		{ at: 30, lean: 2, arch: -2, head: -2, armR: [90, 50], armL: [70, 52] }
	]
};

// Scoop — bend and snatch something small off the floor, bring it up to the
// chest, peer at it.
export const scoop: ActionDef = {
	name: 'scoop',
	category: 'interaction',
	description: 'Bend, snatch something off the floor, and peer at it.',
	frames: 28,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		// Spot it: a little rise, eyes down.
		{ at: 5, lean: 8, head: -22, arch: 4, squash: 1.02, armR: [14, 30] },
		// Swoop: deep bend, arm long to the floor in front.
		{ at: 10, lean: 52, arch: 18, head: -14, legL: [60, 108], legR: [72, 122], armR: [26, 4], reachR: 1.14, armL: [-36, 24], squash: 0.95, ease: 'snap' },
		{ at: 12, lean: 54, arch: 20, head: -16, legL: [62, 112], legR: [74, 126], armR: [22, 8], reachR: 1.12, event: 'grab' },
		// Up with it, hand to the chest.
		{ at: 17, lean: 12, arch: 4, head: -10, legL: [-4, 8], legR: [8, 12], armR: [44, 116], reachR: 1, armL: [-10, 16], squash: 1.02 },
		// Peer at the prize: head down and in, a tiny tilt.
		{ at: 21, lean: 8, head: -26, armR: [56, 112] },
		{ at: 24, lean: 6, head: -18, armR: [40, 100] },
		{ at: 27, ...STAND }
	]
};

// Toss-back — fling whatever's in the right hand back over the shoulder.
export const tossBack: ActionDef = {
	name: 'toss-back',
	category: 'interaction',
	description: 'Fling something back over the shoulder without looking.',
	frames: 22,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	trails: ['handR'],
	trailSpeed: 150,
	keys: [
		{ at: 0, ...STAND },
		// Wind down and forward.
		{ at: 5, lean: 16, arch: 8, head: -8, armR: [34, 30], legL: [-4, 14], legR: [10, 20], squash: 0.96, ease: 'in' },
		// Big arc up past the head…
		{ at: 9, lean: 0, arch: -6, head: 0, armR: [140, 18], squash: 1.02 },
		// …and let go behind, leaning into it, glancing back.
		{ at: 12, lean: -14, arch: -14, head: 18, armR: [204, 6], reachR: 1.12, armL: [40, 20], squash: 1.04, event: 'release', ease: 'out' },
		{ at: 15, lean: -8, arch: -8, head: 14, armR: [226, 24], reachR: 1 },
		{ at: 18, lean: 0, head: 4, armR: [40, 30], squash: 1 },
		{ at: 21, ...STAND }
	]
};

// Scoop-toss — snatch it up and pitch it over the shoulder in one motion.
// The workhorse for stealing letters into a sack behind you.
export const scoopToss: ActionDef = {
	name: 'scoop-toss',
	category: 'interaction',
	description: 'Snatch something off the floor and pitch it over the shoulder in one go.',
	frames: 36,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	trails: ['handR'],
	trailSpeed: 150,
	keys: [
		{ at: 0, ...STAND },
		{ at: 5, lean: 10, head: -22, arch: 4, squash: 1.02, armR: [16, 30] },
		{ at: 10, lean: 52, arch: 18, head: -14, legL: [60, 108], legR: [72, 122], armR: [26, 4], reachR: 1.14, armL: [-36, 24], squash: 0.95, ease: 'snap' },
		{ at: 12, lean: 54, arch: 20, head: -16, legL: [62, 112], legR: [74, 126], armR: [22, 8], reachR: 1.12, event: 'grab' },
		// Come up already swinging.
		{ at: 17, lean: 18, arch: 4, head: -4, legL: [-2, 10], legR: [10, 14], armR: [70, 60], reachR: 1, armL: [10, 20], squash: 1 },
		{ at: 21, lean: -2, arch: -8, head: 4, armR: [150, 20], squash: 1.03 },
		{ at: 24, lean: -16, arch: -14, head: 18, armR: [206, 6], reachR: 1.12, armL: [44, 20], squash: 1.04, event: 'release', ease: 'out' },
		{ at: 28, lean: -8, arch: -8, head: 12, armR: [226, 24], reachR: 1 },
		{ at: 31, lean: 2, head: 2, armR: [30, 30], squash: 1 },
		{ at: 35, ...STAND }
	]
};

// Drag — hunched, effortful walk hauling a heavy sack behind. The right arm
// stays locked back and low; the left arm pumps for balance. Built from one
// mirrored step, then the right arm is pinned so the mirror can't swap it.
const DRAG_ARM: [number, number] = [-54, 0];
const dragStep: Key[] = [
	{ at: 0, lean: 30, arch: 14, head: -14, legR: [24, 18], legL: [-26, 24], strideL: 1.06, strideR: 1, armL: [40, 70] },
	{ at: 3, lean: 34, arch: 18, head: -18, legR: [14, 36], legL: [-18, 52], strideL: 1, armL: [30, 80], squash: 0.95 },
	{ at: 7, lean: 32, arch: 16, head: -16, legR: [0, 18], legL: [8, 76], armL: [18, 78], squash: 0.98 },
	{ at: 11, lean: 30, arch: 14, head: -14, legR: [-14, 8], legL: [22, 44], strideR: 1.06, armL: [8, 70], squash: 1 }
];
export const drag: ActionDef = {
	name: 'drag',
	category: 'interaction',
	description: 'Hunched, heavy walk hauling a sack behind.',
	frames: 28,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	keys: mirrorCycle(dragStep, 14).map((k, i) => ({
		...k,
		// Pinned pulling arm, with a small tug on each down step.
		armR: [DRAG_ARM[0] + (i % 4 === 1 ? -4 : 0), DRAG_ARM[1]] as [number, number],
		// Arm locked straight and stretched by the load (~15–19%).
		reachR: i % 4 === 1 ? 1.19 : 1.15
	}))
};

// Sneak-off — the big cartoon tiptoe: knee up to the chin, hold, place the
// toe down slowly, paws up by the face, head swivelling.
export const sneakOff: ActionDef = {
	name: 'sneak-off',
	category: 'locomotion',
	description: 'Big cartoon tiptoe: knee to the chin, hold, toe down, paws up.',
	frames: 32,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	keys: mirrorCycle(
		[
			// Toe down in front, back foot on its toes.
			{ at: 0, lean: 18, arch: 22, head: 6, legR: [30, 20], legL: [-24, 30], strideL: 1.12, strideR: 1.04, armL: [46, 90], armR: [36, 98], squash: 1 },
			// Weight over; back knee starts up.
			{ at: 4, lean: 22, arch: 24, head: -4, legR: [10, 18], legL: [10, 100], strideL: 1, strideR: 1.06, armL: [42, 94], armR: [40, 94], squash: 0.97 },
			// Knee high, freeze — look one way…
			{ at: 8, lean: 16, arch: 22, head: 12, legR: [-2, 10], legL: [86, 134], strideR: 1.1, armL: [52, 86], armR: [40, 98], squash: 1.03, ease: 'hold' },
			// …look the other.
			{ at: 11, lean: 16, arch: 22, head: -12, legR: [-2, 10], legL: [84, 130], strideR: 1.1, armL: [52, 86], armR: [40, 98], squash: 1.03 },
			// Reach the toe out, slowly.
			{ at: 14, lean: 18, arch: 22, head: 2, legR: [-18, 20], legL: [46, 30], strideR: 1.08, armL: [48, 90], armR: [38, 96], squash: 1 }
		],
		16
	)
};

// Peek-out — standing behind a wall to the right: lean the head out past the
// edge, look about, duck back; then try again lower. The wall is drawn over
// the figure, so only what crosses its edge (x ≳ +120) shows.
export const peekOut: ActionDef = {
	name: 'peek-out',
	category: 'gesture',
	description: 'Hiding behind a wall: lean out, look about, duck back, peek again lower.',
	frames: 48,
	fps: 24,
	loop: false,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND },
		// Gather: a little lean back, hands to the wall's edge.
		{ at: 6, lean: -6, arch: -4, head: -4, armR: [70, 40], armL: [54, 50], squash: 0.98 },
		// Out! Head leads round the edge.
		{ at: 12, lean: 38, arch: -10, head: 14, armR: [82, 30], armL: [64, 40], squash: 1.02, event: 'out', ease: 'snap' },
		// Look up the street…
		{ at: 16, lean: 40, head: -10 },
		// …and down.
		{ at: 20, lean: 38, head: 22 },
		{ at: 23, lean: 39, head: 6, ease: 'hold' },
		// Duck back in fast.
		{ at: 26, lean: -4, arch: 2, head: -6, armR: [72, 40], armL: [56, 46], squash: 0.97, event: 'in', ease: 'snap' },
		{ at: 30, lean: 0, head: -2, squash: 1 },
		// Again, lower: knees bent, head out at hip height.
		{ at: 35, lean: 62, arch: 4, head: 20, legL: [32, 80], legR: [44, 84], armR: [96, 20], armL: [70, 40], squash: 0.98, event: 'out', ease: 'snap' },
		{ at: 39, lean: 64, head: 4 },
		// Back in, and relax.
		{ at: 43, lean: 6, arch: 4, head: -4, legL: STAND.legL, legR: STAND.legR, armR: [30, 30], armL: [10, 20], event: 'in' },
		{ at: 47, ...STAND }
	]
};

// Rub-hands — scheming: hunched, hands rubbing at the chest, a little bounce.
export const rubHands: ActionDef = {
	name: 'rub-hands',
	category: 'emote',
	description: 'Scheming villain hand-rub, hunched and bouncing.',
	frames: 16,
	fps: 24,
	loop: true,
	from: 'stand',
	to: 'stand',
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 16, arch: 18, head: -12, legL: [-6, 14], legR: [8, 18], armR: [38, 100], armL: [50, 86], squash: 1 },
		{ at: 2, armR: [42, 94], armL: [46, 92], squash: 0.96, head: -14 },
		{ at: 4, armR: [48, 88], armL: [38, 100], squash: 1, head: -12 },
		{ at: 6, armR: [42, 94], armL: [44, 94] },
		{ at: 8, armR: [36, 102], armL: [52, 84], squash: 0.96, head: -15 },
		{ at: 10, armR: [44, 92], armL: [44, 92], squash: 1, head: -12 },
		{ at: 12, armR: [50, 86], armL: [38, 100] },
		{ at: 14, armR: [42, 96], armL: [46, 90], squash: 0.98 }
	]
};

// Erase — scrub a big letter in front with an eraser (right hand), sweeping
// from overhead down to the knees and back while the left hand braces on
// the letter. The eraser tip sits ~215 units out along the forearm, so the
// stroke covers roughly x 300–480, y 150–820: a letter as tall as the figure.
export const erase: ActionDef = {
	name: 'erase',
	category: 'interaction',
	description: 'Scrub away at something in front with an eraser, overhead down to the knees and back.',
	frames: 20,
	fps: 24,
	loop: true,
	travel: false,
	keys: [
		{ at: 0, ...STAND, lean: 4, head: -4, arch: 2, armR: [148, 14], armL: [78, 12], legL: [-12, 8], legR: [14, 10] },
		{ at: 5, lean: 8, head: -8, armR: [118, 34], armL: [74, 18], event: 'rub' },
		{ at: 10, lean: 24, head: -18, arch: 12, armR: [30, 24], armL: [58, 30], legL: [-2, 46], legR: [30, 56] },
		{ at: 15, lean: 11, head: -9, armR: [82, 8], armL: [72, 20], legL: [-10, 16], legR: [18, 20], event: 'rub' }
	]
};

export const PROPS: ActionDef[] = [dig, scoop, tossBack, scoopToss, drag, sneakOff, peekOut, rubHands, erase];
