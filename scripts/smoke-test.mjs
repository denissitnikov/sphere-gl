#!/usr/bin/env node
import * as nodeModule from 'node:module';
import {
  ARCHETYPES,
  COLLECTIONS,
  GAMUT_MODES,
  MOOD_MODES,
  STYLE_MODES,
  SphereRenderer,
  formatPresetUrl,
  generateScene,
  getSphereTokensAndCss,
  mountSphereBackground,
  normalizeAtlasId,
  oklabToSrgbHex,
  oklchToOklab,
  parseColorToOklab,
  parseCssColorBytes,
  parsePresetUrl,
  randomSeed,
  registerSphereElement,
  sampleHeroGridLuminance,
  solarPhase,
  srgbHexToOklab,
} from '../src/index.js';
import { exportCSS, exportImage, exportSVG } from '../src/export.js';
import { COLLECTION_HEROES, getCollectionHeroes } from '../src/studio.js';

function relativeLuminance([r8, g8, b8]) {
  const lin = (u) => {
    const c = u / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r8) + 0.7152 * lin(g8) + 0.0722 * lin(b8);
}

function contrastRatioY(yA, yB) {
  return (Math.max(yA, yB) + 0.05) / (Math.min(yA, yB) + 0.05);
}

function contrastRatioHex(hexA, hexB) {
  return contrastRatioY(relativeLuminance(parseCssColorBytes(hexA)), relativeLuminance(parseCssColorBytes(hexB)));
}

function assertHeroContrast(scene, label) {
  const inkY = relativeLuminance(parseCssColorBytes(scene.uiTokens.ink));
  const grid = sampleHeroGridLuminance(scene, scene.focusRect);
  const worstQuartileY = scene.uiTokens.ink === '#FFFFFF' ? grid.q3 : grid.q1;
  const crMed = contrastRatioY(inkY, grid.median);
  const crWorst = contrastRatioY(inkY, worstQuartileY);
  if (crMed < 4.5 || crWorst < 4.5) {
    throw new Error(
      `Hero 3x3 contrast < 4.5:1 on ${label} (ink=${scene.uiTokens.ink}, med=${crMed.toFixed(2)}, worstQ=${crWorst.toFixed(2)})`,
    );
  }
}

let count = 0;

// 1. Verify all 7 STYLE_MODES + GAMUT_MODES & deterministic generation across all styles & moods
const expectedStyles = ['mesh', 'sphere', 'silk', 'caustic', 'fluted', 'prism', 'topo'];
if (
  STYLE_MODES.length !== 7 ||
  expectedStyles.some((m, i) => STYLE_MODES[i] !== m) ||
  GAMUT_MODES.join(',') !== 'auto,p3,srgb'
) {
  throw new Error(`Unexpected STYLE_MODES or GAMUT_MODES: ${JSON.stringify({ STYLE_MODES, GAMUT_MODES })}`);
}

for (const style of STYLE_MODES) {
  for (const mood of MOOD_MODES) {
    for (let i = 0; i < 24; i++) {
      const seed = randomSeed();
      const s1 = generateScene({ seed, style, mood });
      const s2 = generateScene({ seed, style, mood });
      if (JSON.stringify(s1) !== JSON.stringify(s2)) {
        throw new Error(`Determinism check failed for seed ${seed} (${style}/${mood})`);
      }
      if (s1.poles.length !== 6) {
        throw new Error(`Expected 6 poles, got ${s1.poles.length}`);
      }
      if (!s1.uiTokens || !s1.uiTokens.ink || !s1.uiTokens.glass) {
        throw new Error(`Missing uiTokens on scene ${seed}`);
      }
      assertHeroContrast(s1, `random:${seed}:${style}:${s1.mood}`);
      count++;
    }
  }
}

