import type { ActionDef } from '../timeline';
import { LOCOMOTION } from './locomotion';
import { AERIAL } from './aerial';
import { PRATFALL } from './pratfall';
import { TRANSITIONS } from './transitions';
import { IDLE } from './idle';
import { GESTURE } from './gesture';
import { EMOTE } from './emote';
import { INTERACTION } from './interaction';
import { MORE } from './more';
import { PROPS } from './props';

export const ACTIONS: ActionDef[] = [
	...LOCOMOTION,
	...AERIAL,
	...PRATFALL,
	...TRANSITIONS,
	...IDLE,
	...GESTURE,
	...EMOTE,
	...INTERACTION,
	...MORE,
	...PROPS
];
