export interface LicenseSection {
	heading: string;
	paragraphs: string[];
}

export interface License {
	title: string;
	intro: string[];
	sections: LicenseSection[];
	signoff: string;
}

export const LICENSE: License = {
	title: 'The Flipbook Foundry License',
	intro: [
		'One dollar. Yes, one dollar.',
		"This is a real software license. You can read it in under a minute. We made the font called Flipbook Foundry (the \"Font\") and we are selling it to you for one United States Dollar. That price is final. No annual fees, no per-seat fees, no usage caps. The dollar is the joke. The license is real."
	],
	sections: [
		{
			heading: 'What you can do',
			paragraphs: [
				'Use the Font anywhere, for anything. Personal, commercial, billboards, films, t-shirts, apps, wedding invitations, slide decks, tattoos. Embed it in software, games, PDFs, websites. Install it on every device you own. Modify it for your own use.',
				"You don't need to credit us. We'd like it if you did. We are not going to make you."
			]
		},
		{
			heading: 'What you cannot do',
			paragraphs: [
				'You cannot redistribute the Font file by itself, as a font, under your own name or any other name. You cannot resell the Font in a foundry or marketplace. If you build derivative glyphs, you cannot ship them as a competing font without buying a second dollar.',
				'You can redistribute the Font as part of a larger work — embedded in your app, baked into your PDF, packaged in your game. That is the whole point.'
			]
		},
		{
			heading: 'No warranty',
			paragraphs: [
				'The Font is provided "as is." We hope it walks correctly. If it does not, we are sorry, and we will do our best to fix it, but we cannot promise. We are not liable for any damages arising from the Font or its absence of motion.'
			]
		},
		{
			heading: 'This license',
			paragraphs: [
				'If any part of this license is found unenforceable, the rest stands. The price is one dollar. The license fits on a page. Both are deliberate.'
			]
		}
	],
	signoff: '— Flipbook Foundry, 2026'
};

export function renderLicenseText(l: License = LICENSE): string {
	const lines: string[] = [];
	lines.push(l.title.toUpperCase());
	lines.push('');
	for (const p of l.intro) {
		lines.push(p);
		lines.push('');
	}
	for (const s of l.sections) {
		lines.push(s.heading.toUpperCase());
		lines.push('');
		for (const p of s.paragraphs) {
			lines.push(p);
			lines.push('');
		}
	}
	lines.push(l.signoff);
	lines.push('');
	return lines.join('\n');
}
