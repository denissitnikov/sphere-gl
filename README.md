# sphere-gl

`sphere-gl` is a 29 KB gzipped WebGL2 and OKLCH engine that generates non-muddy website backgrounds and 5K wallpapers, matches OS light and dark mode, and sleeps at `0%` GPU between interactions.

[![CI](https://github.com/denissitnikov/sphere-gl/actions/workflows/ci.yml/badge.svg)](https://github.com/denissitnikov/sphere-gl/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b?style=flat-square)](./LICENSE)

Live generator and 5K wallpaper studio: [denissitnikov.github.io/sphere-gl](https://denissitnikov.github.io/sphere-gl/)

<a href="https://denissitnikov.github.io/sphere-gl/">
  <img src="./assets/banner-showcase.jpg" alt="sphere-gl rendering modes: Watercolor Mesh, Diffused Macro Sphere, and Satin Silk" width="100%" />
</a>

## Why I built this

I wanted a background for my own website that looked fresh on every visit without shipping a 4 MB PNG or draining laptop batteries with an always-on 60fps shader loop.

When I tried randomizing colors in standard gradients, three problems kept coming back. Blending opposite colors like blue and orange in standard `sRGB` turns the middle into a dull gray-brown. Randomizing lightness breaks text legibility whenever a bright background lands behind white text or a dark background appears while the visitor's OS is in Light Mode. And most WebGL background scripts run `requestAnimationFrame` forever even when nothing on screen is moving.

`sphere-gl` picks color chords in `OKLCH` and blends them in `OKLab` with a lightness lift where opposite hues meet, so blue-to-orange transitions pass through bright periwinkle or warm peach instead of mud.

By default (`mood="system"`), it reads `prefers-color-scheme` and `<html class="dark">` so visitors get a light palette in Light Mode and a dark palette in Dark Mode. Toggling the OS appearance morphs the palette between day and night while keeping every sphere anchored in the same spot, and updates `--sphere-ink` and `--sphere-glass` CSS variables with a guaranteed WCAG contrast ratio of at least `4.5:1`.

On load, it draws a single Retina frame in about `0.8 ms` on the GPU and stops. Moving the mouse wakes `Solas Light` long enough to tilt a soft grazing keylight across the surface, then drops back to `0%` CPU and GPU as soon as the pointer rests.

Turning on `data-sphere-solar` activates the Solar Clock, which ties the keylight to the visitor's local clock. The bloom rises on the east edge at `06:00`, sits high overhead at noon, sinks warm to the west at `18:00`, and becomes a low cool moon at night while keeping the seed and sphere geometry unchanged. Updates run once every 10 minutes from a `setTimeout`, keeping idle GPU use at `0%`.

On phones, interactive frames (`Solas Light`, morphs, and 60fps drift) render under a `1.6 MP` pixel budget while the settled frame renders at full native resolution up to `3x` DPR on iPhone and Pixel displays. Full-page canvases size to `100dvh`, sync the browser toolbar via `<meta name="theme-color">`, pause when the tab is hidden, and use device tilt to drive `Solas Light` on touch screens.

The [Live Studio](https://denissitnikov.github.io/sphere-gl/) includes 15 curated Irish optical atlases split into two packs: Coast & Sky (*Burren Chalk*, *Skellig Night*, *Antrim Basalt*, *Boyne Solstice*, *Wicklow Amber*, *Achill Dusk*, *Dingle Horizon*, *Connemara Lough*) and Emerald Isle (*Dawn Meadow*, *Moss & Stone*, *Peat Bog*, *Gorse Hedgerow*, *Moher Slate*, *Glen Shade*, *Oak Canopy*), sampled from moss, turf, gorse, lichen on granite, and wet pasture at first light. Any scene exports to `4K` or `5K` `PNG`, `WebP`, `JPG`, vector `SVG`, or pure `CSS`.

<img src="./assets/oklab-vs-srgb.jpg" alt="Comparison between naive sRGB midpoint and sphere-gl OKLab blending" width="100%" />

## Install

Install from npm for bundlers, React, or Next.js:

```bash
npm install sphere-gl
```

Or load the self-mounting browser bundle directly from jsDelivr with no build step:

```html
<script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.4.1/dist/sphere-gl.min.js" defer></script>
```

## Quickstart

Add `data-sphere-bg` to `<body>` or any container element:

```html
<body data-sphere-bg data-transition-in data-sphere-style="sphere" data-sphere-grain="1.65">
  <h1 style="color: var(--sphere-ink)">A fresh background on every visit.</h1>

  <script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.4.1/dist/sphere-gl.min.js" defer></script>
</body>
```

## Framework usage

### CSS variables

Leave `--sphere-color-*` unset for automatic `OKLCH` palettes on every visit, pick one of the 15 Irish atlases, or pass 2 to 6 custom hex colors:

```css
#hero {
  --sphere-style: sphere;       /* sphere | mesh | silk | caustic | auto */
  --sphere-atlas: skellig-night; /* optional: burren-chalk, dawn-meadow, peat-bog... */
  --sphere-grain: 1.65;

  /* Or supply 2 to 6 custom brand colors:
  --sphere-color-1: #fbf8f0;
  --sphere-color-2: #2563eb;
  --sphere-color-3: #ff7a45;
  --sphere-color-4: #a855f7;
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
<script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.4.1/dist/sphere-gl.min.js" defer></script>
```

### React and Next.js (`sphere-gl/react`)

```tsx
import { SphereBackground } from 'sphere-gl/react';

export function Hero() {
  return (
    <SphereBackground
      mode="sphere"        // 'sphere' | 'mesh' | 'silk' | 'caustic' | 'auto'
      mood="system"        // 'system' (matches OS dark/light) | 'any' | 'light' | 'split' | 'dark'
      atlas="dawn-meadow"  // optional Irish atlas preset
      solar={true}         // Solar Clock: light follows local time of day
      grain={1.65}
      lightFollow={true}   // Solas Light cursor tilt (0% idle when pointer stops)
      motion={false}       // false = 1-shot frame; true = continuous 60fps drift
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

### Framer code component

In Framer, open **Assets > Code > Create Code File** and paste one line to get right-sidebar controls for Palette, Atlas, Style, Mood, Film Grain, Solas Light, Solar Clock, and 60fps Drift:

```tsx
export { default } from "https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.4.1/dist/sphere-gl.framer.js"
```

### Vanilla ES module and exports (`PNG`, `WebP`, `JPG`, `SVG`, `CSS`)

```js
import { mountSphereBackground } from 'sphere-gl';

const bg = mountSphereBackground('#hero', {
  style: 'sphere',
  mood: 'system',
  atlas: 'boyne-solstice',
  grain: 1.65,
  onScene(scene) {
    console.log(scene.seed, scene.uiTokens.theme, scene.paletteSwatches);
  },
});

// Roll a new seed with an OKLab morph:
// bg.regenerate({ morph: true });

// Export as PNG, WebP, JPG, SVG, or CSS:
// const webpBlob = await bg.exportImage({ width: 3840, height: 2160, format: 'webp' });
// const svgText  = bg.exportSVG({ width: 1200, height: 630 });
// const cssText  = bg.exportCSS();
```

## HTML attributes and CSS tokens

| Input attribute | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `data-sphere-bg` | *(presence)* | | Mounts `<canvas>` (`z-index: -1`) behind all children. |
| `data-transition-in` | *(presence)* | `false` | Fades in over `320ms` on the first GPU frame. |
| `data-sphere-style` | `auto` \| `sphere` \| `mesh` \| `silk` \| `caustic` | `auto` | Optical geometry mode. |
| `data-sphere-mood` | `system` \| `any` \| `light` \| `split` \| `dark` | `system` | Matches OS `prefers-color-scheme` and `<html class="dark">` by default. |
| `data-sphere-atlas` | Coast & Sky: `burren-chalk` \| `skellig-night` \| `antrim-basalt` \| `boyne-solstice` \| `wicklow-amber` \| `achill-dusk` \| `dingle-horizon` \| `connemara-lough`<br>Emerald Isle: `dawn-meadow` \| `moss-stone` \| `peat-bog` \| `gorse-hedgerow` \| `moher-slate` \| `glen-shade` \| `oak-canopy` | | Optional curated Irish atlas. |
| `data-sphere-solar` | *(presence)* \| `true` \| `false` | `false` | Solar Clock: light follows local time of day. Add `data-sphere-hour="7.5"` to pin an hour. |
| `data-sphere-harmony` | `auto` \| `<archetype-id>` | `auto` | Specific color harmony when no atlas is set. |
| `data-sphere-grain` | `0` to `2.5` | `1.0` | Film grain (`1.0` = Fine, `1.65` = Editorial, `0` = Off). |
| `data-sphere-light-follow` | `true` \| `false` \| `0.0` to `1.5` | `true` | `Solas Light` tilt keylight (wakes on pointer move or phone tilt, sleeps at `0%` when still). |
| `data-sphere-motion` | `true` \| `false` | `false` | `false` = `0%` idle static mode; `true` = continuous `60fps` drift. |
| `data-sphere-preset` | `<Studio URL>` | | Reproduces any URL copied from the [Live Studio](https://denissitnikov.github.io/sphere-gl/). |
| `data-sphere-colors` | `#hex1,#hex2,...` | | Custom brand palette (2 to 6 colors). |

Mounted containers (and `<html>` when mounted on `<body>`) receive `data-sphere-theme="light|dark"` along with these CSS custom properties:

`--sphere-base` · `--sphere-bloom` · `--sphere-accent` · `--sphere-ink` · `--sphere-ink-muted` · `--sphere-glass` · `--sphere-glass-border`

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
