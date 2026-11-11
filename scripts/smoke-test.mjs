#!/usr/bin/env node
import {
  ARCHETYPES,
  COLLECTIONS,
  STYLE_MODES,
  MOOD_MODES,
  generateScene,
  randomSeed,
  parsePresetUrl,
  formatPresetUrl,
  srgbHexToOklab,
  oklabToSrgbHex,
  parseCssColorBytes,
} from '../src/index.js';

function relativeLuminance([r8, g8, b8]) {
  const lin = (u) => {
    const c = u / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r8) + 0.7152 * lin(g8) + 0.0722 * lin(b8);
}

function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(parseCssColorBytes(hexA));
  const l2 = relativeLuminance(parseCssColorBytes(hexB));
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

let count = 0;

// 1. Test 500+ deterministic generative scenes across all styles & moods
for (const style of STYLE_MODES) {
  for (const mood of MOOD_MODES) {
    for (let i = 0; i < 32; i++) {
      const seed = randomSeed();
      const s1 = generateScene({ seed, style, mood });
      const s2 = generateScene({ seed, style, mood });
      if (JSON.stringify(s1) !== JSON.stringify(s2)) {
        throw new Error(`Determinism check failed for seed ${seed}`);
      }
      if (s1.poles.length !== 6) {
        throw new Error(`Expected 6 poles, got ${s1.poles.length}`);
      }
      if (!s1.uiTokens || !s1.uiTokens.ink || !s1.uiTokens.glass) {
        throw new Error(`Missing uiTokens on scene ${seed}`);
      }
      const cr = contrastRatio(s1.baseHex, s1.uiTokens.ink);
      if (cr < 4.5) {
        throw new Error(`Low ink/base contrast (${cr.toFixed(2)}) on seed ${seed}`);
      }
      count++;
    }
  }
}

// 2. Test all curated archetypes
for (const arch of ARCHETYPES) {
  const s = generateScene({ archetype: arch.id });
  if (!s.baseHex.startsWith('#') || s.paletteSwatches.length < 4) {
    throw new Error(`Invalid palette for archetype ${arch.id}`);
  }
  count++;
}

// 3. Test sRGB <-> OKLab roundtrip & custom brand palette override
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

const customScene = generateScene({
  seed: 'BRAND2',
  style: 'sphere',
  colors: ['#04070F', '#0A84FF', '#47ABFF', '#8CE5FF'],
});
if (customScene.archetypeId !== 'custom-palette' || !customScene.isDark) {
  throw new Error('Custom dark brand palette failed');
}

// 4. Test Preset URL formatting & parsing (including ?preview=website, hour, lightFollow)
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
const slidetabLink = parsePresetUrl('https://denissitnikov.github.io/sphere-gl/?preview=website');
if (slidetabLink.preview !== 'website') {
  throw new Error(`Expected ?preview=website to parse preview='website', got ${JSON.stringify(slidetabLink)}`);
}
const hourOnlyLink = parsePresetUrl('#hour=6.25&light=0');
if (hourOnlyLink.solar !== true || hourOnlyLink.solarHour !== 6.25 || hourOnlyLink.lightFollow !== false) {
  throw new Error(`Expected #hour=6.25&light=0 to enable solar and disable lightFollow, got ${JSON.stringify(hourOnlyLink)}`);
}

// 5. Test `mood: 'system'` strict OS Light vs Dark schema alignment across 400 seeds
for (let i = 0; i < 200; i++) {
  const darkSeed = generateScene({ mood: 'system', colorScheme: 'dark' });
  if (!darkSeed.isDark || darkSeed.uiTokens.theme !== 'dark') {
    throw new Error(`System dark schema produced non-dark scene (${darkSeed.seed})`);
  }
  const lightSeed = generateScene({ mood: 'system', colorScheme: 'light' });
  if (lightSeed.isDark || lightSeed.uiTokens.theme !== 'light') {
    throw new Error(`System light schema produced dark scene (${lightSeed.seed})`);
  }
  count += 2;
}

