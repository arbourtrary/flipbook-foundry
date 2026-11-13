// The Stick family: Flipbook Foundry's original stick figures.
import manifest from './generated/manifest.js';

export const VERSION = '0.1.0';

/** @type {import('./index.d.ts').Family} */
const stick = {
	id: 'stick',
	manifest,
	anchors: () => import('./generated/anchors.js').then((m) => m.default),
	fontBase: `https://cdn.jsdelivr.net/npm/@flipbook-foundry/stick@${VERSION}/fonts/`
};

export default stick;
