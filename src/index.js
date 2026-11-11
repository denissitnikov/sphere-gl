import { SphereRenderer, AuraRenderer, STYLE_MAP, styleToIndex } from './shader.js';
import {
  STYLE_MODES,
  MOOD_MODES,
  ARCHETYPES,
  COLLECTIONS,
  ATLASES,
  ATLAS_GROUPS,
  randomSeed,
  generateScene,
  solarPhase,
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
  STYLE_MAP,
  styleToIndex,
  STYLE_MODES,
  MOOD_MODES,
  ARCHETYPES,
  COLLECTIONS,
  ATLASES,
  ATLAS_GROUPS,
  randomSeed,
  generateScene,
  solarPhase,
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

function normalizeAtlasId(raw) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return v && v !== 'all' && v !== 'auto' && v !== 'none' ? v : null;
}

function resolveWhisperStrength(val) {
  if (val === false || val === 'false' || val === '0' || val === 'off') return 0;
  if (typeof val === 'number' && Number.isFinite(val)) return Math.max(0, Math.min(1.5, val));
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n)) return Math.max(0, Math.min(1.5, n));
  }
  return parseBool(val, true) ? 1.0 : 0;
}

export function parsePresetUrl(urlOrQuery) {
  if (typeof urlOrQuery !== 'string' || !urlOrQuery.trim()) return {};
  const raw = urlOrQuery.trim();
  const merged = new URLSearchParams();

  const ingest = (part) => {
    if (!part) return;
    const clean = part.replace(/^[?#]+/, '');
    if (!clean) return;
    for (const [k, v] of new URLSearchParams(clean).entries()) {
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
  if (merged.has('atlas') || merged.has('collection') || merged.has('col')) {
    const col = normalizeAtlasId(
      merged.get('atlas') ?? merged.get('collection') ?? merged.get('col'),
    );
    if (col) {
      out.atlas = col;
      out.collection = col;
    }
  }
  if (merged.has('grain')) {
    const g = Number(merged.get('grain'));
    if (Number.isFinite(g)) out.grain = g;
  }
  if (merged.has('motion')) {
    out.motion = parseBool(merged.get('motion'), false);
  }
  if (merged.has('light') || merged.has('whisper')) {
    const rawL = merged.get('light') ?? merged.get('whisper');
    const numL = Number(rawL);
    out.lightFollow = Number.isFinite(numL) && rawL.trim() !== '' ? numL : parseBool(rawL, true);
  }
  if (merged.has('solar')) out.solar = parseBool(merged.get('solar'), true);
  if (merged.has('hour')) {
    const hr = Number(merged.get('hour'));
    if (Number.isFinite(hr)) out.solarHour = hr;
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

export function formatPresetUrl(
  scene,
  {
    grain = 1.65,
    motion = false,
    lockSeed = true,
    colors = null,
    solar = false,
    solarHour = null,
    baseUrl = 'https://denissitnikov.github.io/sphere-gl/',
  } = {},
) {
  const params = new URLSearchParams();
  const col = scene?.atlas || scene?.collection;
  if (lockSeed && scene?.seed) params.set('seed', scene.seed);
  if (col) params.set('col', col);
  if (scene?.style) params.set('style', scene.style);
  if (scene?.mood) params.set('mood', scene.mood);
  if (scene?.archetypeId && scene.archetypeId !== 'custom-palette' && !col) {
    params.set('arch', scene.archetypeId);
  }
  if (Number.isFinite(grain)) params.set('grain', String(grain));
  if (motion) params.set('motion', '1');
  if (solar || scene?.solar) params.set('solar', '1');
  if (Number.isFinite(solarHour)) params.set('hour', String(Math.round(solarHour * 100) / 100));
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

  const cssAtlas =
    cs.getPropertyValue('--sphere-atlas').trim() ||
    cs.getPropertyValue('--sphere-collection').trim();
  if (cssAtlas) {
    const col = normalizeAtlasId(cssAtlas);
    out.atlas = col;
    out.collection = col;
  }

  const cssGrain = cs.getPropertyValue('--sphere-grain').trim();
  if (cssGrain !== '') {
    const g = Number(cssGrain);
    if (Number.isFinite(g)) out.grain = g;
  }

  const cssSolar = cs.getPropertyValue('--sphere-solar').trim();
  if (cssSolar) out.solar = parseBool(cssSolar, true);

  return out;
}

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

  const rawLightFollow =
    options.lightFollow ??
    urlCfg.lightFollow ??
    ds.sphereLightFollow ??
    ds.lightFollow ??
    true;

  const rawAtlas =
    options.atlas ??
    options.collection ??
    urlCfg.atlas ??
    urlCfg.collection ??
    ds.sphereAtlas ??
    ds.sphereCollection ??
    ds.atlas ??
    ds.collection ??
    cssCfg.atlas ??
    cssCfg.collection ??
    null;

  const cfg = {
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
    collection: normalizeAtlasId(rawAtlas),
    colors: options.colors ?? urlCfg.colors ?? attrColors ?? cssCfg.colors ?? null,
    grainScale: parseNum(
      options.grain ??
        options.grainScale ??
        urlCfg.grain ??
        ds.sphereGrain ??
        cssCfg.grain,
      1.0,
    ),
    motion: parseBool(options.motion ?? urlCfg.motion ?? ds.sphereMotion, false),
    whisperStrength: resolveWhisperStrength(rawLightFollow),
    solar:
      el.hasAttribute?.('data-sphere-solar') && ds.sphereSolar === ''
        ? true
        : parseBool(options.solar ?? urlCfg.solar ?? ds.sphereSolar ?? cssCfg.solar, false),
    solarHour: parseNum(options.solarHour ?? urlCfg.solarHour ?? ds.sphereHour, null),
    transitionIn: parseBool(
      options.transitionIn ??
        (el.hasAttribute?.('data-transition-in') ? true : ds.sphereTransitionIn),
      false,
    ),
    maxDpr: parseNum(options.maxDpr ?? ds.sphereMaxDpr, 3),
  };

  const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData === true;

  let canvas;
  if (isDirectCanvas) {
    canvas = el;
  } else {
    if (isFullPage) {
      document.body.style.isolation = 'isolate';
      document.body.style.backgroundColor = 'transparent';
    } else {
      const computed = window.getComputedStyle(container);
      if (computed.position === 'static') container.style.position = 'relative';
      if (computed.isolation === 'auto') container.style.isolation = 'isolate';
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
    if (isFullPage && typeof CSS !== 'undefined' && CSS.supports?.('height', '100dvh')) {
      canvas.style.height = '100dvh';
    }
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
    interactiveBudget: saveData ? 0.9e6 : 1.6e6,
    onTiming: options.onTiming,
  });

  let currentScene = null;
  let revealed = false;
  let themeMeta = null;

  function syncThemeColor(hex) {
    if (!isFullPage || typeof document === 'undefined') return;
    if (!themeMeta) {
      themeMeta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
    }
    themeMeta.content = hex;
  }

  function applyThemeAttributes(node, scene) {
    if (!node || !node.style) return;
    const t = scene.uiTokens;
    const col = scene.collection || '';
    node.dataset.sphereTheme = t.theme;
    node.dataset.sphereMood = scene.mood;
    node.dataset.sphereStyle = scene.style;
    node.dataset.sphereSeed = scene.seed;
    node.dataset.sphereCollection = col;
    node.dataset.sphereAtlas = col;
    node.style.setProperty('--sphere-base', scene.baseHex);
    node.style.setProperty('--sphere-bloom', scene.bloomHex);
    node.style.setProperty('--sphere-accent', t.accent);
    node.style.setProperty('--sphere-ink', t.ink);
    node.style.setProperty('--sphere-ink-muted', t.inkMuted);
    node.style.setProperty('--sphere-glass', t.glass);
    node.style.setProperty('--sphere-glass-border', t.glassBorder);
  }

  function applyScene(seedOverride, { morph = false, morphDuration = 540 } = {}) {
    const prevScene = currentScene;
    currentScene = generateScene({
      seed: seedOverride,
      style: cfg.style,
      mood: cfg.mood,
      archetype: cfg.archetype,
      collection: cfg.collection,
      colors: cfg.colors,
      solar: cfg.solar,
      solarHour: cfg.solarHour,
    });
    currentScene.atlas = currentScene.collection;

    applyThemeAttributes(container, currentScene);
    if (isDirectCanvas) applyThemeAttributes(canvas, currentScene);
    if (isFullPage) {
      applyThemeAttributes(document.documentElement, currentScene);
      document.documentElement.style.backgroundColor = currentScene.baseHex;
      syncThemeColor(currentScene.baseHex);
    }

    renderer.resize();
    if (cfg.motion && !prefersReducedMotion) {
      renderer.stopMotion();
      renderer.startMotion(currentScene, { grainScale: cfg.grainScale });
    } else if (morph && prevScene && !prefersReducedMotion) {
      renderer.morphTo(currentScene, {
        duration: morphDuration,
        grainScale: cfg.grainScale,
      });
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

  const syncSystemScheme = () => {
    if (String(cfg.mood || 'system').trim().toLowerCase() !== 'system') return;
    const nextScheme = detectColorScheme();
    if (nextScheme === lastDetectedScheme) return;
    lastDetectedScheme = nextScheme;
    applyScene(cfg.seed, { morph: !prefersReducedMotion, morphDuration: 620 });
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
    typeof MutationObserver === 'function' &&
    typeof document !== 'undefined' &&
    document.documentElement
      ? new MutationObserver(syncSystemScheme)
      : null;

  if (themeObserver) {
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-bs-theme'],
    });
  }

  let cachedRect = null;
  const invalidateRect = () => {
    cachedRect = null;
  };

  let resizeRaf = 0;
  const scheduleResize = () => {
    invalidateRect();
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      renderer.resize();
      if (currentScene && !renderer.isAnimating && !renderer.isMorphing) {
        renderer.renderOnce(currentScene, { grainScale: cfg.grainScale });
      }
    });
  };

  const ro =
    typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleResize) : null;
  if (ro) {
    ro.observe(isFullPage ? document.documentElement : el);
  }

  if (typeof window !== 'undefined') {
    if (isFullPage) {
      window.addEventListener('resize', scheduleResize, { passive: true });
      window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });
    } else {
      window.addEventListener('scroll', invalidateRect, { passive: true });
    }
  }

  let hiddenMotion = false;
  const onVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      hiddenMotion = renderer.isAnimating;
      renderer.stopMotion();
      return;
    }
    if (!currentScene) return;
    if (cfg.solar) {
      applyScene(cfg.seed ?? currentScene.seed, { morph: !prefersReducedMotion, morphDuration: 900 });
    } else if (hiddenMotion && cfg.motion && !prefersReducedMotion) {
      renderer.startMotion(currentScene, { grainScale: cfg.grainScale });
    } else {
      renderer.resize('static');
      renderer.renderOnce(currentScene, { grainScale: cfg.grainScale });
    }
    hiddenMotion = false;
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  // Solar clock: one re-render every 10 minutes, scheduled with setTimeout so idle stays at 0 RAF.
  let solarTimer = 0;
  const scheduleSolarTick = () => {
    if (solarTimer) clearTimeout(solarTimer);
    solarTimer = 0;
    if (!cfg.solar || Number.isFinite(cfg.solarHour) || typeof setTimeout !== 'function') return;
    const now = new Date();
    const msToNext = (10 - (now.getMinutes() % 10)) * 60000 - now.getSeconds() * 1000 + 250;
    solarTimer = setTimeout(() => {
      solarTimer = 0;
      if (currentScene && !(typeof document !== 'undefined' && document.hidden)) {
        applyScene(cfg.seed ?? currentScene.seed, { morph: !prefersReducedMotion, morphDuration: 1400 });
      }
      scheduleSolarTick();
    }, msToNext);
  };
  scheduleSolarTick();

  const onPointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    const wantWhisper = cfg.whisperStrength > 0 && !prefersReducedMotion;
    if (!renderer.isAnimating && !wantWhisper) return;

    let w = 0;
    let h = 0;
    let left = 0;
    let top = 0;
    if (isFullPage && typeof window !== 'undefined') {
      w = window.innerWidth;
      h = window.innerHeight;
    } else {
      if (!cachedRect) cachedRect = canvas.getBoundingClientRect();
      w = cachedRect.width;
      h = cachedRect.height;
      left = cachedRect.left;
      top = cachedRect.top;
    }
    if (!w || !h) return;

    const nx = ((e.clientX - left) / w) * 2 - 1;
    const ny = ((e.clientY - top) / h) * 2 - 1;

    if (renderer.isAnimating) {
      renderer.setPointer(nx, ny);
    } else {
      renderer.wakePointer(nx, ny, {
        strength: cfg.whisperStrength,
        grainScale: cfg.grainScale,
      });
    }
  };

  const onPointerLeave = () => {
    if (!renderer.isAnimating && renderer.isWhispering) {
      renderer.wakePointer(0, 0, { strength: 0, grainScale: cfg.grainScale });
    }
  };

  if (options.interactivePointer !== false && typeof window !== 'undefined') {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }
  }

  // Tilt light: on touch devices the phone's orientation drives the same wake-and-sleep keylight.
  const coarsePointer =
    typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches;
  let tiltBase = null;
  const onTilt = (e) => {
    if (cfg.whisperStrength <= 0 || prefersReducedMotion || renderer.isAnimating) return;
    if (!Number.isFinite(e.gamma) || !Number.isFinite(e.beta)) return;
    if (!tiltBase) tiltBase = { g: e.gamma, b: e.beta };
    const nx = Math.max(-1, Math.min(1, (e.gamma - tiltBase.g) / 28));
    const ny = Math.max(-1, Math.min(1, (e.beta - tiltBase.b) / 28));
    renderer.wakePointer(nx, ny, { strength: cfg.whisperStrength, grainScale: cfg.grainScale });
  };
  let tiltAttached = false;
  const attachTilt = () => {
    if (tiltAttached || typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return;
    tiltAttached = true;
    window.addEventListener('deviceorientation', onTilt, { passive: true });
  };
  const enableTilt = async () => {
    if (typeof DeviceOrientationEvent === 'undefined') return false;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const state = await DeviceOrientationEvent.requestPermission();
        if (state !== 'granted') return false;
      } catch (_) {
        return false;
      }
    }
    attachTilt();
    return true;
  };
  if (coarsePointer && options.interactivePointer !== false && cfg.whisperStrength > 0) {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      attachTilt();
    }
  }

  const instance = {
    canvas,
    renderer,
    get scene() {
      return currentScene;
    },
    regenerate(rawNext = {}) {
      const next =
        rawNext.url || rawNext.preset
          ? { ...parsePresetUrl(rawNext.url || rawNext.preset), ...rawNext }
          : rawNext;

      if (next.seed !== undefined) cfg.seed = next.seed;
      if (next.style !== undefined) cfg.style = next.style;
      if (next.mood !== undefined) cfg.mood = next.mood;
      if (next.harmony !== undefined) cfg.archetype = next.harmony;
      if (next.archetype !== undefined) cfg.archetype = next.archetype;
      const nextAtlas = next.atlas !== undefined ? next.atlas : next.collection;
      if (nextAtlas !== undefined) cfg.collection = normalizeAtlasId(nextAtlas);
      if (next.colors !== undefined) cfg.colors = next.colors;
      if (next.grain !== undefined) cfg.grainScale = parseNum(next.grain, 1.0);
      if (next.grainScale !== undefined) cfg.grainScale = parseNum(next.grainScale, 1.0);
      if (next.motion !== undefined) cfg.motion = Boolean(next.motion);
      if (next.lightFollow !== undefined) {
        cfg.whisperStrength = resolveWhisperStrength(next.lightFollow);
      }
      if (next.solar !== undefined) cfg.solar = parseBool(next.solar, false);
      if (next.solarHour !== undefined) cfg.solarHour = parseNum(next.solarHour, null);
      scheduleSolarTick();

      const seedToUse = next.seed !== undefined ? next.seed : undefined;
      return applyScene(seedToUse, {
        morph: Boolean(next.morph),
        morphDuration: next.morphDuration ?? 540,
      });
    },
    enableTilt,
    refreshCssVariables() {
      const updatedCss = readCssVariableConfig(el);
      if (updatedCss.colors) cfg.colors = updatedCss.colors;
      if (updatedCss.style) cfg.style = updatedCss.style;
      if (updatedCss.mood) cfg.mood = updatedCss.mood;
      if (updatedCss.harmony) cfg.archetype = updatedCss.harmony;
      if (updatedCss.atlas !== undefined || updatedCss.collection !== undefined) {
        cfg.collection = updatedCss.atlas ?? updatedCss.collection;
      }
      if (updatedCss.grain !== undefined) cfg.grainScale = updatedCss.grain;
      return applyScene(cfg.seed);
    },
    exportImage(exportOpts = {}) {
      return renderer.exportImage(currentScene, {
        grainScale: cfg.grainScale,
        ...exportOpts,
      });
    },
    exportPNG(exportOpts = {}) {
      return renderer.exportPNG(currentScene, {
        grainScale: cfg.grainScale,
        ...exportOpts,
      });
    },
    exportSVG(exportOpts = {}) {
      return renderer.exportSVG(currentScene, {
        grainScale: cfg.grainScale,
        ...exportOpts,
      });
    },
    exportCSS() {
      return renderer.exportCSS(currentScene);
    },
    destroy() {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (solarTimer) clearTimeout(solarTimer);
      if (ro) ro.disconnect();
      if (themeObserver) themeObserver.disconnect();
      if (schemeMedia) {
        if (typeof schemeMedia.removeEventListener === 'function') {
          schemeMedia.removeEventListener('change', syncSystemScheme);
        } else if (typeof schemeMedia.removeListener === 'function') {
          schemeMedia.removeListener(syncSystemScheme);
        }
      }
      if (typeof window !== 'undefined') {
        if (isFullPage) {
          window.removeEventListener('resize', scheduleResize);
          window.visualViewport?.removeEventListener('resize', scheduleResize);
        } else {
          window.removeEventListener('scroll', invalidateRect);
        }
        window.removeEventListener('pointermove', onPointerMove);
        if (tiltAttached) window.removeEventListener('deviceorientation', onTilt);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibility);
      }
      renderer.destroy();
      if (!isDirectCanvas) canvas.remove();
      delete el.__sphereInstance;
    },
  };

  el.__sphereInstance = instance;
  return instance;
}

export { mountSphereBackground as mount, mountSphereBackground as mountAuraBackground };

export function autoMountSphereBackgrounds(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const instances = [];
  if (root === document && document.documentElement?.hasAttribute('data-sphere-bg')) {
    instances.push(mountSphereBackground(document.documentElement));
  } else if (root.nodeType === 1 && root.hasAttribute?.('data-sphere-bg')) {
    instances.push(mountSphereBackground(root));
  }
  for (const el of root.querySelectorAll('[data-sphere-bg]')) {
    instances.push(mountSphereBackground(el));
  }
  return instances;
}
