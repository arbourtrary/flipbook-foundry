// Inline renderer: a figure that lives in a line of text as a single
// character. Each frame it swaps the element's text to the next glyph —
// no canvas, no SVG, nothing but the font. All inline figures share one
// update and one render pass on the frameloop.

import { Character, type CharacterOptions, type Definition } from './character';
import { frame, cancelFrame } from './frameloop';

const live = new Set<InlineFigure>();

function update(d: { delta: number }) {
	for (const f of live) f.character.update(d.delta);
}
function render() {
	for (const f of live) f.paint();
}

export interface InlineOptions extends CharacterOptions {
	/** Let root motion move the element (translateX). Default false: plays in place. */
	travel?: boolean;
}

export class InlineFigure {
	readonly character: Character;
	readonly el: HTMLElement;
	private travel: boolean;
	private originX = 0;
	private lastGlyph = '';
	private lastTransform = '';

	constructor(el: HTMLElement, opts: InlineOptions = {}) {
		this.el = el;
		this.travel = opts.travel ?? false;
		this.character = new Character({
			...opts,
			transition: { inPlace: !this.travel, ...opts.transition }
		});
		this.originX = this.character.x;
		const { family, weight } = this.character.library.css(this.character.layer);
		el.style.fontFamily = `"${family}"`;
		el.style.fontWeight = String(weight);
		el.style.display ||= 'inline-block';
		el.style.lineHeight ||= '1';
		el.style.fontVariantLigatures = 'none';
		if (opts.size) el.style.fontSize = `${opts.size}px`;
		if (opts.color && opts.color !== 'currentColor') el.style.color = opts.color;
		el.setAttribute('aria-hidden', 'true');
		// Glyphs are private-use codepoints: drawn before their font chunk
		// arrives, they show as the fallback font's hex "missing glyph" box.
		// Stay hidden until this action's chunk has loaded.
		el.style.visibility = 'hidden';
		const c = this.character;
		c.library.load([c.layer], undefined, [c.action.name]).then(() => {
			if (live.has(this)) el.style.visibility = '';
		}, () => {});
		live.add(this);
		if (live.size === 1) {
			frame.update(update, true);
			frame.render(render, true);
		}
		this.paint();
	}

	animate(def: Definition, t?: Parameters<Character['animate']>[1]) {
		return this.character.animate(def, t);
	}

	paint() {
		const c = this.character;
		const g = c.glyph;
		if (g !== this.lastGlyph) {
			this.el.textContent = g;
			this.lastGlyph = g;
		}
		const dx = this.travel ? c.x - this.originX : 0;
		const t = `translateX(${dx.toFixed(1)}px)${c.facing < 0 ? ' scaleX(-1)' : ''}`;
		if (t !== this.lastTransform) {
			this.el.style.transform = t;
			this.lastTransform = t;
		}
	}

	destroy() {
		live.delete(this);
		if (live.size === 0) {
			cancelFrame(update);
			cancelFrame(render);
		}
		this.character.stop();
	}
}

export const mountFigure = (el: HTMLElement, opts?: InlineOptions) => new InlineFigure(el, opts);

// Shared gesture wiring (whileHover / whileTap) for any binding.
export function gestures(
	el: HTMLElement | HTMLCanvasElement,
	c: Character,
	opts: { whileHover?: Definition; whileTap?: Definition; rest: () => Definition | undefined }
) {
	const on = (type: string, fn: (e: Event) => void) => {
		el.addEventListener(type, fn);
		return () => el.removeEventListener(type, fn);
	};
	const back = () => {
		const r = opts.rest();
		if (r !== undefined) c.animate(r);
	};
	const offs: (() => void)[] = [];
	if (opts.whileHover) {
		offs.push(on('pointerenter', () => c.animate(opts.whileHover!)));
		offs.push(on('pointerleave', back));
	}
	if (opts.whileTap) {
		offs.push(on('pointerdown', () => c.animate(opts.whileTap!)));
		offs.push(on('pointerup', () => (opts.whileHover ? c.animate(opts.whileHover) : back())));
	}
	return () => offs.forEach((f) => f());
}
