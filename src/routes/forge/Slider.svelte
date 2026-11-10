<script lang="ts">
	// Label · range · number. One row, tabular, precise.
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		disabled?: boolean;
		onchange: (v: number) => void;
	}

	let { label, value, min, max, step = 1, disabled = false, onchange }: Props = $props();

	// Interpolated frames carry long decimals; show what's meaningful at this step.
	const shown = $derived(step < 1 ? Math.round(value * 100) / 100 : Math.round(value * 10) / 10);

	function set(e: Event) {
		const v = parseFloat((e.currentTarget as HTMLInputElement).value);
		if (!Number.isNaN(v)) onchange(v);
	}
</script>

<label class="s" class:disabled>
	<span class="l">{label}</span>
	<input type="range" {min} {max} {step} value={value} {disabled} oninput={set} />
	<input class="n" type="number" {step} value={shown} {disabled} onchange={set} />
</label>

<style>
	.s {
		display: grid;
		grid-template-columns: 78px 1fr 58px;
		gap: var(--space-2);
		align-items: center;
		font: var(--size-12) / 1 var(--font-sans);
		color: var(--ink);
	}
	.disabled {
		color: var(--ink-2);
	}
	.l {
		font-family: var(--font-mono);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	input[type='range'] {
		width: 100%;
		margin: 0;
		accent-color: var(--ink);
		height: 16px;
	}
	.n {
		width: 100%;
		font: var(--size-12) / 1 var(--font-mono);
		border: var(--hairline);
		border-radius: 0;
		background: var(--paper);
		color: var(--ink);
		padding: 3px 4px;
		text-align: right;
	}
	.n:focus {
		outline: 1px solid var(--accent);
		outline-offset: -1px;
	}
</style>
