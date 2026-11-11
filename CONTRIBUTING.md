# Contributing to sphere-gl

Thanks for taking the time to report a bug or submit a pull request.

## Prerequisites

- Node.js `18.0.0` or newer
- A modern browser with WebGL2 support if you are testing `index.html` visually

`sphere-gl` ships zero runtime dependencies. `esbuild` is used only at build time to minify the four bundles in `dist/`.

## Local setup and verification

```bash
git clone https://github.com/denissitnikov/sphere-gl.git
cd sphere-gl
npm install
npm run build
npm test
```

What these two scripts check:

1. `npm run build` bundles `dist/sphere-gl.min.js`, `dist/sphere-gl.esm.min.js`, `dist/sphere-gl.react.js`, and `dist/sphere-gl.framer.js`, strips comments inside `#version 300 es` shaders, and fails if any bundle exceeds `29.5 KB` gzipped.
2. `npm test` runs `scripts/smoke-test.mjs`, checking deterministic output across seeds, `sRGB` to `OKLab` roundtrips, preset URL parsing, OS dark and light mode matching, Solar Clock sun progression, two-tier phone resolution limits, and a minimum `4.5:1` WCAG contrast ratio between `baseHex` and `uiTokens.ink` across all 15 atlases.

To preview the Live Studio locally, serve the repository root with any static file server (for example `npx serve .` or `python3 -m http.server 8795`) and open `http://localhost:8795`.

## Pull request guidelines

- Open an issue first before starting large shader changes or new rendering modes so we can agree on the scope and bundle budget.
- Keep pull requests focused on one fix or feature.
- Run `npm run build` and `npm test` before pushing, and commit the rebuilt `dist/` bundles when `src/` changes so CDN and git installs stay in sync.
- Add a regression check in `scripts/smoke-test.mjs` when fixing palette, contrast, or URL parsing bugs.
