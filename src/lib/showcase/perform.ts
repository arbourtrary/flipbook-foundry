// A figure that keeps performing: an entrance, then a run of actions that
// reshuffles every pass with only a short breath at rest in between, so it
// never sits still long enough to look stuck.
import type { Character } from 'flipbook-foundry';

export type Step = string | { action: string; repeat: number };

export interface Performance {
	entrance?: string;
	loop: Step[];
	rest?: string;
	/** Seconds at rest between passes, picked fresh each time. */
	restFor?: [number, number];
}

const name = (s: Step) => (typeof s === 'string' ? s : s.action);

function shuffle(steps: Step[], after?: string): Step[] {
	const out = [...steps];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	// Don't open a pass with the move that just closed the last one.
	if (out.length > 1 && name(out[0]) === after) out.push(out.shift()!);
	return out;
}

/** Starts the show; returns a function that stops it. */
export function perform(get: () => Character | null, p: Performance): () => void {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
	const { entrance, loop, rest = 'idle', restFor = [0.6, 1.4] } = p;
	let live = true;
	const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

	(async () => {
		await wait(0.25);
		if (entrance && get()) await get()!.animate(entrance, { repeat: 0 });
		let steps = loop;
		while (live) {
			for (const step of steps) {
				const c = get();
				if (!live || !c) return;
				const { action, repeat } = typeof step === 'string' ? { action: step, repeat: 0 } : step;
				await c.animate(action, { repeat });
			}
			// Rest loops forever, so start it and move on rather than awaiting it.
			if (live) get()?.animate(rest);
			await wait(restFor[0] + Math.random() * (restFor[1] - restFor[0]));
			steps = shuffle(loop, name(steps[steps.length - 1]));
		}
	})();
	return () => (live = false);
}
