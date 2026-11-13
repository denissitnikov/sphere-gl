# sphere-gl

`sphere-gl` is a 12.31 KB gzipped WebGL2, OKLCH, and Display-P3 engine that renders non-muddy website backgrounds and 5K wallpapers, syncs with OS light and dark mode, and sleeps at `0%` GPU between interactions.

[![CI](https://github.com/denissitnikov/sphere-gl/actions/workflows/ci.yml/badge.svg)](https://github.com/denissitnikov/sphere-gl/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/types-included-2563eb?style=flat-square)](./types/index.d.ts)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-059669?style=flat-square)](./package.json)

**[Live Studio & 5K Wallpaper Generator](https://denissitnikov.github.io/sphere-gl/)** · **[Quick start](#quick-start)** · **[Features](#features-at-a-glance)** · **[React & Next.js](#react-and-nextjs-sphere-glreact-125-kb-gzip)** · **[Tailwind v4 & CSS](#css-variables-and-tailwind-css-v4)** · **[Modes & atlases](#optical-modes-and-irish-atlases)** · **[Bundle sizes](#subpath-exports-and-bundle-sizes)** · **[llms.txt](./llms.txt)**

<a href="https://denissitnikov.github.io/sphere-gl/">
  <img src="./assets/banner-showcase.jpg" alt="sphere-gl rendering modes: Watercolor Mesh, Diffused Macro Sphere, and Satin Silk" width="100%" />
</a>

## Quick start

### Option 1: Zero-build Web Component (HTML, Astro, Vue, Svelte, Webflow)

Load the self-mounting bundle from jsDelivr and drop `<sphere-gl>` around your content:

```html
<script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.5.1/dist/sphere-gl.min.js" defer></script>

<sphere-gl
  atlas="ocean"
  mode="fluted"
  mood="system"
  grain="1.65"
  style="min-height: 100dvh; display: grid; place-items: center; color: var(--sphere-ink);"
>
  <h1>A fresh background on every visit.</h1>
</sphere-gl>
```

Or add `data-sphere-bg` to `<body>` or any container element:

```html
<body data-sphere-bg data-transition-in data-sphere-mode="sphere" data-sphere-grain="1.65">
  <h1 style="color: var(--sphere-ink)">A fresh background on every visit.</h1>
  <script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.5.1/dist/sphere-gl.min.js" defer></script>
</body>
```

### Option 2: Install for React, Next.js, Vite, or TypeScript

Install directly from the `v1.5.1` release tag (zero runtime dependencies, `.d.ts` types included):

```bash
npm install github:denissitnikov/sphere-gl#v1.5.1
```

## Features at a glance

| Capability | How `sphere-gl` handles it |
| :--- | :--- |
| **Perceptual color & wide gamut** | Generates chords in `OKLCH`, blends in `OKLab` with midtone chroma-loss compensation, and outputs `Display-P3` on wide-gamut screens (`sRGB` elsewhere) with soft-shoulder gamut compression. |
| **Sleep-first `0%` idle GPU** | Draws a single Retina frame in about `0.8 ms` and stops. Wakes only on pointer movement (`Solas Light`), theme changes, or resize, and pauses offscreen canvases via `IntersectionObserver`. |
| **Verified `>= 4.5:1` UI contrast** | Evaluates a 3x3 analytical `OKLab` grid across the central hero zone (or a custom `focusRect`) and sets `--sphere-ink` and `--sphere-glass` with at least `4.5:1` WCAG contrast against both median and worst-quartile samples. |
| **OS light & dark mode sync** | Defaults to `mood="system"`, watching `prefers-color-scheme` and `<html class="dark">` to morph between day and night palettes while locking sphere positions in place. |
| **7 specialized shader modes** | Compiles only the active mode via `#define STYLE` and async `KHR_parallel_shader_compile`: `mesh`, `sphere`, `silk`, `caustic`, `fluted`, `prism`, and `topo`. |
| **Zero-flash SSR first paint** | Renders `--sphere-*` tokens and an `in oklab` CSS radial gradient on the server before WebGL2 finishes compiling on the client. |
| **Solar Clock (`solar`)** | Moves the keylight along an east-to-west arc from the visitor's local clock (`06:00` dawn, noon zenith, `18:00` sunset, cool night moon), updating once every 10 minutes via `setTimeout`. |
| **4K/5K & vector exports** | Exports tiled offscreen WebGL2 `PNG`/`WebP`/`JPG` up to `5K`, `linearRGB` `SVG`, and `in oklab` + `Display-P3` `@supports` `CSS` via `sphere-gl/export`. |

### How `sphere-gl` compares

| Metric | `sphere-gl` (`v1.5.1`) | Typical WebGL mesh libraries | Static 4K hero PNG |
| :--- | :--- | :--- | :--- |
| **Core bundle (gzip)** | **`12.31 KB`** (`1.25 KB` React wrapper) | `11 KB` to `45 KB` | `2,000 KB` to `5,000 KB` |
| **Color blending space** | **`OKLCH` + `OKLab` + `Display-P3`** | Linear or gamma `sRGB` (gray midpoints) | Baked `sRGB` pixels |
| **Idle GPU & battery usage** | **`0%`** (1-shot frame + wake-on-pointer) | Continuous `60fps` `requestAnimationFrame` | `0%` |
| **Foreground text contrast** | **Automatic `--sphere-ink` (`>= 4.5:1` WCAG)** | Manual guesswork | Manual guesswork |
| **SSR / First Contentful Paint** | **Inline `in oklab` CSS gradient** | Blank canvas until JS + WebGL init | Progressive image load |
| **Shader modes** | **7 optical modes** (`#define` specialized) | 1 to 20 modes (often 1 uber-shader) | 1 static image |

## Why I built this

I wanted a background for my own website, [slidetab.app](https://slidetab.app), that looked fresh on every visit without shipping a 4 MB PNG or draining laptop batteries with an always-on 60fps shader loop.

When I tried randomizing colors in standard gradients, three problems kept coming back. Blending opposite colors like blue and orange in standard `sRGB` turns the middle into a dull gray-brown. Randomizing lightness breaks text legibility whenever a bright pole lands behind white text or a dark background appears while the visitor's OS is in Light Mode. And most WebGL background scripts run `requestAnimationFrame` forever even when nothing on screen is moving.

`sphere-gl` picks color chords in `OKLCH`, blends them in `OKLab` with a lightness lift where opposite hues meet, and outputs wide-gamut `Display-P3` on P3 displays (`sRGB` elsewhere) with soft-shoulder compression. Blue-to-orange transitions pass through bright periwinkle or warm peach instead of mud.

<img src="./assets/oklab-vs-srgb.jpg" alt="Comparison between naive sRGB midpoint and sphere-gl OKLab blending" width="100%" />

By default (`mood="system"`), it reads `prefers-color-scheme` and `<html class="dark">` so visitors get a light palette in Light Mode and a dark palette in Dark Mode. Toggling the OS appearance morphs the palette between day and night while keeping every sphere anchored in the same spot.

Interactive frames (`Solas Light`, morphs, and optional 60fps drift) render into a persistent scaled FBO under a hard `1.6 MP` pixel ceiling with an 8-frame median GPU-timing governor, then blit with `gl.LINEAR` to the static-resolution canvas (`<= 5.2 MP`, up to `3x` DPR on iPhone and Pixel displays) without reallocating the canvas backbuffer. Full-page canvases size to `100dvh`, sync the browser toolbar via `<meta name="theme-color">`, pause when the tab is hidden, and use device tilt to drive `Solas Light` on phones.

## Framework usage

### React and Next.js (`sphere-gl/react`, 1.25 KB gzip)

When deterministic props (`seed`, `atlas`, `colors`, or `url`) are passed, `SphereBackground` renders `--sphere-*` tokens and an `in oklab` CSS gradient inline during SSR so text and color appear on First Contentful Paint with no flash:

```tsx
import { SphereBackground } from 'sphere-gl/react';

export function Hero() {
  return (
    <SphereBackground
      mode="sphere"                       // 'mesh' | 'sphere' | 'silk' | 'caustic' | 'fluted' | 'prism' | 'topo' | 'auto'
      mood="system"                       // 'system' | 'any' | 'light' | 'split' | 'dark'
      atlas="dawn-meadow"                 // Irish atlas ID or semantic alias ('forest', 'ocean', 'amber'...)
      focusRect={[0.2, 0.25, 0.8, 0.75]}  // optional hero text box [x0, y0, x1, y1]
      solar={true}                        // Solar Clock: light follows local time of day
      grain={1.65}                        // 0 = off (keeps +/-0.5 LSB anti-banding dither)
      lightFollow={true}                  // Solas Light cursor tilt (0% idle when pointer stops)
      motion={false}                      // false = 1-shot frame; true = continuous 60fps drift
      style={{ minHeight: '100dvh', color: 'var(--sphere-ink)' }}
    >
      <h1>Every visit renders a fresh canvas.</h1>
    </SphereBackground>
  );
}
```

You can also copy any preset URL from the [Live Studio](https://denissitnikov.github.io/sphere-gl/) and pass it to `url`:

```tsx
<SphereBackground url="https://denissitnikov.github.io/sphere-gl/#seed=F4L8G2&col=dingle-horizon&style=sphere&grain=1.65" />
```

For server-only token generation without mounting React:

```ts
import { getSphereTokensAndCss } from 'sphere-gl/palettes';

const { tokens, cssBackground, theme } = getSphereTokensAndCss({
  seed: '7F3K9A',
  atlas: 'paper',
});
```

### CSS variables and Tailwind CSS v4

`parseColorToOklab()` natively parses CSS Color 4 values (`oklch()`, `oklab()`, `hsl()`, percentage `rgb()`, and `#hex`) directly into floating-point `OKLab` without 8-bit quantization. Leave `--sphere-color-*` unset for automatic `OKLCH` palettes, pick an atlas, or pass 2 to 6 brand colors:

```css
#hero {
  --sphere-mode: fluted;         /* mesh | sphere | silk | caustic | fluted | prism | topo | auto */
  --sphere-atlas: skellig-night; /* or semantic alias: ocean, fintech, amber, forest, paper, slate, sunset */
  --sphere-gamut: auto;          /* auto | p3 | srgb */
  --sphere-grain: 1.65;

  /* Or pass 2 to 6 Tailwind v4 oklch(), oklab(), hsl(), rgb(), or #hex brand colors:
  --sphere-color-1: oklch(0.97 0.012 85);
  --sphere-color-2: oklch(0.62 0.19 255);
  --sphere-color-3: oklch(0.71 0.17 42);
  --sphere-color-4: oklch(0.58 0.21 302);
  */

  color: var(--sphere-ink);
}

#hero .card {
  background: var(--sphere-glass);
  border: 1px solid var(--sphere-glass-border);
  backdrop-filter: blur(24px);
}
```

### Framer code component (`sphere-gl/framer`, 1.58 KB gzip)

In Framer, open **Assets > Code > Create Code File** and paste:

```tsx
export { default } from "https://esm.sh/gh/denissitnikov/sphere-gl@v1.5.1/src/framer.js?external=react,framer"
```

### Vanilla ES module and exports (`sphere-gl` + `sphere-gl/export`)

Optional subsystems (`sphere-gl/export` and the Canvas2D CPU `sphere-gl/fallback`) live in separate subpath modules and load only when requested:

```ts
import { mountSphereBackground } from 'sphere-gl';
import { exportCSS, exportSVG } from 'sphere-gl/export';

const bg = mountSphereBackground('#hero', {
  mode: 'fluted',
  mood: 'system',
  atlas: 'boyne-solstice',
  gamut: 'auto',
  grain: 1.65,
  onScene(scene) {
    console.log(scene.seed, scene.uiTokens.theme, scene.paletteSwatches);
  },
});

// Update grain or mode while preserving the current seed:
bg.regenerate({ mode: 'prism', grain: 0 });

// Roll a new seed with a 540ms OKLab GPU morph:
bg.regenerate({ seed: 'random', morph: true });

// Synchronous CSS (in oklab + Display-P3 @supports + sRGB fallback) and linearRGB SVG:
const cssText = exportCSS(bg.scene!);
const svgText = exportSVG(bg.scene!, { width: 1200, height: 630 });

// Offscreen WebGL2 FBO export (tiled automatically above MAX_RENDERBUFFER_SIZE):
const webpBlob = await bg.exportImage({ width: 3840, height: 2160, format: 'webp', strict: true });
```

## Optical modes and Irish atlases

### 7 optical shader modes

| Mode | Optical profile |
| :--- | :--- |
| `mesh` | Soft multi-pole watercolor diffusion with domain-warped organic boundaries. |
| `sphere` | Diffused 3D macro sphere with grazing keylight, rim glow, and shadow falloff. |
| `silk` | Anisotropic satin ribbon folds driven by cross-gradient flow vectors. |
| `caustic` | Sharp refractive light cusps and underwater focal ridges. |
| `fluted` | Cylindrical ribbed glass refraction (`sin(uv.x * freq)`) with Fresnel edge highlights. |
| `prism` | Chromatic `OKLab` `a`/`b` dispersion separated along the analytical `gradM` derivative field. |
| `topo` | Single-pass anti-aliased topographic elevation isolines over the `OKLab` luminance field. |

### 15 Irish optical atlases and semantic aliases

You can pass either a canonical Irish atlas ID or a semantic intent alias to `atlas` / `data-sphere-atlas`:

| Pack | Atlas ID | Name & inspiration | Semantic aliases | Default mode |
| :--- | :--- | :--- | :--- | :--- |
| **Coast & Sky** | `burren-chalk` | *Burren Chalk* (Limestone & Gorse) | `paper`, `editorial`, `minimal`, `chalk`, `ivory` | `mesh` |
| **Coast & Sky** | `skellig-night` | *Skellig Night* (Atlantic Sapphire) | `ocean`, `fintech`, `sapphire`, `navy`, `midnight` | `silk` |
| **Coast & Sky** | `antrim-basalt` | *Antrim Basalt* (Causeway Obsidian) | `slate`, `obsidian`, `mono`, `charcoal` | `silk` |
| **Coast & Sky** | `boyne-solstice` | *Boyne Solstice* (Chamber Corona) | `eclipse`, `solstice` | `sphere` |
| **Coast & Sky** | `wicklow-amber` | *Wicklow Amber* (Peat & Molten Gold) | `amber`, `gold`, `luxury`, `bronze`, `honey` | `silk` |
| **Coast & Sky** | `achill-dusk` | *Achill Dusk* (Heather & Sea-Glass) | `lavender`, `twilight`, `violet` | `silk` |
| **Coast & Sky** | `dingle-horizon` | *Dingle Horizon* (Bay & Sunset Tangerine) | `sunset`, `coral`, `horizon`, `peach` | `sphere` |
| **Coast & Sky** | `connemara-lough` | *Connemara Lough* (Jade & Teal Cusps) | `teal`, `lagoon`, `jade` | `caustic` |
| **Emerald Isle** | `dawn-meadow` | *Dawn Meadow* (Dew & First Light) | `forest`, `sage`, `matcha`, `meadow`, `mint` | `mesh` |
| **Emerald Isle** | `moss-stone` | *Moss & Stone* (Lichen on Granite) | `moss`, `stone`, `granite` | `mesh` |
| **Emerald Isle** | `peat-bog` | *Peat Bog* (Turf & Bog Cotton) | `peat`, `earth` | `silk` |
| **Emerald Isle** | `gorse-hedgerow` | *Gorse Hedgerow* (Furze & Hawthorn) | `gorse`, `citrine` | `sphere` |
| **Emerald Isle** | `moher-slate` | *Moher Slate* (Cliff & Atlantic Foam) | `cliff`, `nordic` | `sphere` |
| **Emerald Isle** | `glen-shade` | *Glen Shade* (Fern & Rain) | `fern`, `emerald` | `caustic` |
| **Emerald Isle** | `oak-canopy` | *Oak Canopy* (Bark & Sunlit Leaf) | `oak`, `olive` | `silk` |

## HTML attributes and CSS tokens

| Input attribute | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `data-sphere-bg` | *(presence)* | | Mounts `<canvas>` (`z-index: -1`) behind all children. |
| `data-transition-in` | *(presence)* | `false` | Fades in over `320ms` on the first GPU frame over the instant CSS placeholder. |
| `data-sphere-mode` | `auto` \| `mesh` \| `sphere` \| `silk` \| `caustic` \| `fluted` \| `prism` \| `topo` | `auto` | Optical geometry mode (`data-sphere-style` also accepted). |
| `data-sphere-mood` | `system` \| `any` \| `light` \| `split` \| `dark` | `system` | Matches OS `prefers-color-scheme` and `<html class="dark">` by default. |
| `data-sphere-gamut` | `auto` \| `p3` \| `srgb` | `auto` | Enables wide-gamut `Display-P3` WebGL2 drawing buffers on P3 screens. |
| `data-sphere-atlas` | Any atlas ID or semantic alias from the table above | | Locks color generation to a curated Irish optical atlas. |
| `data-sphere-focus` | `x0,y0,x1,y1` | | Normalized `0..1` hero text box where overlapping high-chroma or dark poles attenuate. |
| `data-sphere-solar` | *(presence)* \| `true` \| `false` | `false` | Solar Clock: light follows local time of day. Add `data-sphere-hour="7.5"` to pin an hour. |
| `data-sphere-harmony` | `auto` \| `<archetype-id>` | `auto` | Specific color harmony when no atlas is set. |
| `data-sphere-grain` | `0` to `2.5` | `1.0` | Film grain (`1.0` = Fine, `1.65` = Editorial, `0` = Off with `+/-0.5 LSB` anti-banding dither). |
| `data-sphere-light-follow` | `true` \| `false` \| `0.0` to `1.5` | `true` | `Solas Light` tilt keylight (wakes on pointer move or phone tilt, sleeps at `0%` when still). |
| `data-sphere-motion` | `true` \| `false` | `false` | `false` = `0%` idle static mode; `true` = continuous `60fps` drift. |
| `data-sphere-preset` | `<Studio URL>` | | Reproduces any URL copied from the [Live Studio](https://denissitnikov.github.io/sphere-gl/). |
| `data-sphere-colors` | `color1,color2,...` | | Custom brand palette (2 to 6 `#hex`, `oklch()`, `oklab()`, `hsl()`, or `rgb()` colors). |

Mounted containers (and `<html>` when mounted on `<body>`) receive `data-sphere-theme="light|dark"` along with these CSS custom properties:

`--sphere-base` · `--sphere-bloom` · `--sphere-accent` · `--sphere-ink` · `--sphere-ink-muted` · `--sphere-glass` · `--sphere-glass-border`

## Subpath exports and bundle sizes

Every subpath is tree-shakeable, declares `"types"` first in `package.json`, and is verified in CI by `scripts/build.mjs`:

| Import path | Artifact | Raw size | Gzipped | Purpose |
| :--- | :--- | ---: | ---: | :--- |
| `sphere-gl` | `dist/sphere-gl.esm.min.js` | `28.41 KB` | **`12.31 KB`** | Core WebGL2 renderer, DOM mount, `<sphere-gl>` Custom Element, URL presets. |
| `sphere-gl/palettes` | `dist/sphere-gl.palettes.js` | `24.71 KB` | **`12.18 KB`** | Zero-WebGL SSR (`getSphereTokensAndCss`), OKLCH/OKLab/P3 math, 3x3 WCAG solver, 15 atlases. |
| `sphere-gl/react` | `dist/sphere-gl.react.js` | `2.76 KB` | **`1.25 KB`** | `<SphereBackground>` React & Next.js SSR component (`sphere-gl` externalized). |
| `sphere-gl/framer` | `dist/sphere-gl.framer.js` | `3.78 KB` | **`1.58 KB`** | Framer Canvas code component with property controls. |
| `sphere-gl/export` | `dist/sphere-gl.export.js` | `7.98 KB` | **`3.51 KB`** | Lazy on-demand `exportImage`, `exportPNG`, `exportSVG`, `exportCSS`. |
| `sphere-gl/fallback` | `dist/sphere-gl.fallback.js` | `5.46 KB` | **`2.77 KB`** | Lazy on-demand Canvas2D CPU renderer (loaded only if WebGL2 is unavailable). |
| `sphere-gl/studio` | `dist/sphere-gl.studio.js` | `0.95 KB` | **`0.65 KB`** | Curated hero seed lists for the Studio UI. |
| CDN `<script>` (IIFE) | `dist/sphere-gl.min.js` | `54.04 KB` | **`24.37 KB`** | All-in-one self-mounting browser bundle (`window.SphereGL` + `<sphere-gl>`). |

For AI coding assistants and LLM toolchains, see [llms.txt](./llms.txt) for a single-file reference of valid enums, semantic aliases, SSR helpers, and WCAG contrast rules.

## Development and contributing

Requires Node.js `18.0.0` or newer (`esbuild` is the only dev dependency; runtime dependencies stay at zero).

```bash
git clone https://github.com/denissitnikov/sphere-gl.git
cd sphere-gl
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for bundle budget and contrast checks, [SECURITY.md](./SECURITY.md) for vulnerability reporting, and [CHANGELOG.md](./CHANGELOG.md) for release notes.

## License

Built by [Denis S.](https://github.com/denissitnikov). Released under the [MIT License](./LICENSE).
