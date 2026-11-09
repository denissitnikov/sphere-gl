#!/usr/bin/env node
import {
  ARCHETYPES,
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

// 3. Test sRGB <-> OKLab roundtrip & custom brand palette override (whatamesh-style)
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

// 4. Test Preset URL formatting & parsing (ShaderGradient-style URL preset)
const presetUrl = formatPresetUrl(customScene, {
  grain: 1.65,
  motion: true,
  lockSeed: true,
  colors: ['#04070F', '#0A84FF'],
});
const parsed = parsePresetUrl(presetUrl);
if (
  parsed.seed !== 'BRAND2' ||
  parsed.style !== 'sphere' ||
  parsed.grain !== 1.65 ||
  parsed.motion !== true ||
  parsed.colors.length !== 2
) {
  throw new Error(`Preset URL roundtrip failed: ${JSON.stringify(parsed)}`);
}

console.log(
  `sphere-gl v1.1 smoke test passed (${count} deterministic scenes, WCAG ink contrast >= 4.5:1, custom CSS hexes, and Preset URL roundtrip verified).`,
);
