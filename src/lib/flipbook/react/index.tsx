// React bindings. Same vocabulary as framer-motion:
//
//   <FlipbookConfig transition={{ onTwos: true }}>          ~ <MotionConfig>
//     <Stage style={{ height: 400 }}>                       canvas world
//       <Figure animate="run" x={0} y={300} exit="bow" />  ~ <motion.div>
//       <TextFlow text={copy} font="18px Georgia" width={600} lineHeight={26} />
//     </Stage>
//     <p>Hello <Figure animate="wave" whileHover="cheer" /></p>   inline glyph
//   </FlipbookConfig>
//
//   const animate = useAnimate();  animate(ref.current, 'jump')

import {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
	type Ref
} from 'react';
import {
	Character,
	InlineFigure,
	Stage as CoreStage,
	Page as CorePage,
	type PageOptions,
	animate as coreAnimate,
	createTextFlow,
	gestures,
	getLibrary,
	type AnimateOptions,
	type Definition,
	type FrameData,
	type Layer,
	type PlaybackControls,
	type Rect,
	type SequenceStep,
	type Transition,
	type Variants
} from '../core';

export * from '../core';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// ----- config -----

export interface FlipbookConfigProps {
	transition?: Transition;
	layer?: Layer;
	size?: number;
	color?: string;
	reducedMotion?: 'user' | 'always' | 'never';
	children?: ReactNode;
}

const ConfigContext = createContext<Omit<FlipbookConfigProps, 'children'>>({});

export function FlipbookConfig({ children, ...config }: FlipbookConfigProps) {
	const parent = useContext(ConfigContext);
	const value = useMemo(() => ({ ...parent, ...config }), [parent, config.transition, config.layer, config.size, config.color, config.reducedMotion]);
	return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useReducedMotion(): boolean {
	const { reducedMotion = 'user' } = useContext(ConfigContext);
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		if (reducedMotion !== 'user') return setReduced(reducedMotion === 'always');
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		setReduced(mq.matches);
		const on = () => setReduced(mq.matches);
		mq.addEventListener('change', on);
		return () => mq.removeEventListener('change', on);
	}, [reducedMotion]);
	return reduced;
}

// ----- stage -----

class StageHandle {
	stage: CoreStage | null = null;
	private pending: Character[] = [];
	private waiters: ((s: CoreStage) => void)[] = [];
	attach(c: Character) {
		if (this.stage) this.stage.add(c);
		else this.pending.push(c);
	}
	detach(c: Character, exit?: Definition) {
		const i = this.pending.indexOf(c);
		if (i >= 0) this.pending.splice(i, 1);
		else this.stage?.remove(c, exit);
	}
	whenReady(fn: (s: CoreStage) => void) {
		if (this.stage) fn(this.stage);
		else this.waiters.push(fn);
	}
	ready(s: CoreStage) {
		this.stage = s;
		for (const c of this.pending) s.add(c);
		this.pending = [];
		for (const w of this.waiters) w(s);
		this.waiters = [];
	}
}

const StageContext = createContext<StageHandle | null>(null);

export interface StageProps {
	background?: string | null;
	color?: string;
	layers?: Layer[];
	pixelRatio?: number;
	depthSort?: boolean;
	className?: string;
	style?: CSSProperties;
	onReady?: (stage: CoreStage) => void;
	onUpdate?: (data: FrameData, stage: CoreStage) => void;
	onBeforeDraw?: (data: FrameData, stage: CoreStage) => void;
	onAfterDraw?: (data: FrameData, stage: CoreStage) => void;
	onPointerMove?: React.PointerEventHandler<HTMLCanvasElement>;
	onPointerDown?: React.PointerEventHandler<HTMLCanvasElement>;
	children?: ReactNode;
}