// 2. Curated archetypes + twilight-violet-citrine split contrast regression test
for (const arch of ARCHETYPES) {
  for (const mood of [undefined, 'light', 'split', 'dark']) {
    const s = generateScene({ seed: '7F3K9A', archetype: arch.id, mood });
    if (!s.baseHex.startsWith('#') || s.paletteSwatches.length < 4) {
      throw new Error(`Invalid palette for archetype ${arch.id}`);
    }
    assertHeroContrast(s, `arch:${arch.id}:${s.mood}`);
    count++;
  }
}

// 3. Native CSS Color 4 parsing (parseColorToOklab) without 8-bit quantization + custom bright-base/dark-poles contrast
for (const sampleHex of ['#47ABFF', '#FF7A45', '#FDFBF7', '#04070F', '#8CE5FF']) {
  const lab = srgbHexToOklab(sampleHex);
  if (!lab) throw new Error(`Failed to parse ${sampleHex}`);
  const rt = oklabToSrgbHex(lab[0], lab[1], lab[2]);
  const b1 = parseCssColorBytes(sampleHex);
  const b2 = parseCssColorBytes(rt);
  if (Math.max(Math.abs(b1[0] - b2[0]), Math.abs(b1[1] - b2[1]), Math.abs(b1[2] - b2[2])) > 1) {
    throw new Error(`sRGB <-> OKLab roundtrip drift: ${sampleHex} -> ${rt}`);
  }
}

const refLch = oklchToOklab(0.72, 0.16, 250);
const parsedLch1 = parseColorToOklab('oklch(0.72 0.16 250)');
const parsedLch2 = parseColorToOklab('oklch(72% 0.16 0.6944444turn / 0.8)');
const parsedLch3 = parseColorToOklab('oklch(0.72 0.16 4.3633231rad)');
const parsedLch4 = parseColorToOklab('oklch(72% 40% 277.77778grad)');
for (const cand of [parsedLch1, parsedLch2, parsedLch3, parsedLch4]) {
  if (!cand || Math.hypot(cand[0] - refLch[0], cand[1] - refLch[1], cand[2] - refLch[2]) > 2e-4) {
    throw new Error(`oklch() floating-point precision mismatch: ${JSON.stringify(cand)} vs ${JSON.stringify(refLch)}`);
  }
}

// Wide-gamut P3 color outside sRGB must not be clipped during parseColorToOklab
const wideP3 = parseColorToOklab('oklch(0.76 0.27 148)');
if (!wideP3 || Math.abs(Math.hypot(wideP3[1], wideP3[2]) - 0.27) > 1e-5) {
  throw new Error(`Wide-gamut oklch() was quantized or clipped: ${JSON.stringify(wideP3)}`);
}

const parsedLab = parseColorToOklab('oklab(0.65 -0.08 0.11 / 0.9)');
const parsedLabPct = parseColorToOklab('oklab(65% -20% 27.5%)');
if (
  !parsedLab ||
  !parsedLabPct ||
  Math.hypot(parsedLab[0] - 0.65, parsedLab[1] + 0.08, parsedLab[2] - 0.11) > 1e-6 ||
  Math.hypot(parsedLabPct[0] - 0.65, parsedLabPct[1] + 0.08, parsedLabPct[2] - 0.11) > 1e-6
) {
  throw new Error(`oklab() parse failed: ${JSON.stringify({ parsedLab, parsedLabPct })}`);
}

const parsedHsl = parseColorToOklab('hsl(210 80% 55%)');
const parsedHsla = parseColorToOklab('hsla(210deg, 80%, 55%, 0.75)');
const parsedRgbPct = parseColorToOklab('rgb(20% 50% 90%)');
const parsedRgbByte = parseColorToOklab('rgb(51 128 230)');
if (
  !parsedHsl ||
  !parsedHsla ||
  Math.hypot(parsedHsl[0] - parsedHsla[0], parsedHsl[1] - parsedHsla[1], parsedHsl[2] - parsedHsla[2]) > 1e-6 ||
  !parsedRgbPct ||
  !parsedRgbByte ||
  Math.hypot(parsedRgbPct[0] - parsedRgbByte[0], parsedRgbPct[1] - parsedRgbByte[1], parsedRgbPct[2] - parsedRgbByte[2]) > 0.005
) {
  throw new Error('hsl() or percentage rgb() parse failed');
}

