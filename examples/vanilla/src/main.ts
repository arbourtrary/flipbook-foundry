import { createPage, createStage, getLibrary, wander, greet } from 'flipbook-foundry';

// A sentence where {action} tokens are stick figures. Page fetches its own fonts.
createPage(document.querySelector<HTMLCanvasElement>('#page')!, {
  text: 'Bob {walk} walked over. Sue {wave} waved back. The dog {run} ran off.',
  font: '400 22px Georgia',
  align: 'center'
});

// A Stage draws on its own canvas; load the figure font before adding anyone.
await getLibrary().load(['regular']);
const stage = createStage(document.querySelector<HTMLCanvasElement>('#stage')!);

// Two figures that wander about and greet each other when they meet.
for (const x of [80, 320]) {
  stage.add({ x, y: 150, size: 72, animate: 'idle' }).use(wander({ pause: [1, 3] }), greet());
}
