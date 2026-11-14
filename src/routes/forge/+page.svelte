<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { Text, Button } from '$lib/ds';
	import { ACTIONS } from '$rig/actions/index';
	import { HUBS } from '$rig/actions/hubs';
	import { bake, sample, type BakedAction, type Ease, type Category, type Hub } from '$rig/timeline';
	import { BUILD, type Build, type Pose, type JointName } from '$rig/skeleton';
	import { toSvgD } from '$rig/geometry';
	import Slider from './Slider.svelte';
	import {
		type Model,
		type EditKey,
		toModel,
		toDef,
		newModel,
		clonePose,
		mirrorSecondHalf,
		solveLimb,
		toLocal,
		shoulderLocal,
		upAngle,
		exportTS,
		loadDrafts,
		saveDraft,
		deleteDraft,
		parseImport
	} from './forge';

	// ----- state -----

	let model: Model = $state(toModel(ACTIONS.find((a) => a.name === 'walk') ?? ACTIONS[0]));
	let source = $state<string>('walk');
	let build: Build = $state({ ...BUILD });
	let frame = $state(0);
	let playing = $state(false);
	let onTwos = $state(false);
	let loopPlay = $state(true);
	let onion = $state(true);
	let world = $state(false);
	let drafts: Record<string, Model> = $state({});
	let panel = $state<null | 'export' | 'import'>(null);
	let exportText = $state('');
	let importText = $state('');
	let importError = $state('');
	let toast = $state('');

	const CATEGORIES: Category[] = ['idle', 'locomotion', 'aerial', 'gesture', 'emote', 'interaction', 'pratfall', 'transition', 'presence'];
	const HUB_NAMES = Object.keys(HUBS) as Hub[];
	const EASES: { id: string; label: string }[] = [
		{ id: '', label: 'spline' },
		{ id: 'linear', label: 'linear' },
		{ id: 'in', label: 'in' },
		{ id: 'out', label: 'out' },
		{ id: 'inOut', label: 'inOut' },
		{ id: 'snap', label: 'snap' },
		{ id: 'hold', label: 'hold' }
	];
	const TRAIL_JOINTS: JointName[] = ['handL', 'handR', 'footL', 'footR', 'head', 'elbowL', 'elbowR', 'kneeL', 'kneeR'];
	const grouped = CATEGORIES.map((c) => [c, ACTIONS.filter((a) => a.category === c)] as const).filter(([, l]) => l.length);

	// ----- derived -----

	const def = $derived(toDef(model));
	const samples = $derived.by(() => {
		try {
			return sample(def);
		} catch {
			return [];
		}
	});
	const baked: BakedAction | null = $derived.by(() => {
		try {
			return bake(def, { build, weight: build.weight });
		} catch (e) {
			console.error(e);
			return null;
		}
	});
	const n = $derived(model.meta.frames);
	const keyIndex = $derived(model.keys.findIndex((k) => k.at === frame));
	const key: EditKey | null = $derived(keyIndex >= 0 ? model.keys[keyIndex] : null);
	const pose: Pose | null = $derived(key ? key.pose : (samples[frame]?.pose ?? null));
	const cur = $derived(baked?.frames[frame] ?? null);
	// Accumulated root motion — where each frame stands in the world.
	const cum = $derived.by(() => {
		const out: number[] = [];
		let x = 0;
		baked?.frames.forEach((f, i) => {
			if (i > 0) x += f.dx;
			out.push(x);
		});
		return out;
	});
	const offsetOf = (i: number) => (world ? (cum[i] ?? 0) - (cum[frame] ?? 0) : 0);
	const stride = $derived(baked && baked.frames.length ? (cum[cum.length - 1] ?? 0) + baked.frames[0].dx : 0);
	const keyAts = $derived(new Set(model.keys.map((k) => k.at)));

	$effect(() => {
		if (frame >= n) frame = Math.max(0, n - 1);
	});

	// ----- editing -----

	function ensureKey(): EditKey {
		if (key) return key;
		const p = clonePose(samples[frame]?.pose ?? HUBS.stand);
		const k: EditKey = { at: frame, pose: p };
		model.keys = [...model.keys, k].sort((a, b) => a.at - b.at);
		return model.keys.find((x) => x.at === frame)!;
	}

	function setField<K extends keyof Pose>(f: K, v: Pose[K]) {
		const k = ensureKey();
		k.pose[f] = v;
	}

	function setLimb(f: 'armL' | 'armR' | 'legL' | 'legR', i: 0 | 1, v: number) {
		const k = ensureKey();
		const pair: [number, number] = [k.pose[f][0], k.pose[f][1]];
		pair[i] = v;
		k.pose[f] = pair;
	}

	function addKey() {
		ensureKey();
		flash(`Key at ${frame}`);
	}

	function removeKey() {
		if (keyIndex < 0) return;
		if (model.keys.length <= 1) return flash('An action needs at least one key');
		model.keys = model.keys.filter((_, i) => i !== keyIndex);
	}

	function duplicateKey() {
		if (!key) return;
		let to = frame + 1;
		while (to < n && keyAts.has(to)) to++;
		if (to >= n) return flash('No free frame after this one');
		model.keys = [...model.keys, { ...$state.snapshot(key), at: to }].sort((a, b) => a.at - b.at);
		frame = to;
	}

	function mirror() {
		model.keys = mirrorSecondHalf($state.snapshot(model) as Model);
		flash('Second half mirrored');
	}

	function setFrames(v: number) {
		const f = Math.max(2, Math.min(240, Math.round(v)));
		const kept = model.keys.filter((k) => k.at < f);
		model.keys = kept.length ? kept : [{ ...model.keys[0], at: 0 }];
		model.meta.frames = f;
	}

	function load(name: string) {
		const a = ACTIONS.find((x) => x.name === name);
		if (!a) return;
		model = toModel(a);
		source = name;
		frame = 0;
		playing = false;
	}

	function loadDraft(name: string) {
		model = structuredClone($state.snapshot(drafts[name]) as Model);
		source = `draft:${name}`;
		frame = 0;
		playing = false;
	}

	function fresh() {
		model = newModel();
		source = 'new';
		frame = 0;
		playing = false;
	}

	function save() {
		if (saveDraft($state.snapshot(model) as Model)) {
			drafts = loadDrafts();
			flash(`Draft "${model.meta.name}" saved`);
		} else flash('Could not save — storage unavailable');
	}

	function removeDraft(name: string) {
		deleteDraft(name);
		drafts = loadDrafts();
	}

	async function openExport() {
		exportText = exportTS($state.snapshot(model) as Model);
		panel = 'export';
		try {
			await navigator.clipboard.writeText(exportText);
			flash('TypeScript copied');
		} catch {
			flash('Select and copy the text below');
		}
	}

	function doImport() {
		try {
			model = parseImport(importText);
			source = 'import';
			frame = 0;
			panel = null;
			importError = '';
		} catch (e) {
			importError = (e as Error).message;
		}
	}

	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	function flash(msg: string) {
		toast = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 1800);
	}

	// ----- playback -----

	onMount(() => {
		drafts = loadDrafts();
		let raf = 0;
		let last = 0;
		let acc = 0;
		const tick = (t: number) => {
			raf = requestAnimationFrame(tick);
			if (!playing) {
				last = t;
				return;
			}
			acc += t - (last || t);
			last = t;
			const ms = 1000 / (model.meta.fps / (onTwos ? 2 : 1));
			while (acc >= ms) {
				acc -= ms;
				if (frame + 1 >= n) {
					if (loopPlay || model.meta.loop) frame = 0;
					else {
						playing = false;
						acc = 0;
					}
				} else frame++;
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	function onKey(e: KeyboardEvent) {
		const t = e.target as HTMLElement;
		if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
		if (e.key === ' ') {
			e.preventDefault();
			playing = !playing;
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			playing = false;
			frame = (frame + 1) % n;
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			playing = false;
			frame = (frame - 1 + n) % n;
		} else if (e.key === 'k' || e.key === 'K') addKey();
		else if (e.key === 'Delete' || e.key === 'Backspace') removeKey();
		else if (e.key === ']') {
			const next = model.keys.find((k) => k.at > frame);
			frame = next ? next.at : model.keys[0].at;
		} else if (e.key === '[') {
			const prev = [...model.keys].reverse().find((k) => k.at < frame);
			frame = prev ? prev.at : model.keys[model.keys.length - 1].at;
		}
	}

	// ----- stage & direct manipulation -----

	let svg: SVGSVGElement | undefined = $state();
	type Handle = 'handL' | 'handR' | 'footL' | 'footR' | 'head' | 'pelvis';
	const HANDLES: Handle[] = ['footL', 'handL', 'pelvis', 'head', 'footR', 'handR'];
	let drag: {
		h: Handle;
		start: [number, number];
		anchor: [number, number];
		pelvis: [number, number];
		pose: Pose;
		alt: boolean;
	} | null = null;
	let dragging = $state<Handle | null>(null);

	function fontPoint(e: PointerEvent): [number, number] {
		const pt = svg!.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const p = pt.matrixTransform(svg!.getScreenCTM()!.inverse());
		return [p.x, -p.y];
	}

	function startDrag(h: Handle, e: PointerEvent) {
		if (!cur) return;
		e.preventDefault();
		e.stopPropagation();
		playing = false;
		const k = ensureKey();
		svg!.setPointerCapture(e.pointerId);
		const a = cur.anchors[h === 'head' ? 'head' : h] as [number, number];
		drag = {
			h,
			start: fontPoint(e),
			anchor: [a[0], a[1]],
			pelvis: [cur.anchors.pelvis[0], cur.anchors.pelvis[1]],
			pose: clonePose($state.snapshot(k.pose) as Pose),
			alt: e.altKey
		};
		dragging = h;
	}

	function moveDrag(e: PointerEvent) {
		if (!drag || !key) return;
		const p = fontPoint(e);
		const f = e.shiftKey ? 0.25 : 1;
		const dx = (p[0] - drag.start[0]) * f;
		const dy = (p[1] - drag.start[1]) * f;
		const target: [number, number] = [drag.anchor[0] + dx, drag.anchor[1] + dy];
		const s = drag.pose;
		const local = toLocal(s, drag.pelvis, target);
		const k = key;
		switch (drag.h) {
			case 'handL':
			case 'handR': {
				const side = drag.h === 'handL' ? 'armL' : 'armR';
				const reach = drag.h === 'handL' ? s.reachL : s.reachR;
				k.pose[side] = solveLimb(shoulderLocal(s, build), local, build.upperArm * reach, build.foreArm * reach, 'arm', s[side]);
				break;
			}
			case 'footL':
			case 'footR': {
				const side = drag.h === 'footL' ? 'legL' : 'legR';
				const stride = drag.h === 'footL' ? s.strideL : s.strideR;
				k.pose[side] = solveLimb([0, 0], local, build.thigh * stride, build.shin * stride, 'leg', s[side]);
				break;
			}
			case 'head': {
				if (drag.alt || e.altKey) {
					const sh = shoulderLocal(s, build);
					k.pose.head = Math.round(upAngle(local[0] - sh[0], local[1] - sh[1]) - s.lean);
				} else {
					// Keep the head's offset from the spine; swing the whole spine.
					const neckAngle = upAngle(local[0], local[1]);
					k.pose.lean = Math.round(neckAngle - s.head * 0.15);
				}
				break;
			}
			case 'pelvis': {
				if ((model.meta.ground ?? 'plant') === 'free') {
					k.pose.x = Math.round(s.x + dx);
					k.pose.y = Math.round(s.y + dy);
				} else {
					k.pose.lift = Math.max(0, Math.round(s.lift + dy));
				}
				break;
			}
		}
	}

	function endDrag(e: PointerEvent) {
		if (!drag) return;
		try {
			svg!.releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}
		drag = null;
		dragging = null;
	}

	// ----- timeline drag (retime keys) -----

	let strip: HTMLDivElement | undefined = $state();
	let keyDrag: { from: number; to: number } | null = $state(null);

	function frameAt(clientX: number) {
		const r = strip!.getBoundingClientRect();
		return Math.max(0, Math.min(n - 1, Math.floor(((clientX - r.left) / r.width) * n)));
	}

	function keyDown(at: number, e: PointerEvent) {
		e.stopPropagation();
		playing = false;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		keyDrag = { from: at, to: at };
		frame = at;
	}

	function keyMove(e: PointerEvent) {
		if (!keyDrag) return;
		keyDrag.to = frameAt(e.clientX);
	}

	function keyUp() {
		if (!keyDrag) return;
		const { from, to } = keyDrag;
		keyDrag = null;
		if (from === to) return;
		if (keyAts.has(to)) return flash(`Frame ${to} already has a key`);
		const k = model.keys.find((x) => x.at === from);
		if (!k) return;
		k.at = to;
		model.keys = [...model.keys].sort((a, b) => a.at - b.at);
		frame = to;
	}

	// ----- view helpers -----

	// Fit the whole action (jumps, hangs below a ledge) with a stable minimum
	// frame so ordinary actions keep the same scale.
	const VB = $derived.by(() => {
		let top = 1000;
		let bottom = -150;
		for (const f of baked?.frames ?? []) {
			const a = f.anchors;
			top = Math.max(top, a.top[1] + 120);
			for (const k of ['footL', 'footR', 'handL', 'handR', 'pelvis'] as const) bottom = Math.min(bottom, a[k][1] - 140);
		}
		const h = top - bottom;
		const w = Math.max(1800, h * 1.1);
		return { x: -w / 2, y: -top, w, h };
	});
	const tickXs = $derived.by(() => {
		const o = world ? (cum[frame] ?? 0) : 0;
		const xs: number[] = [];
		const startK = Math.floor((VB.x + o) / 200);
		for (let k = startK; k * 200 - o < VB.x + VB.w; k++) xs.push(k * 200 - o);
		return xs;
	});
	const onionFrames = $derived.by(() => {
		if (!onion || !baked) return [];
		const out: { i: number; d: number; shift: number }[] = [];
		for (const d of [-2, -1, 1, 2]) {
			let i = frame + d;
			if (model.meta.loop) i = (i + n) % n;
			if (i < 0 || i >= n || i === frame) continue;
			// Across the loop seam the neighbour belongs to the previous/next
			// cycle, a whole stride away in the world.
			const wrap = d < 0 && i > frame ? -1 : d > 0 && i < frame ? 1 : 0;
			out.push({ i, d, shift: wrap * stride });
		}
		return out;
	});
	const planted = $derived.by(() => {
		if (!world || !baked) return [];
		const out: { x: number; y: number; side: 'L' | 'R' }[] = [];
		baked.frames.forEach((f, i) => {
			for (const side of ['L', 'R'] as const) {
				const a = f.anchors[`foot${side}`];
				if (a[1] < build.weight * 0.75) out.push({ x: offsetOf(i) + a[0], y: -a[1], side });
			}
		});
		return out;
	});
	const ink = $derived(baked ? baked.frames.map((f) => toSvgD(f.contours, 0, 0)) : []);

	function fmt(n: number) {
		return Math.round(n * 10) / 10;
	}
</script>

<svelte:head>
	<title>Forge — Flipbook Foundry</title>
	<meta name="description" content="Build a new stick-figure action from keyframes in the browser and copy it out as TypeScript." />
	<meta property="og:title" content="Forge — Flipbook Foundry" />
	<meta property="og:description" content="Build a new stick-figure action from keyframes in the browser and copy it out as TypeScript." />
</svelte:head>

<svelte:window onkeydown={onKey} />

<div class="forge">
	<!-- left: actions -->
	<aside class="col left">
		<header class="head">
			<a href="{base}/" class="mark">Flipbook Foundry</a>
			<Text variant="subheading">Forge</Text>
		</header>
		<div class="tools">
			<Button variant="primary" onclick={fresh}>New action</Button>
		</div>
		<nav class="list">
			{#if Object.keys(drafts).length}
				<div class="group">
					<div class="cat">drafts</div>
					{#each Object.keys(drafts) as d (d)}
						<div class="item-row">
							<button class="item" class:on={source === `draft:${d}`} onclick={() => loadDraft(d)}>{d}</button>
							<button class="x" title="Delete draft" onclick={() => removeDraft(d)}>×</button>
						</div>
					{/each}
				</div>
			{/if}
			{#each grouped as [cat, list] (cat)}
				<div class="group">
					<div class="cat">{cat}</div>
					{#each list as a (a.name)}
						<button class="item" class:on={source === a.name} onclick={() => load(a.name)}>
							<span>{a.name}</span><span class="dim">{a.frames}</span>
						</button>
					{/each}
				</div>
			{/each}
		</nav>
	</aside>

	<!-- centre: stage + timeline -->
	<main class="col mid">
		<div class="bar">
			<div class="title">
				<strong>{model.meta.name}</strong>
				<span class="dim mono">{model.meta.category} · {n}f @ {model.meta.fps}fps · {model.meta.loop ? 'loop' : `${model.meta.from ?? 'stand'}→${model.meta.to ?? model.meta.from ?? 'stand'}`}</span>
			</div>
			<div class="toggles mono">
				<label><input type="checkbox" bind:checked={onion} /> onion</label>
				<label><input type="checkbox" bind:checked={world} /> world track</label>
			</div>
		</div>

		<div class="stage">
			<svg
				bind:this={svg}
				viewBox="{VB.x} {VB.y} {VB.w} {VB.h}"
				preserveAspectRatio="xMidYMid meet"
				onpointermove={moveDrag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				role="application"
				aria-label="Pose editor stage"
			>
				<!-- ground -->
				<line x1={VB.x} x2={VB.x + VB.w} y1="0" y2="0" class="ground" />
				{#each tickXs as tx (tx)}
					<line x1={tx} x2={tx} y1="0" y2="18" class="tick" />
				{/each}

				{#each onionFrames as o (o.i)}
					<path d={ink[o.i]} transform="translate({offsetOf(o.i) + (world ? o.shift : 0)} 0)" class="onion" class:before={o.d < 0} opacity={o.d === -1 || o.d === 1 ? 0.22 : 0.1} />
				{/each}

				{#if world}
					{#each planted as p, i (i)}
						<circle cx={p.x} cy={p.y + 4} r="7" class="plant" class:r={p.side === 'R'} />
					{/each}
				{/if}

				{#if ink[frame]}
					<path d={ink[frame]} class="figure" />
				{/if}

				{#if cur && !playing}
					{#each HANDLES as h (h)}
						{@const a = cur.anchors[h]}
						{#if h === 'pelvis'}
							<rect
								x={a[0] - 16}
								y={-a[1] - 16}
								width="32"
								height="32"
								transform="rotate(45 {a[0]} {-a[1]})"
								class="handle"
								class:ghost={!key}
								class:active={dragging === h}
								onpointerdown={(e) => startDrag(h, e)}
								role="button"
								tabindex="-1"
								aria-label={h}
							/>
						{:else if h === 'head'}
							<rect
								x={a[0] - 18}
								y={-a[1] - 18}
								width="36"
								height="36"
								class="handle"
								class:ghost={!key}
								class:active={dragging === h}
								onpointerdown={(e) => startDrag(h, e)}
								role="button"
								tabindex="-1"
								aria-label={h}
							/>
						{:else}
							<circle
								cx={a[0]}
								cy={-a[1]}
								r="20"
								class="handle"
								class:near={h.endsWith('R')}
								class:ghost={!key}
								class:active={dragging === h}
								onpointerdown={(e) => startDrag(h, e)}
								role="button"
								tabindex="-1"
								aria-label={h}
							/>
						{/if}
					{/each}
				{/if}
			</svg>
			<div class="legend mono dim">
				drag handles · shift = fine · alt+head = nod only · filled = near limbs
			</div>
			{#if toast}<div class="toast mono">{toast}</div>{/if}
		</div>

		<div class="transport">
			<button class="tb" onclick={() => (playing = !playing)} title="Space">{playing ? 'Pause' : 'Play'}</button>
			<button class="tb" onclick={() => { playing = false; frame = (frame - 1 + n) % n; }} title="←">‹</button>
			<button class="tb" onclick={() => { playing = false; frame = (frame + 1) % n; }} title="→">›</button>
			<span class="mono readout">
				{String(frame).padStart(2, '0')} / {n - 1}
				{#if cur}· dx {fmt(cur.dx)} · air {Math.round(cur.air)}{/if}
				{#if cur?.event}· <span class="accent">{cur.event}</span>{/if}
			</span>
			<span class="spacer"></span>
			<label class="mono"><input type="checkbox" bind:checked={onTwos} /> on twos</label>
			<label class="mono"><input type="checkbox" bind:checked={loopPlay} /> loop</label>
			<button class="tb" onclick={addKey} title="K">+ Key</button>
			<button class="tb" onclick={duplicateKey} disabled={!key}>Duplicate</button>
			<button class="tb" onclick={removeKey} disabled={!key} title="Delete">Delete</button>
			<button class="tb" onclick={mirror} title="Mirror first half into second half (L↔R)">Mirror cycle</button>
		</div>

		<div
			class="strip"
			bind:this={strip}
			style="grid-template-columns: repeat({n}, 1fr)"
			onpointermove={keyMove}
			onpointerup={keyUp}
			role="slider"
			aria-valuenow={frame}
			aria-valuemin={0}
			aria-valuemax={n - 1}
			tabindex="0"
		>
			{#each Array(n) as _, i (i)}
				<button
					class="cell"
					class:cur={i === frame}
					class:drop={keyDrag && keyDrag.to === i && keyDrag.from !== i}
					onpointerdown={() => {
						playing = false;
						frame = i;
					}}
					aria-label="Frame {i}"
				>
					{#if keyAts.has(i)}
						<span
							class="key"
							class:moving={keyDrag?.from === i}
							onpointerdown={(e) => keyDown(i, e)}
							role="button"
							tabindex="-1"
							aria-label="Key at {i}"
						></span>
					{/if}
					{#if baked?.frames[i]?.event}<span class="ev"></span>{/if}
					{#if i % 4 === 0}<span class="num">{i}</span>{/if}
				</button>
			{/each}
		</div>
	</main>

	<!-- right: inspector -->
	<aside class="col right">
		<section class="sec">
			<div class="sec-h">
				<strong>{key ? `Key · frame ${frame}` : `Frame ${frame}`}</strong>
				<span class="dim mono">{key ? '' : 'interpolated — edits add a key'}</span>
			</div>
			{#if pose}
				<div class="sliders">
					<Slider label="lean" value={pose.lean} min={-90} max={90} onchange={(v) => setField('lean', v)} />
					<Slider label="arch" value={pose.arch} min={-60} max={60} onchange={(v) => setField('arch', v)} />
					<Slider label="head" value={pose.head} min={-90} max={90} onchange={(v) => setField('head', v)} />
					<Slider label="rot" value={pose.rot} min={-400} max={400} onchange={(v) => setField('rot', v)} />
					<Slider label="lift" value={pose.lift} min={-100} max={800} onchange={(v) => setField('lift', v)} />
					<Slider label="x" value={pose.x} min={-1000} max={1000} onchange={(v) => setField('x', v)} />
					<Slider label="y" value={pose.y} min={-1000} max={1000} onchange={(v) => setField('y', v)} />
				</div>
				<div class="sub">limbs <span class="dim">[upper°, bend°]</span></div>
				<div class="sliders">
					{#each [['armL', 'arm L'], ['armR', 'arm R'], ['legL', 'leg L'], ['legR', 'leg R']] as [f, label] (f)}
						{@const field = f as 'armL' | 'armR' | 'legL' | 'legR'}
						<Slider label="{label} ↑" value={pose[field][0]} min={-200} max={200} onchange={(v) => setLimb(field, 0, v)} />
						<Slider label="{label} ∠" value={pose[field][1]} min={-180} max={180} onchange={(v) => setLimb(field, 1, v)} />
					{/each}
				</div>
				<div class="sub">squash &amp; reach</div>
				<div class="sliders">
					<Slider label="squash" value={pose.squash} min={0.5} max={1.5} step={0.01} onchange={(v) => setField('squash', v)} />
					<Slider label="headSquash" value={pose.headSquash} min={0.5} max={1.5} step={0.01} onchange={(v) => setField('headSquash', v)} />
					<Slider label="reachL" value={pose.reachL} min={0.5} max={1.6} step={0.01} onchange={(v) => setField('reachL', v)} />
					<Slider label="reachR" value={pose.reachR} min={0.5} max={1.6} step={0.01} onchange={(v) => setField('reachR', v)} />
					<Slider label="strideL" value={pose.strideL} min={0.5} max={1.6} step={0.01} onchange={(v) => setField('strideL', v)} />
					<Slider label="strideR" value={pose.strideR} min={0.5} max={1.6} step={0.01} onchange={(v) => setField('strideR', v)} />
				</div>
			{/if}
			{#if key}
				<div class="sub">key</div>
				<div class="form">
					<label>ease
						<select
							value={typeof key.ease === 'string' ? key.ease : ''}
							onchange={(e) => {
								const v = (e.currentTarget as HTMLSelectElement).value;
								key!.ease = v ? (v as Ease) : undefined;
							}}
						>
							{#each EASES as ea (ea.id)}<option value={ea.id}>{ea.label}</option>{/each}
						</select>
					</label>
					<label>event
						<input
							value={key.event ?? ''}
							placeholder="hit, land…"
							onchange={(e) => (key!.event = (e.currentTarget as HTMLInputElement).value.trim() || undefined)}
						/>
					</label>
					<label>vx
						<input
							type="number"
							value={key.vx ?? ''}
							placeholder="auto"
							onchange={(e) => {
								const v = parseFloat((e.currentTarget as HTMLInputElement).value);
								key!.vx = Number.isNaN(v) ? undefined : v;
							}}
						/>
					</label>
					<label class="check"><input type="checkbox" checked={!!key.puff} onchange={(e) => (key!.puff = (e.currentTarget as HTMLInputElement).checked || undefined)} /> puff</label>
				</div>
			{/if}
		</section>

		<section class="sec">
			<div class="sec-h"><strong>Action</strong></div>
			<div class="form">
				<label>name <input bind:value={model.meta.name} /></label>
				<label>category
					<select bind:value={model.meta.category}>
						{#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
					</select>
				</label>
				<label class="wide">description <input bind:value={model.meta.description} /></label>
				<label>frames <input type="number" min="2" max="240" value={n} onchange={(e) => setFrames(+(e.currentTarget as HTMLInputElement).value)} /></label>
				<label>fps <input type="number" min="1" max="60" bind:value={model.meta.fps} /></label>
				<label>ground
					<select value={model.meta.ground ?? 'plant'} onchange={(e) => (model.meta.ground = (e.currentTarget as HTMLSelectElement).value as 'plant' | 'free')}>
						<option value="plant">plant</option>
						<option value="free">free</option>
					</select>
				</label>
				<label>contacts
					<select value={model.meta.contacts ?? 'feet'} onchange={(e) => (model.meta.contacts = (e.currentTarget as HTMLSelectElement).value as 'feet' | 'any')}>
						<option value="feet">feet</option>
						<option value="any">any</option>
					</select>
				</label>
				<label>from
					<select value={model.meta.from ?? 'stand'} onchange={(e) => (model.meta.from = (e.currentTarget as HTMLSelectElement).value as Hub)}>
						{#each HUB_NAMES as h (h)}<option value={h}>{h}</option>{/each}
					</select>
				</label>
				<label>to
					<select value={model.meta.to ?? model.meta.from ?? 'stand'} onchange={(e) => (model.meta.to = (e.currentTarget as HTMLSelectElement).value as Hub)}>
						{#each HUB_NAMES as h (h)}<option value={h}>{h}</option>{/each}
					</select>
				</label>
				<label class="check"><input type="checkbox" bind:checked={model.meta.loop} /> loop</label>
				<label class="check"><input type="checkbox" checked={model.meta.floor !== false} onchange={(e) => (model.meta.floor = (e.currentTarget as HTMLInputElement).checked ? undefined : false)} /> floor</label>
			</div>
			<div class="sub">trails</div>
			<div class="chips">
				{#each TRAIL_JOINTS as j (j)}
					{@const on = model.meta.trails?.includes(j) ?? false}
					<button
						class="chip"
						class:on
						onclick={() => {
							const t = new Set(model.meta.trails ?? []);
							if (on) t.delete(j);
							else t.add(j);
							model.meta.trails = t.size ? [...t] : undefined;
						}}>{j}</button
					>
				{/each}
			</div>
		</section>

		<section class="sec">
			<div class="sec-h">
				<strong>Build</strong>
				<button class="link" onclick={() => (build = { ...BUILD })}>reset to default</button>
			</div>
			<div class="sliders">
				<Slider label="headR" value={build.headR} min={40} max={120} onchange={(v) => (build.headR = v)} />
				<Slider label="weight" value={build.weight} min={10} max={60} onchange={(v) => (build.weight = v)} />
				<Slider label="thigh" value={build.thigh} min={100} max={240} onchange={(v) => (build.thigh = v)} />
				<Slider label="shin" value={build.shin} min={100} max={240} onchange={(v) => (build.shin = v)} />
				<Slider label="torso" value={build.torso} min={120} max={280} onchange={(v) => (build.torso = v)} />
				<Slider label="neck" value={build.neck} min={0} max={80} onchange={(v) => (build.neck = v)} />
				<Slider label="upperArm" value={build.upperArm} min={80} max={200} onchange={(v) => (build.upperArm = v)} />
				<Slider label="foreArm" value={build.foreArm} min={80} max={200} onchange={(v) => (build.foreArm = v)} />
			</div>
		</section>

		<section class="sec out">
			<Button variant="primary" onclick={openExport}>Copy as TypeScript</Button>
			<Button variant="secondary" onclick={save}>Save draft</Button>
			<Button variant="secondary" onclick={() => { panel = 'import'; importError = ''; }}>Import JSON</Button>
		</section>
	</aside>

	{#if panel}
		<div class="sheet" role="dialog" aria-label={panel}>
			<div class="sheet-h">
				<strong>{panel === 'export' ? 'ActionDef — paste into rig/actions/*.ts' : 'Import ActionDef or draft JSON'}</strong>
				<button class="link" onclick={() => (panel = null)}>close</button>
			</div>
			{#if panel === 'export'}
				<textarea readonly class="code" value={exportText}></textarea>
			{:else}
				<textarea class="code" bind:value={importText} placeholder={'{ "name": "…", "frames": 24, "keys": [ … ] }'}></textarea>
				<div class="sheet-f">
					{#if importError}<span class="accent mono">{importError}</span>{/if}
					<Button variant="primary" onclick={doImport}>Import</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.forge {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr) 340px;
		height: 100vh;
		background: var(--paper);
		color: var(--ink);
		font: var(--size-14) / 1.3 var(--font-sans);
		overflow: hidden;
	}
	.col {
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.left {
		border-right: var(--hairline);
	}
	.right {
		border-left: var(--hairline);
		overflow-y: auto;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		padding: var(--space-4);
		border-bottom: var(--hairline);
	}
	.mark {
		font-weight: var(--weight-bold);
		color: var(--ink);
		text-decoration: none;
	}
	.tools {
		padding: var(--space-3) var(--space-4);
		border-bottom: var(--hairline);
	}
	.list {
		overflow-y: auto;
		flex: 1;
		padding-bottom: var(--space-8);
	}
	.group {
		padding-top: var(--space-3);
	}
	.cat {
		font: var(--size-12) / 1 var(--font-mono);
		color: var(--ink-2);
		padding: var(--space-1) var(--space-4) var(--space-2);
	}
	.item {
		display: flex;
		justify-content: space-between;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		border-radius: 0;
		padding: 5px var(--space-4);
		font: var(--size-14) / 1.2 var(--font-sans);
		color: var(--ink);
		cursor: pointer;
	}
	.item:hover {
		background: var(--ink);
		color: var(--paper);
	}
	.item:hover .dim {
		color: var(--paper);
	}
	.item:focus-visible,
	.tb:focus-visible,
	.chip:focus-visible,
	.cell:focus-visible {
		outline: 1px solid var(--accent);
		outline-offset: -1px;
	}
	.item:focus:not(:focus-visible) {
		outline: none;
	}
	.item.on {
		box-shadow: inset 3px 0 0 var(--accent);
		font-weight: var(--weight-medium);
	}
	.item-row {
		display: flex;
	}
	.x {
		border: none;
		background: none;
		color: var(--ink-2);
		padding: 0 var(--space-3);
		cursor: pointer;
	}
	.dim {
		color: var(--ink-2);
	}
	.mono {
		font-family: var(--font-mono);
		font-size: var(--size-12);
	}
	.accent {
		color: var(--accent);
	}

	.mid {
		min-width: 0;
	}
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-4);
		padding: var(--space-4);
		border-bottom: var(--hairline);
	}
	.title {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		min-width: 0;
	}
	.toggles {
		display: flex;
		gap: var(--space-4);
		white-space: nowrap;
	}
	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
	}
	svg {
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		user-select: none;
	}
	.ground {
		stroke: var(--ink);
		stroke-width: 3;
	}
	.tick {
		stroke: var(--ink);
		stroke-width: 3;
	}
	.figure {
		fill: var(--ink);
	}
	.onion {
		fill: var(--ink);
	}
	.onion.before {
		fill: var(--accent);
	}
	.plant {
		fill: none;
		stroke: var(--ink);
		stroke-width: 3;
	}
	.plant.r {
		fill: var(--ink);
	}
	.handle {
		fill: var(--paper);
		stroke: var(--accent);
		stroke-width: 5;
		cursor: grab;
	}
	.handle.near {
		fill: var(--accent);
	}
	.handle.ghost {
		stroke-dasharray: 8 6;
		opacity: 0.6;
	}
	.handle.active {
		cursor: grabbing;
		stroke: var(--ink);
	}
	.legend {
		position: absolute;
		left: var(--space-4);
		bottom: var(--space-3);
	}
	.toast {
		position: absolute;
		right: var(--space-4);
		top: var(--space-3);
		background: var(--ink);
		color: var(--paper);
		padding: var(--space-1) var(--space-2);
	}

	.transport {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-top: var(--hairline);
		flex-wrap: wrap;
	}
	.transport label {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.readout {
		margin-left: var(--space-2);
		white-space: nowrap;
	}
	.spacer {
		flex: 1;
	}
	.tb {
		font: var(--weight-medium) var(--size-12) / 1 var(--font-sans);
		border: var(--hairline);
		border-radius: 0;
		background: var(--paper);
		color: var(--ink);
		padding: 6px 10px;
		cursor: pointer;
	}
	.tb:hover:not(:disabled) {
		background: var(--ink);
		color: var(--paper);
	}
	.tb:disabled {
		color: var(--ink-2);
		cursor: default;
	}

	.strip {
		display: grid;
		border-top: var(--hairline);
		height: 52px;
		touch-action: none;
	}
	.cell {
		position: relative;
		border: none;
		border-right: var(--hairline);
		border-radius: 0;
		background: var(--paper);
		padding: 0;
		cursor: pointer;
		min-width: 0;
	}
	.cell:last-child {
		border-right: none;
	}
	.cell:hover {
		background: color-mix(in srgb, var(--ink) 6%, var(--paper));
	}
	.cell.cur {
		background: var(--ink);
	}
	.cell.cur .num {
		color: var(--paper);
	}
	.cell.drop {
		box-shadow: inset 0 0 0 2px var(--accent);
	}
	.key {
		position: absolute;
		left: 50%;
		top: 10px;
		width: 10px;
		height: 10px;
		transform: translateX(-50%) rotate(45deg);
		background: var(--accent);
		cursor: ew-resize;
	}
	.cell.cur .key {
		background: var(--paper);
		outline: 2px solid var(--accent);
	}
	.key.moving {
		opacity: 0.4;
	}
	.ev {
		position: absolute;
		left: 50%;
		top: 26px;
		width: 4px;
		height: 4px;
		transform: translateX(-50%);
		background: var(--ink-2);
	}
	.num {
		position: absolute;
		left: 3px;
		bottom: 3px;
		font: 10px / 1 var(--font-mono);
		color: var(--ink-2);
	}

	.sec {
		padding: var(--space-4);
		border-bottom: var(--hairline);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.sec-h {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-2);
		margin-bottom: var(--space-1);
	}
	.sub {
		font: var(--size-12) / 1 var(--font-mono);
		color: var(--ink);
		margin-top: var(--space-3);
	}
	.sliders {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2);
	}
	.form label {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font: var(--size-12) / 1 var(--font-mono);
	}
	.form label.wide {
		grid-column: 1 / -1;
	}
	.form label.check {
		flex-direction: row;
		align-items: center;
		gap: 6px;
	}
	.form input:not([type='checkbox']),
	.form select {
		font: var(--size-12) / 1.2 var(--font-sans);
		border: var(--hairline);
		border-radius: 0;
		background: var(--paper);
		color: var(--ink);
		padding: 5px 6px;
		width: 100%;
		min-width: 0;
	}
	input[type='checkbox'] {
		accent-color: var(--ink);
		margin: 0;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.chip {
		font: var(--size-12) / 1 var(--font-mono);
		border: var(--hairline);
		border-radius: 0;
		background: var(--paper);
		color: var(--ink);
		padding: 4px 6px;
		cursor: pointer;
	}
	.chip.on {
		background: var(--ink);
		color: var(--paper);
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		font: var(--size-12) / 1 var(--font-mono);
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.link:hover {
		color: var(--accent);
	}
	.out {
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--space-2);
		border-bottom: none;
	}

	.sheet {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(760px, 92vw);
		height: min(560px, 80vh);
		background: var(--paper);
		border: var(--hairline);
		display: flex;
		flex-direction: column;
		z-index: 10;
	}
	.sheet-h,
	.sheet-f {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
	}
	.sheet-h {
		border-bottom: var(--hairline);
	}
	.sheet-f {
		border-top: var(--hairline);
	}
	.code {
		flex: 1;
		border: none;
		border-radius: 0;
		resize: none;
		padding: var(--space-4);
		font: var(--size-12) / 1.5 var(--font-mono);
		background: var(--paper);
		color: var(--ink);
		outline: none;
	}

	@media (max-width: 1100px) {
		.forge {
			grid-template-columns: 180px minmax(0, 1fr) 300px;
		}
	}
	@media (max-width: 860px) {
		.forge {
			grid-template-columns: 1fr;
			grid-template-rows: auto 70vh auto;
			height: auto;
			overflow: visible;
		}
		.left {
			border-right: none;
			border-bottom: var(--hairline);
			max-height: 240px;
		}
		.right {
			border-left: none;
			border-top: var(--hairline);
			overflow: visible;
		}
	}
</style>
