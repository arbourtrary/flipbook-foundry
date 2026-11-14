// The tab icon is a figure from the font: it stands, and every few seconds
// it turns to face you and waves. Each frame is drawn to a small transparent canvas and
// swapped into the <link rel="icon">. Chrome and Firefox animate it; Safari
// keeps the static icon. The ink follows the system theme, with a thin
// outline in the opposite colour so it still reads when the browser's tab
// bar doesn't match (Firefox ignores media queries on icon links).
import { getLibrary } from 'flipbook-foundry';

const PX = 64;
const FPS = 24; // the authored rate; anything less reads as choppy
const EVERY = 6; // seconds between waves
const STROKE = 1; // px of extra line weight at 64px: just enough to survive 16px
const HALO = 1.5; // px of outline at 64px
const PAD = 2 + STROKE / 2 + HALO; // px kept clear around the ink

const INK = { light: '#0F0F0E', dark: '#F2F2EE' };

export function animateFavicon(link: HTMLLinkElement): () => void {
	const lib = getLibrary();
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = PX;
	const g = canvas.getContext('2d')!;
	const { family, weight } = lib.css('bold');
	const idle = lib.action('idle');
	const wave = lib.action('wave-hello');

	// Fit every frame of the wave, so the figure keeps one size throughout.
	let size = PX;
	let ox = 0;
	let base = PX;
	const fit = () => {
		const ref = 100;
		g.font = `${weight} ${ref}px "${family}"`;
		let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
		for (const ch of [lib.glyph(idle, 0), ...Array.from({ length: wave.frames }, (_, i) => lib.glyph(wave, i))]) {
			const m = g.measureText(ch);
			l = Math.min(l, -m.actualBoundingBoxLeft);
			r = Math.max(r, m.actualBoundingBoxRight);
			t = Math.min(t, -m.actualBoundingBoxAscent);
			b = Math.max(b, m.actualBoundingBoxDescent);
		}
		const k = (PX - PAD * 2) / Math.max(r - l, b - t);
		size = ref * k;
		ox = (PX - (r - l) * k) / 2 - l * k;
		base = PX - PAD - b * k;
	};

	const scheme = matchMedia('(prefers-color-scheme: dark)');
	let current = '';
	const draw = (ch = current) => {
		current = ch;
		const [ink, halo] = scheme.matches ? [INK.dark, INK.light] : [INK.light, INK.dark];
		g.clearRect(0, 0, PX, PX);
		g.font = `${weight} ${size}px "${family}"`;
		g.lineJoin = g.lineCap = 'round';
		// Outline first, then the figure over it. At 16px the font's own
		// strokes are under a pixel, so the figure gets extra weight too.
		g.strokeStyle = halo;
		g.lineWidth = STROKE + HALO * 2;
		g.strokeText(ch, ox, base);
		g.fillStyle = g.strokeStyle = ink;
		g.lineWidth = STROKE;
		g.fillText(ch, ox, base);
		g.strokeText(ch, ox, base);
		link.href = canvas.toDataURL('image/png');
	};
	const retheme = () => current && draw();
	scheme.addEventListener('change', retheme);

	let timer: ReturnType<typeof setTimeout> | undefined;
	let stopped = false;
	const play = () => {
		let f = 0;
		const tick = () => {
			if (stopped) return;
			if (f >= wave.frames) {
				draw(lib.glyph(idle, 0));
				timer = setTimeout(play, EVERY * 1000);
				return;
			}
			draw(lib.glyph(wave, f++));
			timer = setTimeout(tick, 1000 / FPS);
		};
		tick();
	};

	lib.load(['bold']).then(() => {
		if (stopped) return;
		fit();
		draw(lib.glyph(idle, 0));
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setTimeout(play, 1500);
	});
	return () => {
		stopped = true;
		clearTimeout(timer);
		scheme.removeEventListener('change', retheme);
	};
}
