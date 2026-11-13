import { InlineFigure, type InlineOptions } from '../core';

// `use:figure={{ animate: 'wave' }}` — turn any element into an inline figure.
export function figure(el: HTMLElement, opts: InlineOptions = {}) {
	const f = new InlineFigure(el, opts);
	f.character.library.load([f.character.layer], undefined, [f.character.action.name]);
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