// Custom bright-base + dark-poles regression test
const brightBaseDarkPoles = generateScene({
  seed: 'INVERT',
  style: 'sphere',
  colors: ['#FDFBF7', '#0F172A', '#1E293B', '#334155'],
});
assertHeroContrast(brightBaseDarkPoles, 'custom:bright-base-dark-poles');

// Tailwind v4 oklch() custom palette test
const oklchBrandScene = generateScene({
  seed: 'TWV4OK',
  mode: 'prism',
  gamut: 'p3',
  colors: ['oklch(0.97 0.012 85)', 'oklch(0.62 0.19 255)', 'oklch(0.71 0.17 42)', 'hsl(285 75% 58%)'],
});
if (oklchBrandScene.archetypeId !== 'custom-palette' || oklchBrandScene.gamut !== 'p3') {
  throw new Error('Tailwind v4 oklch() + P3 custom palette failed');
}
assertHeroContrast(oklchBrandScene, 'custom:tailwind-v4-oklch');

const customScene = generateScene({
  seed: 'BRAND2',
  style: 'sphere',
  colors: ['#04070F', '#0A84FF', '#47ABFF', '#8CE5FF'],
});
if (customScene.archetypeId !== 'custom-palette' || !customScene.isDark) {
  throw new Error('Custom dark brand palette failed');
}
assertHeroContrast(customScene, 'custom:dark-brand');

// 4. Preset URL formatting & parsing + semantic aliases + focusRect
const presetUrl = formatPresetUrl(customScene, {
  grain: 1.65,
  motion: true,
  lightFollow: false,
  solar: true,
  solarHour: 7.5,
  preview: 'website',
  lockSeed: true,
  colors: ['#04070F', '#0A84FF'],
});
const parsed = parsePresetUrl(presetUrl);
if (
  parsed.seed !== 'BRAND2' ||
  parsed.style !== 'sphere' ||
  parsed.grain !== 1.65 ||
  parsed.motion !== true ||
  parsed.lightFollow !== false ||
  parsed.solar !== true ||
  parsed.solarHour !== 7.5 ||
  parsed.preview !== 'website' ||
  parsed.colors.length !== 2
) {
  throw new Error(`Preset URL roundtrip failed: ${JSON.stringify(parsed)}`);
}
if (parsePresetUrl('https://denissitnikov.github.io/sphere-gl/?preview=website').preview !== 'website') {
  throw new Error('Expected ?preview=website to parse preview=website');
}
const hourOnlyLink = parsePresetUrl('#hour=6.25&light=0&col=fintech&focus=0.2,0.3,0.8,0.7');
if (
  hourOnlyLink.solar !== true ||
  hourOnlyLink.solarHour !== 6.25 ||
  hourOnlyLink.lightFollow !== false ||
  hourOnlyLink.atlas !== 'skellig-night' ||
  hourOnlyLink.focusRect?.join(',') !== '0.2,0.3,0.8,0.7'
) {
  throw new Error(`Extended URL parse failed: ${JSON.stringify(hourOnlyLink)}`);
}

// 5. Semantic atlas aliases & focusRect pole weight attenuation
const aliasPairs = [
  ['ocean', 'skellig-night'],
  ['fintech', 'skellig-night'],
  ['sapphire', 'skellig-night'],
  ['amber', 'wicklow-amber'],
  ['gold', 'wicklow-amber'],
  ['luxury', 'wicklow-amber'],
  ['forest', 'dawn-meadow'],
  ['sage', 'dawn-meadow'],
  ['matcha', 'dawn-meadow'],
  ['paper', 'burren-chalk'],
  ['editorial', 'burren-chalk'],
  ['minimal', 'burren-chalk'],
  ['slate', 'antrim-basalt'],
  ['obsidian', 'antrim-basalt'],
  ['mono', 'antrim-basalt'],
  ['sunset', 'dingle-horizon'],
  ['coral', 'dingle-horizon'],
];
for (const [alias, target] of aliasPairs) {
  if (normalizeAtlasId(alias) !== target) {
    throw new Error(`Expected alias "${alias}" -> "${target}", got "${normalizeAtlasId(alias)}"`);
  }
  const sAlias = generateScene({ seed: 'ALIAS1', atlas: alias });
  if (sAlias.atlas !== target) {
    throw new Error(`generateScene({ atlas: "${alias}" }) resolved to "${sAlias.atlas}" instead of "${target}"`);
  }
}

