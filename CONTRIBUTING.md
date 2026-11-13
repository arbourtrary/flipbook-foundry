# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Setup

```sh
npm install        # links the workspace packages
npm run dev
```

The repo is an npm workspace:

- `packages/engine` is `flipbook-foundry`, the runtime.
- `packages/<family>` is a figure family such as `@flipbook-foundry/stick`:
  its fonts, its generated manifest, and a `family.ts` bake config.
- `packages/rig` is private and build-time only: the humanoid skeleton, skins,
  timeline, ground solver and the shared action library.
- `src/` is the demo site. It imports the packages from source.

## Adding an action

1. Write an `ActionDef` in the matching file in `packages/rig/actions/`
   (`gesture.ts`, `locomotion.ts` and so on) and add it to that file's export
   list. Poses are joint angles on a fixed skeleton; see `wave` in `gesture.ts`
   for a small example.
2. Rough it out in `/forge`, which exports the TypeScript for you.
3. Check it with `npm run sheet <name>` (contact sheets in `.sheets/`) and, for
   anything that travels, `npx tsx scripts/skate.ts <name>` (planted-foot
   drift should be near zero).
4. `npm run build:font` re-bakes the stick fonts and manifest. Commit the
   changes in `packages/stick/fonts/` and `packages/stick/generated/` with your
   action.

Actions in `packages/rig/actions/` are shared: every human-shaped family that
uses them gets the new action when it re-bakes.

## Adding a family

There are three kinds of new family, from least work to most:

- **A new look on the same motion.** Write a `Skin` (see `STICK_SKIN` in
  `packages/rig/skeleton.ts`): how a posed skeleton becomes ink, and which
  points the ground solver plants. Reuse the shared actions.
- **A new feel.** Different proportions (`build`) and re-timed or new actions.
- **A new body.** Its own skeleton and actions. The engine doesn't change, but
  the rig needs a skeleton alongside the humanoid one.

To start one:

1. Copy `packages/stick/` to `packages/<id>/`, minus `fonts/` and `generated/`.
2. In `family.ts`, set `id`, `name` (for example "Flipbook Rubberhose"), `build`,
   `skin`, `actions`, `things` and `layers`.
3. In `package.json`, rename it `@flipbook-foundry/<id>`. In `index.js`, set
   `id` and the jsDelivr URL.
4. `npm run build:font <id>` writes `packages/<id>/fonts/` and
   `packages/<id>/generated/`.
5. Try it on the site with `<FlipbookConfig family={yourFamily}>`.

Families share Private Use codepoints, so two families on one page are told
apart by font family name, which is why every font name carries the family's.

## Before opening a pull request

```sh
npm run check
npm test
npm run build
npm run package && npx publint packages/engine && npx publint packages/stick
```

CI runs the same steps.

## Releasing

Packages are versioned independently.

- **A family:** bump `version` in `packages/<id>/package.json` and `VERSION` in
  `packages/<id>/index.js` (the default font URL pins it; `npm run package`
  fails if they differ). Then run `npm publish -w packages/<id>`.
- **The engine:** bump `packages/engine/package.json`, and its
  `@flipbook-foundry/stick` dependency if stick changed. Then run
  `npm run release`, then `npm publish -w packages/engine`.
- Add a section to `CHANGELOG.md` either way.

## License

By contributing you agree that code is released under MIT and font changes
under the SIL Open Font License 1.1.
