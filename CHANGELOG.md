# Changelog

## [1.5.0] - 2026-11-11

### Added
- Wide-gamut `Display-P3` WebGL2 rendering (`gamut: 'auto' | 'p3' | 'srgb'`, `gl.drawingBufferColorSpace = 'display-p3'`) with `OKLab`-to-linear-Display-P3 conversion and P3 soft-shoulder gamut compression.
- Three optical shader modes powered by the `gradM` derivative field: `fluted` (cylindrical glass rib refraction and Fresnel highlights), `prism` (chromatic `OKLab` dispersion), and `topo` (1-pass anti-aliased contour isolines), expanding `STYLE_MODES` to 7 modes.
- Native CSS Color 4 parser (`parseColorToOklab`) supporting `oklch()`, `oklab()`, `hsl()`, percentage `rgb()`, and `#hex` directly into floating-point `OKLab` without 8-bit quantization.
- Zero-WebGL `getSphereTokensAndCss()` SSR helper, inline `in oklab` SSR style output in `SphereBackground` (`sphere-gl/react`), and instant CSS placeholder paint prior to first WebGL2 frame in `mountSphereBackground()`.
- `<sphere-gl>` Custom Element (`registerSphereElement`, auto-registered in `sphere-gl.min.js`) with 13 reactive `observedAttributes`.
- Strict TypeScript declaration files (`types/index.d.ts`, `types/react.d.ts`, `types/framer.d.ts`, `types/export.d.ts`, `types/fallback.d.ts`, `types/studio.d.ts`) with `"types"` first in every `package.json` export entry.
- Semantic atlas aliases (`ocean`, `fintech`, `amber`, `gold`, `forest`, `sage`, `paper`, `editorial`, `slate`, `obsidian`, `sunset`, `coral`, and related intent names), `focusRect: [x0, y0, x1, y1]` pole attenuation over hero text regions, and `/llms.txt` integration guide.
- `IntersectionObserver` (`rootMargin: '100px'`) viewport culling and `[-1.25, 1.25]` pointer bounds gating for non-full-page mounts.

### Changed
- Cut core `dist/sphere-gl.esm.min.js` to `11.97 KB` gzipped and `dist/sphere-gl.react.js` to `1.25 KB` gzipped by externalizing `sphere-gl` in React/Framer wrappers and splitting `sphere-gl/export`, `sphere-gl/fallback`, `sphere-gl/palettes`, and `sphere-gl/studio` into subpath modules.
- Specialized fragment shaders per optical mode (`#define STYLE n`) with lazy compilation, `WebGLProgram` caching, async `KHR_parallel_shader_compile` polling, and CPU-hoisted per-pole math uploaded via packed `vec4` uniform arrays.
- Enforced hard pixel ceilings (`width * height <= budget`) across `3x` mobile and `5K` viewports, added an 8-frame median GPU-timing DPR governor (`[0.5, 1.0]`), and rendered interactive frames into a persistent FBO blitted with `gl.LINEAR` so the canvas backbuffer never reallocates on pointer wake or settle.
- Upgraded `exportCSS()` to emit `in oklab` elliptical radial gradients with `Display-P3` `@supports` blocks, proper bloom layer ordering, and an `sRGB` `@supports not` fallback; upgraded `exportImage()` to reuse the active WebGL2 context with tiled offscreen RGBA8 FBOs and `blob.degraded` / `strict` signaling.

### Fixed
- Fixed React (`SphereBackground`) and Framer (`SphereGL`) initial double-render on mount, prevented wrapper defaults from clobbering Studio `url` presets, and preserved `seed` when calling `regenerate()` without a new `seed`.
- Fixed `computeUiTokens()` WCAG `>= 4.5:1` contrast verification across `split` mood and custom bright-base/dark-pole or dark-base/bright-pole palettes using a deterministic 3x3 analytical `OKLab` hero grid (`median` and worst quartile).
- Fixed 8-bit dark-ramp banding when `grain === 0` by always applying an unconditional `+/-0.5 LSB` triangular dither after transfer-function encoding.

