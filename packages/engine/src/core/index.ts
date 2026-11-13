// flipbook — a font-only animation library. Every frame is a glyph.
export { frame, cancelFrame, frameData, type FrameData } from './frameloop';
export {
	createLibrary,
	getLibrary,
	setFontBase,
	setDefaultFamily,
	type Family,
	type Library,
	type ActionInfo,
	type Hub,
	type Layer,
	type AnchorName,
	type ThingInfo,
	type Manifest
} from './library';
export {
	Character,
	createCharacter,
	type CharacterOptions,
	type Transition,
	type Target,
	type Definition,
	type Variants,
	type PlaybackControls
} from './character';
export { Stage, createStage, type StageOptions, type Prop, type Thing, type StageStats } from './stage';
export { animate, stagger, type AnimateOptions, type SequenceStep } from './animate';
export { InlineFigure, mountFigure, gestures, type InlineOptions } from './inline';
export { Page, createPage, plainText, type PageOptions } from './page';
export { createTextFlow, type TextFlow, type TextFlowOptions, type Fragment, type Rect } from './textflow';
export { wander, greet, type Behavior, type WanderOptions, type GreetOptions } from './behavior';
