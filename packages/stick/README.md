# @flipbook-foundry/stick

Stick figures for [Flipbook Foundry](https://github.com/arbourtrary/flipbook-foundry):
92 actions and 2,550 drawings, baked into the Flipbook Stick fonts.

This is the default family of `flipbook-foundry`, which depends on it, so you
normally don't install it yourself. Import it to name it explicitly or to
self-host its fonts:

```js
import stick from '@flipbook-foundry/stick';
import { setFontBase } from 'flipbook-foundry';

// After copying node_modules/@flipbook-foundry/stick/fonts/ to /fonts/:
setFontBase('/fonts/', stick);
```

`fonts/` also has `.otf` files that install like any other font.

Fonts and drawings: [SIL Open Font License 1.1](OFL.txt).
