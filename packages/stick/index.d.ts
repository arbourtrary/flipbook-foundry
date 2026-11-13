// Structural, so this package needs nothing from the engine.
export interface Family {
	id: string;
	manifest: object;
	anchors(): Promise<object>;
	fontBase: string;
}

export declare const VERSION: string;
declare const stick: Family;
export default stick;
