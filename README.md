# sphere-gl

`sphere-gl` is an 11.9 KB gzipped WebGL2, OKLCH, and Display-P3 engine that generates non-muddy website backgrounds and 5K wallpapers, matches OS light and dark mode, and sleeps at `0%` GPU between interactions.

[![CI](https://github.com/denissitnikov/sphere-gl/actions/workflows/ci.yml/badge.svg)](https://github.com/denissitnikov/sphere-gl/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b?style=flat-square)](./LICENSE)

Live generator and 5K wallpaper studio: [denissitnikov.github.io/sphere-gl](https://denissitnikov.github.io/sphere-gl/)

<a href="https://denissitnikov.github.io/sphere-gl/">
  <img src="./assets/banner-showcase.jpg" alt="sphere-gl rendering modes: Watercolor Mesh, Diffused Macro Sphere, and Satin Silk" width="100%" />
</a>

## Why I built this

I wanted a background for my own website that looked fresh on every visit without shipping a 4 MB PNG or draining laptop batteries with an always-on 60fps shader loop.

When I tried randomizing colors in standard gradients, three problems kept coming back. Blending opposite colors like blue and orange in standard `sRGB` turns the middle into a dull gray-brown. Randomizing lightness breaks text legibility whenever a bright pole lands behind white text or a dark background appears while the visitor's OS is in Light Mode. And most WebGL background scripts run `requestAnimationFrame` forever even when nothing on screen is moving.

`sphere-gl` picks color chords in `OKLCH`, blends them in `OKLab` with a lightness lift where opposite hues meet, and outputs wide-gamut `Display-P3` on P3 displays (`sRGB` elsewhere) with soft-shoulder gamut compression. Blue-to-orange transitions pass through bright periwinkle or warm peach instead of mud.

By default (`mood="system"`), it reads `prefers-color-scheme` and `<html class="dark">` so visitors get a light palette in Light Mode and a dark palette in Dark Mode. Toggling the OS appearance morphs the palette between day and night while keeping every sphere anchored in the same spot. `computeUiTokens()` samples a deterministic 3x3 `OKLab` grid across the central hero zone (or a custom `focusRect`) and sets `--sphere-ink` and `--sphere-glass` CSS variables with a verified WCAG contrast ratio of at least `4.5:1` against both the median and worst-quartile hero samples.

On load, an inline `in oklab` CSS gradient paints immediately while WebGL2 compiles asynchronously via `KHR_parallel_shader_compile`, then draws a single Retina frame in about `0.8 ms` on the GPU and stops. Moving the mouse wakes `Solas Light` long enough to tilt a soft grazing keylight across the surface, then drops back to `0%` CPU and GPU as soon as the pointer rests. Offscreen canvases automatically pause via `IntersectionObserver`.

Turning on `data-sphere-solar` activates the Solar Clock, which ties the keylight to the visitor's local clock. The bloom rises on the east edge at `06:00`, sits high overhead at noon, sinks warm to the west at `18:00`, and becomes a low cool moon at night while keeping the seed and sphere geometry unchanged. Updates run once every 10 minutes from a `setTimeout`, keeping idle GPU use at `0%`.

Interactive frames (`Solas Light`, morphs, and 60fps drift) render into a persistent scaled FBO under a strict `1.6 MP` pixel budget with a closed-loop GPU-timing governor and blit cleanly to the static-resolution canvas (`<= 5.2 MP`, up to `3x` DPR on iPhone and Pixel displays) without backbuffer reallocation. Full-page canvases size to `100dvh`, sync the browser toolbar via `<meta name="theme-color">`, pause when the tab is hidden, and use device tilt to drive `Solas Light` on touch screens.

Seven specialized shader modes ship out of the box: `mesh`, `sphere`, `silk`, `caustic`, `fluted` (cylindrical ribbed glass refraction), `prism` (chromatic `OKLab` dispersion), and `topo` (anti-aliased topographic isolines).

The [Live Studio](https://denissitnikov.github.io/sphere-gl/) includes 15 curated Irish optical atlases split into two packs: Coast & Sky (*Burren Chalk*, *Skellig Night*, *Antrim Basalt*, *Boyne Solstice*, *Wicklow Amber*, *Achill Dusk*, *Dingle Horizon*, *Connemara Lough*) and Emerald Isle (*Dawn Meadow*, *Moss & Stone*, *Peat Bog*, *Gorse Hedgerow*, *Moher Slate*, *Glen Shade*, *Oak Canopy*), plus semantic intent aliases (`ocean`, `fintech`, `amber`, `forest`, `paper`, `slate`, `sunset`). Any scene exports to `4K` or `5K` `PNG`, `WebP`, `JPG`, vector `SVG`, or `in oklab` / `Display-P3` `CSS`.

<img src="./assets/oklab-vs-srgb.jpg" alt="Comparison between naive sRGB midpoint and sphere-gl OKLab blending" width="100%" />

## Install

Install from npm for TypeScript, bundlers, React, Next.js, Astro, Vue, or Svelte (`0` runtime dependencies, full `.d.ts` types included):

```bash
npm install sphere-gl
```

Or load the self-mounting browser bundle directly from jsDelivr with no build step:

```html
<script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.5.0/dist/sphere-gl.min.js" defer></script>
```

## Quickstart

### `<sphere-gl>` Web Component (HTML, Astro, Vue, Svelte, Webflow)

```html
<script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.5.0/dist/sphere-gl.min.js" defer></script>

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

### `data-sphere-bg` attribute

Add `data-sphere-bg` to `<body>` or any container element:

```html
<body data-sphere-bg data-transition-in data-sphere-mode="sphere" data-sphere-grain="1.65">
  <h1 style="color: var(--sphere-ink)">A fresh background on every visit.</h1>

  <script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.5.0/dist/sphere-gl.min.js" defer></script>
</body>
```

## Framework usage

### CSS variables and Tailwind CSS v4 (`oklch`, `oklab`, `hsl`, `#hex`)

Leave `--sphere-color-*` unset for automatic `OKLCH` palettes on every visit, pick one of the 15 Irish atlases (or a semantic alias like `fintech` or `paper`), or pass 2 to 6 custom CSS Color 4 values:

```css
#hero {
  --sphere-mode: fluted;         /* mesh | sphere | silk | caustic | fluted | prism | topo | auto */
  --sphere-atlas: skellig-night; /* or semantic alias: ocean, fintech, amber, forest, paper, slate, sunset */
  --sphere-gamut: auto;          /* auto | p3 | srgb */
  --sphere-grain: 1.65;

  /* Or supply 2 to 6 Tailwind v4 oklch(), oklab(), hsl(), rgb(), or #hex brand colors:
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

```html
<section id="hero" data-sphere-bg data-transition-in>...</section>
<script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.5.0/dist/sphere-gl.min.js" defer></script>
```

### React and Next.js (`sphere-gl/react`, 1.25 KB gzip)

When deterministic props (`seed`, `atlas`, `colors`, or `url`) are supplied, `SphereBackground` renders `--sphere-*` tokens and an `in oklab` CSS gradient inline during SSR so text and color appear on First Contentful Paint with no flash:

```tsx
import { SphereBackground } from 'sphere-gl/react';

export function Hero() {
  return (
    <SphereBackground
      mode="sphere"                  // 'mesh' | 'sphere' | 'silk' | 'caustic' | 'fluted' | 'prism' | 'topo' | 'auto'
      mood="system"                  // 'system' | 'any' | 'light' | 'split' | 'dark'
      atlas="dawn-meadow"            // Irish atlas ID or semantic alias ('forest', 'ocean', 'amber'...)
      focusRect={[0.2, 0.25, 0.8, 0.75]} // optional hero text box [x0, y0, x1, y1]
      solar={true}                   // Solar Clock: light follows local time of day
      grain={1.65}
      lightFollow={true}             // Solas Light cursor tilt (0% idle when pointer stops)
      motion={false}                 // false = 1-shot frame; true = continuous 60fps drift
      style={{ minHeight: '100vh', color: 'var(--sphere-ink)' }}
    >
      <h1>Every visit renders a fresh canvas.</h1>
    </SphereBackground>
  );
}
```

You can also copy any URL from the [Live Studio](https://denissitnikov.github.io/sphere-gl/) and pass it to `url`:

```tsx
<SphereBackground url="https://denissitnikov.github.io/sphere-gl/#seed=F4L8G2&col=dingle-horizon&style=sphere&grain=1.65" />
```

For server-only token generation without mounting React:

```ts
import { getSphereTokensAndCss } from 'sphere-gl/palettes';

const { tokens, cssBackground, theme } = getSphereTokensAndCss({ seed: '7F3K9A', atlas: 'paper' });
```

### Framer code component (`sphere-gl/framer`)

In Framer, open **Assets > Code > Create Code File** and paste:

```tsx
export { default } from "https://esm.sh/sphere-gl@1.5.0/framer?external=react,framer"
```

### Vanilla ES module and exports (`sphere-gl` + `sphere-gl/export`)

Optional subsystems (`sphere-gl/export` and the Canvas2D CPU `sphere-gl/fallback`) are split out of the core bundle and loaded only when needed:

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

// Update grain or mode while keeping the current seed:
// bg.regenerate({ mode: 'prism', grain: 0 });

// Roll a fresh seed with an OKLab morph:
// bg.regenerate({ seed: 'random', morph: true });

// Synchronous CSS (in oklab + Display-P3 @supports + sRGB fallback) and linearRGB SVG:
// const cssText = exportCSS(bg.scene!);
// const svgText = exportSVG(bg.scene!, { width: 1200, height: 630 });

// Full-resolution offscreen WebGL2 FBO export (tiled automatically above MAX_RENDERBUFFER_SIZE):
// const webpBlob = await bg.exportImage({ width: 3840, height: 2160, format: 'webp', strict: true });
```

## HTML attributes and CSS tokens

| Input attribute | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `data-sphere-bg` | *(presence)* | | Mounts `<canvas>` (`z-index: -1`) behind all children. |
| `data-transition-in` | *(presence)* | `false` | Fades in over `320ms` on the first GPU frame over the instant CSS placeholder. |
| `data-sphere-mode` | `auto` \| `mesh` \| `sphere` \| `silk` \| `caustic` \| `fluted` \| `prism` \| `topo` | `auto` | Optical geometry mode (`data-sphere-style` also accepted). |
| `data-sphere-mood` | `system` \| `any` \| `light` \| `split` \| `dark` | `system` | Matches OS `prefers-color-scheme` and `<html class="dark">` by default. |
| `data-sphere-gamut` | `auto` \| `p3` \| `srgb` | `auto` | Enables wide-gamut `Display-P3` WebGL2 drawing buffers on P3 screens. |
| `data-sphere-atlas` | Coast & Sky: `burren-chalk` \| `skellig-night` \| `antrim-basalt` \| `boyne-solstice` \| `wicklow-amber` \| `achill-dusk` \| `dingle-horizon` \| `connemara-lough`<br>Emerald Isle: `dawn-meadow` \| `moss-stone` \| `peat-bog` \| `gorse-hedgerow` \| `moher-slate` \| `glen-shade` \| `oak-canopy`<br>Semantic aliases: `ocean` \| `fintech` \| `amber` \| `forest` \| `paper` \| `slate` \| `sunset` | | Optional curated Irish atlas or semantic intent alias. |
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

For AI coding assistants and LLM toolchains, see [llms.txt](./llms.txt) for a single-file reference of valid enums, semantic aliases, SSR helpers, and WCAG contrast rules.

## Development

Requires Node.js 18 or newer (`esbuild` is the only dev dependency; runtime dependencies stay at zero).

```bash
git clone https://github.com/denissitnikov/sphere-gl.git
cd sphere-gl
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for bundle size and contrast checks, and [CHANGELOG.md](./CHANGELOG.md) for release history.

## License

Built by [Denis S.](https://github.com/denissitnikov). Released under the [MIT License](./LICENSE).
