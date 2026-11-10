<div align="center">

# sphere-gl

**Synthesize a fresh, never-muddy WebGL2 studio canvas on every visit—in `< 1 ms` GPU with `0%` idle battery.**

[![Live Studio](https://img.shields.io/badge/Live_Studio-Open_Playground-10b981?style=flat-square)](https://denissitnikov.github.io/sphere-gl/)
[![Bundle Size](https://img.shields.io/badge/gzip-22_KB-3b82f6?style=flat-square)](https://github.com/denissitnikov/sphere-gl/releases)
[![Dependencies](https://img.shields.io/badge/dependencies-0-8b5cf6?style=flat-square)](#)
[![Idle GPU](https://img.shields.io/badge/idle_GPU-0%25-f59e0b?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b?style=flat-square)](./LICENSE)

<br />

<a href="https://denissitnikov.github.io/sphere-gl/">
  <img src="./assets/banner-showcase.jpg" alt="sphere-gl three rendering modes: Light Watercolor Mesh, Split Cerulean-Tangerine Sphere, and Dark Electric Sapphire Silk" width="100%" />
</a>

**[Open Live Studio & 5K Wallpaper Generator →](https://denissitnikov.github.io/sphere-gl/)**

</div>

---

## 10-Second Quickstart (`whatamesh`-simple, OS Dark/Light aware)

Drop 2 lines into any HTML page. Every reload synthesizes a harmonious `OKLCH` background in ~`0.8 ms` on the GPU, **automatically matches the visitor's OS / browser Light vs. Dark schema (`prefers-color-scheme`)**, goes **100% idle**, and live-switches in `< 1 ms` if the user toggles macOS/iOS Dark Mode:

```html
<body data-sphere-bg data-transition-in data-sphere-style="sphere" data-sphere-grain="1.65">
  <h1 style="color: var(--sphere-ink)">A fresh canvas on every visit.</h1>

  <script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.2.0/dist/sphere-gl.min.js" defer></script>
</body>
```

---

## Use With Your Stack

<details open>
<summary><strong>1. Pure CSS Variables (Override Brand Colors or Style Glass UI)</strong></summary>

Leave `--sphere-color-*` unset for automatic `OKLCH` harmonies on every visit, or supply 2–6 custom brand hexes (also supports `--gradient-color-1..4` for drop-in `whatamesh` migration):

```css
#hero {
  --sphere-style: sphere;
  --sphere-grain: 1.65;
  /* Optional custom palette (blended in OKLab with anti-muddy scatter lift): */
  --sphere-color-1: #fbf8f0;
  --sphere-color-2: #2563eb;
  --sphere-color-3: #ff7a45;
  --sphere-color-4: #a855f7;

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
<script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.2.0/dist/sphere-gl.min.js" defer></script>
```
</details>

<details>
<summary><strong>2. React / Next.js (`sphere-gl/react`)</strong></summary>

```tsx
import { SphereBackground } from 'sphere-gl/react';

export function Hero() {
  return (
    <SphereBackground
      mode="sphere"      // 'sphere' | 'mesh' | 'silk' | 'auto'
      mood="system"      // 'system' (matches OS dark/light) | 'any' | 'light' | 'split' | 'dark'
      grain={1.65}
      motion={false}     // false = <1ms 1-shot frame (0% idle GPU); true = 60fps drift
      style={{ minHeight: '100vh', color: 'var(--sphere-ink)' }}
    >
      <h1>Every visit renders a fresh canvas.</h1>
    </SphereBackground>
  );
}
```

Or copy **any URL directly from the [Live Studio](https://denissitnikov.github.io/sphere-gl/)** and pass it via `url="..."`:
```tsx
<SphereBackground url="https://denissitnikov.github.io/sphere-gl/#seed=7K9P2M&style=sphere&grain=1.65" />
```
</details>

<details>
<summary><strong>3. Framer (Zero-Code Drag & Drop Component)</strong></summary>

In Framer, go to **Assets → Code → Create Code File** and paste these 2 lines to unlock native Framer right-sidebar controls (`Fresh Each Visit`, `Lock Seed`, `Studio URL`, `Custom Colors`, `Style`, `Mood`, `Film Grain`, `60fps Drift`):

```tsx
export { default } from "https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.2.0/dist/sphere-gl.framer.js"
```
</details>

<details>
<summary><strong>4. Vanilla ES Module / Offscreen 5K PNG Export</strong></summary>

```js
import { mountSphereBackground } from 'https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.2.0/dist/sphere-gl.esm.min.js';

const bg = mountSphereBackground('#hero', {
  style: 'sphere',
  mood: 'system', // Default: syncs with prefers-color-scheme & <html class="dark">
  grain: 1.65,
  onScene(scene) {
    console.log(scene.seed, scene.uiTokens.theme, scene.paletteSwatches);
  },
});

// Re-roll a new seed in <1 ms:
// bg.regenerate();

// Export an offscreen 5K Studio Display PNG Blob:
// const blob = await bg.exportPNG({ width: 5120, height: 2880 });
```
</details>

---

## Why Random Gradients Usually Look Muddy (And How `sphere-gl` Fixes It)

Most WebGL gradient libraries expect you to hardcode 4 hex colors because randomizing opposing colors (like cerulean blue + sunset tangerine) in `sRGB` collapses through desaturated murky gray-brown in the center:

<img src="./assets/oklab-vs-srgb.jpg" alt="Comparison between naive sRGB muddy midpoint and sphere-gl OKLab scatter lift" width="100%" />

`sphere-gl` combines four techniques in a single bufferless `#version 300 es` GPU triangle (~`0.8 ms` at Retina resolution):
1. **Perceptual `OKLCH` Art Director:** Synthesizes palettes across 13 studio harmonies (plus a continuous harmonic chord explorer) with constant-`L`/`H` gamut binary search so vivid oranges and sapphires never clip flat.
2. **Analytical `OKLab` Chroma-Loss Scatter Lift:** Detects exact regions where opposing hues meet (`chromaLoss = avgChroma - length(blendedLab.yz)`) and applies atmospheric lightness lift + harmonic hue-arc bridging through periwinkle/peach mist.
3. **32-bit PCG Triangular-PDF Film Grain:** Eliminates 8-bit Mach banding across ultra-soft `f/0.95` optical blurs while adding a tactile editorial print finish.
4. **Zero Idle Battery Drain + Adaptive UI Tokens:** Renders **1 single Retina frame** on load (and resize), then sleeps at `0%` CPU/GPU—while exposing guaranteed WCAG `>= 4.5:1` foreground tokens (`--sphere-ink`, `--sphere-glass`, `data-sphere-theme="light|dark"`).

---

## How `sphere-gl` Fits Into the Ecosystem

| Library | Best For | Bundle | Idle GPU | Random Reload Safe? |
| :--- | :--- | :--- | :--- | :--- |
| **`sphere-gl`** | **Generative reload canvases, `f/0.95` spheres, adaptive UI & 5K wallpapers** | **22 KB** | **`0%` static** *(or 60fps)* | **Yes (`OKLCH` + UI tokens)** |
| `ShaderGradient` | Heavy interactive 3D React Three Fiber scenes | ~450 KB+ | `60fps` loop | Manual preset colors |
| `whatamesh` / `NEAT` | Classic Stripe-style 3D Perlin wave creases | ~18–35 KB | `60fps` loop | Manual 4 hex colors |

---

## HTML Attributes & Auto-Generated CSS Tokens

| Input Attribute | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `data-sphere-bg` | *(presence)* | — | Auto-mounts `<canvas>` (`z-index: -1`) behind all children. |
| `data-transition-in` | *(presence)* | `false` | Smooth `320ms` opacity fade-in on first GPU frame. |
| `data-sphere-style` | `auto` \| `sphere` \| `mesh` \| `silk` | `auto` | Shader geometry mode. |
| `data-sphere-mood` | `system` \| `any` \| `light` \| `split` \| `dark` | `system` | Defaults to `system` (matches OS `prefers-color-scheme` & `<html class="dark">` live). Use `any` for unconstrained random. |
| `data-sphere-harmony` | `auto` \| `<archetype-id>` | `auto` | Specific harmony (`cerulean-tangerine`, `alabaster-honey`, `electric-sapphire`, etc.). |
| `data-sphere-grain` | `0` – `2.5` | `1.0` | Film grain (`1.0` = Fine, `1.65` = Editorial, `0` = Off). |
| `data-sphere-motion` | `true` \| `false` | `false` | `false` = 1-shot static (`0%` idle); `true` = 60fps drift + pointer parallax. |
| `data-sphere-preset` | `<Studio URL>` | — | Reproduces any URL copied from the [Live Studio](https://denissitnikov.github.io/sphere-gl/). |
| `data-sphere-colors` | `#hex1,#hex2,...` | — | Optional custom brand palette (2–6 colors). |

**Output tokens automatically set on your element (and `<html>` when mounted on `<body>`):**
`data-sphere-theme="light|dark"` · `--sphere-base` · `--sphere-bloom` · `--sphere-accent` · `--sphere-ink` · `--sphere-ink-muted` · `--sphere-glass` · `--sphere-glass-border`

---

## Credits & License

Created by **Denis S.** — maker of [**SlideTab**](https://slidetab.app) *(instant multi-touch trackpad window switching for macOS)*.  
Released under the [MIT License](./LICENSE).
