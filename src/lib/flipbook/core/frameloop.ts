// One requestAnimationFrame for everything, batched into ordered steps —
// the same shape as framer-motion's `frame` / `cancelFrame` / `frameData`.
// Every Character, Stage and inline figure on the page shares this loop, so
// ten thousand figures cost one rAF callback, not ten thousand.

export type FrameCallback = (data: FrameData) => void;

export interface FrameData {
	delta: number; // ms since last frame (clamped)
	timestamp: number; // ms
}

type StepName = 'read' | 'update' | 'render' | 'postRender';
const ORDER: StepName[] = ['read', 'update', 'render', 'postRender'];

const steps: Record<StepName, { keep: Set<FrameCallback>; once: Set<FrameCallback> }> = {
	read: { keep: new Set(), once: new Set() },
	update: { keep: new Set(), once: new Set() },
	render: { keep: new Set(), once: new Set() },
	postRender: { keep: new Set(), once: new Set() }
};

export const frameData: FrameData = { delta: 0, timestamp: 0 };

let rafId: number | null = null;
const hasRaf = () => typeof requestAnimationFrame !== 'undefined';

function tick(now: number) {
	rafId = null;
	frameData.delta = frameData.timestamp ? Math.min(now - frameData.timestamp, 100) : 1000 / 60;
	frameData.timestamp = now;
	for (const name of ORDER) {
		const s = steps[name];
		for (const cb of s.keep) cb(frameData);
		if (s.once.size) {
			const once = [...s.once];
			s.once.clear();
			for (const cb of once) cb(frameData);
		}
	}
	if (alive()) schedule();
	else frameData.timestamp = 0;
}

function alive() {
	for (const name of ORDER) if (steps[name].keep.size || steps[name].once.size) return true;
	return false;
}

function schedule() {
	if (rafId === null && hasRaf()) rafId = requestAnimationFrame(tick);
}

function step(name: StepName) {
	return (cb: FrameCallback, keepAlive = false) => {
		(keepAlive ? steps[name].keep : steps[name].once).add(cb);
		schedule();
		return cb;
	};
}

export const frame = {
	read: step('read'),
	update: step('update'),
	render: step('render'),
	postRender: step('postRender')
};

export function cancelFrame(cb: FrameCallback) {
	for (const name of ORDER) {
		steps[name].keep.delete(cb);
		steps[name].once.delete(cb);
	}
}

export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
