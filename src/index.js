/**
 * sphere-gl
 * Zero-dependency procedural WebGL2 background & wallpaper engine.
 * Synthesizes studio-grade diffused macro spheres, organic watercolor meshes,
 * and satin silk ribbons in <1 ms on GPU using perceptual OKLCH/OKLab color harmony.
 */

import { SphereRenderer, AuraRenderer } from './shader.js';
import {
  STYLE_MODES,
  MOOD_MODES,
  ARCHETYPES,
  randomSeed,
  generateScene,
  oklchToOklab,
  oklabToLinearSrgb,
  clampToGamutOklab,
  oklabToSrgbHex,
} from './palettes.js';

export {
  SphereRenderer,
  AuraRenderer,
  STYLE_MODES,
  MOOD_MODES,
  ARCHETYPES,
  randomSeed,
  generateScene,
  oklchToOklab,
  oklabToLinearSrgb,
  clampToGamutOklab,
  oklabToSrgbHex,
};

function parseBool(val, fallback = false) {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return fallback;
}

function parseNum(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Mounts a procedural WebGL2 background inside any DOM element or `document.body`.
 * Automatically layers behind all children (`isolation: isolate` + `z-index: -1`)
 * and exposes `data-sphere-theme="light|dark"` + CSS custom properties.
 *
 * @param {HTMLElement | string} [target=document.body]
 * @param {object} [options]
 * @param {string} [options.seed] - Omit to generate a fresh harmonious palette on every load
 * @param {'auto'|'sphere'|'mesh'|'silk'} [options.style='auto']
 * @param {'auto'|'light'|'split'|'dark'} [options.mood='auto']
 * @param {string} [options.harmony='auto'] - Harmony archetype ID (alias: `archetype`)
 * @param {number} [options.grain=1.0] - Film grain multiplier (`1.0` Fine, `1.65` Editorial, `0` Off)
 * @param {boolean} [options.motion=false] - `false` renders 1 static frame in <1 ms (0% idle GPU)
 * @param {boolean} [options.interactivePointer=true] - Subtle pointer parallax when `motion: true`
 * @param {number} [options.maxDpr=2]
 * @param {Function} [options.onScene] - `(scene) => void`
 * @param {Function} [options.onTiming] - `({ cpuMs, gpuMs, width, height, backend }) => void`
 */
export function mountSphereBackground(target, options = {}) {
  const container =
    typeof target === 'string'
      ? document.querySelector(target)
      : target || document.body;

  if (!container) {
    throw new Error(`mountSphereBackground: target "${target}" not found.`);
  }

  // Prevent duplicate auto-mounts on the same element
  if (container.__sphereInstance) {
    return container.__sphereInstance;
  }

  const ds = container.dataset || {};
  const isFullPage =
    container === document.body || container === document.documentElement;

  let cfg = {
    seed: options.seed ?? ds.sphereSeed ?? undefined,
    style: options.style ?? ds.sphereStyle ?? 'auto',
    mood: options.mood ?? ds.sphereMood ?? 'auto',
    archetype:
      options.harmony ??
      options.archetype ??
      ds.sphereHarmony ??
      ds.sphereArchetype ??
      'auto',
    grainScale: parseNum(
      options.grain ?? options.grainScale ?? ds.sphereGrain,
      1.0,
    ),
    motion: parseBool(options.motion ?? ds.sphereMotion, false),
    maxDpr: parseNum(options.maxDpr ?? ds.sphereMaxDpr, 2),
  };

  // Establish clean stacking context so z-index: -1 sits behind static text/cards
  if (isFullPage) {
    document.body.style.isolation = 'isolate';
    document.body.style.backgroundColor = 'transparent';
  } else {
    const computed = window.getComputedStyle(container);
    if (computed.position === 'static') {
      container.style.position = 'relative';
    }
    if (computed.isolation === 'auto') {
      container.style.isolation = 'isolate';
    }
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'sphere-gl-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: isFullPage ? 'fixed' : 'absolute',
    inset: '0',
    width: isFullPage ? '100vw' : '100%',
    height: isFullPage ? '100vh' : '100%',
    display: 'block',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  container.prepend(canvas);

  const renderer = new SphereRenderer(canvas, {
    maxDpr: cfg.maxDpr,
    onTiming: options.onTiming,
  });

  let currentScene = null;

  function applyThemeAttributes(el, scene) {
    const theme = scene.isDark ? 'dark' : 'light';
    el.dataset.sphereTheme = theme;
    el.dataset.sphereMood = scene.mood;
    el.dataset.sphereStyle = scene.style;
    el.dataset.sphereSeed = scene.seed;
    el.style.setProperty('--sphere-base', scene.baseHex);
    el.style.setProperty('--sphere-bloom', scene.bloomHex);
    el.style.setProperty(
      '--sphere-accent',
      scene.paletteSwatches[1] || scene.paletteSwatches[0] || scene.baseHex,
    );
  }

  function applyScene(seedOverride) {
    currentScene = generateScene({
      seed: seedOverride,
      style: cfg.style,
      mood: cfg.mood,
      archetype: cfg.archetype,
    });

    applyThemeAttributes(container, currentScene);
    if (isFullPage) {
      applyThemeAttributes(document.documentElement, currentScene);
      // Match Safari/macOS overscroll rubber-band canvas to the generated seed base
      document.documentElement.style.backgroundColor = currentScene.baseHex;
    }

    renderer.resize();
    if (cfg.motion) {
      renderer.stopMotion();
      renderer.startMotion(currentScene, { grainScale: cfg.grainScale });
    } else {
      renderer.stopMotion();
      renderer.renderOnce(currentScene, { grainScale: cfg.grainScale });
    }

    if (typeof options.onScene === 'function') {
      options.onScene(currentScene);
    }

    if (typeof CustomEvent === 'function') {
      container.dispatchEvent(
        new CustomEvent('sphere:change', {
          detail: currentScene,
          bubbles: true,
        }),
      );
    }

    return currentScene;
  }

  applyScene(cfg.seed);

  let resizeRaf = 0;
  const ro =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          if (resizeRaf) cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(() => {
            renderer.resize();
            if (currentScene && !renderer.isAnimating) {
              renderer.renderOnce(currentScene, { grainScale: cfg.grainScale });
            }
          });
        })
      : null;

  if (ro) {
    ro.observe(isFullPage ? document.documentElement : container);
  }

  const onWindowResize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      renderer.resize();
      if (currentScene && !renderer.isAnimating) {
        renderer.renderOnce(currentScene, { grainScale: cfg.grainScale });
      }
    });
  };
  if (isFullPage) {
    window.addEventListener('resize', onWindowResize, { passive: true });
  }

  const onPointerMove = (e) => {
    if (!renderer.isAnimating) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    renderer.setPointer(nx, ny);
  };

  if (options.interactivePointer !== false) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  const instance = {
    canvas,
    renderer,
    get scene() {
      return currentScene;
    },
    regenerate(next = {}) {
      if (next.style !== undefined) cfg.style = next.style;
      if (next.mood !== undefined) cfg.mood = next.mood;
      if (next.harmony !== undefined) cfg.archetype = next.harmony;
      if (next.archetype !== undefined) cfg.archetype = next.archetype;
      if (next.grain !== undefined) cfg.grainScale = parseNum(next.grain, 1.0);
      if (next.grainScale !== undefined) cfg.grainScale = parseNum(next.grainScale, 1.0);
      if (next.motion !== undefined) cfg.motion = Boolean(next.motion);
      return applyScene(next.seed);
    },
    exportPNG(exportOpts = {}) {
      return renderer.exportPNG(currentScene, {
        grainScale: cfg.grainScale,
        ...exportOpts,
      });
    },
    destroy() {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (ro) ro.disconnect();
      if (isFullPage) window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.destroy();
      canvas.remove();
      delete container.__sphereInstance;
    },
  };

  container.__sphereInstance = instance;
  return instance;
}

export { mountSphereBackground as mount, mountSphereBackground as mountAuraBackground };

/**
 * Automatically mounts SphereGL on all `[data-sphere-bg]` elements in the document.
 * Ideal for strict CSP (`script-src 'self'`) sites requiring zero inline JS.
 */
export function autoMountSphereBackgrounds(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const instances = [];
  if (root === document && document.documentElement?.hasAttribute('data-sphere-bg')) {
    instances.push(mountSphereBackground(document.documentElement));
  }
  const nodes = root.querySelectorAll('[data-sphere-bg]');
  for (const el of nodes) {
    instances.push(mountSphereBackground(el));
  }
  return instances;
}