const unattenuated = generateScene({ seed: '7F3K9A', atlas: 'dingle-horizon', mood: 'light' });
const focused = generateScene({
  seed: '7F3K9A',
  atlas: 'dingle-horizon',
  mood: 'light',
  focusRect: [0.15, 0.2, 0.85, 0.8],
});
const totalWeightBefore = unattenuated.poles.reduce((s, p) => s + p.weight, 0);
const totalWeightAfter = focused.poles.reduce((s, p) => s + p.weight, 0);
if (!(totalWeightAfter < totalWeightBefore)) {
  throw new Error(`focusRect failed to attenuate overlapping poles (${totalWeightBefore} -> ${totalWeightAfter})`);
}
assertHeroContrast(focused, 'focusRect:dingle-horizon');

// 6. `mood: 'system'` strict OS Light vs Dark schema alignment across 200 pairs
for (let i = 0; i < 100; i++) {
  const darkSeed = generateScene({ mood: 'system', colorScheme: 'dark' });
  const lightSeed = generateScene({ mood: 'system', colorScheme: 'light' });
  if (!darkSeed.isDark || darkSeed.uiTokens.theme !== 'dark' || lightSeed.isDark || lightSeed.uiTokens.theme !== 'light') {
    throw new Error(`System schema alignment failed on iteration ${i}`);
  }
  count += 2;
}

// 7. All 15 Irish COLLECTIONS + studio COLLECTION_HEROES stripped out of runtime COLLECTIONS
if (!Array.isArray(COLLECTIONS) || COLLECTIONS.length !== 15) {
  throw new Error(`Expected 15 COLLECTIONS, got ${COLLECTIONS?.length}`);
}
if (COLLECTIONS.some((c) => 'heroes' in c)) {
  throw new Error('Runtime COLLECTIONS still contains studio-only heroes arrays');
}
if (COLLECTIONS.filter((c) => c.group === 'emerald').length !== 7 || Object.keys(COLLECTION_HEROES).length !== 15) {
  throw new Error('Expected 7 Emerald Isle atlases and 15 studio hero sets');
}
for (const col of COLLECTIONS) {
  const heroes = getCollectionHeroes(col.id);
  for (const heroSeed of heroes) {
    for (const moodOverride of [undefined, 'light', 'split', 'dark']) {
      const sc = generateScene({ seed: heroSeed, collection: col.id, mood: moodOverride });
      if (sc.collection !== col.id || (moodOverride && sc.mood !== moodOverride)) {
        throw new Error(`Atlas ${col.id} metadata mismatch`);
      }
      if (contrastRatioHex(sc.baseHex, sc.uiTokens.ink) < 4.5) {
        throw new Error(`Low base/ink contrast in collection ${col.id} hero ${heroSeed}`);
      }
      assertHeroContrast(sc, `atlas:${col.id}:${heroSeed}:${sc.mood}`);
      count++;
    }
  }
  const sysDark = generateScene({ seed: heroes[0], collection: col.id, mood: 'system', colorScheme: 'dark' });
  const sysLight = generateScene({ seed: heroes[0], collection: col.id, mood: 'system', colorScheme: 'light' });
  if (!sysDark.isDark || sysLight.isDark) {
    throw new Error(`Collection ${col.id} failed system colorScheme override`);
  }
  count += 2;
}