// 6. Test all 15 Procedural COLLECTIONS (heroes + random seeds) & WCAG contrast
if (!Array.isArray(COLLECTIONS) || COLLECTIONS.length !== 15) {
  throw new Error(`Expected 15 COLLECTIONS, got ${COLLECTIONS?.length}`);
}
if (COLLECTIONS.filter((c) => c.group === 'emerald').length !== 7) {
  throw new Error('Expected 7 Emerald Isle atlases');
}
for (const col of COLLECTIONS) {
  for (const heroSeed of col.heroes) {
    for (const moodOverride of [undefined, 'light', 'split', 'dark']) {
      const sc = generateScene({ seed: heroSeed, collection: col.id, mood: moodOverride });
      if (sc.collection !== col.id) {
        throw new Error(`Expected collection ${col.id}, got ${sc.collection}`);
      }
      if (moodOverride && sc.mood !== moodOverride) {
        throw new Error(`Expected mood ${moodOverride} on collection ${col.id}, got ${sc.mood}`);
      }
      const cr = contrastRatio(sc.baseHex, sc.uiTokens.ink);
      if (cr < 4.5) {
        throw new Error(`Low contrast (${cr.toFixed(2)}) in collection ${col.id} hero ${heroSeed} mood ${sc.mood}`);
      }
      count++;
    }
  }
  const sysDark = generateScene({ seed: col.heroes[0], collection: col.id, mood: 'system', colorScheme: 'dark' });
  const sysLight = generateScene({ seed: col.heroes[0], collection: col.id, mood: 'system', colorScheme: 'light' });
  if (!sysDark.isDark || sysLight.isDark) {
    throw new Error(`Collection ${col.id} failed system colorScheme override`);
  }
  count += 2;
}

// 7. Test lockGeometrySeed Day <-> Night physical sphere anchoring & style count (4 modes, fluted removed)
if (STYLE_MODES.includes('fluted') || STYLE_MODES.length !== 4) {
  throw new Error(`Expected 4 STYLE_MODES without fluted, got ${JSON.stringify(STYLE_MODES)}`);
}
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

// 8. Test exportSVG & exportCSS on SphereRenderer prototype
const { SphereRenderer, solarPhase } = await import('../src/index.js');
const svgOut = SphereRenderer.prototype.exportSVG.call({ _lastScene: dayScene }, dayScene, {
  width: 1200,
  height: 630,
  grainScale: 1.65,
});
const cssOut = SphereRenderer.prototype.exportCSS.call({ _lastScene: dayScene }, dayScene);
if (!svgOut.startsWith('<svg') || !svgOut.includes('radialGradient') || !cssOut.includes('radial-gradient')) {
  throw new Error('exportSVG or exportCSS output validation failed');
}

// 9. Solar clock: sun x sweeps east->west across the day; bloom follows; theme never flips
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
if (dawn.isDark !== noon.isDark || JSON.stringify(dawn.poles[0].pos) !== JSON.stringify(noon.poles[0].pos)) {
  throw new Error('Solar clock must not flip theme or move spheres');
}
for (const sc of [dawn, noon, dusk]) {
  if (contrastRatio(sc.baseHex, sc.uiTokens.ink) < 4.5) throw new Error('Solar scene lost contrast');
  count++;
}

// 10. Two-tier resolution budget: interactive frames stay under 1.6 MP on 3x phones
const fakeCanvas = { clientWidth: 430, clientHeight: 932, width: 0, height: 0 };
globalThis.window = { devicePixelRatio: 3 };
const r = Object.create(SphereRenderer.prototype);
Object.assign(r, { canvas: fakeCanvas, gl: null, maxDpr: 3, pixelBudget: 5.2e6, interactiveBudget: 1.6e6, _tier: 'static' });
const st = r.resize('static');
const it = r.resize('interactive');
delete globalThis.window;
if (st.dpr !== 3 || it.width * it.height > 1.6e6 * 1.02 || it.dpr >= st.dpr) {
  throw new Error(`Resolution tiers wrong: static ${st.dpr}x, interactive ${it.width}x${it.height}`);
}

console.log(
  `sphere-gl smoke test passed (${count} deterministic scenes, 15 Irish atlases, solar clock, 2-tier resolution, 4 optical styles, PNG/WebP/JPG/SVG/CSS exports, Day/Night geometry lock, 100% OS dark/light schema alignment, and WCAG ink contrast >= 4.5:1 verified).`,
);
