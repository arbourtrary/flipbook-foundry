<script lang="ts">
	interface Props {
		label: string;
		hint?: string;
		error?: string;
		value?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'number' | 'search';
		name?: string;
		id?: string;
		oninput?: (e: Event) => void;
	}

	let {
		label,
		hint,
		error,
		value = $bindable(''),
		placeholder,
		type = 'text',
		name,
		id,
		oninput
	}: Props = $props();

	const fieldId = $derived(id ?? `f-${name ?? Math.random().toString(36).slice(2, 8)}`);
</script>

<div class="field">
	<label class="label" for={fieldId}>{label}</label>
	<input
		id={fieldId}
		class="input"
		class:has-error={!!error}
		{type}
		{name}
		{placeholder}
		bind:value
		{oninput}
	/>
	{#if error}
		<span class="msg msg-error">{error}</span>
	{:else if hint}
		<span class="msg msg-hint">{hint}</span>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.label {
		font-size: var(--size-14);
		color: var(--ink);
		font-weight: var(--weight-medium);
	}
	.input {
		font-family: var(--font-sans);
		font-size: var(--size-16);
		color: var(--ink);
		background: transparent;
		padding: var(--space-2) 0;
		border: none;
		border-bottom: var(--hairline);
		border-radius: 0;
		outline: none;
		transition: border-color var(--transition-fast);
	}
	.input::placeholder {
		color: var(--ink-2);
	}
	.input:focus {
		border-bottom-color: var(--ink);
		border-bottom-width: 1px;
	}
	.input.has-error {
		border-bottom-color: var(--accent);
	}
	.msg {
		font-size: var(--size-12);
		color: var(--ink-2);
	}
	.msg-error {
		color: var(--accent);
	}
</style>
