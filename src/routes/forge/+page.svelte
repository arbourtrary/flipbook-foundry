<script lang="ts">
	import { Container, Stack, Row, Text, Button, Field, Link, Rule } from '$lib/ds';
	import { buildFont } from '$lib/font/buildFont';
	import { exportWoff2 } from '$lib/font/exportWoff2';
	import {
		parseCodepoint,
		codepointToString,
		type PosesManifest,
		type Pose
	} from '$lib/font/types';
	import baseManifest from '$lib/font/poses.json';
	import RigEditor from '$lib/forge/RigEditor.svelte';

	interface PendingPose extends Pose {
		svgText: string;
	}

	const existingSvgs = import.meta.glob('/src/poses/*.svg', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;

	let manifest = $state<PosesManifest>(structuredClone(baseManifest));
	let pending = $state<PendingPose[]>([]);
	let status = $state<{ kind: 'idle' | 'building' | 'ok' | 'error'; message?: string }>({
		kind: 'idle'
	});
	let isDragOver = $state(false);
	let previewSize = $state(120);

	let combined = $derived<PosesManifest>({
		...manifest,
		poses: [...manifest.poses, ...pending.map(({ svgText: _, ...p }) => p)]
	});

	let allPoses = $derived([
		...manifest.poses.map((p) => ({ ...p, source: 'committed' as const })),
		...pending.map((p) => ({ ...p, source: 'pending' as const }))
	]);

	const PREVIEW_FAMILY = 'FoundrySans Stick Forge';
	let currentFace: FontFace | null = null;
	let woff2Bytes: Uint8Array | null = $state(null);
	let otfBytes: Uint8Array | null = $state(null);

	function loadSvg(file: string): Promise<string> {
		const found = pending.find((p) => p.file === file);
		if (found) return Promise.resolve(found.svgText);
		const key = `/src/poses/${file}`;
		const text = existingSvgs[key];
		if (!text) return Promise.reject(new Error(`Not found: ${file}`));
		return Promise.resolve(text);
	}

	function nextFreeCodepoint(): string {
		const used = new Set<number>();
		for (const p of manifest.poses) used.add(parseCodepoint(p.codepoint));
		for (const p of pending) used.add(parseCodepoint(p.codepoint));
		for (let cp = 0xe001; cp < 0xf8ff; cp++) {
			if (!used.has(cp)) return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
		}
		throw new Error('No free PUA codepoints left');
	}

	function suggestName(filename: string): string {
		const base = filename.replace(/\.svg$/i, '').replace(/[^a-z0-9-]+/gi, '-');
		const existing = new Set([
			...manifest.poses.map((p) => p.name),
			...pending.map((p) => p.name)
		]);
		if (!existing.has(base)) return base;
		let i = 2;
		while (existing.has(`${base}-${i}`)) i++;
		return `${base}-${i}`;
	}

	async function addFiles(files: File[]) {
		const svgFiles = files.filter((f) => /\.svg$/i.test(f.name));
		for (const f of svgFiles) {
			const text = await f.text();
			pending.push({
				name: suggestName(f.name),
				codepoint: nextFreeCodepoint(),
				file: f.name,
				svgText: text
			});
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const files = Array.from(e.dataTransfer?.files ?? []);
		addFiles(files);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function onDragLeave() {
		isDragOver = false;
	}

	async function onPickFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (!input.files) return;
		await addFiles(Array.from(input.files));
		input.value = '';
	}

	function removePending(i: number) {
		pending = [...pending.slice(0, i), ...pending.slice(i + 1)];
	}

	function addPendingFromRig(svgText: string) {
		const name = suggestName('custom.svg');
		pending.push({
			name,
			codepoint: nextFreeCodepoint(),
			file: `${name}.svg`,
			svgText
		});
	}

	async function rebuild() {
		status = { kind: 'building' };
		try {
			const font = await buildFont(combined, loadSvg);
			const otf = new Uint8Array(font.toArrayBuffer());
			const woff2 = await exportWoff2(otf);
			otfBytes = otf;
			woff2Bytes = woff2;

			if (currentFace) {
				document.fonts.delete(currentFace);
			}
			const face = new FontFace(PREVIEW_FAMILY, woff2.buffer as ArrayBuffer);
			await face.load();
			document.fonts.add(face);
			currentFace = face;
			status = { kind: 'ok', message: `${combined.poses.length} pose(s)` };
		} catch (err) {
			status = { kind: 'error', message: err instanceof Error ? err.message : String(err) };
		}
	}

	let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const _ = JSON.stringify(combined);
		if (rebuildTimer) clearTimeout(rebuildTimer);
		rebuildTimer = setTimeout(rebuild, 80);
		return () => {
			if (rebuildTimer) clearTimeout(rebuildTimer);
		};
	});

	function download(name: string, bytes: BlobPart, type: string) {
		const blob = new Blob([bytes], { type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function downloadManifest() {
		download('poses.json', JSON.stringify(combined, null, '\t') + '\n', 'application/json');
	}

	function downloadWoff2() {
		if (woff2Bytes) download('flipbook.woff2', woff2Bytes as BlobPart, 'font/woff2');
	}

	function downloadOtf() {
		if (otfBytes) download('flipbook.otf', otfBytes as BlobPart, 'font/otf');
	}

	function downloadSvg(p: PendingPose) {
		download(p.file, p.svgText, 'image/svg+xml');
	}

	let fileInput: HTMLInputElement | undefined = $state();
</script>

<svelte:head>
	<title>Forge — Flipbook Foundry</title>
</svelte:head>

<main class="page">
	<Container>
		<Stack gap="12">
			<Stack gap="2">
				<Text variant="small" color="ink-2">/forge</Text>
				<Text variant="title">Forge</Text>
				<Text variant="body" color="ink-2">
					Drag in SVG poses. The tool assigns codepoints, previews the in-memory font, and
					hands you back a font + manifest to commit.
				</Text>
			</Stack>

			<Rule />

			<Stack gap="6">
				<Stack gap="2">
					<Text variant="heading">Rig editor</Text>
					<Text variant="body" color="ink-2">
						Drag joints to build a pose. Toggle elbows or knees to override the auto bend.
						Sliders lean the spine and stretch limbs along their vector.
					</Text>
				</Stack>
				<RigEditor onAddPending={addPendingFromRig} />
			</Stack>

			<Rule />

			<section
				class="drop"
				class:over={isDragOver}
				ondrop={onDrop}
				ondragover={onDragOver}
				ondragleave={onDragLeave}
				aria-label="Drop SVG files here"
			>
				<Stack gap="3" align="center">
					<Text variant="subheading">Drop SVG files here</Text>
					<Text variant="small" color="ink-2">
						One <Text variant="mono">&lt;path d="..."&gt;</Text> per file, viewBox 0 0 1000 1000.
					</Text>
					<Button variant="secondary" onclick={() => fileInput?.click()}>
						{#snippet children()}Pick files{/snippet}
					</Button>
					<input
						bind:this={fileInput}
						type="file"
						accept=".svg,image/svg+xml"
						multiple
						class="file-input"
						onchange={onPickFiles}
					/>
				</Stack>
			</section>

			<Row gap="6" align="center" wrap>
				<Text variant="small" color="ink-2">Status</Text>
				{#if status.kind === 'building'}
					<Text variant="mono">building…</Text>
				{:else if status.kind === 'ok'}
					<Text variant="mono">ok · {status.message}</Text>
				{:else if status.kind === 'error'}
					<Text variant="mono" color="accent">{status.message}</Text>
				{:else}
					<Text variant="mono" color="ink-2">idle</Text>
				{/if}
			</Row>

			<Rule />

			<Stack gap="6">
				<Row gap="4" align="baseline" justify="between" wrap>
					<Text variant="heading">Preview</Text>
					<Row gap="3" align="center">
						<Text variant="small" color="ink-2">Size</Text>
						<input
							type="range"
							min="48"
							max="240"
							bind:value={previewSize}
							class="size-range"
						/>
						<Text variant="mono" color="ink-2">{previewSize}px</Text>
					</Row>
				</Row>
				<div class="grid">
					{#each allPoses as p, i (`${p.source}-${p.name}-${p.codepoint}-${i}`)}
						<div class="card" class:pending={p.source === 'pending'}>
							<div class="glyph" style="font-size: {previewSize}px;">
								{codepointToString(p.codepoint)}
							</div>
							<Stack gap="1">
								<Text variant="mono">{p.name}</Text>
								<Text variant="mono" color="ink-2">{p.codepoint}</Text>
								{#if p.source === 'pending'}
									<Row gap="3" align="center">
										<button
											class="link"
											onclick={() => downloadSvg(p as PendingPose)}
										>save .svg</button>
										<button
											class="link link-accent"
											onclick={() =>
												removePending(
													pending.findIndex(
														(x) =>
															x.file === p.file &&
															x.codepoint === p.codepoint
													)
												)
											}>remove</button>
									</Row>
								{/if}
							</Stack>
						</div>
					{/each}
					{#if allPoses.length === 0}
						<Text variant="body" color="ink-2">No poses yet. Drop some SVGs above.</Text>
					{/if}
				</div>
			</Stack>

			<Rule />

			<Stack gap="6">
				<Text variant="heading">Pending poses</Text>
				{#if pending.length === 0}
					<Text variant="body" color="ink-2">
						No pending poses. Drag SVGs above; they'll show up here for editing.
					</Text>
				{:else}
					<Stack gap="8">
						{#each pending as p, i (p.file + i)}
							<Row gap="6" align="start" wrap>
								<div class="glyph thumb" style="font-size: 96px;">
									{codepointToString(p.codepoint)}
								</div>
								<Stack gap="3">
									<Field label="Name" bind:value={p.name} />
									<Field label="Codepoint (U+XXXX)" bind:value={p.codepoint} />
									<Row gap="4" wrap>
										<Button variant="text" onclick={() => removePending(i)}>
											{#snippet children()}Remove{/snippet}
										</Button>
										<Button variant="text" onclick={() => downloadSvg(p)}>
											{#snippet children()}Save as .svg{/snippet}
										</Button>
									</Row>
								</Stack>
							</Row>
						{/each}
					</Stack>
				{/if}
			</Stack>

			<Rule />

			<Stack gap="6">
				<Text variant="heading">Download</Text>
				<Text variant="body" color="ink-2">
					Save these into the repo:
					<Text variant="mono">poses.json</Text>
					replaces <Text variant="mono">src/lib/font/poses.json</Text>; any new
					<Text variant="mono">.svg</Text> files go in <Text variant="mono">src/poses/</Text>.
					Commit, then <Text variant="mono">npm run build:font</Text> regenerates the production
					font.
				</Text>
				<Row gap="4" wrap>
					<Button variant="primary" onclick={downloadManifest}>
						{#snippet children()}poses.json{/snippet}
					</Button>
					<Button
						variant="secondary"
						onclick={downloadWoff2}
						disabled={!woff2Bytes}
					>
						{#snippet children()}flipbook.woff2{/snippet}
					</Button>
					<Button
						variant="secondary"
						onclick={downloadOtf}
						disabled={!otfBytes}
					>
						{#snippet children()}flipbook.otf{/snippet}
					</Button>
				</Row>
			</Stack>

			<Rule />

			<Row gap="6" wrap>
				<Link href="/usage">Usage</Link>
				<Link href="/license">License</Link>
				<Link href="/">Back to the foundry</Link>
			</Row>
		</Stack>
	</Container>
</main>

<style>
	.page {
		padding: var(--space-16) 0 var(--space-24);
	}
	.drop {
		border: var(--hairline);
		padding: var(--space-12) var(--space-6);
		text-align: center;
		transition: background-color var(--transition-fast);
	}
	.drop.over {
		background: var(--ink);
		color: var(--paper);
	}
	.drop.over :global(*) {
		color: var(--paper) !important;
	}
	.file-input {
		display: none;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--space-6);
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		border: var(--hairline);
	}
	.card.pending {
		border-color: var(--accent);
	}
	.glyph {
		font-family: 'FoundrySans Stick Forge', var(--font-flipbook), sans-serif;
		line-height: 1;
		text-align: center;
		min-height: 1em;
	}
	.thumb {
		flex-shrink: 0;
		border: var(--hairline);
		padding: var(--space-3);
	}
	.size-range {
		appearance: none;
		width: 160px;
		height: 1px;
		background: var(--ink);
		outline: none;
	}
	.size-range::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 18px;
		background: var(--ink);
		border-radius: 0;
		cursor: pointer;
	}
	.size-range::-moz-range-thumb {
		width: 10px;
		height: 18px;
		background: var(--ink);
		border-radius: 0;
		border: none;
		cursor: pointer;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		font-family: var(--font-sans);
		font-size: var(--size-12);
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.link:hover {
		color: var(--accent);
	}
	.link-accent {
		color: var(--ink-2);
	}
</style>