// 8. Day <-> Night physical sphere geometry lock + Solar Clock
const dayScene = generateScene({ seed: 'SOLAS1', style: 'sphere', mood: 'light' });
const nightScene = generateScene({ seed: 'SOLAS1', style: 'sphere', mood: 'dark' });
if (
  dayScene.poles[0].pos[0] !== nightScene.poles[0].pos[0] ||
  dayScene.poles[0].pos[1] !== nightScene.poles[0].pos[1] ||
  dayScene.poles[0].radius !== nightScene.poles[0].radius ||
  dayScene.isDark === nightScene.isDark
) {
  throw new Error('lockGeometrySeed failed to anchor spatial geometry across Day <-> Night moods');
}

let prevX = -1;
for (let h = 6; h <= 18; h += 0.5) {
  const p = solarPhase(new Date(), h);
  if (p.x < prevX || p.isNight) throw new Error(`solarPhase not monotonic at ${h}`);
  prevX = p.x;
}
const dawn = generateScene({ seed: 'SOLAS1', atlas: 'dawn-meadow', mood: 'light', solar: true, solarHour: 6.5 });
const noon = generateScene({ seed: 'SOLAS1', atlas: 'dawn-meadow', mood: 'light', solar: true, solarHour: 12 });
const dusk = generateScene({ seed: 'SOLAS1', atlas: 'dawn-meadow', mood: 'light', solar: true, solarHour: 17.5 });
if (!(dawn.bloomPos[0] < noon.bloomPos[0] && noon.bloomPos[0] < dusk.bloomPos[0])) {
  throw new Error('Solar bloom did not move east->west');
}
if (!(noon.bloomPos[1] < dawn.bloomPos[1] && noon.bloomStrength > dawn.bloomStrength)) {
  throw new Error('Solar noon should be higher and brighter than dawn');
}

// 9. Zero-WebGL SSR getSphereTokensAndCss() + OKLab/Display-P3 exportCSS() & exportSVG()
const ssrOut = getSphereTokensAndCss({ seed: 'SOLAS1', atlas: 'ocean', mode: 'fluted', mood: 'dark' });
if (
  ssrOut.theme !== 'dark' ||
  !ssrOut.cssBackground.includes('in oklab') ||
  ssrOut.tokens.ink !== '#FFFFFF'
) {
  throw new Error(`getSphereTokensAndCss() validation failed: ${JSON.stringify(ssrOut)}`);
}

const svgOut = exportSVG(dayScene, { width: 1200, height: 630, grainScale: 1.65 });
const cssOut = exportCSS(dayScene);
if (
  !svgOut.startsWith('<svg') ||
  !svgOut.includes('color-interpolation="linearRGB"') ||
  !cssOut.includes('radial-gradient(ellipse ') ||
  !cssOut.includes(' in oklab,') ||
  !cssOut.includes('@supports (color: color(display-p3 1 1 1))') ||
  !cssOut.includes('color(display-p3 ') ||
  !cssOut.includes('@supports not (background: linear-gradient(in oklab, red, blue))')
) {
  throw new Error('exportSVG or OKLab/Display-P3 exportCSS output validation failed');
}

let strictThrew = false;
try {
  await exportImage(dayScene, { width: 320, height: 180, strict: true });
} catch {
  strictThrew = true;
}
if (!strictThrew) {
  throw new Error('exportImage({ strict: true }) must throw when WebGL2 is unavailable');
}

// 10. Strict pixel-budget enforcement (3x phone + 5K 2x desktop) & zero backbuffer reallocation
const fakePhone = { clientWidth: 430, clientHeight: 932, width: 0, height: 0 };
globalThis.window = { devicePixelRatio: 3 };
const phoneRenderer = new SphereRenderer(fakePhone, { maxDpr: 3, pixelBudget: 5.2e6, interactiveBudget: 1.6e6 });
const stPhone = phoneRenderer.resize('static');
const phoneStaticW = fakePhone.width, phoneStaticH = fakePhone.height;
const itPhone = phoneRenderer.resize('interactive');
if (
  stPhone.width * stPhone.height > 5.2e6 ||
  itPhone.width * itPhone.height > 1.6e6 ||
  itPhone.dpr >= stPhone.dpr ||
  fakePhone.width !== phoneStaticW ||
  fakePhone.height !== phoneStaticH
) {
  throw new Error(`Phone resolution budget or FBO stability failed: ${JSON.stringify({ stPhone, itPhone, fakePhone })}`);
}

