# Changelog

## 0.1.2 (engine)

- Figures in a `Page` stay blank until their font chunk loads, instead of
  painting the "missing glyph" box on the canvas.

## 0.1.1 (engine)

- Inline figures stay hidden until their font chunk loads, instead of
  flashing the system's "missing glyph" box on first paint.

## 0.1.0

First public release, as two packages: the engine (`flipbook-foundry`) and the
first figure family (`@flipbook-foundry/stick`).

- Stick: 92 actions and 2,550 drawings in four fonts (Flipbook Stick Regular
  and Bold, Flipbook Stick Limbs Regular and Bold) plus Flipbook Stick Things.
- Core runtime: `Character`, `Stage`, `animate`, `stagger`, `Page`,
  `createTextFlow`, `wander` and `greet` behaviors, hub routing between rest
  poses.
- Svelte 5 and React bindings: `Stage`, `Figure`, `TextFlow`, `Page`, `Thing`,
  `FlipbookConfig`.
- `frontflip` and `backflip` (`flip` is now `backflip`).
- A shared rest state: loops get baked exit frames and settle moves, and
  changing action hands over through rest instead of cutting mid-pose
  (`interrupt: 'cut'` to opt out). Facing changes wait for the next action.
- Motion audit (`npm run audit`): every action is checked for teleports, loop
  seams, lurching travel and rest-pose mismatches; 20 actions were fixed.
- Families: `<FlipbookConfig family>`, a `family` prop on `Stage`, `Figure` and
  `Page`, `getLibrary(family)` and `setDefaultFamily()`. Stick is the default.
- Fonts load from jsDelivr by default; `setFontBase()` to self-host.
- Code under MIT, fonts under the SIL Open Font License 1.1.
