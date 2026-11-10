// Find verbs in free text that have a matching action. Regular inflections
// are stemmed; irregular and near-synonyms are listed.
const IRREGULAR: Record<string, string> = {
	ran: 'run', fell: 'trip', falls: 'trip', falling: 'trip', fall: 'trip', slept: 'sleep', sat: 'sit-idle', sit: 'sit-idle',
	sits: 'sit-idle', sitting: 'sit-idle', threw: 'throw', caught: 'catch', thought: 'think', snuck: 'sneak', leapt: 'leap',
	stroll: 'walk', strolled: 'walk', wander: 'walk', wandered: 'walk', celebrate: 'cheer', celebrated: 'cheer',
	hurried: 'run', rushed: 'sprint', raced: 'sprint', crept: 'sneak', lay: 'sleep', napped: 'sleep', nap: 'sleep',
	hi: 'wave', hello: 'wave', bye: 'wave', goodbye: 'wave', giggled: 'laugh', sobbed: 'cry', wept: 'cry',
	stood: 'idle', waited: 'tap-foot', wait: 'tap-foot', waiting: 'tap-foot', hit: 'punch', boogied: 'dance',
	fight: 'punch', fought: 'punch', slid: 'slip', climbed: 'climb-up', climb: 'climb-up', rose: 'get-up', woke: 'yawn', wake: 'yawn'
};

export function verbFor(word: string, has: (n: string) => boolean): string | null {
	const w = word.toLowerCase();
	if (IRREGULAR[w]) return IRREGULAR[w];
	if (has(w)) return w;
	const tries = [
		w.replace(/ies$/, 'y'), w.replace(/ied$/, 'y'),
		w.replace(/(\w)\1(ing|ed)$/, '$1'), // skipped → skip
		w.replace(/ing$/, ''), w.replace(/ing$/, 'e'),
		w.replace(/ed$/, ''), w.replace(/d$/, ''),
		w.replace(/es$/, ''), w.replace(/s$/, '')
	];
	for (const t of tries) if (t !== w && t.length > 2 && has(t)) return t;
	return null;
}

/** 'She danced and waved' → 'She danced {dance} and waved {wave}' */
export function illustrate(text: string, has: (n: string) => boolean) {
	return text.replace(/[A-Za-z]+/g, (word) => {
		const v = verbFor(word, has);
		return v ? `${word} {${v}}` : word;
	});
}
