import { useRef, useState } from 'react';
import { Stage, Figure, TextFlow, FlipbookConfig, useAnimate, stagger, type Character } from '$lib/flipbook/react';

export default function Demo() {
	const [action, setAction] = useState('walk');
	const crowd = useRef<(Character | null)[]>([]);
	const animate = useAnimate();
	return (
		<FlipbookConfig transition={{ speed: 1 }}>
			<p>
				React inline <Figure animate={action} size={56} whileHover="run" />
				<button onClick={() => setAction(action === 'walk' ? 'run' : 'walk')}>toggle ({action})</button>
				<button onClick={() => animate(crowd.current.filter(Boolean) as Character[], 'run', { delay: stagger(0.08), repeat: 2, inPlace: true })}>stagger</button>
			</p>
			<Stage style={{ height: 300, border: '1px solid' }} onUpdate={(_, s) => s.characters.forEach((c) => c.x > s.width + 50 && (c.x = -50))}>
				<TextFlow text={'Pretext reflows this paragraph around every figure, every frame. '.repeat(8)} font="400 20px Georgia" x={16} y={16} width={700} lineHeight={28} />
				{Array.from({ length: 8 }, (_, i) => (
					<Figure key={i} ref={(c) => {
						crowd.current[i] = c;
					}} animate={i % 2 ? 'run' : 'walk'} x={i * 90} y={120 + (i % 3) * 80} size={80} transition={{ phase: i / 8 }} />
				))}
			</Stage>
		</FlipbookConfig>
	);
}