## [1.4.2] - 2026-11-11

### Fixed
- Studio URL initialization now applies `?preview=website` (`view=`), `mood`, `grain`, `motion`, `light`, `hour`, and `arch` even when `seed` or `style` is omitted from the URL, and responds to live `hashchange` updates.
- `parsePresetUrl` and `formatPresetUrl` now round-trip `preview` (`canvas` | `website` | `wallpaper`), `light=0`, and `hour` (automatically enabling `solar` when `hour` is set).
- Fixed *Boyne Solstice* (`eclipse` topology) in `Light` and `Split` modes so `baseOverride` only applies to dark moods, preserving `WCAG >= 4.5:1` contrast across all 15 atlases and all moods.
- Fixed Studio `System`, `Any`, and `Auto` toggles when an Optical Atlas is active, cleared active atlas scenes when clicking `All 15` in the Atlases drawer, and updated Solar Clock scrubbing to replace the current scene in place without flooding history.

## [1.4.1] - 2026-11-10

### Added
- Published `sphere-gl` to npm with `exports` entrypoints for `.`, `./react`, and `./framer`.
- Added `CONTRIBUTING.md`, `SECURITY.md`, and `CHANGELOG.md`, plus explicit `engines` (`node >= 18`) and `esbuild` devDependency in `package.json`.

### Changed
- Tightened `.github/workflows/ci.yml` with read-only `contents: read` permissions and pull request concurrency cancellation.
- Updated Studio embed snippets and documentation for `v1.4.1` and all 15 Irish atlases.

## [1.4.0] - 2026-11-10

### Added
- Emerald Isle atlas pack (7 new Irish atlases: *Dawn Meadow*, *Moss & Stone*, *Peat Bog*, *Gorse Hedgerow*, *Moher Slate*, *Glen Shade*, *Oak Canopy*).
- Solar Clock (`data-sphere-solar`, `solar={true}`, `&hour=`): positions the keylight along an east-to-west arc from the visitor's local time of day, re-rendering once every 10 minutes via `setTimeout` at `0%` idle GPU.
- Two-tier resolution scaling (`1.6 MP` interactive cap with native `3x` DPR static frames), phone tilt `Solas Light` (`deviceorientation`), `<meta name="theme-color">` sync, and mobile Studio layout (`100dvh`, safe-area insets, swipeable two-row dock).

## [1.3.0] - 2026-11-09

### Added
- Coast & Sky Irish optical atlases (*Burren Chalk*, *Skellig Night*, *Antrim Basalt*, *Boyne Solstice*, *Wicklow Amber*, *Achill Dusk*, *Dingle Horizon*, *Connemara Lough*).
- `Solas Light` wake-on-pointer grazing keylight that returns to `0%` GPU when pointer movement stops.
- `caustic` optical rendering style and smooth `OKLab` seed/theme morphing (`regenerate({ morph: true })`).
- `WebP`, `JPG`, vector `SVG`, and pure `CSS` radial-gradient fallback exports alongside `4K`/`5K` `PNG`.

## [1.2.0] - 2026-11-09

### Added
- Automatic OS and browser dark/light mode alignment (`mood="system"` default) watching `prefers-color-scheme` and `<html class="dark">` mutations while locking sphere geometry across theme flips.

## [1.1.0] - 2026-11-08

### Added
- Adaptive UI CSS custom properties (`--sphere-ink`, `--sphere-glass`, `--sphere-glass-border`) with `WCAG >= 4.5:1` contrast enforcement.
- Shareable Studio preset URLs (`parsePresetUrl`, `formatPresetUrl`), React wrapper (`sphere-gl/react`), and Framer code component (`sphere-gl/framer`).

## [1.0.0] - 2026-11-08

### Added
- Initial WebGL2 + Canvas2D fallback procedural background and 5K wallpaper studio with `OKLCH` color harmonies, `OKLab` anti-muddy midtone bridging, and monochromatic PCG film grain.
