# Changelog

## 0.1.0

First public release, as two packages: the engine (`flipbook-foundry`) and the
first figure family (`@flipbook-foundry/stick`).

- Stick: 91 actions and 2,516 drawings in four fonts (Flipbook Stick Regular
  and Bold, Flipbook Stick Limbs Regular and Bold) plus Flipbook Stick Things.
- Core runtime: `Character`, `Stage`, `animate`, `stagger`, `Page`,
  `createTextFlow`, `wander` and `greet` behaviors, hub routing between rest
  poses.
- Svelte 5 and React bindings: `Stage`, `Figure`, `TextFlow`, `Page`, `Thing`,
  `FlipbookConfig`.
- Families: `<FlipbookConfig family>`, a `family` prop on `Stage`, `Figure` and
  `Page`, `getLibrary(family)` and `setDefaultFamily()`. Stick is the default.
- Fonts load from jsDelivr by default; `setFontBase()` to self-host.
- Code under MIT, fonts under the SIL Open Font License 1.1.
