import wawoff from 'wawoff2';

export async function exportWoff2(otfBytes: Uint8Array): Promise<Uint8Array> {
	const result = await wawoff.compress(otfBytes);
	return result instanceof Uint8Array ? result : new Uint8Array(result);
}
