import { SphereRenderer, AuraRenderer, STYLE_MAP, styleToIndex } from './shader.js';
import {
  STYLE_MODES, clamp, normalizeAtlasId, generateScene, detectColorScheme, buildInlineCssLayers, parsePresetUrl, _p,
} from './palettes.js';

export * from './palettes.js';
export { SphereRenderer, AuraRenderer, STYLE_MAP, styleToIndex };

const { pBool, pNum, pFocus, splitCols } = _p;
const G = globalThis;
const pWhisp = (v) => (typeof v === 'boolean' ? +v : v != null && String(v).trim() !== '' && Number.isFinite(+v) ? clamp(+v, 0, 1.5) : +pBool(v, true));
const REGEN_KEYS = 'url,preset,seed,mode,style,mood,harmony,archetype,atlas,collection,colors,grain,grainScale,motion,lightFollow,solar,solarHour,gamut,focusRect'.split(',');
const OBS = 'seed,mode,style,mood,atlas,harmony,grain,motion,light-follow,solar,hour,colors,preset'.split(',');
const mAttr = (v) => { const s = typeof v === 'string' ? v.trim().toLowerCase() : ''; return !s || s.includes(':') ? undefined : s === 'auto' || STYLE_MODES.includes(s) ? s : undefined; };

function readAttrs(el, bare) {
  const d = (k) => el.getAttribute?.(`data-sphere-${k}`) ?? el.getAttribute?.(`data-${k}`);
  const ga = (k) => (bare ? el.getAttribute?.(k) ?? (bare < 2 ? d(k) : null) : d(k));
  const ha = (k) => (bare ? el.hasAttribute?.(k) || (bare < 2 && (el.hasAttribute?.(`data-sphere-${k}`) || el.hasAttribute?.(`data-${k}`))) : el.hasAttribute?.(`data-sphere-${k}`) || el.hasAttribute?.(`data-${k}`));
  const o = { url: ga('preset') ?? ga('url') ?? undefined, solarHour: ga('hour') ?? undefined, focusRect: ga('focus') ?? undefined };
  for (const k of 'seed,mode,style,mood,harmony,archetype,atlas,collection,grain,gamut'.split(',')) {
    const v = ga(k);
    if (v != null && (k !== 'style' || !bare || mAttr(v))) o[k] = v;
  }
  for (const [a, p] of [['motion', 'motion'], ['light-follow', 'lightFollow'], ['solar', 'solar']]) if (ha(a)) { const v = ga(a); o[p] = v === '' ? true : v; }
  if (ga('colors')) o.colors = splitCols(ga('colors'));
  return o;
}

function readCss(el) {
  const cs = G.window?.getComputedStyle?.(el);
  if (!cs) return {};
  const pv = (n) => cs.getPropertyValue(`--sphere-${n}`).trim(), o = {}, cols = [];
  for (let i = 1; i <= 6; i++) { const v = pv(`color-${i}`) || cs.getPropertyValue(`--gradient-color-${i}`).trim(); if (v) cols.push(v); }
  if (cols.length > 1) o.colors = cols;
  for (const [k, v] of [['style', pv('mode') || pv('style')], ['mood', pv('mood')], ['harmony', pv('harmony')], ['gamut', pv('gamut')], ['atlas', pv('atlas') || pv('collection')]]) if (v) o[k] = v;
  if (pv('grain') && Number.isFinite(+pv('grain'))) o.grain = +pv('grain');
  if (pv('solar')) o.solar = pBool(pv('solar'), true);
  return o;
}

function patchCfg(cfg, nx, renderer) {
  if (!nx) return;
  if (typeof nx.seed === 'string' && nx.seed.trim()) cfg.seed = nx.seed.trim().toUpperCase();
  const nm = nx.mode ?? nx.style;
  if (nm != null && nm !== '') cfg.style = nm;
  if (nx.mood != null && nx.mood !== '') cfg.mood = nx.mood;
  const nh = nx.harmony ?? nx.archetype;
  if (nh != null && nh !== '') cfg.archetype = nh;
  const na = nx.atlas !== undefined ? nx.atlas : nx.collection;
  if (na !== undefined) cfg.collection = normalizeAtlasId(na);
  if (nx.colors !== undefined) cfg.colors = nx.colors;
  if (nx.grain != null || nx.grainScale != null) cfg.grainScale = pNum(nx.grainScale ?? nx.grain, 1);
  if (nx.motion != null && nx.motion !== '') cfg.motion = pBool(nx.motion, false);
  if (nx.lightFollow != null && nx.lightFollow !== '') cfg.whisperStrength = pWhisp(nx.lightFollow);
  if (nx.solar != null && nx.solar !== '') cfg.solar = pBool(nx.solar, false);
  if (nx.solarHour !== undefined) cfg.solarHour = pNum(nx.solarHour, null);
  if (nx.gamut != null && nx.gamut !== '') { cfg.gamut = nx.gamut; renderer?.setGamut(nx.gamut); }
  if ('focusRect' in nx && nx.focusRect !== undefined) cfg.focusRect = pFocus(nx.focusRect);
}

