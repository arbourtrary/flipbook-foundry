// Bake config for the Stick family. Not published; `npm run build:font stick`
// reads it and writes fonts/ and generated/ next to it.
import type { FamilyConfig } from '../rig/family';
import { BUILD, STICK_SKIN } from '../rig/skeleton';
import { ACTIONS } from '../rig/actions/index';
import { THINGS, type ThingDef } from './things';

const family: FamilyConfig<ThingDef> = {
	id: 'stick',
	name: 'Flipbook Stick',
	build: BUILD,
	skin: STICK_SKIN,
	actions: ACTIONS,
	things: THINGS,
	layers: [
		{ id: 'regular', style: 'Regular', weight: 1, parts: 'full' },
		{ id: 'bold', style: 'Bold', weight: 1.55, parts: 'full' },
		{ id: 'limbs', style: 'Regular', weight: 1, parts: 'limbs', suffix: ' Limbs' },
		{ id: 'limbs-bold', style: 'Bold', weight: 1.55, parts: 'limbs', suffix: ' Limbs' }
	],
	variants: {
		a: { label: 'Classic', build: {} },
		b: { label: 'Inspo — small head, fine line', build: { headR: 62, weight: 22, thigh: 180, shin: 176 } },
		c: { label: 'Chunky comic', build: { headR: 96, weight: 40, thigh: 150, shin: 144, torso: 180, upperArm: 116, foreArm: 110 } },
		d: { label: 'Lanky', build: { headR: 60, weight: 24, thigh: 196, shin: 192, torso: 224, upperArm: 146, foreArm: 140 } }
	}
};

export default family;
