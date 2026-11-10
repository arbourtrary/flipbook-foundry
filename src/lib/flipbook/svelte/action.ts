import { InlineFigure, getLibrary, type InlineOptions } from '../core';

// `use:figure={{ animate: 'wave' }}` — turn any element into an inline figure.
export function figure(el: HTMLElement, opts: InlineOptions = {}) {
	const f = new InlineFigure(el, opts);
	getLibrary().load([f.character.layer]);
	let last = opts.animate;
	return {
		update(next: InlineOptions) {
			if (next.animate !== undefined && next.animate !== last) {
				last = next.animate;
				f.animate(next.animate);
			}
		},
		destroy() {
			f.destroy();
		}
	};
}