export function mountSphereBackground(target, options = {}) {
  const W = G.window, D = G.document;
  const el = typeof target === 'string' ? D?.querySelector(target) : target || D?.body;
  if (!el) throw new Error(`target "${target}"?`);
  if (el.__sphereInstance) return el.__sphereInstance;

  const isDirect = el.tagName === 'CANVAS', container = isDirect ? el.parentElement || D?.body : el;
  const isFull = !isDirect && (container === D?.body || container === D?.documentElement);
  const ds = readAttrs(el, el.tagName?.includes('-'));
  const pu = options.url ?? options.preset ?? ds.url ?? '';
  const ga = (k) => el.getAttribute?.(`data-sphere-${k}`) ?? el.getAttribute?.(`data-${k}`);

  const cfg = {
    seed: undefined, style: 'auto', mood: 'system', archetype: 'auto', collection: null, colors: null,
    grainScale: 1, motion: false, whisperStrength: 1, solar: false, solarHour: null, gamut: 'auto', focusRect: null,
    transitionIn: pBool(options.transitionIn ?? (el.hasAttribute?.('data-transition-in') ? true : ga('transition-in')), false),
    maxDpr: pNum(options.maxDpr ?? ga('max-dpr'), 3),
  };
  for (const src of [readCss(el), ds, pu ? parsePresetUrl(pu) : null, options]) patchCfg(cfg, src);

  const phNode = isFull ? D?.documentElement : !isDirect ? container : null;
  const prevPhBg = phNode?.style ? phNode.style.backgroundImage : '';

  let canvas = el;
  if (!isDirect) {
    if (isFull && D?.body) { D.body.style.isolation = 'isolate'; D.body.style.backgroundColor = 'transparent'; }
    else {
      const cs = W?.getComputedStyle?.(container);
      if (cs?.position === 'static') container.style.position = 'relative';
      if (cs?.isolation === 'auto') container.style.isolation = 'isolate';
    }
    canvas = D.createElement('canvas');
    canvas.className = 'sphere-gl-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: isFull ? 'fixed' : 'absolute', inset: '0', width: isFull ? '100vw' : '100%',
      height: isFull && G.CSS?.supports?.('height', '100dvh') ? '100dvh' : isFull ? '100vh' : '100%',
      display: 'block', pointerEvents: 'none', zIndex: '-1', opacity: '0',
    });
    container.prepend(canvas);
  }

  const redM = !!W?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!isDirect && cfg.transitionIn && !redM) canvas.style.transition = 'opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)';

  let currentScene = null, revealed = false, themeMeta = null, inView = true, solarDirty = false;
  const isSys = () => /^system$/i.test(String(cfg.mood || 'system').trim());
  const renderer = new SphereRenderer(canvas, {
    maxDpr: cfg.maxDpr, interactiveBudget: G.navigator?.connection?.saveData ? 0.9e6 : 1.6e6,
    gamut: cfg.gamut, onTiming: options.onTiming,
    onFirstFrame: () => {
      if (revealed) return;
      revealed = true;
      if (!isDirect) {
        if (cfg.transitionIn && !redM && G.requestAnimationFrame) requestAnimationFrame(() => { canvas.style.opacity = '1'; });
        else canvas.style.opacity = '1';
      }
    },
  });

  const setTok = (n, s) => {
    if (!n?.style) return;
    n._sp = 1;
    const t = s.uiTokens, col = s.collection || '';
    for (const [k, v] of [['theme', t.theme], ['mood', s.mood], ['style', s.style], ['mode', s.style], ['seed', s.seed], ['collection', col], ['atlas', col]]) n.setAttribute?.(`data-sphere-${k}`, v);
    for (const [k, v] of [['base', s.baseHex], ['bloom', s.bloomHex], ['accent', t.accent], ['ink', t.ink], ['ink-muted', t.inkMuted], ['glass', t.glass], ['glass-border', t.glassBorder]]) n.style.setProperty(`--sphere-${k}`, v);
    n._sp = 0;
  };

  const syncRun = () => {
    if (cfg.motion && !redM && !D?.hidden) renderer.startMotion(currentScene, { grainScale: cfg.grainScale });
    else { renderer.resize('static'); renderer.renderOnce(currentScene, { grainScale: cfg.grainScale }); }
  };

  const apply = (seedOv, { morph = false, morphDuration = 540 } = {}) => {
    const prev = currentScene, gOpts = { grainScale: cfg.grainScale };
    currentScene = generateScene({
      seed: seedOv, style: cfg.style, mood: cfg.mood, archetype: cfg.archetype, collection: cfg.collection, colors: cfg.colors,
      colorScheme: isSys() ? detectColorScheme() : null, solar: cfg.solar, solarHour: cfg.solarHour, gamut: cfg.gamut, focusRect: cfg.focusRect,
    });
    currentScene.atlas = currentScene.collection;
    setTok(container, currentScene);
    if (isDirect) setTok(canvas, currentScene);
    if (isFull && D) {
      setTok(D.documentElement, currentScene);
      themeMeta ||= D.querySelector('meta[name="theme-color"]:not([media])') || D.head.appendChild(Object.assign(D.createElement('meta'), { name: 'theme-color' }));
      themeMeta.content = currentScene.baseHex;
    }
    if (phNode?.style) {
      phNode._sp = 1; phNode.style.backgroundColor = currentScene.baseHex;
      if (!revealed) phNode.style.backgroundImage = buildInlineCssLayers(currentScene).join(',');
      phNode._sp = 0;
    }
    renderer.resize();
    if (!inView) renderer.stopMotion();
    else if (cfg.motion && !redM) {
      renderer.startMotion(currentScene, gOpts);
      if (morph && prev) renderer.morphTo(currentScene, { duration: morphDuration, ...gOpts });
    } else {
      renderer.stopMotion();
      if (morph && prev && !redM) renderer.morphTo(currentScene, { duration: morphDuration, ...gOpts });
      else renderer.renderOnce(currentScene, gOpts);
    }
    options.onScene?.(currentScene);
    if (G.CustomEvent) el.dispatchEvent?.(new CustomEvent('sphere:change', { detail: currentScene, bubbles: true }));
    return currentScene;
  };

  const offs = [], on = (t, ev, fn, o = { passive: true }) => { if (t?.addEventListener) { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn)); } };
  let lastSch = detectColorScheme();
  apply(cfg.seed);

  const syncSch = () => {
    if (!isSys()) return;
    const ns = detectColorScheme();
    if (ns !== lastSch) { lastSch = ns; apply(cfg.seed ?? currentScene?.seed, { morph: !redM && inView, morphDuration: 620 }); }
  };
  try {
    const mq = W?.matchMedia?.('(prefers-color-scheme: dark)');
    if (mq?.addEventListener) on(mq, 'change', syncSch, false); else if (mq?.addListener) { mq.addListener(syncSch); offs.push(() => mq.removeListener(syncSch)); }
  } catch {}
  if (G.MutationObserver && D?.documentElement) {
    const mo = new MutationObserver(syncSch);
    mo.observe(D.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-bs-theme'] });
    offs.push(() => mo.disconnect());
  }

  let rect = null, rRaf = 0;
  const onRes = () => {
    rect = null;
    if (!inView) return;
    if (rRaf) cancelAnimationFrame(rRaf);
    rRaf = requestAnimationFrame(() => {
      rRaf = 0; renderer.resize();
      if (currentScene && !renderer.isAnimating && !renderer.isMorphing) renderer.renderOnce(currentScene, { grainScale: cfg.grainScale });
    });
  };
  if (G.ResizeObserver) { const ro = new ResizeObserver(onRes); ro.observe(isFull && D ? D.documentElement : el); offs.push(() => ro.disconnect()); }
  if (G.IntersectionObserver) {
    const io = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      if (!e || !!e.isIntersecting === inView) return;
      inView = !!e.isIntersecting; rect = null;
      if (!inView) { renderer.stopMotion(); return; }
      if (currentScene) { if (solarDirty) { solarDirty = false; apply(cfg.seed ?? currentScene.seed); } else syncRun(); }
    }, { rootMargin: '100px' });
    io.observe(isFull ? canvas : container);
    offs.push(() => io.disconnect());
  }

  if (isFull) { on(W, 'resize', onRes); on(W?.visualViewport, 'resize', onRes); }
  else on(W, 'scroll', () => { rect = null; });

  on(D, 'visibilitychange', () => {
    if (D?.hidden) { renderer.stopMotion(); return; }
    if (!currentScene || !inView) return;
    if (cfg.solar) apply(cfg.seed ?? currentScene.seed, { morph: !redM, morphDuration: 900 });
    else syncRun();
  }, false);

  let solT = 0;
  const schedSol = () => {
    if (solT) clearTimeout(solT);
    solT = 0;
    if (!cfg.solar || Number.isFinite(cfg.solarHour) || !G.setTimeout) return;
    const now = new Date();
    solT = setTimeout(() => {
      solT = 0;
      if (currentScene) { if (!inView || D?.hidden) solarDirty = true; else apply(cfg.seed ?? currentScene.seed, { morph: !redM, morphDuration: 1400 }); }
      schedSol();
    }, (10 - (now.getMinutes() % 10)) * 6e4 - now.getSeconds() * 1e3 + 250);
  };
  schedSol();

  if (options.interactivePointer !== false) {
    on(W, 'pointermove', (e) => {
      if (!inView || e.pointerType === 'touch' || (!renderer.isAnimating && !(cfg.whisperStrength > 0 && !redM))) return;
      let w = 0, h = 0, l = 0, t = 0;
      if (isFull && W) { w = W.innerWidth; h = W.innerHeight; }
      else { rect ||= canvas.getBoundingClientRect(); w = rect.width; h = rect.height; l = rect.left; t = rect.top; }
      if (!w || !h) return;
      const nx = ((e.clientX - l) / w) * 2 - 1, ny = ((e.clientY - t) / h) * 2 - 1;
      if (!isFull && (Math.abs(nx) > 1.25 || Math.abs(ny) > 1.25)) {
        if (!renderer.isAnimating && renderer.isWhispering) renderer.wakePointer(0, 0, { strength: 0, grainScale: cfg.grainScale });
        return;
      }
      if (renderer.isAnimating) renderer.setPointer(nx, ny);
      else renderer.wakePointer(nx, ny, { strength: cfg.whisperStrength, grainScale: cfg.grainScale });
    });
    on(D, 'pointerleave', () => { if (!renderer.isAnimating && renderer.isWhispering) renderer.wakePointer(0, 0, { strength: 0, grainScale: cfg.grainScale }); });
  }

  let tiltB = null, tiltOn = false;
  const attTilt = () => {
    if (!tiltOn && W && G.DeviceOrientationEvent) {
      tiltOn = true;
      on(W, 'deviceorientation', (e) => {
        if (!inView || cfg.whisperStrength <= 0 || redM || renderer.isAnimating || !Number.isFinite(e.gamma) || !Number.isFinite(e.beta)) return;
        tiltB ||= { g: e.gamma, b: e.beta };
        renderer.wakePointer(clamp((e.gamma - tiltB.g) / 28, -1, 1), clamp((e.beta - tiltB.b) / 28, -1, 1), { strength: cfg.whisperStrength, grainScale: cfg.grainScale });
      });
    }
  };
  if (options.interactivePointer !== false && cfg.whisperStrength > 0 && W?.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches && G.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') attTilt();

  const inst = {
    canvas, renderer,
    get scene() { return currentScene; },
    get isIntersecting() { return inView; },
    regenerate(rawNext = {}) {
      const cl = {};
      for (const [k, v] of Object.entries(rawNext || {})) if (v !== undefined) cl[k] = v;
      const nu = cl.url ?? cl.preset ?? '', hasUpd = REGEN_KEYS.some((k) => k in cl);
      let nx = cl;
      if (nu) {
        const p = parsePresetUrl(nu);
        nx = { ...p, ...cl };
        if (p.style && cl.mode === undefined && cl.style === 'auto') nx.style = p.style;
        if (p.mood && cl.mood === 'system') nx.mood = p.mood;
        if (p.harmony && cl.harmony === 'auto' && cl.archetype === undefined) nx.harmony = p.harmony;
        if (p.collection && cl.collection === null && cl.atlas === undefined) nx.collection = p.collection;
        if (p.colors && cl.colors === null) nx.colors = p.colors;
      }
      const roll = /^(random|auto)$/i.test(String(nx.seed || '')) || nx.seed === null || cl.newSeed === true;
      if (roll) { cfg.seed = undefined; delete nx.seed; }
      patchCfg(cfg, nx, renderer);
      schedSol();
      return apply(roll || !hasUpd ? undefined : (cfg.seed ?? currentScene?.seed), { morph: !!nx.morph, morphDuration: nx.morphDuration ?? 540 });
    },
    async enableTilt() {
      if (!G.DeviceOrientationEvent) return false;
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return false; } catch { return false; }
      }
      attTilt(); return true;
    },
    refreshCssVariables() { patchCfg(cfg, readCss(el), renderer); return apply(cfg.seed ?? currentScene?.seed); },
    exportCSS: () => renderer.exportCSS(currentScene),
    destroy() {
      if (rRaf) cancelAnimationFrame(rRaf);
      if (solT) clearTimeout(solT);
      for (const f of offs) f();
      if (phNode?.style) { phNode._sp = 1; phNode.style.backgroundImage = prevPhBg; phNode._sp = 0; }
      renderer.destroy();
      if (!isDirect) canvas.remove();
      delete el.__sphereInstance;
    },
  };
  for (const m of ['exportImage', 'exportPNG', 'exportSVG']) inst[m] = (o) => renderer[m](currentScene, { grainScale: cfg.grainScale, ...o });
  return (el.__sphereInstance = inst);
}

