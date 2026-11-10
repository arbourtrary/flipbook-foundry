<script lang="ts">
	import { Text, Button, Stack, Row, Rule } from '$lib/ds';
	import {
		figure,
		wrapSvg,
		autoMidJoint,
		applyStretch,
		shoulderPoint,
		hipPoint,
		BASE_ARM_LENGTH,
		BASE_LEG_LENGTH,
		FLOOR_Y,
		type Joints,
		type Pt
	} from '$lib/font/rig';

	interface Props {
		onAddPending: (svgText: string) => void;
	}

	let { onAddPending }: Props = $props();

	const STAND: Joints = {
		head: [500, 220],
		neck: [500, 305],
		hips: [500, 555],
		lhand: [400, 595],
		rhand: [600, 595],
		lfoot: [430, 880],
		rfoot: [570, 880]
	};

	let joints = $state<Joints>(structuredClone(STAND));

	// Auto/explicit state for mid-joints is derived directly from joints so undo
	// restores it without a separate stack.
	let useElbow = $derived({ l: joints.lelbow !== undefined, r: joints.relbow !== undefined });
	let useKnee = $derived({ l: joints.lknee !== undefined, r: joints.rknee !== undefined });

	// ----- history -----

	const MAX_HISTORY = 50;
	let undoStack = $state<Joints[]>([]);
	let redoStack = $state<Joints[]>([]);
	let lastCommitted: Joints = structuredClone(STAND);

	function commit() {
		if (JSON.stringify(joints) === JSON.stringify(lastCommitted)) return;
		undoStack = [...undoStack, lastCommitted].slice(-MAX_HISTORY);
		lastCommitted = structuredClone(joints);
		redoStack = [];
	}

	function undo() {
		commit();
		if (undoStack.length === 0) return;
		const prev = undoStack[undoStack.length - 1];
		undoStack = undoStack.slice(0, -1);
		redoStack = [...redoStack, structuredClone(joints)].slice(-MAX_HISTORY);
		joints = structuredClone(prev);
		lastCommitted = structuredClone(prev);
	}

	function redo() {
		if (redoStack.length === 0) return;
		const next = redoStack[redoStack.length - 1];
		redoStack = redoStack.slice(0, -1);
		undoStack = [...undoStack, structuredClone(joints)].slice(-MAX_HISTORY);
		joints = structuredClone(next);
		lastCommitted = structuredClone(next);
	}

	$effect(() => {
		function onKeyDown(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey;
			if (!mod || e.key.toLowerCase() !== 'z') return;
			const a = document.activeElement as HTMLElement | null;
			if (a && (a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
			if (a && a.tagName === 'INPUT') {
				const type = (a as HTMLInputElement).type;
				// Text-like inputs get native undo; range/checkbox/etc. fall through.
				if (type === 'text' || type === 'email' || type === 'search' || type === 'url' || type === 'tel' || type === 'password' || type === 'number') return;
			}
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});

	const VIEW = 1000;
	let svgEl: SVGSVGElement | undefined = $state();

	let pathD = $derived(figure(joints));
	let svgText = $derived(wrapSvg(pathD));

	// Auto-computed mid-joints, shown faintly when explicit toggles are off.
	let autoJoints = $derived.by(() => {
		const sh = shoulderPoint(joints);
		const hp = hipPoint(joints);
		const stretch = joints.stretch ?? {};
		const lhand = applyStretch(sh, joints.lhand, stretch.larm ?? 1, BASE_ARM_LENGTH);
		const rhand = applyStretch(sh, joints.rhand, stretch.rarm ?? 1, BASE_ARM_LENGTH);
		const lfoot = applyStretch(hp, joints.lfoot, stretch.lleg ?? 1, BASE_LEG_LENGTH);
		const rfoot = applyStretch(hp, joints.rfoot, stretch.rleg ?? 1, BASE_LEG_LENGTH);
		const cx = joints.hips[0];
		return {
			lelbow: autoMidJoint(sh, lhand, BASE_ARM_LENGTH, cx, 'inward'),
			relbow: autoMidJoint(sh, rhand, BASE_ARM_LENGTH, cx, 'inward'),
			lknee: autoMidJoint(hp, lfoot, BASE_LEG_LENGTH, cx, 'outward'),
			rknee: autoMidJoint(hp, rfoot, BASE_LEG_LENGTH, cx, 'outward')
		};
	});

	// ----- handle drag -----

	type JointKey = 'head' | 'neck' | 'hips' | 'lhand' | 'rhand' | 'lfoot' | 'rfoot' | 'lelbow' | 'relbow' | 'lknee' | 'rknee';
	let dragging: JointKey | null = $state(null);

	function screenToView(e: PointerEvent): Pt {
		if (!svgEl) return [500, 500];
		const rect = svgEl.getBoundingClientRect();
		const scale = VIEW / rect.width;
		return [Math.round((e.clientX - rect.left) * scale), Math.round((e.clientY - rect.top) * scale)];
	}

	function startDrag(key: JointKey, e: PointerEvent) {
		e.preventDefault();
		dragging = key;
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}

	function onDragMove(e: PointerEvent) {
		if (!dragging) return;
		const pt = screenToView(e);
		joints = { ...joints, [dragging]: pt };
	}

	function endDrag() {
		if (dragging) {
			dragging = null;
			commit();
		}
	}

	// ----- mid-joint toggles -----

	function toggleElbow(side: 'l' | 'r') {
		const key = `${side}elbow` as 'lelbow' | 'relbow';
		if (joints[key] !== undefined) {
			joints = { ...joints, [key]: undefined };
		} else {
			const auto = side === 'l' ? autoJoints.lelbow : autoJoints.relbow;
			joints = { ...joints, [key]: [auto[0], auto[1]] };
		}
		commit();
	}

	function toggleKnee(side: 'l' | 'r') {
		const key = `${side}knee` as 'lknee' | 'rknee';
		if (joints[key] !== undefined) {
			joints = { ...joints, [key]: undefined };
		} else {
			const auto = side === 'l' ? autoJoints.lknee : autoJoints.rknee;
			joints = { ...joints, [key]: [auto[0], auto[1]] };
		}
		commit();
	}

	// ----- stretch + spineLean -----

	function setStretch(limb: 'larm' | 'rarm' | 'lleg' | 'rleg', value: number) {
		const stretch = { ...(joints.stretch ?? {}), [limb]: value };
		joints = { ...joints, stretch };
	}

	function getStretch(limb: 'larm' | 'rarm' | 'lleg' | 'rleg'): number {
		return joints.stretch?.[limb] ?? 1;
	}

	function setSpineLean(value: number) {
		joints = { ...joints, spineLean: value };
	}

	function getSpineLean(): number {
		return joints.spineLean ?? 0;
	}

	// ----- actions -----

	function reset() {
		joints = structuredClone(STAND);
		commit();
	}

	async function copySvg() {
		await navigator.clipboard.writeText(svgText);
	}

	async function copyJoints() {
		const cleaned = JSON.parse(JSON.stringify(joints));
		await navigator.clipboard.writeText(JSON.stringify(cleaned, null, 2));
	}

	function addPending() {
		onAddPending(svgText);
	}

	// ----- view toggles -----

	let showJoints = $state(true);
	let showGrid = $state(false);
	let showFloor = $state(true);
	let gridStep = $state(100);

	// ----- rotoscoping background -----

	interface BgImage {
		src: string;
		x: number;
		y: number;
		scale: number;
		opacity: number;
	}
	let bg = $state<BgImage | null>(null);
	let bgFileInput: HTMLInputElement | undefined = $state();

	function onBgPick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			bg = { src: reader.result as string, x: 0, y: 0, scale: 1, opacity: 0.4 };
		};
		reader.readAsDataURL(file);
		input.value = '';
	}

	function clearBg() {
		bg = null;
	}

	function setBgOpacity(v: number) {
		if (bg) bg = { ...bg, opacity: v };
	}

	function setBgScale(v: number) {
		if (bg) bg = { ...bg, scale: v };
	}

	let bgDragStart: { mouseX: number; mouseY: number; bgX: number; bgY: number } | null = null;

	function startBgDrag(e: PointerEvent) {
		if (!bg || !svgEl) return;
		e.preventDefault();
		e.stopPropagation();
		bgDragStart = { mouseX: e.clientX, mouseY: e.clientY, bgX: bg.x, bgY: bg.y };
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}

	function onBgDragMove(e: PointerEvent) {
		if (!bgDragStart || !bg || !svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		const k = VIEW / rect.width;
		const dx = (e.clientX - bgDragStart.mouseX) * k;
		const dy = (e.clientY - bgDragStart.mouseY) * k;
		bg = { ...bg, x: bgDragStart.bgX + dx, y: bgDragStart.bgY + dy };
	}

	function endBgDrag() {
		bgDragStart = null;
	}

	function onCanvasPointerMove(e: PointerEvent) {
		if (bgDragStart) onBgDragMove(e);
		else if (dragging) onDragMove(e);
	}

	function onCanvasPointerUp() {
		if (bgDragStart) endBgDrag();
		else if (dragging) endDrag();
	}

	// Grid lines (computed once per step change).
	let gridLines = $derived.by(() => {
		if (!showGrid) return [] as number[];
		const lines: number[] = [];
		for (let v = gridStep; v < VIEW; v += gridStep) lines.push(v);
		return lines;
	});

	// ----- joint render data -----

	type HandleSpec = { key: JointKey; pt: Pt; tone: 'primary' | 'mid' | 'auto'; visible: boolean };

	let handles = $derived<HandleSpec[]>([
		{ key: 'head', pt: joints.head, tone: 'primary', visible: true },
		{ key: 'neck', pt: joints.neck, tone: 'primary', visible: true },
		{ key: 'hips', pt: joints.hips, tone: 'primary', visible: true },
		{ key: 'lhand', pt: joints.lhand, tone: 'primary', visible: true },
		{ key: 'rhand', pt: joints.rhand, tone: 'primary', visible: true },
		{ key: 'lfoot', pt: joints.lfoot, tone: 'primary', visible: true },
		{ key: 'rfoot', pt: joints.rfoot, tone: 'primary', visible: true },
		{ key: 'lelbow', pt: joints.lelbow ?? autoJoints.lelbow, tone: useElbow.l ? 'mid' : 'auto', visible: true },
		{ key: 'relbow', pt: joints.relbow ?? autoJoints.relbow, tone: useElbow.r ? 'mid' : 'auto', visible: true },
		{ key: 'lknee', pt: joints.lknee ?? autoJoints.lknee, tone: useKnee.l ? 'mid' : 'auto', visible: true },
		{ key: 'rknee', pt: joints.rknee ?? autoJoints.rknee, tone: useKnee.r ? 'mid' : 'auto', visible: true }
	]);
</script>

<div class="editor">
	<div class="canvas-pane">
		<svg
			bind:this={svgEl}
			class="canvas"
			viewBox="0 0 {VIEW} {VIEW}"
			xmlns="http://www.w3.org/2000/svg"
			role="application"
			aria-label="Pose rig editor canvas — drag the joint handles to build a pose"
			onpointermove={onCanvasPointerMove}
			onpointerup={onCanvasPointerUp}
			onpointercancel={onCanvasPointerUp}
		>
			{#if bg}
				<image
					href={bg.src}
					x={bg.x}
					y={bg.y}
					width={VIEW * bg.scale}
					height={VIEW * bg.scale}
					opacity={bg.opacity}
					preserveAspectRatio="xMidYMid meet"
					class="bg-image"
					role="img"
					aria-label="Rotoscoping background — drag to reposition"
					onpointerdown={startBgDrag}
				/>
			{/if}
			{#if showGrid}
				<g class="grid" aria-hidden="true">
					{#each gridLines as v (v)}
						<line x1={v} y1={0} x2={v} y2={VIEW} />
						<line x1={0} y1={v} x2={VIEW} y2={v} />
					{/each}
				</g>
			{/if}
			{#if showFloor}
				<line
					class="floor"
					x1={0}
					y1={FLOOR_Y}
					x2={VIEW}
					y2={FLOOR_Y}
					aria-hidden="true"
				/>
			{/if}
			<path d={pathD} fill="var(--ink)" />
			{#if showJoints}
				{#each handles as h (h.key)}
					{#if h.visible}
						{@const isAuto = h.tone === 'auto'}
						{@const r = h.tone === 'primary' ? 16 : 12}
						<g
							class="handle"
							class:auto={isAuto}
							class:active={dragging === h.key}
							onpointerdown={(e) => {
								if (isAuto) return;
								startDrag(h.key, e);
							}}
							role="button"
							tabindex={isAuto ? -1 : 0}
						>
							<rect
								x={h.pt[0] - r}
								y={h.pt[1] - r}
								width={r * 2}
								height={r * 2}
								fill={isAuto ? 'transparent' : 'var(--paper)'}
								stroke="var(--ink)"
								stroke-width={isAuto ? 2 : 3}
								stroke-dasharray={isAuto ? '6 6' : ''}
							/>
						</g>
					{/if}
				{/each}
			{/if}
		</svg>
	</div>

	<div class="controls-pane">
		<Stack gap="6">
			<Stack gap="3">
				<Text variant="mono" color="ink-2">view</Text>
				<Row gap="3" wrap>
					<button class="toggle" class:on={showJoints} onclick={() => (showJoints = !showJoints)}>
						joints {showJoints ? 'on' : 'off'}
					</button>
					<button class="toggle" class:on={showFloor} onclick={() => (showFloor = !showFloor)}>
						floor {showFloor ? 'on' : 'off'}
					</button>
					<button class="toggle" class:on={showGrid} onclick={() => (showGrid = !showGrid)}>
						grid {showGrid ? 'on' : 'off'}
					</button>
				</Row>
				{#if showGrid}
					<Row gap="3" align="center">
						<Text variant="mono" color="ink-2">step</Text>
						<input
							type="range"
							min="20"
							max="250"
							step="10"
							value={gridStep}
							oninput={(e) => (gridStep = Number((e.currentTarget as HTMLInputElement).value))}
							class="slider"
						/>
						<Text variant="mono">{gridStep}</Text>
					</Row>
				{/if}
			</Stack>

			<Rule />

			<Stack gap="3">
				<Row gap="4" justify="between" align="baseline">
					<Text variant="mono" color="ink-2">background</Text>
					{#if bg}
						<button class="link" onclick={clearBg}>clear</button>
					{/if}
				</Row>
				{#if !bg}
					<button class="picker" onclick={() => bgFileInput?.click()}>
						drop or pick image
					</button>
				{:else}
					<Text variant="mono" color="ink-2">drag the image on the canvas to position</Text>
					<Stack gap="2">
						<Row gap="4" justify="between" align="baseline">
							<Text variant="mono">scale</Text>
							<Text variant="mono">{bg.scale.toFixed(2)}</Text>
						</Row>
						<input
							type="range"
							min="0.1"
							max="3"
							step="0.01"
							value={bg.scale}
							oninput={(e) =>
								setBgScale(Number((e.currentTarget as HTMLInputElement).value))}
							class="slider"
						/>
					</Stack>
					<Stack gap="2">
						<Row gap="4" justify="between" align="baseline">
							<Text variant="mono">opacity</Text>
							<Text variant="mono">{bg.opacity.toFixed(2)}</Text>
						</Row>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={bg.opacity}
							oninput={(e) =>
								setBgOpacity(Number((e.currentTarget as HTMLInputElement).value))}
							class="slider"
						/>
					</Stack>
				{/if}
				<input
					bind:this={bgFileInput}
					type="file"
					accept="image/*"
					class="file-input"
					onchange={onBgPick}
				/>
			</Stack>

			<Rule />

			<Stack gap="3">
				<Row gap="4" justify="between" align="baseline">
					<Text variant="mono" color="ink-2">spine lean</Text>
					<Text variant="mono">{getSpineLean().toFixed(0)}°</Text>
				</Row>
				<input
					type="range"
					min="-40"
					max="40"
					step="1"
					value={getSpineLean()}
					oninput={(e) => setSpineLean(Number((e.currentTarget as HTMLInputElement).value))}
					onchange={commit}
					class="slider"
				/>
			</Stack>

			<Rule />

			<Stack gap="4">
				<Text variant="mono" color="ink-2">stretch</Text>
				{#each [['larm', 'left arm'], ['rarm', 'right arm'], ['lleg', 'left leg'], ['rleg', 'right leg']] as [limb, label] (limb)}
					<Stack gap="2">
						<Row gap="4" justify="between" align="baseline">
							<Text variant="mono">{label}</Text>
							<Text variant="mono">{getStretch(limb as 'larm').toFixed(2)}</Text>
						</Row>
						<input
							type="range"
							min="0.7"
							max="1.4"
							step="0.01"
							value={getStretch(limb as 'larm')}
							oninput={(e) =>
								setStretch(
									limb as 'larm',
									Number((e.currentTarget as HTMLInputElement).value)
								)}
							onchange={commit}
							class="slider"
						/>
					</Stack>
				{/each}
			</Stack>

			<Rule />

			<Stack gap="3">
				<Text variant="mono" color="ink-2">mid-joints</Text>
				<Row gap="3" wrap>
					<button class="toggle" class:on={useElbow.l} onclick={() => toggleElbow('l')}>
						l elbow {useElbow.l ? 'explicit' : 'auto'}
					</button>
					<button class="toggle" class:on={useElbow.r} onclick={() => toggleElbow('r')}>
						r elbow {useElbow.r ? 'explicit' : 'auto'}
					</button>
					<button class="toggle" class:on={useKnee.l} onclick={() => toggleKnee('l')}>
						l knee {useKnee.l ? 'explicit' : 'auto'}
					</button>
					<button class="toggle" class:on={useKnee.r} onclick={() => toggleKnee('r')}>
						r knee {useKnee.r ? 'explicit' : 'auto'}
					</button>
				</Row>
			</Stack>

			<Rule />

			<Stack gap="3">
				<Row gap="3" align="center" wrap>
					<button
						class="history-btn"
						onclick={undo}
						disabled={undoStack.length === 0}
						title="Undo (⌘Z)"
					>undo</button>
					<button
						class="history-btn"
						onclick={redo}
						disabled={redoStack.length === 0}
						title="Redo (⌘⇧Z)"
					>redo</button>
					<Text variant="mono" color="ink-2">
						{undoStack.length} · {redoStack.length}
					</Text>
				</Row>
				<Row gap="3" wrap>
					<Button variant="secondary" onclick={reset}>
						{#snippet children()}Reset{/snippet}
					</Button>
					<Button variant="secondary" onclick={copySvg}>
						{#snippet children()}Copy SVG{/snippet}
					</Button>
					<Button variant="secondary" onclick={copyJoints}>
						{#snippet children()}Copy joints{/snippet}
					</Button>
					<Button variant="primary" onclick={addPending}>
						{#snippet children()}Add as pending{/snippet}
					</Button>
				</Row>
			</Stack>
		</Stack>
	</div>
</div>

<style>
	.editor {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		gap: var(--space-8);
		align-items: start;
	}
	@media (max-width: 720px) {
		.editor {
			grid-template-columns: 1fr;
		}
	}
	.canvas-pane {
		border: var(--hairline);
		background: var(--paper);
	}
	.canvas {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1 / 1;
		touch-action: none;
		user-select: none;
	}
	.handle {
		cursor: grab;
	}
	.handle.auto {
		cursor: default;
		pointer-events: none;
	}
	.handle.active {
		cursor: grabbing;
	}
	.controls-pane {
		min-width: 0;
	}
	.slider {
		appearance: none;
		width: 100%;
		height: 1px;
		background: var(--ink);
		outline: none;
	}
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 18px;
		background: var(--ink);
		border-radius: 0;
		cursor: pointer;
	}
	.slider::-moz-range-thumb {
		width: 10px;
		height: 18px;
		background: var(--ink);
		border-radius: 0;
		border: none;
		cursor: pointer;
	}
	.toggle {
		appearance: none;
		background: var(--paper);
		border: 1px solid var(--ink);
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-mono);
		font-size: var(--size-12);
		color: var(--ink);
		cursor: pointer;
	}
	.toggle.on {
		background: var(--ink);
		color: var(--paper);
	}
	.history-btn {
		appearance: none;
		background: var(--paper);
		border: 1px solid var(--ink);
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-mono);
		font-size: var(--size-12);
		color: var(--ink);
		cursor: pointer;
	}
	.history-btn:hover:not(:disabled) {
		background: var(--ink);
		color: var(--paper);
	}
	.history-btn:disabled {
		border-color: var(--ink-2);
		color: var(--ink-2);
		cursor: not-allowed;
	}
	.bg-image {
		cursor: move;
		pointer-events: auto;
	}
	.grid line {
		stroke: var(--ink-2);
		stroke-width: 1;
		opacity: 0.25;
		vector-effect: non-scaling-stroke;
	}
	.floor {
		stroke: var(--ink);
		stroke-width: 2;
		opacity: 0.5;
		vector-effect: non-scaling-stroke;
	}
	.picker {
		appearance: none;
		width: 100%;
		background: var(--paper);
		border: 1px dashed var(--ink);
		padding: var(--space-4);
		font-family: var(--font-mono);
		font-size: var(--size-12);
		color: var(--ink);
		cursor: pointer;
	}
	.picker:hover {
		background: var(--ink);
		color: var(--paper);
	}
	.file-input {
		display: none;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		font-family: var(--font-mono);
		font-size: var(--size-12);
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.link:hover {
		color: var(--accent);
	}
</style>
