/**
 * sphere-gl
 * Zero-dependency procedural WebGL2 background & 4K/5K wallpaper engine.
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
  parseCssColorBytes,
  srgbHexToOklab,
  detectColorScheme,
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
  parseCssColorBytes,
  srgbHexToOklab,
  detectColorScheme,
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
 * Parses a Studio share URL, query string (`?seed=...`), or hash string (`#seed=...`)
 * into normalized `mountSphereBackground` options (ShaderGradient-style URL preset workflow).
 *
 * @param {string} urlOrQuery
 * @returns {object}
 */
export function parsePresetUrl(urlOrQuery) {
  if (typeof urlOrQuery !== 'string' || !urlOrQuery.trim()) return {};
  const raw = urlOrQuery.trim();
  const merged = new URLSearchParams();

  const ingest = (part) => {
    if (!part) return;
    const clean = part.replace(/^[?#]+/, '');
    if (!clean) return;
    const sp = new URLSearchParams(clean);
    for (const [k, v] of sp.entries()) {
      merged.set(k, v);
    }
  };

  try {
    if (raw.includes('://')) {
      const u = new URL(raw);
      ingest(u.search);
      ingest(u.hash);
    } else {
      const [beforeHash, afterHash] = raw.split('#');
      if (beforeHash && (beforeHash.includes('=') || beforeHash.startsWith('?'))) {
        ingest(beforeHash);
      }
      if (afterHash) ingest(afterHash);
    }
  } catch (_) {
    ingest(raw);
  }

  const out = {};
  if (merged.has('seed')) {
    const s = merged.get('seed').trim();
    if (s && s !== 'auto' && s !== 'random') out.seed = s.toUpperCase();
  }
  if (merged.has('style')) out.style = merged.get('style').trim().toLowerCase();
  if (merged.has('mood')) out.mood = merged.get('mood').trim().toLowerCase();
  if (merged.has('harmony') || merged.has('arch') || merged.has('archetype')) {
    out.harmony = (
      merged.get('harmony') ||
      merged.get('arch') ||
      merged.get('archetype')
    ).trim();
  }
  if (merged.has('grain')) {
    const g = Number(merged.get('grain'));
    if (Number.isFinite(g)) out.grain = g;
  }
  if (merged.has('motion')) {
    out.motion = parseBool(merged.get('motion'), false);
  }
  if (merged.has('colors')) {
    const list = merged
      .get('colors')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (list.length >= 2) out.colors = list;
  }
  return out;
}

/**
 * Formats a shareable Studio preset URL from a scene & current studio settings.
 */
export function formatPresetUrl(
  scene,
  {
    grain = 1.65,
    motion = false,
    lockSeed = true,
    colors = null,
    baseUrl = 'https://denissitnikov.github.io/sphere-gl/',
  } = {},
) {
  const params = new URLSearchParams();
  if (lockSeed && scene?.seed) params.set('seed', scene.seed);
  if (scene?.style) params.set('style', scene.style);
  if (scene?.mood) params.set('mood', scene.mood);
  if (scene?.archetypeId && scene.archetypeId !== 'custom-palette') {
    params.set('arch', scene.archetypeId);
  }
  if (Number.isFinite(grain)) params.set('grain', String(grain));
  if (motion) params.set('motion', '1');
  if (Array.isArray(colors) && colors.length >= 2) {
    params.set('colors', colors.join(','));
  }
  return `${baseUrl}#${params.toString()}`;
}

function readCssVariableConfig(el) {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function' || !el) {
    return {};
  }
  const cs = window.getComputedStyle(el);
  const colors = [];
  for (let i = 1; i <= 6; i++) {
    const val =
      cs.getPropertyValue(`--sphere-color-${i}`).trim() ||
      cs.getPropertyValue(`--gradient-color-${i}`).trim();
    if (val) colors.push(val);
  }

  const out = {};
  if (colors.length >= 2) out.colors = colors;

  const cssStyle = cs.getPropertyValue('--sphere-style').trim();
  if (cssStyle) out.style = cssStyle;

  const cssMood = cs.getPropertyValue('--sphere-mood').trim();
  if (cssMood) out.mood = cssMood;

  const cssHarmony = cs.getPropertyValue('--sphere-harmony').trim();
  if (cssHarmony) out.harmony = cssHarmony;

  const cssGrain = cs.getPropertyValue('--sphere-grain').trim();
  if (cssGrain !== '') {
    const g = Number(cssGrain);
    if (Number.isFinite(g)) out.grain = g;
  }

  return out;
}

/**
 * Mounts a procedural WebGL2 background onto any DOM container (`body`, `section`, `div`)
 * or directly onto an existing `<canvas>` element (`whatamesh`-style).
 *
 * Automatically exposes `data-sphere-theme="light|dark"` and adaptive CSS tokens:
 * `--sphere-base`, `--sphere-bloom`, `--sphere-accent`, `--sphere-ink`,
 * `--sphere-ink-muted`, `--sphere-glass`, `--sphere-glass-border`.
 *
 * @param {HTMLElement | HTMLCanvasElement | string} [target=document.body]
 * @param {object} [options]
 */
export function mountSphereBackground(target, options = {}) {
  const el =
    typeof target === 'string'
      ? document.querySelector(target)
      : target || document.body;

  if (!el) {
    throw new Error(`mountSphereBackground: target "${target}" not found.`);
  }

  if (el.__sphereInstance) {
    return el.__sphereInstance;
  }

  const ds = el.dataset || {};
  const isDirectCanvas = el.tagName === 'CANVAS';
  const container = isDirectCanvas ? el.parentElement || document.body : el;
  const isFullPage =
    !isDirectCanvas &&
    (container === document.body || container === document.documentElement);

  const presetUrl =
    options.url ?? options.preset ?? ds.spherePreset ?? ds.sphereUrl ?? '';
  const urlCfg = presetUrl ? parsePresetUrl(presetUrl) : {};
  const cssCfg = readCssVariableConfig(el);

  const attrColors = ds.sphereColors
    ? ds.sphereColors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  let cfg = {
    seed: options.seed ?? urlCfg.seed ?? ds.sphereSeed ?? undefined,
    style: options.style ?? urlCfg.style ?? ds.sphereStyle ?? cssCfg.style ?? 'auto',
    mood: options.mood ?? urlCfg.mood ?? ds.sphereMood ?? cssCfg.mood ?? 'system',
    archetype:
      options.harmony ??
      options.archetype ??
      urlCfg.harmony ??
      ds.sphereHarmony ??
      ds.sphereArchetype ??
      cssCfg.harmony ??
      'auto',
    colors: options.colors ?? urlCfg.colors ?? attrColors ?? cssCfg.colors ?? null,
    grainScale: parseNum(
      options.grain ??
        options.grainScale ??
        urlCfg.grain ??
        ds.sphereGrain ??
        cssCfg.grain,
      1.0,
    ),
    motion: parseBool(
      options.motion ?? urlCfg.motion ?? ds.sphereMotion,
      false,
    ),
    transitionIn: parseBool(
      options.transitionIn ??
        (el.hasAttribute?.('data-transition-in') ? true : ds.sphereTransitionIn),
      false,
    ),
    maxDpr: parseNum(options.maxDpr ?? ds.sphereMaxDpr, 2),
  };

  let canvas;
  if (isDirectCanvas) {
    canvas = el;
  } else {
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

    canvas = document.createElement('canvas');
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
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  if (cfg.transitionIn && !prefersReducedMotion) {
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)';
  }

  const renderer = new SphereRenderer(canvas, {
    maxDpr: cfg.maxDpr,
    onTiming: options.onTiming,
  });

  let currentScene = null;
  let revealed = false;

  function applyThemeAttributes(node, scene) {
    if (!node || !node.style) return;
    const t = scene.uiTokens;
    node.dataset.sphereTheme = t.theme;
    node.dataset.sphereMood = scene.mood;
    node.dataset.sphereStyle = scene.style;
    node.dataset.sphereSeed = scene.seed;
    node.style.setProperty('--sphere-base', scene.baseHex);
    node.style.setProperty('--sphere-bloom', scene.bloomHex);
    node.style.setProperty('--sphere-accent', t.accent);
    node.style.setProperty('--sphere-ink', t.ink);
    node.style.setProperty('--sphere-ink-muted', t.inkMuted);
    node.style.setProperty('--sphere-glass', t.glass);
    node.style.setProperty('--sphere-glass-border', t.glassBorder);
  }

  function applyScene(seedOverride) {
    currentScene = generateScene({
      seed: seedOverride,
      style: cfg.style,
      mood: cfg.mood,
      archetype: cfg.archetype,
      colors: cfg.colors,
    });

    applyThemeAttributes(container, currentScene);
    if (isDirectCanvas) applyThemeAttributes(canvas, currentScene);
    if (isFullPage) {
      applyThemeAttributes(document.documentElement, currentScene);
      document.documentElement.style.backgroundColor = currentScene.baseHex;
    }

    renderer.resize();
    if (cfg.motion && !prefersReducedMotion) {
      renderer.stopMotion();
      renderer.startMotion(currentScene, { grainScale: cfg.grainScale });
    } else {
      renderer.stopMotion();
      renderer.renderOnce(currentScene, { grainScale: cfg.grainScale });
    }

    if (cfg.transitionIn && !revealed) {
      revealed = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          canvas.style.opacity = '1';
        });
      } else {
        canvas.style.opacity = '1';
      }
    }

    if (typeof options.onScene === 'function') {
      options.onScene(currentScene);
    }

    if (typeof CustomEvent === 'function') {
      el.dispatchEvent(
        new CustomEvent('sphere:change', {
          detail: currentScene,
          bubbles: true,
        }),
      );
    }

    return currentScene;
  }

  let lastDetectedScheme = detectColorScheme();
  applyScene(cfg.seed);

  // Live OS prefers-color-scheme & site theme toggle sync when mood === 'system'
  const syncSystemScheme = () => {
    const activeMood = String(cfg.mood || 'system').trim().toLowerCase();
    if (activeMood !== 'system') return;
    const nextScheme = detectColorScheme();
    if (nextScheme === lastDetectedScheme) return;
    lastDetectedScheme = nextScheme;
    applyScene(cfg.seed);
  };

  let schemeMedia = null;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      schemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
      if (typeof schemeMedia.addEventListener === 'function') {
        schemeMedia.addEventListener('change', syncSystemScheme);
      } else if (typeof schemeMedia.addListener === 'function') {
        schemeMedia.addListener(syncSystemScheme);
      }
    } catch (_) {
      schemeMedia = null;
    }
  }

  const themeObserver =
    typeof MutationObserver === 'function' && typeof document !== 'undefined' && document.documentElement
      ? new MutationObserver(syncSystemScheme)
      : null;

  if (themeObserver) {
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-bs-theme'],
    });
  }

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
    ro.observe(isFullPage ? document.documentElement : el);
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
      if (next.url || next.preset) {
        Object.assign(cfg, parsePresetUrl(next.url || next.preset));
      }
      if (next.style !== undefined) cfg.style = next.style;
      if (next.mood !== undefined) cfg.mood = next.mood;
      if (next.harmony !== undefined) cfg.archetype = next.harmony;
      if (next.archetype !== undefined) cfg.archetype = next.archetype;
      if (next.colors !== undefined) cfg.colors = next.colors;
      if (next.grain !== undefined) cfg.grainScale = parseNum(next.grain, 1.0);
      if (next.grainScale !== undefined) cfg.grainScale = parseNum(next.grainScale, 1.0);
      if (next.motion !== undefined) cfg.motion = Boolean(next.motion);
      return applyScene(next.seed);
    },
    refreshCssVariables() {
      const updatedCss = readCssVariableConfig(el);
      if (updatedCss.colors) cfg.colors = updatedCss.colors;
      if (updatedCss.style) cfg.style = updatedCss.style;
      if (updatedCss.mood) cfg.mood = updatedCss.mood;
      if (updatedCss.harmony) cfg.archetype = updatedCss.harmony;
      if (updatedCss.grain !== undefined) cfg.grainScale = updatedCss.grain;
      return applyScene(cfg.seed);
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
      if (themeObserver) themeObserver.disconnect();
      if (schemeMedia) {
        if (typeof schemeMedia.removeEventListener === 'function') {
          schemeMedia.removeEventListener('change', syncSystemScheme);
        } else if (typeof schemeMedia.removeListener === 'function') {
          schemeMedia.removeListener(syncSystemScheme);
        }
      }
      if (isFullPage) window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.destroy();
      if (!isDirectCanvas) canvas.remove();
      delete el.__sphereInstance;
    },
  };

  el.__sphereInstance = instance;
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