export { mountSphereBackground as mount, mountSphereBackground as mountAuraBackground };

export function formatPresetUrl(scene, { grain = 1.65, motion = false, lockSeed = true, colors = null, solar = false, solarHour = null, lightFollow = true, preview = null, baseUrl = 'https://denissitnikov.github.io/sphere-gl/' } = {}) {
  const p = new URLSearchParams(), col = scene?.atlas || scene?.collection;
  for (const [k, v] of [
    ['preview', preview !== 'canvas' && preview], ['seed', lockSeed && scene?.seed], ['col', col], ['style', scene?.style], ['mood', scene?.mood],
    ['arch', scene?.archetypeId !== 'custom-palette' && !col && scene?.archetypeId], ['grain', Number.isFinite(grain) ? grain : false],
    ['motion', motion && 1], ['light', (lightFollow === false || lightFollow === 0) ? 0 : false], ['solar', (solar || scene?.solar) && 1],
    ['hour', Number.isFinite(solarHour) ? Math.round(solarHour * 100) / 100 : false], ['colors', Array.isArray(colors) && colors.length > 1 && colors.join(',')],
  ]) if (v !== false && v != null && v !== '') p.set(k, String(v));
  return `${baseUrl}#${p}`;
}

export function autoMountSphereBackgrounds(root = G.document) {
  const D = G.document;
  if (!root?.querySelectorAll) return [];
  const out = [];
  if (root === D && D?.documentElement?.hasAttribute('data-sphere-bg')) out.push(mountSphereBackground(D.documentElement));
  else if (root.nodeType === 1 && root.hasAttribute?.('data-sphere-bg')) out.push(mountSphereBackground(root));
  for (const el of root.querySelectorAll('[data-sphere-bg]')) out.push(mountSphereBackground(el));
  return out;
}

export function registerSphereElement(tag = 'sphere-gl') {
  if (!G.HTMLElement || !G.customElements) return null;
  const ex = customElements.get(tag);
  if (ex) return ex;
  class SphereEl extends HTMLElement {
    static get observedAttributes() { return OBS; }
    connectedCallback() {
      if (!this.style.display) { this._sp = 1; this.style.display = 'block'; this._sp = 0; }
      this._i = mountSphereBackground(this);
    }
    disconnectedCallback() { this._i?.destroy(); this._i = null; }
    attributeChangedCallback(n, o, v) {
      if (o === v || !this._i || this._sp || (n === 'style' && mAttr(o) === mAttr(v))) return;
      this._i.regenerate(readAttrs(this, 2));
    }
    get instance() { return this._i || null; }
    regenerate(o) { return this._i?.regenerate(o); }
  }
  customElements.define(tag, SphereEl);
  return SphereEl;
}