const fake5K = { clientWidth: 5120, clientHeight: 2880, width: 0, height: 0 };
globalThis.window = { devicePixelRatio: 2 };
const desk5kRenderer = new SphereRenderer(fake5K, { maxDpr: 3, pixelBudget: 5.2e6, interactiveBudget: 1.6e6 });
const st5K = desk5kRenderer.resize('static');
const w5K = fake5K.width, h5K = fake5K.height;
const it5K = desk5kRenderer.resize('interactive');
delete globalThis.window;
if (
  st5K.width * st5K.height > 5.2e6 ||
  it5K.width * it5K.height > 1.6e6 ||
  fake5K.width !== w5K ||
  fake5K.height !== h5K
) {
  throw new Error(`5K hard pixel budget exceeded: static=${st5K.width * st5K.height}, interactive=${it5K.width * it5K.height}`);
}

// 11. React (SphereBackground) & Framer (SphereGL) single-mount, URL preset preservation, & seed stability
function makeMockElement(tag = 'DIV') {
  const attrs = new Map();
  const props = new Map();
  const styleObj = {
    position: 'static',
    isolation: 'auto',
    setProperty(k, v) { props.set(k, v); },
    getPropertyValue(k) { return props.get(k) || ''; },
  };
  return {
    tagName: tag,
    nodeType: 1,
    clientWidth: 1280,
    clientHeight: 720,
    width: 0,
    height: 0,
    style: styleObj,
    children: [],
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    hasAttribute(k) { return attrs.has(k); },
    prepend(child) { child.parentElement = this; this.children.unshift(child); },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
  };
}

globalThis.document = {
  hidden: false,
  documentElement: makeMockElement('HTML'),
  body: makeMockElement('BODY'),
  head: { appendChild: (n) => n },
  querySelector: () => null,
  createElement: (t) => makeMockElement(t.toUpperCase()),
  addEventListener() {},
  removeEventListener() {},
};
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 2,
  getComputedStyle: (el) => el?.style || { getPropertyValue: () => '' },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {},
  removeEventListener() {},
};

// Direct mountSphereBackground + regenerate check
const directHost = makeMockElement('DIV');
const studioUrl = 'https://denissitnikov.github.io/sphere-gl/#seed=K9P3W7&col=wicklow-amber&style=fluted&mood=dark&grain=0.45';
let sceneEvents = 0;
const directInst = mountSphereBackground(directHost, {
  url: studioUrl,
  onScene: () => { sceneEvents++; },
});
if (
  sceneEvents !== 1 ||
  directInst.scene.seed !== 'K9P3W7' ||
  directInst.scene.collection !== 'wicklow-amber' ||
  directInst.scene.style !== 'fluted' ||
  directInst.scene.mood !== 'dark' ||
  !directHost.style.backgroundImage.includes('in oklab')
) {
  throw new Error(`Direct mount URL preset failed: ${JSON.stringify(directInst.scene)}`);
}
// Updating grain/lightFollow without seed must keep the existing seed
directInst.regenerate({ grain: 2.0, lightFollow: false });
if (directInst.scene.seed !== 'K9P3W7' || directInst.scene.collection !== 'wicklow-amber') {
  throw new Error('regenerate({ grain, lightFollow }) clobbered seed or collection');
}
directInst.destroy();

