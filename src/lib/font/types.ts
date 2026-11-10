export interface Pose {
	name: string;
	codepoint: string;
	file: string;
	advanceWidth?: number;
}

export interface PosesManifest {
	fontFamily: string;
	styleName: string;
	unitsPerEm: number;
	ascender: number;
	descender: number;
	defaultAdvanceWidth: number;
	viewBox: number;
	poses: Pose[];
	animations: Record<string, string[]>;
}

export function parseCodepoint(s: string): number {
	return parseInt(s.replace(/^U\+/i, ''), 16);
}

export function codepointToString(s: string): string {
	return String.fromCodePoint(parseCodepoint(s));
}
