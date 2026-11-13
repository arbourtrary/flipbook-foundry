import { useState } from 'react';
import { Page, Stage, Figure } from 'flipbook-foundry/react';

const moods = ['wave', 'dance', 'cheer', 'jump'];

export function App() {
  const [i, setI] = useState(0);
  const next = moods[(i + 1) % moods.length];

  return (
    <main style={{ maxWidth: 640, margin: '48px auto', padding: '0 16px', fontFamily: 'Georgia, serif' }}>
      <Page
        text="Bob {walk} walked over. Sue {wave} waved back. The dog {run} ran off."
        font="400 22px Georgia"
        align="center"
      />

      <Stage style={{ height: 180 }}>
        <Figure animate="idle" x={120} y={150} size={72} />
        <Figure animate={moods[i]} x={240} y={150} size={72} facing={-1} />
      </Stage>

      <button style={{ font: 'inherit' }} onClick={() => setI((i + 1) % moods.length)}>
        Next: {next}
      </button>
    </main>
  );
}