export function Stage(props: StageProps) {
	const { background = null, color = 'currentColor', layers = ['regular'], pixelRatio = 2, depthSort = true, className, style, children } = props;
	const canvas = useRef<HTMLCanvasElement>(null);
	const handle = useMemo(() => new StageHandle(), []);
	// Latest callbacks without re-creating the stage.
	const cb = useRef(props);
	cb.current = props;

	useEffect(() => {
		let s: CoreStage | null = null;
		let cancelled = false;
		getLibrary()
			.load(layers)
			.then(() => {
				if (cancelled || !canvas.current) return;
				const resolved = color === 'currentColor' ? getComputedStyle(canvas.current).color : color;
				s = new CoreStage(canvas.current, { background, color: resolved, pixelRatio, depthSort });
				s.onUpdate((d, st) => cb.current.onUpdate?.(d, st));
				s.onBeforeDraw((d, st) => cb.current.onBeforeDraw?.(d, st));
				s.onAfterDraw((d, st) => cb.current.onAfterDraw?.(d, st));
				handle.ready(s);
				cb.current.onReady?.(s);
			});
		return () => {
			cancelled = true;
			s?.destroy();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<StageContext.Provider value={handle}>
			<div className={className} style={{ position: 'relative', ...style }}>
				<canvas
					ref={canvas}
					onPointerMove={props.onPointerMove}
					onPointerDown={props.onPointerDown}
					style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
				/>
				{children}
			</div>
		</StageContext.Provider>
	);
}

/** The enclosing Stage (null until its fonts load). */
export function useStage(): CoreStage | null {
	const handle = useContext(StageContext);
	const [stage, setStage] = useState<CoreStage | null>(handle?.stage ?? null);
	useEffect(() => handle?.whenReady(setStage), [handle]);
	return stage;
}

// ----- figure -----

export interface FigureProps {
	animate?: Definition;
	initial?: Definition | false;
	exit?: Definition;
	variants?: Variants;
	transition?: Transition;
	whileHover?: Definition;
	whileTap?: Definition;
	x?: number;
	y?: number;
	size?: number;
	facing?: 1 | -1;
	layer?: Layer;
	color?: string;
	body?: { char: string; font: string; color?: string };
	travel?: boolean;
	/** Stage only: a thing from the Things font in this figure's hand. */
	holding?: { thing: string; hand?: 'L' | 'R'; behind?: boolean; frame?: number; size?: number };
	className?: string;
	style?: CSSProperties;
	ref?: Ref<Character | null>;
	onAnimationStart?: (action: string) => void;
	onAnimationComplete?: (action: string) => void;
	onEvent?: (event: string, action: string) => void;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
	if (!ref) return;
	if (typeof ref === 'function') ref(value);
	else (ref as { current: T }).current = value;
}

export function Figure(props: FigureProps) {
	const handle = useContext(StageContext);
	const config = useContext(ConfigContext);
	const reduced = useReducedMotion();
	const span = useRef<HTMLSpanElement>(null);
	const charRef = useRef<Character | null>(null);
	const latest = useRef(props);
	latest.current = props;

	const opts = () => {
		const p = latest.current;
		return {
			x: p.x ?? 0,
			y: p.y ?? 0,
			size: p.size ?? config.size ?? (handle ? 32 : undefined),
			facing: p.facing ?? 1,
			layer: p.layer ?? config.layer ?? (p.body ? ('limbs' as Layer) : ('regular' as Layer)),
			color: p.color ?? config.color,
			body: p.body,
			variants: p.variants,
			transition: { ...config.transition, ...p.transition },
			initial: reduced ? (p.animate ?? p.initial) : p.initial,
			animate: reduced ? undefined : p.animate
		};
	};

	useIsoLayoutEffect(() => {
		let inline: InlineFigure | null = null;
		let c: Character;
		if (handle) {
			c = new Character(opts());
			handle.attach(c);
		} else {
			inline = new InlineFigure(span.current!, { ...opts(), travel: latest.current.travel });
			c = inline.character;
			// Just this action's font chunk; others load when first shown.
			getLibrary().load([c.layer], undefined, [c.action.name]);
		}
		charRef.current = c;
		assignRef(latest.current.ref, c);
		const offs: (() => unknown)[] = [
			c.on('start', (e) => latest.current.onAnimationStart?.(e.action)),
			c.on('complete', (e) => latest.current.onAnimationComplete?.(e.action)),
			c.on('frame', (e) => e.event && latest.current.onEvent?.(e.event, e.action))
		];
		const h = latest.current.holding;
		if (handle && h) {
			handle.whenReady((st) => {
				const t = st.addThing({ name: h.thing, frame: h.frame ?? 0, size: h.size ?? c.size });
				st.hold(t, c, h.hand ?? 'R', h.behind);
				offs.push(() => st.removeThing(t));
			});
		}
		if (inline && (props.whileHover || props.whileTap)) {
			offs.push(gestures(span.current!, c, { whileHover: props.whileHover, whileTap: props.whileTap, rest: () => latest.current.animate }));
		}
		return () => {
			offs.forEach((f) => f());
			if (handle) handle.detach(c, latest.current.exit);
			inline?.destroy();
			charRef.current = null;
			assignRef(latest.current.ref, null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handle]);

	// Prop sync — skip the mount pass (the constructor already applied them).
	const mounted = useRef(false);
	const animateKey = typeof props.animate === 'string' ? props.animate : JSON.stringify(props.animate);
	useEffect(() => {
		if (!mounted.current || reduced || props.animate === undefined) return;
		charRef.current?.animate(props.animate);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [animateKey]);
	useEffect(() => {
		const c = charRef.current;
		if (!mounted.current || !c) return;
		if (props.x !== undefined) c.x = props.x;
		if (props.y !== undefined) c.y = props.y;
	}, [props.x, props.y]);
	useEffect(() => {
		const c = charRef.current;
		if (mounted.current && c && props.facing) c.facing = props.facing;
	}, [props.facing]);
	useEffect(() => {
		if (charRef.current && props.variants) charRef.current.variants = props.variants;
	}, [props.variants]);
	useEffect(() => {
		mounted.current = true;
	}, []);

	if (handle) return null;
	return <span ref={span} className={className(props.className)} style={{ display: 'inline-block', lineHeight: 1, userSelect: 'none', ...props.style }} />;
}

const className = (c?: string) => (c ? `flipbook-figure ${c}` : 'flipbook-figure');

// ----- text flow -----

export interface TextFlowProps {
	text: string;
	font: string;
	x?: number;
	y?: number;
	width: number;
	lineHeight: number;
	color?: string;
	avoid?: boolean;
	padding?: number;
	obstacles?: Rect[];
}

export function TextFlow(props: TextFlowProps) {
	const handle = useContext(StageContext);
	if (!handle) throw new Error('[flipbook] <TextFlow> must be inside a <Stage>');
	const latest = useRef(props);
	latest.current = props;
	useEffect(() => {
		let off: (() => void) | null = null;
		let flowRef: { destroy(): void } | null = null;
		let alive = true;
		document.fonts.load(latest.current.font).then(() =>
			handle.whenReady((stage) => {
				if (!alive) return;
				const p = latest.current;
				const flow = createTextFlow({ text: p.text, font: p.font, x: p.x ?? 0, y: p.y ?? 0, width: p.width, lineHeight: p.lineHeight, padding: p.padding });
				flowRef = flow;
				off = stage.onBeforeDraw((_, s) => {
					const q = latest.current;
					Object.assign(flow.options, { x: q.x ?? 0, y: q.y ?? 0, width: q.width, lineHeight: q.lineHeight });
					if (flow.options.text !== q.text) flow.setText(q.text);
					const obs = q.avoid === false ? [] : s.characters.map((c) => c.bounds());
					flow.layout(q.obstacles ? obs.concat(q.obstacles) : obs);
					flow.draw(s.ctx, q.color ?? s.options.color);
				});
			})
		);
		return () => {
			alive = false;
			off?.();
			flowRef?.destroy();
		};
	}, [handle]);
	return null;
}

// ----- hooks -----

/** framer-motion's useAnimate(): an animate() whose animations stop on unmount. */
export function useAnimate() {
	const live = useRef(new Set<PlaybackControls>());
	useEffect(() => {
		const set = live.current;
		return () => set.forEach((c) => c.stop());
	}, []);
	return useMemo(() => {
		function animate(sequence: SequenceStep[]): PlaybackControls;
		function animate(target: Character | Character[], def: Definition, options?: AnimateOptions): PlaybackControls;
		function animate(target: Character | Character[] | SequenceStep[], def?: Definition, options?: AnimateOptions) {
			const c = def === undefined ? coreAnimate(target as SequenceStep[]) : coreAnimate(target as Character | Character[], def, options);
			live.current.add(c);
			c.finished.then(() => live.current.delete(c));
			return c;
		}
		return animate;
	}, []);
}

/** Run game logic every frame on the enclosing Stage. */
export function useStageFrame(fn: (data: FrameData, stage: CoreStage) => void) {
	const stage = useStage();
	const latest = useRef(fn);
	latest.current = fn;
	useEffect(() => {
		if (!stage) return;
		const off = stage.onUpdate((d, s) => latest.current(d, s));
		return () => {
			off();
		};
	}, [stage]);
}

// ----- page -----

export interface PageProps extends Omit<PageOptions, 'library'> {
	className?: string;
	style?: CSSProperties;
}

/** A paragraph laid out by pretext where {action} tokens are stick figures. */
export function Page({ className, style, ...opts }: PageProps) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const key = JSON.stringify(opts);
	useEffect(() => {
		// Page fetches the font chunks its figures need on its own.
		const page = new CorePage(canvas.current!, opts);
		return () => page.destroy();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);
	return <canvas ref={canvas} className={className} style={{ display: 'block', width: '100%', ...style }} />;
}

// ----- things -----

export interface ThingProps {
	name: string;
	frame?: number;
	x?: number;
	y?: number;
	size?: number;
	facing?: 1 | -1;
	layer?: 'back' | 'front';
}

/** A prop or set piece from the Things font, standing on the enclosing Stage. */
export function Thing(props: ThingProps) {
	const handle = useContext(StageContext);
	if (!handle) throw new Error('[flipbook] <Thing> must be inside a <Stage>');
	const ref = useRef<import('../core').Thing | null>(null);
	useEffect(() => {
		let alive = true;
		handle.whenReady((st) => {
			if (!alive) return;
			ref.current = st.addThing({ size: 64, ...props });
		});
		return () => {
			alive = false;
			if (ref.current) handle.stage?.removeThing(ref.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handle, props.name]);
	useEffect(() => {
		if (ref.current) Object.assign(ref.current, props);
	});
	return null;
}
