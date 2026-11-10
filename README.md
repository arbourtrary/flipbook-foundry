# Flipbook

An animation library where every frame is a glyph. Stick figures are drawn on a
skeleton at build time and baked into fonts; at runtime a figure is one
character that gets swapped for the next drawing. The API follows framer-motion
(`animate`, `initial`, `exit`, `variants`, `transition`, `whileHover`,
`stagger`, sequences), with bindings for Svelte and React.

Text in any real font is laid out with [pretext](https://github.com/chenglou/pretext),
and figures are just characters in that layout: `{walk}` in a sentence is a
stick figure sized like the text around it. Every drawing of an action shares
one advance width, so animating is swapping a character — the layout never
moves. A canvas Stage draws larger scenes the same way: one `fillText` per figure.

## Layout

```
src/lib/flipbook/
  rig/          build time only — skeleton, spline timeline, ground solver
    actions/    the action library (69 actions, 1,868 drawings)
  core/         runtime — frameloop, library, Character, Stage, animate,
                stagger, page + textflow (pretext), behaviors
  svelte/       <Stage> <Figure> <TextFlow> <FlipbookConfig> use:figure
  react/        <Stage> <Figure> <TextFlow> <FlipbookConfig> useAnimate useStage
  generated/    manifest.json (written by the baker)
static/fonts/   flipbook-{regular,bold,limbs,limbs-bold}.{woff2,otf}
```

## Commands

| | |
|---|---|
| `npm run dev` | bake fonts, start the site |
| `npm run build:font` | bake every action into the fonts + manifest |
| `npm run sheet walk run` | contact sheets in `.sheets/` (strip, world track, onion skin) |
| `npx tsx scripts/overview.ts` | every action on one page |
| `npx tsx scripts/skate.ts walk` | planted-foot drift per frame |
| `npm test` | runtime checks (routing, travel, ledges, events) |

## Routes

- `/` the showcase
- `/docs` API reference
- `/forge` character and action builder (IK handles, timeline, TS export)
- `/lab` check-in gallery: build variants, timing, per-action review → `lab/picks.json`
- `/lab/page`, `/lab/world`, `/lab/letters`, `/lab/perf?n=10000`, `/lab/react`

## How motion stays grounded

Poses are angles on bones of fixed length, interpolated along time-aware
splines, so hands sweep arcs instead of cutting corners and speed carries
through keys. The baker plants the lowest contact on the floor, picks the foot
that is actually bearing weight, and derives each frame's root motion from it.
That number ships in the manifest, so a travelling figure moves exactly as far
as its planted foot says and never skates. Squash, stretch, speed lines and
impact puffs are drawn into the glyphs themselves. Glyph outlines are
boolean-unioned so no rasteriser ever sees overlapping contours.