const sphereIndexUrl = new URL('../src/index.js', import.meta.url).href;
const mockSources = {
  'mock:react': `
    export const __h = { slots: [], idx: 0, effects: [], host: null };
    export function forwardRef(fn) { return fn; }
    export function useRef(init) {
      const i = __h.idx++;
      if (!(i in __h.slots)) __h.slots[i] = { current: i === 0 && __h.host ? __h.host : init };
      return __h.slots[i];
    }
    export function useMemo(fn, deps) {
      const i = __h.idx++;
      const prev = __h.slots[i];
      if (!prev || deps.some((d, k) => !Object.is(d, prev.deps[k]))) __h.slots[i] = { val: fn(), deps };
      return __h.slots[i].val;
    }
    export function useImperativeHandle(ref, create) { if (ref) ref.current = create(); }
    export function useEffect(fn, deps) {
      const i = __h.idx++;
      const prev = __h.slots[i];
      if (!prev || !deps || deps.some((d, k) => !Object.is(d, prev.deps[k]))) {
        __h.effects.push(() => {
          if (prev?.cleanup) prev.cleanup();
          const cleanup = fn();
          __h.slots[i] = { deps, cleanup };
        });
      }
    }
    export function createElement(type, props, children) { return { type, props, children }; }
  `,
  'mock:framer': `
    export const ControlType = { Enum: 'enum', String: 'string', Color: 'color', Number: 'number', Boolean: 'boolean' };
    export function addPropertyControls() {}
  `,
};

if (typeof nodeModule.registerHooks === 'function') {
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'react') return { shortCircuit: true, url: 'mock:react' };
      if (specifier === 'framer') return { shortCircuit: true, url: 'mock:framer' };
      if (specifier === 'sphere-gl') return { shortCircuit: true, url: sphereIndexUrl };
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url in mockSources) return { shortCircuit: true, format: 'module', source: mockSources[url] };
      return nextLoad(url, context);
    },
  });
} else {
  const loaderSrc = `
    const map = ${JSON.stringify(mockSources)};
    const sp = ${JSON.stringify(sphereIndexUrl)};
    export async function resolve(s, c, n) {
      if (s === 'react') return { shortCircuit: true, url: 'mock:react' };
      if (s === 'framer') return { shortCircuit: true, url: 'mock:framer' };
      if (s === 'sphere-gl') return { shortCircuit: true, url: sp };
      return n(s, c);
    }
    export async function load(u, c, n) {
      if (u in map) return { shortCircuit: true, format: 'module', source: map[u] };
      return n(u, c);
    }
  `;
  nodeModule.register(`data:text/javascript,${encodeURIComponent(loaderSrc)}`);
}

const mockReact = await import('react');
const { SphereBackground } = await import('../src/react.js');
const { default: SphereGL } = await import('../src/framer.js');

function runHookRender(Comp, props, ref = null) {
  mockReact.__h.idx = 0;
  mockReact.__h.effects = [];
  const vnode = Comp(props, ref);
  const fns = [...mockReact.__h.effects];
  mockReact.__h.effects = [];
  for (const fn of fns) fn();
  return vnode;
}

// Test SphereBackground initial mount with Studio URL + prop update without clobbering
mockReact.__h.slots = [];
mockReact.__h.host = makeMockElement('DIV');
const reactScenes = [];
const reactHandle = { current: null };
const ssrVnode = runHookRender(
  SphereBackground,
  { url: studioUrl, onScene: (sc) => reactScenes.push(sc) },
  reactHandle,
);
if (
  reactScenes.length !== 1 ||
  reactScenes[0].seed !== 'K9P3W7' ||
  reactScenes[0].collection !== 'wicklow-amber' ||
  reactScenes[0].style !== 'fluted' ||
  reactScenes[0].mood !== 'dark' ||
  !String(ssrVnode.props.style.background || '').includes('in oklab')
) {
  throw new Error(`SphereBackground double-mounted or clobbered URL preset: scenes=${reactScenes.length}, scene=${JSON.stringify(reactScenes[0])}`);
}

// Update grain & lightFollow on SphereBackground: must NOT roll a new seed or clobber URL preset
runHookRender(
  SphereBackground,
  { url: studioUrl, grain: 2.1, lightFollow: false, onScene: (sc) => reactScenes.push(sc) },
  reactHandle,
);
if (
  reactScenes.length !== 2 ||
  reactScenes[1].seed !== 'K9P3W7' ||
  reactScenes[1].collection !== 'wicklow-amber' ||
  reactScenes[1].style !== 'fluted'
) {
  throw new Error(`SphereBackground prop update clobbered URL preset or seed: ${JSON.stringify(reactScenes[1])}`);
}
for (const slot of mockReact.__h.slots) slot?.cleanup?.();

