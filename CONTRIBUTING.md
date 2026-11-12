# Contributing to sphere-gl

Thanks for taking the time to report a bug or submit a pull request.

## Prerequisites

- Node.js `18.0.0` or newer
- A modern browser with WebGL2 support if you are testing `index.html` visually

`sphere-gl` ships zero runtime dependencies. `esbuild` is used only at build time to minify the bundles in `dist/`.

## Local setup and verification

```bash
git clone https://github.com/denissitnikov/sphere-gl.git
cd sphere-gl
npm install
npm run build
npm test
```

What these two scripts check:

1. `npm run build` compiles the ESM, IIFE, React, Framer, export, fallback, palettes, and studio bundles in `dist/`, minifies `#version 300 es` GLSL shaders, and enforces strict gzipped size budgets (`<= 12.5 KB` on `sphere-gl.esm.min.js` and `sphere-gl.palettes.js`, `<= 2.5 KB` on `sphere-gl.react.js`).
2. `npm test` runs `scripts/smoke-test.mjs`, checking deterministic output across all 7 optical modes, CSS Color 4 (`oklch`, `oklab`, `hsl`, `rgb`, `#hex`) parsing, preset URL and React/Framer single-mount behavior, semantic atlas aliases, `focusRect` attenuation, Solar Clock sun progression, strict `3x` mobile and `5K` pixel ceilings, `OKLab`/`Display-P3` CSS and SVG exports, and a minimum `4.5:1` WCAG contrast ratio across a 3x3 central hero grid for all 15 atlases and custom palettes.

To preview the Live Studio locally, serve the repository root with any static file server (for example `npx serve .` or `python3 -m http.server 8795`) and open `http://localhost:8795`.

## Pull request guidelines

- Open an issue first before starting large shader changes or new rendering modes so we can agree on the scope and bundle budget.
- Keep pull requests focused on one fix or feature.
- Run `npm run build` and `npm test` before pushing, and commit the rebuilt `dist/` bundles when `src/` changes so CDN and git installs stay in sync.
- Add a regression check in `scripts/smoke-test.mjs` when fixing palette, contrast, or URL parsing bugs.
