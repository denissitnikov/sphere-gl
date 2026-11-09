# sphere-gl

**Sub-millisecond WebGL2 & OKLCH procedural background and 4K/5K wallpaper engine.**  
Zero dependencies · **19 KB gzipped** · `0%` idle CPU/GPU in static mode · Automatic light/dark theme detection.

- **Live Wallpaper Studio:** [denissitnikov.github.io/sphere-gl](https://denissitnikov.github.io/sphere-gl/)
- **License:** MIT

---

## Why `sphere-gl`?

Standard CSS/Canvas gradients suffer from three classic problems when randomized:
1. **Muddy midtones** — Mixing opposing colors (like cerulean blue and sunset orange) in sRGB/HSL collapses through murky gray-brown in the center.
2. **8-bit color banding** — Wide, soft atmospheric blurs produce visible stepped Mach rings on modern Retina/HDR displays.
3. **Heavy image payloads** — Shipping 2–5 MB PNG hero backgrounds slows LCP and shows the exact same static image on every visit.

`sphere-gl` solves all three in a single bufferless `#version 300 es` GPU fragment shader draw call (~`0.5–1.5 ms` at Retina resolution):
- **Perceptual `OKLCH` Harmony + Chroma-Loss Scatter Lift:** Palettes are generated in `OKLCH` across 13 studio harmonies (plus a continuous harmonic chord explorer) and blended in `OKLab` with analytical opposing-chord scatter lift—so opposing spectrum poles glide through luminous periwinkle/peach mist instead of gray.
- **3 Studio Geometry Modes:**
  - `sphere` — Macro-scale 3D luminous planetary bodies diffused through an `f/0.95` optical blur with C2-continuous quintic falloff.
  - `mesh` — Multi-octave domain-warped liquid watercolor folds with breathable negative space.
  - `silk` — Anisotropic satin ribbon folds with soft crest sheen.
- **32-bit PCG Triangular-PDF Film Grain + C1 Gamut Compression:** Eliminates 8-bit banding and adds a tactile editorial print finish without harsh RGB channel clipping.
- **Zero Battery Drain (`0%` Idle):** By default, renders **one single GPU frame** on load (and on resize), then goes completely idle—or optionally drifts at 60/120fps with damped pointer parallax.

---

## Quick Start (2 Lines, Zero Inline JS, Strict-CSP Friendly)

Add `data-sphere-bg` to `<body>` (or any `<section>`/`<div>`) and include the script via CDN or self-hosting:

```html
<body
  data-sphere-bg
  data-sphere-style="sphere"
  data-sphere-mood="auto"
  data-sphere-grain="1.65"
>
  <main>
    <h1>Fresh studio canvas on every visit.</h1>
  </main>

  <!-- Via jsDelivr CDN (or self-host /vendor/sphere-gl.min.js for strict script-src 'self' CSP) -->
  <script src="https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.0.0/dist/sphere-gl.min.js" defer></script>
</body>
```

### Automatic Light / Dark CSS Adaptation

Whenever `sphere-gl` generates a scene, it automatically sets `data-sphere-theme="light"` or `data-sphere-theme="dark"` (plus `--sphere-base`, `--sphere-bloom`, and `--sphere-accent` CSS variables) on your target element and `<html>`:

```css
/* Adapt website typography & frosted glass automatically when mood="auto" */
html[data-sphere-theme="light"] {
  --text-primary: #0f172a;
  --text-secondary: rgba(15, 23, 42, 0.68);
  --glass-surface: rgba(255, 255, 255, 0.56);
}

html[data-sphere-theme="dark"] {
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.70);
  --glass-surface: rgba(15, 23, 42, 0.48);
}
```

---

## JavaScript / ES Module API

```html
<script type="module">
  import { mountSphereBackground } from 'https://cdn.jsdelivr.net/gh/denissitnikov/sphere-gl@v1.0.0/dist/sphere-gl.esm.min.js';

  const bg = mountSphereBackground('#hero', {
    style: 'sphere',    // 'sphere' | 'mesh' | 'silk' | 'auto'
    mood: 'auto',       // 'light' | 'split' | 'dark' | 'auto'
    harmony: 'auto',    // 'auto' or specific archetype ID (e.g. 'cerulean-tangerine')
    grain: 1.65,        // 0 = off, 1.0 = fine, 1.65 = editorial
    motion: false,      // false = 1-shot <1ms static frame (0% idle GPU); true = 60fps drift
    // seed: '7F3K9A',  // omit for a new color each time, or pass a 6-char seed to lock it
    onScene(scene) {
      console.log('Rendered seed:', scene.seed, 'isDark:', scene.isDark, scene.paletteSwatches);
    },
  });

  // Generate a new palette on demand in <1 ms:
  // bg.regenerate();

  // Export an offscreen 4K or 5K PNG Blob:
  // const blob = await bg.exportPNG({ width: 5120, height: 2880 });
</script>
```

---

## HTML `data-sphere-*` Attributes Reference

| Attribute | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `data-sphere-bg` | *(presence)* | — | Auto-mounts a background `<canvas>` (`z-index: -1`) inside the element. |
| `data-sphere-style` | `auto` \| `sphere` \| `mesh` \| `silk` | `auto` | Shader geometry mode. |
| `data-sphere-mood` | `auto` \| `light` \| `split` \| `dark` | `auto` | Luminance & contrast family. |
| `data-sphere-harmony` | `auto` \| `<archetype-id>` | `auto` | Curated `OKLCH` color harmony (`cerulean-tangerine`, `alabaster-honey`, `electric-sapphire`, `harmonic-wild`, etc.). |
| `data-sphere-grain` | `0` – `2.5` | `1.0` | Physical-pixel film grain (`1.0` = Fine, `1.65` = Editorial, `0` = Off). |
| `data-sphere-motion` | `true` \| `false` | `false` | `false` renders once (`0%` idle GPU); `true` enables subtle 60fps drift + pointer parallax. |
| `data-sphere-seed` | e.g. `7F3K9A` | *(random)* | Optional deterministic seed. Omit to synthesize a fresh palette on every load. |

---

## Local Development

Zero external runtime dependencies.

```bash
git clone https://github.com/denissitnikov/sphere-gl.git
cd sphere-gl
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## Credits & License

Created by **Denis S.** — maker of [**SlideTab**](https://slidetab.app) (instant multi-touch trackpad window switching for macOS).  
Released under the [MIT License](./LICENSE).
