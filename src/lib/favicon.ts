// The tab icon is a figure from the font: it stands, and every few seconds
// it backflips. Each frame is drawn to a small canvas and swapped into the
// <link rel="icon">. Chrome and Firefox animate it; Safari keeps whatever
// icon the page loaded with, which is fine.
import { getLibrary } from 'flipbook-foundry';

const PX = 64;
const FPS = 12; // half the authored rate is plenty at 16px
const EVERY = 6; // seconds between flips

export function animateFavicon(link: HTMLLinkElement): () => void {
	const lib = getLibrary();
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = PX;
	const g = canvas.getContext('2d')!;
	const { family, weight } = lib.css('bold');
	const styles = getComputedStyle(document.documentElement);
	const paper = styles.getPropertyValue('--paper').trim() || '#f8f8f4';
	const ink = styles.getPropertyValue('--ink').trim() || '#111';

	const draw = (action: string, frame: number) => {
		g.fillStyle = paper;
		g.beginPath();
		g.roundRect(0, 0, PX, PX, 14);
		g.fill();
		g.fillStyle = ink;
		g.font = `${weight} ${PX * 0.78}px "${family}"`;
		g.textAlign = 'center';
		g.fillText(lib.glyph(lib.action(action), frame), PX / 2, PX * 0.86);
		link.href = canvas.toDataURL('image/png');
	};

	let timer: ReturnType<typeof setTimeout> | undefined;
	let stopped = false;
	const flip = () => {
		const a = lib.action('backflip');
		let f = 0;
		const tick = () => {
			if (stopped) return;
			if (f >= a.frames) {
				draw('idle', 0);
				timer = setTimeout(flip, EVERY * 1000);
				return;
			}
			draw('backflip', f);
			f += 24 / FPS;
			timer = setTimeout(tick, 1000 / FPS);
		};
		tick();
	};

	lib.load(['bold']).then(() => {
		if (stopped) return;
		draw('idle', 0);
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setTimeout(flip, 1500);
	});
	return () => {
		stopped = true;
		clearTimeout(timer);
	};
}
