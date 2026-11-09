#!/usr/bin/env node
import {
  ARCHETYPES,
  STYLE_MODES,
  MOOD_MODES,
  generateScene,
  randomSeed,
} from '../src/index.js';

let count = 0;
for (const style of STYLE_MODES) {
  for (const mood of MOOD_MODES) {
    for (let i = 0; i < 12; i++) {
      const seed = randomSeed();
      const s1 = generateScene({ seed, style, mood });
      const s2 = generateScene({ seed, style, mood });
      if (JSON.stringify(s1) !== JSON.stringify(s2)) {
        throw new Error(`Determinism check failed for seed ${seed}`);
      }
      if (s1.poles.length !== 6) {
        throw new Error(`Expected 6 poles, got ${s1.poles.length}`);
      }
      count++;
    }
  }
}

for (const arch of ARCHETYPES) {
  const s = generateScene({ archetype: arch.id });
  if (!s.baseHex.startsWith('#') || s.paletteSwatches.length < 4) {
    throw new Error(`Invalid palette for archetype ${arch.id}`);
  }
  count++;
}

console.log(`sphere-gl smoke test passed (${count} deterministic scenes verified across ${ARCHETYPES.length} harmonies).`);