// Test SphereGL (Framer) initial mount with sourceMode='url'
mockReact.__h.slots = [];
const framerHost = makeMockElement('DIV');
mockReact.__h.host = framerHost;
runHookRender(SphereGL, { sourceMode: 'url', presetUrl: studioUrl });
const framerInst = framerHost.__sphereInstance;
if (
  !framerInst ||
  framerInst.scene.seed !== 'K9P3W7' ||
  framerInst.scene.collection !== 'wicklow-amber' ||
  framerInst.scene.style !== 'fluted' ||
  framerInst.scene.mood !== 'dark'
) {
  throw new Error(`Framer SphereGL clobbered URL preset: ${JSON.stringify(framerInst?.scene)}`);
}
runHookRender(SphereGL, { sourceMode: 'url', presetUrl: studioUrl, grain: 0.9 });
if (framerInst.scene.seed !== 'K9P3W7' || framerInst.scene.collection !== 'wicklow-amber') {
  throw new Error('Framer SphereGL prop update rolled a new seed');
}
for (const slot of mockReact.__h.slots) slot?.cleanup?.();

// Test <sphere-gl> Custom Element registration & observedAttributes reactivity
const customDefs = new Map();
globalThis.HTMLElement = class MockHTMLElement {
  constructor() { Object.assign(this, makeMockElement('SPHERE-GL')); }
};
globalThis.customElements = {
  get: (n) => customDefs.get(n),
  define: (n, c) => customDefs.set(n, c),
};
const SphereElClass = registerSphereElement('sphere-gl');
if (!SphereElClass || SphereElClass.observedAttributes.length !== 13) {
  throw new Error('<sphere-gl> observedAttributes registration failed');
}
const wc = new SphereElClass();
wc.setAttribute('seed', 'WC7F3A');
wc.setAttribute('mode', 'prism');
wc.setAttribute('atlas', 'ocean');
wc.connectedCallback();
if (wc.instance?.scene?.seed !== 'WC7F3A' || wc.instance?.scene?.style !== 'prism' || wc.instance?.scene?.atlas !== 'skellig-night') {
  throw new Error(`<sphere-gl> connectedCallback failed: ${JSON.stringify(wc.instance?.scene)}`);
}
wc.setAttribute('mode', 'topo');
wc.attributeChangedCallback('mode', 'prism', 'topo');
if (wc.instance?.scene?.seed !== 'WC7F3A' || wc.instance?.scene?.style !== 'topo') {
  throw new Error('<sphere-gl> attributeChangedCallback failed or rolled new seed');
}
wc.disconnectedCallback();
delete globalThis.HTMLElement;
delete globalThis.customElements;
delete globalThis.window;
delete globalThis.document;

// 12. Built dist/sphere-gl.esm.min.js smoke verification
const distEsm = await import('../dist/sphere-gl.esm.min.js');
const distScene = distEsm.generateScene({ seed: 'DIST15', atlas: 'emerald', mode: 'topo', gamut: 'p3' });
if (distScene.atlas !== 'glen-shade' || distScene.mode !== 'topo' || distScene.gamut !== 'p3') {
  throw new Error(`Built dist/sphere-gl.esm.min.js verification failed: ${JSON.stringify(distScene)}`);
}

console.log(
  `sphere-gl v1.5.0 smoke test passed (${count} deterministic scenes, 7 optical modes, 15 Irish atlases + semantic aliases, CSS Color 4 oklch/oklab/hsl parser, focusRect attenuation, 3x3 WCAG >= 4.5:1 hero contrast, React/Framer single-mount + URL preset & seed stability, OKLab + Display-P3 CSS/SVG export, and strict 3x/5K pixel-budget enforcement verified).`,
);
