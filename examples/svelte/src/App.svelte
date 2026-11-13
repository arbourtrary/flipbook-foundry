<script lang="ts">
  import { Page, Stage, Figure } from 'flipbook-foundry/svelte';

  // A JS string: in a quoted attribute Svelte would read {walk} as an expression.
  const text = 'Bob {walk} walked over. Sue {wave} waved back. The dog {run} ran off.';
  const moods = ['wave', 'dance', 'cheer', 'jump'];
  let i = $state(0);
</script>

<main>
  <Page {text} font="400 22px Georgia" align="center" />

  <Stage style="height: 180px">
    <Figure animate="idle" x={120} y={150} size={72} />
    <Figure animate={moods[i]} x={240} y={150} size={72} facing={-1} />
  </Stage>

  <button onclick={() => (i = (i + 1) % moods.length)}>Next: {moods[(i + 1) % moods.length]}</button>
</main>

<style>
  main { max-width: 640px; margin: 48px auto; padding: 0 16px; font-family: Georgia, serif; }
  button { font: inherit; }
</style>
