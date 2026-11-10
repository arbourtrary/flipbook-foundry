// Prints world-space position of the lowest foot per frame; a planted foot
// should hold the same world x across consecutive frames.
import { ACTIONS } from '../src/lib/flipbook/rig/actions/index.ts';
import { bake } from '../src/lib/flipbook/rig/timeline.ts';
const names = process.argv.slice(2);
for (const def of ACTIONS.filter((a) => !names.length || names.includes(a.name))) {
	const b = bake(def);
	let wx = 0;
	const rows: string[] = [];
	b.frames.forEach((f, i) => {
		wx += f.dx;
		const L = f.anchors.footL, R = f.anchors.footR;
		const low = L[1] <= R[1] ? 'L' : 'R';
		const ft = low === 'L' ? L : R;
		rows.push(`${i}:${low}@${Math.round(wx + ft[0])} y${ft[1]} air${Math.round(f.air)} dx${Math.round(f.dx)}`);
	});
	console.log(def.name, '\n ', rows.join('\n  '));
}
