// A figure family, as the baker sees it. Each family package has a
// family.ts that exports one of these; `npm run build:font <id>` bakes it
// into that package's fonts/ and generated/.
//
// A new look on the same motion needs a new skin (and maybe a build). A new
// feel needs re-timed actions. A new body needs its own skeleton and actions.

import type { ActionDef } from './timeline';
import type { Build, Parts, Pose, Skin } from './skeleton';

export interface LayerConfig {
	/** Runtime layer id: 'regular', 'bold', 'limbs'… */
	id: string;
	style: 'Regular' | 'Bold';
	/** Line weight as a multiple of build.weight. */
	weight: number;
	parts: Parts;
	/** Appended to the family name: '' → "Flipbook Stick", ' Limbs' → "Flipbook Stick Limbs". */
	suffix?: string;
}

export interface FamilyConfig<Thing = unknown> {
	/** Package id and file prefix: 'stick' → @flipbook-foundry/stick, flipbook-stick-regular.woff2. */
	id: string;
	/** Font family name, e.g. 'Flipbook Stick'. */
	name: string;
	build: Build;
	skin: Skin;
	actions: ActionDef[];
	/** Rest poses actions start and end on; loops settle into these. */
	hubs: Record<string, Pose>;
	/** Props, baked into a "<name> Things" font. */
	things?: Thing[];
	layers: LayerConfig[];
	/** Alternate builds for side-by-side review in /lab (`--variant <id>`). */
	variants?: Record<string, { label: string; build: Partial<Build> }>;
}
