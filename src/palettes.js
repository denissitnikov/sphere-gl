/**
 * sphere-gl / src/palettes.js
 * Perceptual OKLCH / OKLab color science, deterministic seeded PRNG, and
 * studio-grade procedural composition choreography for generative backgrounds.
 *
 * Art-directed inspirations:
 * 1. Doo Design — High-key luminous alabaster, warm honey, blush coral & botanical sage meshes
 * 2. Lukas Rudrof (SPHERE) — Macro planetary spheres, split-spectrum cerulean & sunset tangerine
 *    dissolving across misty periwinkle and pale ivory horizons
 * 3. Midnight Glassmorphic Studio — Deep sapphire, caustic cyan & velvet ember dark moods
 *
 * Zero external dependencies. Pure ES module.
 */

export const STYLE_MODES = ['auto', 'mesh', 'sphere', 'silk'];
export const MOOD_MODES = ['system', 'any', 'light', 'split', 'dark'];

const VALID_STYLES = ['mesh', 'sphere', 'silk'];
const VALID_MOODS = ['light', 'split', 'dark'];

/**
 * Detects the active user/site color scheme preference (`'dark'` or `'light'`).
 * Checks explicit root theme attributes/classes first (`data-theme`, `data-color-scheme`,
 * `.dark` / `.light` on `<html>`), then falls back to OS/browser `prefers-color-scheme`.
 *
 * @returns {'dark' | 'light'}
 */
export function detectColorScheme() {
  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement;
    const body = document.body;
    const explicitAttr = (
      root.getAttribute('data-theme') ||
      root.getAttribute('data-color-scheme') ||
      root.getAttribute('data-bs-theme') ||
      body?.getAttribute('data-theme') ||
      body?.getAttribute('data-color-scheme') ||
      ''
    )
      .trim()
      .toLowerCase();

    if (explicitAttr === 'dark') return 'dark';
    if (explicitAttr === 'light') return 'light';

    if (root.classList?.contains('dark') || body?.classList?.contains('dark')) {
      return 'dark';
    }
    if (root.classList?.contains('light') || body?.classList?.contains('light')) {
      return 'light';
    }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (_) {
      // Ignore matchMedia errors in restricted environments
    }
  }

  return 'light';
}
const SEED_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 unambiguous uppercase chars
const DEG_TO_RAD = Math.PI / 180;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Curated Archetype Specifications (OKLCH perceptual coordinates)
// Poles are ordered by functional choreography role:
//   [0] Primary Hero A       [1] Primary Hero B (or Counter-Pole)
//   [2] Companion Glow A     [3] Companion Glow B / Accent
//   [4] Luminous Hue Bridge  [5] Atmospheric Veil / Anchor
// ---------------------------------------------------------------------------

const ARCHETYPE_SPECS = [
  // ======================== LIGHT MOOD ========================
  {
    id: 'alabaster-honey',
    name: 'Alabaster & Honey Coral',
    mood: 'light',
    defaultStyle: 'mesh',
    hueDrift: 7,
    base: [0.976, 0.013, 84],
    bloom: [0.986, 0.015, 80],
    bridgeHue: 62,
    poles: [
      [0.865, 0.138, 76],  // Sunlit golden honey
      [0.805, 0.142, 29],  // Blush coral
      [0.848, 0.128, 52],  // Warm apricot nectar
      [0.862, 0.068, 152], // Muted botanical sage
      [0.938, 0.048, 70],  // Champagne cream bridge
      [0.892, 0.076, 18],  // Soft petal rose
    ],
  },
  {
    id: 'porcelain-peach-sage',
    name: 'Porcelain Peach & Celadon',
    mood: 'light',
    defaultStyle: 'mesh',
    hueDrift: 8,
    base: [0.974, 0.011, 94],
    bloom: [0.986, 0.012, 88],
    bridgeHue: 74,
    poles: [
      [0.822, 0.132, 42],  // Watercolor peach-terracotta
      [0.858, 0.078, 168], // Eucalyptus celadon
      [0.908, 0.104, 86],  // Soft sunlit buttercup
      [0.872, 0.062, 230], // Pale mineral sky
      [0.946, 0.028, 78],  // Warm porcelain silk bridge
      [0.882, 0.082, 22],  // Rosewater quartz
    ],
  },
  {
    id: 'morning-lilac-pearl',
    name: 'Morning Lilac & Pearl',
    mood: 'light',
    defaultStyle: 'silk',
    hueDrift: 9,
    base: [0.972, 0.012, 286],
    bloom: [0.986, 0.014, 312],
    bridgeHue: 326,
    poles: [
      [0.818, 0.118, 278], // Periwinkle iris
      [0.846, 0.114, 348], // Blush peony silk
      [0.888, 0.078, 232], // Glacial sky mist
      [0.878, 0.094, 48],  // Warm peach satin
      [0.922, 0.054, 306], // Opal lavender bridge
      [0.958, 0.020, 258], // Nacre highlight
    ],
  },
  {
    id: 'solstice-ochre-mist',
    name: 'Solstice Ochre & Chalk',
    mood: 'light',
    defaultStyle: 'sphere',
    hueDrift: 7,
    base: [0.962, 0.016, 80],
    bloom: [0.984, 0.014, 76],
    bridgeHue: 44,
    poles: [
      [0.788, 0.146, 66],  // Macro warm ochre sphere
      [0.772, 0.152, 35],  // Macro apricot-coral sphere
      [0.878, 0.058, 244], // Misty pale cerulean counter-glow
      [0.886, 0.088, 78],  // Sunlit sand halo
      [0.896, 0.046, 302], // Soft lavender-chalk bridge
      [0.952, 0.022, 74],  // Limestone horizon veil
    ],
  },

  // ======================== SPLIT MOOD ========================
  {
    id: 'cerulean-tangerine',
    name: 'Cerulean & Sunset Tangerine',
    mood: 'split',
    defaultStyle: 'sphere',
    hueDrift: 6,
    base: [0.868, 0.042, 256],
    bloom: [0.968, 0.018, 268],
    bridgeHue: 332,
    poles: [
      [0.595, 0.186, 252], // Macro cerulean cobalt sphere
      [0.722, 0.184, 46],  // Macro sunset tangerine sphere
      [0.762, 0.116, 246], // Azure periwinkle halo
      [0.828, 0.126, 64],  // Golden peach glow
      [0.884, 0.054, 320], // Misty periwinkle-rose horizon bridge
      [0.952, 0.018, 250], // Luminous zenith sky-white
    ],
  },
  {
    id: 'steel-lavender-amber',
    name: 'Nordic Steel & Warm Amber',
    mood: 'split',
    defaultStyle: 'sphere',
    hueDrift: 7,
    base: [0.842, 0.036, 272],
    bloom: [0.960, 0.016, 292],
    bridgeHue: 326,
    poles: [
      [0.565, 0.098, 248], // Muted Nordic steel blue sphere
      [0.748, 0.146, 55],  // Burnished ochre-amber sphere
      [0.742, 0.096, 292], // Wisteria lavender companion
      [0.768, 0.118, 30],  // Warm terracotta peach
      [0.882, 0.044, 322], // Pale mauve mist bridge
      [0.946, 0.014, 266], // Diffused silver alabaster
    ],
  },
  {
    id: 'aegean-coral-horizon',
    name: 'Aegean Teal & Coral Dusk',
    mood: 'split',
    defaultStyle: 'mesh',
    hueDrift: 8,
    base: [0.882, 0.034, 224],
    bloom: [0.970, 0.018, 56],
    bridgeHue: 348,
    poles: [
      [0.585, 0.148, 228], // Deep Aegean teal-azure
      [0.712, 0.172, 26],  // Living coral dusk
      [0.822, 0.134, 66],  // Sunlit nectar gold
      [0.748, 0.114, 214], // Luminous lagoon cyan
      [0.892, 0.052, 350], // Seashell rose bridge
      [0.952, 0.022, 74],  // Champagne horizon mist
    ],
  },
  {
    id: 'twilight-violet-citrine',
    name: 'Twilight Violet & Citrine',
    mood: 'split',
    defaultStyle: 'silk',
    hueDrift: 8,
    base: [0.806, 0.048, 284],
    bloom: [0.954, 0.026, 342],
    bridgeHue: 342,
    poles: [
      [0.532, 0.168, 282], // Deep twilight iris violet
      [0.818, 0.148, 68],  // Luminous peach-citrine
      [0.724, 0.152, 356], // Flamingo rose ribbon
      [0.588, 0.146, 256], // Cobalt dusk
      [0.848, 0.072, 326], // Orchid mist bridge
      [0.926, 0.044, 78],  // Pale gold veil
    ],
  },

  // ======================== DARK MOOD ========================
  {
    id: 'electric-sapphire',
    name: 'Midnight Electric Sapphire',
    mood: 'dark',
    defaultStyle: 'silk',
    hueDrift: 5,
    base: [0.136, 0.034, 260],
    bloom: [0.615, 0.138, 232],
    bridgeHue: 246,
    poles: [
      [0.365, 0.176, 262], // Deep royal aqua-sapphire (#003DA6 lineage)
      [0.535, 0.204, 255], // Electric sapphire blue (#0A6BFF / #0A84FF)
      [0.665, 0.140, 222], // Liquid cyan caustic glow (#47ABFF / #8CE5FF)
      [0.245, 0.096, 274], // Midnight indigo shadow
      [0.345, 0.126, 286], // Subtle Pro Studio violet rim
      [0.182, 0.054, 252], // Brand slate anchor (#081226)
    ],
  },
  {
    id: 'velvet-ember-obsidian',
    name: 'Velvet Ember & Obsidian',
    mood: 'dark',
    defaultStyle: 'sphere',
    hueDrift: 6,
    base: [0.138, 0.028, 274],
    bloom: [0.558, 0.136, 42],
    bridgeHue: 342,
    poles: [
      [0.445, 0.168, 32],  // Smoldering velvet ember
      [0.348, 0.138, 258], // Deep midnight sapphire counter-sphere
      [0.538, 0.148, 54],  // Burnished copper-amber glow
      [0.402, 0.138, 14],  // Crimson garnet halo
      [0.305, 0.104, 328], // Nocturne plum-rose bridge
      [0.182, 0.036, 262], // Obsidian slate depth
    ],
  },
  {
    id: 'abyssal-aurora-jade',
    name: 'Abyssal Jade & Ultramarine',
    mood: 'dark',
    defaultStyle: 'mesh',
    hueDrift: 7,
    base: [0.142, 0.032, 234],
    bloom: [0.562, 0.118, 202],
    bridgeHue: 216,
    poles: [
      [0.478, 0.132, 184], // Bioluminescent sea-jade
      [0.362, 0.168, 264], // Deep ultramarine
      [0.442, 0.138, 228], // Nocturnal cerulean
      [0.568, 0.114, 198], // Soft aqua caustic
      [0.272, 0.094, 286], // Midnight violet bridge
      [0.215, 0.062, 178], // Deep pine-abyssal shadow
    ],
  },
  {
    id: 'nocturne-amethyst-rose',
    name: 'Nocturne Amethyst & Rose Gold',
    mood: 'dark',
    defaultStyle: 'silk',
    hueDrift: 7,
    base: [0.138, 0.032, 302],
    bloom: [0.575, 0.106, 26],
    bridgeHue: 345,
    poles: [
      [0.385, 0.158, 296], // Royal amethyst fold
      [0.442, 0.154, 352], // Velvet berry rose
      [0.556, 0.122, 46],  // Champagne rose-gold rim
      [0.285, 0.112, 268], // Deep dusk indigo
      [0.512, 0.106, 332], // Dusty orchid bridge
      [0.196, 0.062, 320], // Dark aubergine velvet
    ],
  },
];

export const ARCHETYPES = [
  ...ARCHETYPE_SPECS.map(({ id, name, mood, defaultStyle }) => ({
    id,
    name,
    mood,
    defaultStyle,
  })),
  {
    id: 'harmonic-wild',
    name: 'Harmonic Wildcard',
    mood: 'auto',
    defaultStyle: 'auto',
  },
];

// ---------------------------------------------------------------------------
// Deterministic Seed & PRNG (cyrb128 + sfc32)
// ---------------------------------------------------------------------------

/**
 * Generates a 6-character uppercase alphanumeric seed using cryptographic RNG.
 * Uses a 32-character unambiguous alphabet so `byte & 31` has zero modulo bias.
 */
export function randomSeed() {
  const bytes = new Uint8Array(6);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += SEED_ALPHABET[bytes[i] & 31];
  }
  return out;
}

function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function createRng(seedStr) {
  let [a, b, c, d] = cyrb128(`sphere-gl-v1:${seedStr}`);
  const next = () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  // Warm up state mixing
  for (let i = 0; i < 8; i++) next();

  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    jitter(center, span) {
      // Smooth Bates-2 triangular distribution in [-span, +span] to favor poise over extremes
      const t = (next() + next()) - 1.0;
      return center + t * span;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(prob) {
      return next() < prob;
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
  };
}

// ---------------------------------------------------------------------------
// Perceptual OKLCH / OKLab / Linear sRGB Color Science
// ---------------------------------------------------------------------------

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapHue(hDeg) {
  const h = hDeg % 360;
  return h < 0 ? h + 360 : h;
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Converts perceptual OKLCH (`L` in 0..1, `C` >= 0, `hDeg` in degrees) to OKLab `[L, a, b]`.
 */
export function oklchToOklab(L, C, hDeg) {
  const l = clamp(Number(L) || 0, 0, 1);
  const c = Math.max(0, Number(C) || 0);
  const rad = wrapHue(Number(hDeg) || 0) * DEG_TO_RAD;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

/**
 * Converts OKLab `[L, a, b]` to linear-light sRGB `[r, g, b]` (unclamped).
 */
export function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [r, g, bl];
}

function isLinearInGamut(r, g, b) {
  return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
}

/**
 * Maps OKLCH `(L, C, hDeg)` onto the sRGB gamut via chroma binary search at
 * constant perceptual lightness `L` and exact hue angle `hDeg`, returning `[L, a, b]`.
 * Prevents ugly RGB channel-clipping hue shifts (e.g. royal blue turning purple
 * or bright coral clipping to neon yellow).
 */
export function clampToGamutOklab(L, C, hDeg) {
  const l = clamp(Number(L) || 0, 0, 1);
  if (l <= 0.0001) return [0, 0, 0];
  if (l >= 0.9999) return [1, 0, 0];

  const cTarget = Math.max(0, Number(C) || 0);
  const rad = wrapHue(Number(hDeg) || 0) * DEG_TO_RAD;
  const cosH = Math.cos(rad);
  const sinH = Math.sin(rad);

  const [r0, g0, b0] = oklabToLinearSrgb(l, cTarget * cosH, cTarget * sinH);
  if (isLinearInGamut(r0, g0, b0)) {
    return [l, cTarget * cosH, cTarget * sinH];
  }

  let lo = 0;
  let hi = cTarget;
  for (let i = 0; i < 22; i++) {
    const mid = 0.5 * (lo + hi);
    const [r, g, b] = oklabToLinearSrgb(l, mid * cosH, mid * sinH);
    if (isLinearInGamut(r, g, b)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const safeC = lo * 0.999;
  return [l, safeC * cosH, safeC * sinH];
}

function linearToSrgbByte(x) {
  const c = clamp(x, 0, 1);
  const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return clamp(Math.round(encoded * 255), 0, 255);
}

function byteToHex(b) {
  return b.toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Converts OKLab `(L, a, b)` to a `'#RRGGBB'` hex string.
 * Out-of-gamut inputs are smoothly chroma-mapped in OKLCH first so hue and
 * lightness remain faithful without channel clipping.
 */
export function oklabToSrgbHex(L, a, b) {
  const l = clamp(Number(L) || 0, 0, 1);
  const na = Number(a) || 0;
  const nb = Number(b) || 0;

  let [r, g, bl] = oklabToLinearSrgb(l, na, nb);
  if (!isLinearInGamut(r, g, bl)) {
    const c = Math.hypot(na, nb);
    const hDeg = (Math.atan2(nb, na) * 180) / Math.PI;
    const [gl, ga, gb] = clampToGamutOklab(l, c, hDeg);
    [r, g, bl] = oklabToLinearSrgb(gl, ga, gb);
  }

  return `#${byteToHex(linearToSrgbByte(r))}${byteToHex(linearToSrgbByte(g))}${byteToHex(linearToSrgbByte(bl))}`;
}

function srgbChannelToLinear(u8) {
  const c = clamp(u8 / 255, 0, 1);
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Parses a CSS `#RGB`, `#RRGGBB`, or `rgb(r,g,b)` color string into `[r, g, b]` bytes (`0..255`),
 * returning `null` if invalid.
 */
export function parseCssColorBytes(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;

  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
    return null;
  }

  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
  if (rgbMatch) {
    return [
      clamp(Math.round(Number(rgbMatch[1])), 0, 255),
      clamp(Math.round(Number(rgbMatch[2])), 0, 255),
      clamp(Math.round(Number(rgbMatch[3])), 0, 255),
    ];
  }
  return null;
}

/**
 * Converts a CSS `#RRGGBB` / `#RGB` / `rgb(...)` string into perceptual OKLab `[L, a, b]`,
 * returning `null` if invalid.
 */
export function srgbHexToOklab(colorStr) {
  const bytes = parseCssColorBytes(colorStr);
  if (!bytes) return null;

  const r = srgbChannelToLinear(bytes[0]);
  const g = srgbChannelToLinear(bytes[1]);
  const b = srgbChannelToLinear(bytes[2]);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(Math.max(0, l));
  const m_ = Math.cbrt(Math.max(0, m));
  const s_ = Math.cbrt(Math.max(0, s));

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

function oklabToOklchTuple([L, a, b]) {
  const C = Math.hypot(a, b);
  const h = C > 1e-5 ? wrapHue((Math.atan2(b, a) * 180) / Math.PI) : 0;
  return [L, C, h];
}

function computeUiTokens(isDark, baseHex, poles, paletteSwatches) {
  const rgb = parseCssColorBytes(baseHex) || (isDark ? [10, 15, 26] : [252, 250, 246]);
  // Subtle hue-tinted frosted glass blended toward dark slate or pure white
  const glassR = isDark ? Math.round(rgb[0] * 0.35 + 10 * 0.65) : Math.round(rgb[0] * 0.22 + 255 * 0.78);
  const glassG = isDark ? Math.round(rgb[1] * 0.35 + 14 * 0.65) : Math.round(rgb[1] * 0.22 + 255 * 0.78);
  const glassB = isDark ? Math.round(rgb[2] * 0.35 + 24 * 0.65) : Math.round(rgb[2] * 0.22 + 255 * 0.78);
  const glassAlpha = isDark ? 0.50 : 0.60;

  // Pick a vibrant, legible accent pole
  let bestAccent = paletteSwatches[1] || paletteSwatches[0] || baseHex;
  let bestScore = -1;
  for (const p of poles) {
    const chroma = Math.hypot(p.lab[1], p.lab[2]);
    const contrastBias = isDark ? (p.lab[0] > 0.48 ? 1.2 : 0.7) : (p.lab[0] < 0.78 ? 1.2 : 0.75);
    const score = chroma * contrastBias * p.weight;
    if (score > bestScore) {
      bestScore = score;
      bestAccent = p.hex;
    }
  }

  return {
    theme: isDark ? 'dark' : 'light',
    bg: baseHex,
    ink: isDark ? '#FFFFFF' : '#0F172A',
    inkMuted: isDark ? 'rgba(255, 255, 255, 0.70)' : 'rgba(15, 23, 42, 0.68)',
    glass: `rgba(${glassR}, ${glassG}, ${glassB}, ${glassAlpha})`,
    glassBorder: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.10)',
    accent: bestAccent,
  };
}

// ---------------------------------------------------------------------------
// Perceptual Aesthetic Guardrails & Continuous Chord Generator ('harmonic-wild')
// ---------------------------------------------------------------------------

/**
 * Tames awkward perceptual zones in OKLCH when exploring continuous chords:
 * - Prevents swampy olive-brown (`H` in 92..142 at dark/mid `L`), turning high-L
 *   greens into refined botanical sage/celadon.
 * - Softens harsh electric Chartreuse / Neon Green / Acid Magenta chroma spikes.
 */
function sculptPerceptualOklch(L, C, hDeg, mood) {
  let l = clamp(L, 0.08, 0.99);
  let c = Math.max(0, C);
  let h = wrapHue(hDeg);

  // Tame olive/chartreuse zone (92°..146°)
  if (h > 92 && h < 146) {
    const midDist = 1 - Math.abs(h - 119) / 27; // 0..1 peak at 119°
    if (mood === 'dark' || l < 0.72) {
      // Shift dark/mid olive gently toward either burnished amber (82°) or deep forest jade (162°)
      h = h < 118 ? h - 22 * midDist : h + 28 * midDist;
      c *= 1 - 0.35 * midDist;
    } else {
      // High-key: sculpt into muted watercolor botanical sage/celadon
      c = Math.min(c, 0.088 - 0.018 * midDist);
    }
  }

  // Prevent dark yellow/ochre from turning muddy brown in dark mode (46°..96° at L < 0.52):
  // lift into luminous molten amber/gold or warm toward velvet copper-ember
  if (mood === 'dark' && h > 46 && h < 96 && l < 0.54) {
    const amberFactor = 1 - Math.abs(h - 71) / 25;
    l = Math.max(l, 0.50 + 0.08 * amberFactor);
    h -= 12 * amberFactor;
  }

  // Soften harsh electric magenta/neon violet spikes (308°..336°) at excessive chroma
  if (h > 308 && h < 336) {
    const mDist = 1 - Math.abs(h - 322) / 14;
    c *= 1 - 0.16 * mDist;
  }

  return [l, c, wrapHue(h)];
}

/**
 * Computes an art-directed hue bridge angle between two primary hues so opposing
 * colors bow through luminous rose/periwinkle or sunlit peach/champagne instead
 * of muddy olive or dead neutral gray.
 */
function chooseArtDirectedBridgeHue(hA, hB, mood) {
  const a = wrapHue(hA);
  const b = wrapHue(hB);
  let delta = ((b - a + 540) % 360) - 180; // [-180, 180)

  // Candidate midpoint along shorter hue arc, plus opposite arc
  const mid1 = wrapHue(a + delta * 0.5);
  const mid2 = wrapHue(mid1 + 180);

  const scoreHue = (h) => {
    // Penalize swampy yellow-green / dull cyan-green bridges (95°..165°)
    let score = 0;
    if (h >= 95 && h <= 165) {
      score -= 2.0 * (1 - Math.abs(h - 130) / 35);
    }
    // Reward rose/lavender/periwinkle atmospheric bridges (300°..360°, 0°..25°)
    if (h >= 300 || h <= 25) score += 1.1;
    // Reward sunlit warm peach/champagne bridges in light mode (40°..82°)
    if (mood === 'light' && h >= 40 && h <= 82) score += 1.25;
    // Reward sapphire/cyan-indigo continuity in dark mode (210°..285°)
    if (mood === 'dark' && h >= 210 && h <= 285) score += 0.9;
    return score;
  };

  if (Math.abs(delta) > 125) {
    // Near-complementary split: choose whichever arc avoids muddy green and feels most luminous
    return scoreHue(mid1) >= scoreHue(mid2) ? mid1 : mid2;
  }
  // If shorter arc passes right through olive (105..145) while spanning wide, detour via rose/peach
  if (Math.abs(delta) > 85 && mid1 > 105 && mid1 < 145) {
    return mid2;
  }
  return mid1;
}

/**
 * Builds a complete 6-pole + base + bloom OKLCH specification for `'harmonic-wild'`
 * that obeys strict studio harmony archetypes across continuous hue space.
 */
function buildHarmonicWildSpec(rng, mood) {
  const chordType = rng.pick(['split-atmosphere', 'analogous-cascade', 'botanical-contrast', 'iridescent-arc']);

  let hPrimary;
  let hSecondary;
  let hAccentA;
  let hAccentB;

  if (chordType === 'split-atmosphere' || mood === 'split') {
    // Cool anchor (198°..298°) paired with warm sunlit counterpart (16°..76°)
    const cool = rng.range(198, 298);
    const warm = rng.range(16, 76);
    if (rng.chance(0.5)) {
      hPrimary = cool;
      hSecondary = warm;
    } else {
      hPrimary = warm;
      hSecondary = cool;
    }
    hAccentA = wrapHue(hPrimary + rng.range(-24, 24));
    hAccentB = wrapHue(hSecondary + rng.range(-22, 22));
  } else if (chordType === 'botanical-contrast') {
    // Warm terracotta/honey/coral (18°..78°) + mineral sage/teal/sky (156°..238°)
    hPrimary = rng.range(18, 78);
    hSecondary = rng.range(156, 238);
    hAccentA = wrapHue(hPrimary + rng.range(18, 38) * rng.sign());
    hAccentB = wrapHue(hSecondary + rng.range(-24, 24));
  } else if (chordType === 'iridescent-arc') {
    // Continuous 95°..135° sweeping arc through sapphire -> orchid -> rose -> gold
    const start = rng.range(205, 345);
    const dir = rng.sign();
    hPrimary = start;
    hSecondary = wrapHue(start + dir * rng.range(72, 118));
    hAccentA = wrapHue(start + dir * rng.range(28, 52));
    hAccentB = wrapHue(start + dir * rng.range(115, 148));
  } else {
    // Analogous luminous triad + gentle counter-whisper
    const anchor = rng.range(0, 360);
    hPrimary = anchor;
    hSecondary = wrapHue(anchor + rng.range(32, 58) * rng.sign());
    hAccentA = wrapHue(anchor - rng.range(26, 48));
    hAccentB = wrapHue(anchor + 155 + rng.range(-20, 20));
  }

  const bridgeHue = chooseArtDirectedBridgeHue(hPrimary, hSecondary, mood);

  if (mood === 'light') {
    const baseHue = rng.chance(0.72) ? rng.range(68, 95) : wrapHue(hPrimary);
    return {
      base: [rng.range(0.964, 0.980), rng.range(0.009, 0.016), baseHue],
      bloom: [rng.range(0.980, 0.990), rng.range(0.010, 0.018), bridgeHue],
      bridgeHue,
      poles: [
        sculptPerceptualOklch(rng.range(0.79, 0.86), rng.range(0.118, 0.152), hPrimary, 'light'),
        sculptPerceptualOklch(rng.range(0.78, 0.86), rng.range(0.112, 0.148), hSecondary, 'light'),
        sculptPerceptualOklch(rng.range(0.84, 0.90), rng.range(0.090, 0.128), hAccentA, 'light'),
        sculptPerceptualOklch(rng.range(0.85, 0.91), rng.range(0.062, 0.098), hAccentB, 'light'),
        sculptPerceptualOklch(rng.range(0.91, 0.95), rng.range(0.035, 0.062), bridgeHue, 'light'),
        sculptPerceptualOklch(rng.range(0.94, 0.97), rng.range(0.016, 0.034), baseHue, 'light'),
      ],
    };
  }

  if (mood === 'split') {
    const skyHue = rng.range(228, 286);
    return {
      base: [rng.range(0.82, 0.88), rng.range(0.032, 0.048), skyHue],
      bloom: [rng.range(0.952, 0.974), rng.range(0.014, 0.024), bridgeHue],
      bridgeHue,
      poles: [
        sculptPerceptualOklch(rng.range(0.55, 0.64), rng.range(0.135, 0.186), hPrimary, 'split'),
        sculptPerceptualOklch(rng.range(0.70, 0.78), rng.range(0.140, 0.184), hSecondary, 'split'),
        sculptPerceptualOklch(rng.range(0.73, 0.81), rng.range(0.098, 0.136), hAccentA, 'split'),
        sculptPerceptualOklch(rng.range(0.77, 0.85), rng.range(0.102, 0.138), hAccentB, 'split'),
        sculptPerceptualOklch(rng.range(0.87, 0.91), rng.range(0.042, 0.068), bridgeHue, 'split'),
        sculptPerceptualOklch(rng.range(0.93, 0.96), rng.range(0.014, 0.026), skyHue, 'split'),
      ],
    };
  }

  // Dark mood: obsidian/midnight base + jewel-toned glows
  const darkBaseHue = rng.range(235, 300);
  return {
    base: [rng.range(0.130, 0.150), rng.range(0.026, 0.038), darkBaseHue],
    bloom: sculptPerceptualOklch(rng.range(0.54, 0.62), rng.range(0.105, 0.142), hAccentA, 'dark'),
    bridgeHue,
    poles: [
      sculptPerceptualOklch(rng.range(0.36, 0.46), rng.range(0.145, 0.188), hPrimary, 'dark'),
      sculptPerceptualOklch(rng.range(0.42, 0.54), rng.range(0.148, 0.198), hSecondary, 'dark'),
      sculptPerceptualOklch(rng.range(0.50, 0.63), rng.range(0.118, 0.152), hAccentA, 'dark'),
      sculptPerceptualOklch(rng.range(0.28, 0.38), rng.range(0.102, 0.142), hAccentB, 'dark'),
      sculptPerceptualOklch(rng.range(0.30, 0.42), rng.range(0.092, 0.132), bridgeHue, 'dark'),
      sculptPerceptualOklch(rng.range(0.17, 0.22), rng.range(0.042, 0.072), darkBaseHue, 'dark'),
    ],
  };
}

// ---------------------------------------------------------------------------
// Spatial Choreography Engines ('sphere', 'mesh', 'silk')
// ---------------------------------------------------------------------------

function mirrorPoint([x, y], flipX, flipY) {
  return [flipX ? 1 - x : x, flipY ? 1 - y : y];
}

/**
 * Lukas Rudrof SPHERE choreography:
 * 2-3 macro-scale diffused planetary spheres flanking opposite sides/diagonals,
 * companion inner glows, and a central/upper horizon bloom dissolving the boundary.
 */
function choreographSphere(rng, mood) {
  const flipX = rng.chance(0.5);
  const flipY = rng.chance(0.32); // Prefer horizon sky upward more often, occasionally inverted
  const layout = rng.pick(['flanking-horizon', 'diagonal-eclipse', 'triad-orbit']);

  let rawPoles;
  let rawBloomPos;

  if (layout === 'flanking-horizon') {
    const leftY = rng.range(0.36, 0.66);
    const rightY = clamp(1.02 - leftY + rng.jitter(0, 0.08), 0.30, 0.70);
    const p0 = [rng.range(0.02, 0.25), leftY];
    const p1 = [rng.range(0.75, 0.98), rightY];
    const midX = 0.5 * (p0[0] + p1[0]) + rng.jitter(0, 0.05);
    const midY = 0.5 * (p0[1] + p1[1]) - rng.range(0.04, 0.13);

    rawPoles = [
      { pos: p0, radius: rng.range(0.74, 1.04), softness: rng.range(0.48, 0.78), weight: rng.range(1.08, 1.28) },
      { pos: p1, radius: rng.range(0.72, 1.02), softness: rng.range(0.48, 0.78), weight: rng.range(1.06, 1.26) },
      { pos: [p0[0] + rng.range(0.16, 0.28), clamp(p0[1] - rng.range(0.06, 0.18), 0.18, 0.82)], radius: rng.range(0.54, 0.78), softness: rng.range(0.56, 0.84), weight: rng.range(0.66, 0.90) },
      { pos: [p1[0] - rng.range(0.16, 0.28), clamp(p1[1] + rng.range(-0.14, 0.16), 0.20, 0.82)], radius: rng.range(0.52, 0.76), softness: rng.range(0.56, 0.84), weight: rng.range(0.64, 0.88) },
      { pos: [clamp(midX, 0.34, 0.66), clamp(midY, 0.24, 0.62)], radius: rng.range(0.62, 0.92), softness: rng.range(0.68, 0.96), weight: rng.range(0.56, 0.82) },
      { pos: [rng.range(0.32, 0.68), rng.range(0.06, 0.24)], radius: rng.range(0.64, 1.02), softness: rng.range(0.74, 1.04), weight: mood === 'dark' ? rng.range(0.42, 0.68) : rng.range(0.52, 0.82) },
    ];
    rawBloomPos = [clamp(midX, 0.36, 0.64), clamp(midY - 0.08, 0.16, 0.48)];
  } else if (layout === 'diagonal-eclipse') {
    const p0 = [rng.range(0.04, 0.26), rng.range(0.56, 0.80)];
    const p1 = [rng.range(0.74, 0.96), rng.range(0.20, 0.44)];
    rawPoles = [
      { pos: p0, radius: rng.range(0.76, 1.05), softness: rng.range(0.46, 0.76), weight: rng.range(1.08, 1.30) },
      { pos: p1, radius: rng.range(0.74, 1.02), softness: rng.range(0.46, 0.78), weight: rng.range(1.06, 1.28) },
      { pos: [rng.range(0.18, 0.42), rng.range(0.22, 0.48)], radius: rng.range(0.56, 0.84), softness: rng.range(0.52, 0.82), weight: rng.range(0.68, 0.92) },
      { pos: [rng.range(0.58, 0.82), rng.range(0.54, 0.80)], radius: rng.range(0.54, 0.80), softness: rng.range(0.54, 0.84), weight: rng.range(0.64, 0.88) },
      { pos: [rng.range(0.40, 0.60), rng.range(0.38, 0.60)], radius: rng.range(0.62, 0.90), softness: rng.range(0.68, 0.96), weight: rng.range(0.55, 0.80) },
      { pos: [rng.range(0.10, 0.34), rng.range(0.06, 0.24)], radius: rng.range(0.64, 0.98), softness: rng.range(0.72, 1.02), weight: rng.range(0.45, 0.74) },
    ];
    rawBloomPos = [rng.range(0.38, 0.62), rng.range(0.24, 0.50)];
  } else {
    // triad-orbit: macro lower limb + two upper-flanking planetary bodies
    rawPoles = [
      { pos: [rng.range(0.06, 0.28), rng.range(0.26, 0.54)], radius: rng.range(0.72, 1.00), softness: rng.range(0.46, 0.78), weight: rng.range(1.06, 1.28) },
      { pos: [rng.range(0.70, 0.94), rng.range(0.48, 0.78)], radius: rng.range(0.74, 1.04), softness: rng.range(0.46, 0.78), weight: rng.range(1.06, 1.28) },
      { pos: [rng.range(0.58, 0.84), rng.range(0.16, 0.38)], radius: rng.range(0.56, 0.86), softness: rng.range(0.50, 0.82), weight: rng.range(0.74, 0.98) },
      { pos: [rng.range(0.20, 0.44), rng.range(0.64, 0.86)], radius: rng.range(0.54, 0.80), softness: rng.range(0.56, 0.85), weight: rng.range(0.64, 0.86) },
      { pos: [rng.range(0.38, 0.62), rng.range(0.36, 0.58)], radius: rng.range(0.60, 0.88), softness: rng.range(0.68, 0.96), weight: rng.range(0.54, 0.78) },
      { pos: [rng.range(0.26, 0.56), rng.range(0.06, 0.24)], radius: rng.range(0.64, 0.98), softness: rng.range(0.72, 1.04), weight: rng.range(0.46, 0.74) },
    ];
    rawBloomPos = [rng.range(0.36, 0.62), rng.range(0.20, 0.46)];
  }

  const flowAngle = rng.range(-Math.PI, Math.PI);
  const polesLayout = rawPoles.map((p) => {
    const pos = mirrorPoint(p.pos, flipX, flipY);
    return {
      pos: [clamp(pos[0], -0.18, 1.18), clamp(pos[1], -0.18, 1.18)],
      radius: clamp(p.radius, 0.52, 1.05),
      softness: clamp(p.softness, 0.42, 1.06),
      stretch: [rng.range(0.96, 1.07), rng.range(0.96, 1.07)],
      angle: rng.range(-Math.PI, Math.PI),
      weight: clamp(p.weight, 0.35, 1.32),
    };
  });

  const bloomPos = mirrorPoint(rawBloomPos, flipX, flipY);
  return {
    polesLayout,
    bloomPos: [clamp(bloomPos[0], 0.12, 0.88), clamp(bloomPos[1], 0.12, 0.88)],
    bloomRadius: rng.range(0.62, 1.02),
    bloomStrength: mood === 'dark' ? rng.range(0.20, 0.36) : rng.range(0.44, 0.78),
    warp: {
      scale: rng.range(0.46, 0.84),
      amount: rng.range(0.032, 0.088),
      foldStrength: 0.0,
      phase: [rng.range(-48, 48), rng.range(-48, 48)],
      flowAngle,
    },
  };
}

/**
 * Doo Design MESH choreography:
 * Preserves a calm sanctuary quadrant so `baseLab` (e.g. warm alabaster `#FDFBF6`)
 * breathes naturally, while billowing watercolor poles cascade along a golden-ratio
 * C-curve / diagonal stream across the remaining three quadrants.
 */
function choreographMesh(rng, mood) {
  const flipX = rng.chance(0.5);
  const flipY = rng.chance(0.5);
  const template = rng.pick(['golden-c-curve', 'diagonal-bay', 'archipelago-pool']);

  // Canonical sanctuary is top-left [0.14, 0.15]; flipping places it in any of the 4 corners
  let rawAnchors;
  let rawBloomPos;

  if (template === 'golden-c-curve') {
    rawAnchors = [
      { pos: [0.76, 0.68], r: [0.56, 0.82], s: [0.52, 0.82], w: [0.96, 1.24], ang: -0.55 },
      { pos: [0.38, 0.82], r: [0.52, 0.78], s: [0.50, 0.80], w: [0.92, 1.18], ang: 0.25 },
      { pos: [0.84, 0.26], r: [0.48, 0.74], s: [0.54, 0.84], w: [0.78, 1.04], ang: -1.15 },
      { pos: [0.60, 0.48], r: [0.44, 0.68], s: [0.58, 0.88], w: [0.68, 0.94], ang: -0.42 },
      { pos: [0.48, 0.30], r: [0.50, 0.76], s: [0.66, 0.96], w: [0.54, 0.80], ang: -0.30 },
      { pos: [0.16, 0.66], r: [0.44, 0.70], s: [0.64, 0.94], w: [0.48, 0.74], ang: 0.65 },
    ];
    rawBloomPos = [0.24, 0.24];
  } else if (template === 'diagonal-bay') {
    rawAnchors = [
      { pos: [0.82, 0.76], r: [0.58, 0.86], s: [0.52, 0.82], w: [0.98, 1.26], ang: -0.68 },
      { pos: [0.66, 0.24], r: [0.52, 0.78], s: [0.50, 0.80], w: [0.90, 1.16], ang: -0.45 },
      { pos: [0.28, 0.78], r: [0.50, 0.76], s: [0.54, 0.84], w: [0.80, 1.06], ang: 0.42 },
      { pos: [0.88, 0.46], r: [0.46, 0.70], s: [0.56, 0.86], w: [0.70, 0.94], ang: -0.95 },
      { pos: [0.52, 0.56], r: [0.50, 0.76], s: [0.66, 0.96], w: [0.54, 0.80], ang: -0.58 },
      { pos: [0.38, 0.40], r: [0.46, 0.72], s: [0.68, 0.98], w: [0.44, 0.70], ang: -0.52 },
    ];
    rawBloomPos = [0.20, 0.22];
  } else {
    rawAnchors = [
      { pos: [0.74, 0.32], r: [0.56, 0.82], s: [0.52, 0.82], w: [0.96, 1.22], ang: -0.35 },
      { pos: [0.54, 0.78], r: [0.54, 0.80], s: [0.52, 0.82], w: [0.92, 1.18], ang: 0.28 },
      { pos: [0.88, 0.72], r: [0.48, 0.74], s: [0.54, 0.84], w: [0.76, 1.02], ang: -0.78 },
      { pos: [0.22, 0.76], r: [0.46, 0.72], s: [0.56, 0.86], w: [0.72, 0.96], ang: 0.55 },
      { pos: [0.58, 0.50], r: [0.50, 0.76], s: [0.66, 0.95], w: [0.56, 0.82], ang: -0.25 },
      { pos: [0.44, 0.22], r: [0.46, 0.72], s: [0.68, 0.98], w: [0.45, 0.72], ang: -0.15 },
    ];
    rawBloomPos = [0.22, 0.26];
  }

  const flowAngle = rng.range(-1.15, 1.15);
  const polesLayout = rawAnchors.map((a) => {
    const jittered = [a.pos[0] + rng.jitter(0, 0.065), a.pos[1] + rng.jitter(0, 0.065)];
    const pos = mirrorPoint(jittered, flipX, flipY);
    let ang = a.ang + rng.jitter(0, 0.32);
    if (flipX) ang = Math.PI - ang;
    if (flipY) ang = -ang;
    return {
      pos: [clamp(pos[0], -0.10, 1.10), clamp(pos[1], -0.10, 1.10)],
      radius: rng.range(a.r[0], a.r[1]),
      softness: rng.range(a.s[0], a.s[1]),
      stretch: [rng.range(1.14, 1.46), rng.range(0.76, 0.96)],
      angle: Math.atan2(Math.sin(ang), Math.cos(ang)),
      weight: rng.range(a.w[0], a.w[1]),
    };
  });

  const bloomMirrored = mirrorPoint(
    [rawBloomPos[0] + rng.jitter(0, 0.06), rawBloomPos[1] + rng.jitter(0, 0.06)],
    flipX,
    flipY
  );

  return {
    polesLayout,
    bloomPos: [clamp(bloomMirrored[0], 0.08, 0.92), clamp(bloomMirrored[1], 0.08, 0.92)],
    bloomRadius: rng.range(0.52, 0.92),
    bloomStrength: mood === 'dark' ? rng.range(0.18, 0.34) : rng.range(0.32, 0.66),
    warp: {
      scale: mood === 'light' ? rng.range(0.56, 0.94) : rng.range(0.64, 1.12),
      amount: mood === 'light' ? rng.range(0.22, 0.36) : rng.range(0.26, 0.42),
      foldStrength: mood === 'light' ? rng.range(0.045, 0.105) : rng.range(0.055, 0.140),
      phase: [rng.range(-48, 48), rng.range(-48, 48)],
      flowAngle,
    },
  };
}

/**
 * Sculptural SILK choreography:
 * Elongated anisotropic poles (`stretch: [1.4..2.0, 0.65..0.9]`) sweeping in
 * staggered echelon lanes along `flowAngle` to form liquid satin folds.
 */
function choreographSilk(rng, mood) {
  const baseFlow = rng.range(0.28, 0.86) * rng.sign();
  const flipOffset = rng.chance(0.5) ? 0 : Math.PI;
  const flowAngle = Math.atan2(Math.sin(baseFlow + flipOffset), Math.cos(baseFlow + flipOffset));

  const dirX = Math.cos(flowAngle);
  const dirY = Math.sin(flowAngle);
  const normX = -dirY;
  const normY = dirX;

  // Staggered coordinates (along, across) in [-0.5..0.5] centered around [0.5, 0.5]
  // Leave one outer lane airy so dark/light ground creates sculptural contrast
  const laneSign = rng.sign();
  const ribbons = [
    { u: -0.16, v: -0.18 * laneSign, r: [0.54, 0.78], s: [0.42, 0.68], w: [1.00, 1.26] },
    { u: 0.18,  v: 0.14 * laneSign,  r: [0.52, 0.76], s: [0.42, 0.68], w: [0.96, 1.22] },
    { u: -0.28, v: 0.04 * laneSign,  r: [0.46, 0.68], s: [0.46, 0.72], w: [0.76, 1.02] },
    { u: 0.28,  v: -0.06 * laneSign, r: [0.44, 0.66], s: [0.48, 0.74], w: [0.72, 0.96] },
    { u: 0.02,  v: -0.02 * laneSign, r: [0.48, 0.72], s: [0.54, 0.82], w: [0.58, 0.86] },
    { u: -0.06, v: 0.32 * laneSign,  r: [0.44, 0.68], s: [0.58, 0.88], w: [0.42, 0.68] },
  ];

  const polesLayout = ribbons.map((rb) => {
    const u = rb.u + rng.jitter(0, 0.08);
    const v = rb.v + rng.jitter(0, 0.06);
    const px = 0.5 + u * dirX + v * normX;
    const py = 0.5 + u * dirY + v * normY;
    const poleAngle = flowAngle + rng.jitter(0, 0.22);
    return {
      pos: [clamp(px, -0.12, 1.12), clamp(py, -0.12, 1.12)],
      radius: rng.range(rb.r[0], rb.r[1]),
      softness: rng.range(rb.s[0], rb.s[1]),
      stretch: [rng.range(1.42, 1.98), rng.range(0.66, 0.89)],
      angle: Math.atan2(Math.sin(poleAngle), Math.cos(poleAngle)),
      weight: rng.range(rb.w[0], rb.w[1]),
    };
  });

  const bloomU = rng.jitter(0.04, 0.16);
  const bloomV = -0.12 * laneSign + rng.jitter(0, 0.08);
  const bx = clamp(0.5 + bloomU * dirX + bloomV * normX, 0.14, 0.86);
  const by = clamp(0.5 + bloomU * dirY + bloomV * normY, 0.14, 0.86);

  return {
    polesLayout,
    bloomPos: [bx, by],
    bloomRadius: rng.range(0.46, 0.86),
    bloomStrength: mood === 'dark' ? rng.range(0.20, 0.38) : rng.range(0.30, 0.62),
    warp: {
      scale: rng.range(0.86, 1.54),
      amount: rng.range(0.35, 0.54),
      foldStrength: rng.range(0.29, 0.47),
      phase: [rng.range(-48, 48), rng.range(-48, 48)],
      flowAngle,
    },
  };
}

// ---------------------------------------------------------------------------
// Palette Swatch Extraction & Lighting Calibration
// ---------------------------------------------------------------------------

function labDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function extractPaletteSwatches(baseLab, baseHex, poles, bloomLab, bloomHex) {
  const candidates = [
    { lab: baseLab, hex: baseHex, score: 2.0 },
    ...poles
      .map((p) => ({ lab: p.lab, hex: p.hex, score: p.weight * p.radius }))
      .sort((x, y) => y.score - x.score),
    { lab: bloomLab, hex: bloomHex, score: 0.4 },
  ];

  const chosen = [];
  for (const cand of candidates) {
    if (chosen.length >= 5) break;
    const tooClose = chosen.some(
      (existing) => existing.hex === cand.hex || labDistance(existing.lab, cand.lab) < 0.042
    );
    if (!tooClose) {
      chosen.push(cand);
    }
  }

  // Guarantee at least 4 distinct swatches even for subtle monochromatic variations
  if (chosen.length < 4) {
    for (const cand of candidates) {
      if (chosen.length >= 4) break;
      if (!chosen.some((existing) => existing.hex === cand.hex)) {
        chosen.push(cand);
      }
    }
  }

  // If still fewer than 4 due to identical hexes (unlikely), include top pole hexes directly
  while (chosen.length < 4) {
    chosen.push(candidates[chosen.length % candidates.length]);
  }

  return chosen.slice(0, 5).map((c) => c.hex);
}

function calibrateLighting(rng, mood) {
  if (mood === 'light') {
    return {
      scatterLift: round6(rng.range(0.085, 0.145)),
      chromaPreserve: round6(rng.range(0.36, 0.58)),
      vignette: round6(rng.range(-0.045, 0.025)),
      grain: round6(rng.range(0.0195, 0.0245)),
    };
  }
  if (mood === 'split') {
    return {
      scatterLift: round6(rng.range(0.100, 0.158)),
      chromaPreserve: round6(rng.range(0.46, 0.68)),
      vignette: round6(rng.range(-0.025, 0.055)),
      grain: round6(rng.range(0.0200, 0.0255)),
    };
  }
  // dark mood: preserve velvety shadow depth while keeping jewel chroma crisp
  return {
    scatterLift: round6(rng.range(0.042, 0.076)),
    chromaPreserve: round6(rng.range(0.32, 0.56)),
    vignette: round6(rng.range(0.032, 0.095)),
    grain: round6(rng.range(0.0200, 0.0258)),
  };
}

// ---------------------------------------------------------------------------
// Main Deterministic Scene Generator
// ---------------------------------------------------------------------------

/**
 * Generates a complete deterministic `SceneConfig` from a short seed string.
 *
 * @param {object} [options]
 * @param {string} [options.seed] - Human-friendly seed (auto-generated if omitted)
 * @param {'auto'|'mesh'|'sphere'|'silk'} [options.style='auto']
 * @param {'auto'|'light'|'split'|'dark'} [options.mood='auto']
 * @param {string} [options.archetype='auto']
 */
export function generateScene({
  seed,
  style = 'auto',
  mood = 'system',
  archetype = 'auto',
  colors = null,
  colorScheme = null,
} = {}) {
  const normalizedSeed =
    typeof seed === 'string' && seed.trim().length > 0
      ? seed.trim().toUpperCase()
      : randomSeed();

  const rng = createRng(normalizedSeed);

  // Parse optional custom brand hex/rgb colors (whatamesh-style CSS variable or JS array override)
  const parsedCustomLabs = Array.isArray(colors)
    ? colors.map(srgbHexToOklab).filter(Boolean)
    : [];
  const hasCustomPalette = parsedCustomLabs.length >= 2;

  const rawMood = typeof mood === 'string' ? mood.trim().toLowerCase() : 'system';
  const requestedStyle = VALID_STYLES.includes(style) ? style : 'auto';

  // Resolve device / browser color scheme when mood === 'system'
  let targetScheme = null; // 'dark' | 'light' | null
  if (rawMood === 'system') {
    targetScheme =
      colorScheme === 'dark' || colorScheme === 'light'
        ? colorScheme
        : detectColorScheme();
  } else if (rawMood === 'daylight') {
    targetScheme = 'light';
  }

  const requestedMood = VALID_MOODS.includes(rawMood)
    ? rawMood
    : targetScheme === 'dark'
      ? 'dark'
      : targetScheme === 'light'
        ? 'daylight'
        : 'any'; // 'any' or 'auto' -> unconstrained across light/split/dark

  // 1. Resolve Archetype & Mood deterministically
  let selectedMeta = null;
  let useWild = false;

  if (!hasCustomPalette) {
    if (archetype === 'harmonic-wild') {
      useWild = true;
    } else if (archetype && archetype !== 'auto') {
      selectedMeta = ARCHETYPE_SPECS.find((a) => a.id === archetype) || null;
    }
  }

  let resolvedMood;
  if (hasCustomPalette) {
    if (VALID_MOODS.includes(requestedMood)) {
      resolvedMood = requestedMood;
    } else {
      const avgCustomL =
        parsedCustomLabs.reduce((acc, c) => acc + c[0], 0) / parsedCustomLabs.length;
      resolvedMood = avgCustomL < 0.45 ? 'dark' : avgCustomL > 0.78 ? 'light' : 'split';
    }
  } else if (selectedMeta) {
    resolvedMood = selectedMeta.mood;
  } else if (VALID_MOODS.includes(requestedMood)) {
    resolvedMood = requestedMood;
  } else if (requestedMood === 'daylight') {
    // Light OS schema: 64% high-key Light Studio + 36% sunlit Split Horizon (all light-theme safe)
    resolvedMood = rng.chance(0.64) ? 'light' : 'split';
  } else {
    resolvedMood = rng.pick(VALID_MOODS);
  }

  if (!hasCustomPalette && !selectedMeta && !useWild) {
    // In 'auto' archetype mode, 84% curated studio archetypes, 16% continuous Harmonic Wildcard
    if (rng.chance(0.16)) {
      useWild = true;
    } else {
      const pool = ARCHETYPE_SPECS.filter((a) => a.mood === resolvedMood);
      selectedMeta = rng.pick(pool);
    }
  }

  // 2. Resolve Style Mode deterministically
  const explicitArchetypeChosen = Boolean(archetype && archetype !== 'auto');
  let resolvedStyle;
  if (requestedStyle !== 'auto') {
    resolvedStyle = requestedStyle;
  } else if (selectedMeta && VALID_STYLES.includes(selectedMeta.defaultStyle)) {
    if (explicitArchetypeChosen) {
      resolvedStyle = selectedMeta.defaultStyle;
    } else {
      // In full-auto mode, spotlight signature style 72% of the time, cross-pollinate 28%
      resolvedStyle = rng.chance(0.72) ? selectedMeta.defaultStyle : rng.pick(VALID_STYLES);
    }
  } else if (resolvedMood === 'split' || hasCustomPalette) {
    resolvedStyle = rng.chance(0.60) ? 'sphere' : rng.pick(['mesh', 'silk']);
  } else {
    resolvedStyle = rng.pick(VALID_STYLES);
  }

  // 3. Build Perceptual OKLCH Palette with Gentle Seed-Specific Micro-Variation
  let archetypeId;
  let archetypeName;
  let rawBase;
  let rawBloom;
  let bridgeHue;
  let rawPolesOklch;

  if (hasCustomPalette) {
    archetypeId = 'custom-palette';
    archetypeName = 'Custom Brand Palette';
    const lchList = parsedCustomLabs.map(oklabToOklchTuple);
    // Use first color as base if >= 3 colors provided, or synthesize harmonized base from [0]
    if (lchList.length >= 3) {
      rawBase = lchList[0];
      const heroPool = lchList.slice(1);
      const p0 = heroPool[0];
      const p1 = heroPool[1 % heroPool.length];
      bridgeHue = chooseArtDirectedBridgeHue(p0[2], p1[2], resolvedMood);
      const bloomL = resolvedMood === 'dark' ? clamp(Math.max(p0[0], p1[0]) + 0.12, 0.38, 0.72) : 0.965;
      rawBloom = [bloomL, Math.min(0.035, (p0[1] + p1[1]) * 0.2), bridgeHue];
      rawPolesOklch = [
        p0,
        p1,
        heroPool[2 % heroPool.length],
        heroPool[3 % heroPool.length] || [clamp(p0[0] + 0.06, 0.15, 0.95), p0[1] * 0.82, wrapHue(p0[2] + 14)],
        [clamp((p0[0] + p1[0]) * 0.5 + 0.08, 0.22, 0.94), Math.min(0.065, (p0[1] + p1[1]) * 0.35), bridgeHue],
        rawBase,
      ];
    } else {
      // 2 custom colors: opposing or duo spheres over harmonized base
      const [p0, p1] = lchList;
      bridgeHue = chooseArtDirectedBridgeHue(p0[2], p1[2], resolvedMood);
      const avgL = 0.5 * (p0[0] + p1[0]);
      rawBase = avgL < 0.48 ? [0.14, 0.025, p0[2]] : [0.968, 0.014, bridgeHue];
      rawBloom = avgL < 0.48 ? [0.55, 0.08, bridgeHue] : [0.982, 0.016, bridgeHue];
      rawPolesOklch = [
        p0,
        p1,
        [clamp(p0[0] + 0.08, 0.18, 0.92), p0[1] * 0.78, wrapHue(p0[2] + 16)],
        [clamp(p1[0] + 0.08, 0.18, 0.92), p1[1] * 0.78, wrapHue(p1[2] - 16)],
        [clamp(avgL + 0.10, 0.25, 0.93), Math.min(0.06, (p0[1] + p1[1]) * 0.32), bridgeHue],
        rawBase,
      ];
    }
  } else if (useWild) {
    archetypeId = 'harmonic-wild';
    archetypeName = 'Harmonic Wildcard';
    const wildSpec = buildHarmonicWildSpec(rng, resolvedMood);
    rawBase = wildSpec.base;
    rawBloom = wildSpec.bloom;
    bridgeHue = wildSpec.bridgeHue;
    rawPolesOklch = wildSpec.poles;
  } else {
    archetypeId = selectedMeta.id;
    archetypeName = selectedMeta.name;
    const globalHueShift = rng.jitter(0, selectedMeta.hueDrift || 6);

    rawBase = [
      clamp(selectedMeta.base[0] + rng.jitter(0, 0.008), 0.08, 0.99),
      Math.max(0, selectedMeta.base[1] + rng.jitter(0, 0.004)),
      wrapHue(selectedMeta.base[2] + globalHueShift * 0.5),
    ];
    rawBloom = [
      clamp(selectedMeta.bloom[0] + rng.jitter(0, 0.010), 0.15, 0.992),
      Math.max(0, selectedMeta.bloom[1] + rng.jitter(0, 0.006)),
      wrapHue(selectedMeta.bloom[2] + globalHueShift * 0.6),
    ];
    bridgeHue = wrapHue(selectedMeta.bridgeHue + globalHueShift * 0.6);

    rawPolesOklch = selectedMeta.poles.map(([pL, pC, pH]) => [
      clamp(pL + rng.jitter(0, 0.022), 0.12, 0.98),
      Math.max(0.005, pC * rng.range(0.91, 1.09)),
      wrapHue(pH + globalHueShift + rng.jitter(0, 5.5)),
    ]);

    // Deterministic role swap between primary poles [0] & [1] or companions [2] & [3]
    if (rng.chance(0.5)) {
      [rawPolesOklch[0], rawPolesOklch[1]] = [rawPolesOklch[1], rawPolesOklch[0]];
    }
    if (rng.chance(0.5)) {
      [rawPolesOklch[2], rawPolesOklch[3]] = [rawPolesOklch[3], rawPolesOklch[2]];
    }
  }

  // Convert Base & Bloom to Gamut-Safe OKLab + Hex
  const baseLabRaw = clampToGamutOklab(rawBase[0], rawBase[1], rawBase[2]);
  const baseLab = [round6(baseLabRaw[0]), round6(baseLabRaw[1]), round6(baseLabRaw[2])];
  const baseHex = oklabToSrgbHex(baseLab[0], baseLab[1], baseLab[2]);

  const bloomLabRaw = clampToGamutOklab(rawBloom[0], rawBloom[1], rawBloom[2]);
  const bloomLab = [round6(bloomLabRaw[0]), round6(bloomLabRaw[1]), round6(bloomLabRaw[2])];
  const bloomHex = oklabToSrgbHex(bloomLab[0], bloomLab[1], bloomLab[2]);

  const bridgeRad = bridgeHue * DEG_TO_RAD;
  const bridgeDir = [round6(Math.cos(bridgeRad)), round6(Math.sin(bridgeRad))];
  // Re-normalize after rounding so hypot is exact unit length
  const bridgeLen = Math.hypot(bridgeDir[0], bridgeDir[1]) || 1;
  bridgeDir[0] = round6(bridgeDir[0] / bridgeLen);
  bridgeDir[1] = round6(bridgeDir[1] / bridgeLen);

  // 4. Choreograph Spatial Layout & Domain Warp
  let choreography;
  if (resolvedStyle === 'sphere') {
    choreography = choreographSphere(rng, resolvedMood);
  } else if (resolvedStyle === 'silk') {
    choreography = choreographSilk(rng, resolvedMood);
  } else {
    choreography = choreographMesh(rng, resolvedMood);
  }

  const poles = choreography.polesLayout.map((geom, idx) => {
    const [pL, pC, pH] = rawPolesOklch[idx];
    const labRaw = clampToGamutOklab(pL, pC, pH);
    const lab = [round6(labRaw[0]), round6(labRaw[1]), round6(labRaw[2])];
    return {
      lab,
      hex: oklabToSrgbHex(lab[0], lab[1], lab[2]),
      pos: [round6(geom.pos[0]), round6(geom.pos[1])],
      radius: round6(clamp(geom.radius, 0.30, 1.15)),
      softness: round6(clamp(geom.softness, 0.30, 1.15)),
      stretch: [round6(geom.stretch[0]), round6(geom.stretch[1])],
      angle: round6(geom.angle),
      weight: round6(clamp(geom.weight, 0.0, 1.35)),
    };
  });

  // 5. Compute Perceived Luminance (`isDark`) & Hero Swatches
  let poleWeightSum = 0;
  let poleLumaSum = 0;
  for (const p of poles) {
    const inf = p.weight * p.radius;
    poleWeightSum += inf;
    poleLumaSum += p.lab[0] * inf;
  }
  const avgPoleL = poleWeightSum > 0 ? poleLumaSum / poleWeightSum : baseLab[0];
  const perceivedL =
    0.38 * baseLab[0] +
    0.50 * avgPoleL +
    0.12 * (bloomLab[0] * choreography.bloomStrength + baseLab[0] * (1 - choreography.bloomStrength));
  const isDark = perceivedL < 0.54;

  const paletteSwatches = extractPaletteSwatches(baseLab, baseHex, poles, bloomLab, bloomHex);
  const lighting = calibrateLighting(rng, resolvedMood);
  const uiTokens = computeUiTokens(isDark, baseHex, poles, paletteSwatches);

  return {
    seed: normalizedSeed,
    style: resolvedStyle,
    mood: resolvedMood,
    archetypeId,
    archetypeName,
    isDark,
    baseLab,
    baseHex,
    bloomLab,
    bloomHex,
    bloomPos: [round6(choreography.bloomPos[0]), round6(choreography.bloomPos[1])],
    bloomRadius: round6(clamp(choreography.bloomRadius, 0.40, 1.05)),
    bloomStrength: round6(clamp(choreography.bloomStrength, 0.15, 0.85)),
    bridgeDir,
    poles,
    paletteSwatches,
    uiTokens,
    warp: {
      scale: round6(choreography.warp.scale),
      amount: round6(choreography.warp.amount),
      foldStrength: round6(choreography.warp.foldStrength),
      phase: [round6(choreography.warp.phase[0]), round6(choreography.warp.phase[1])],
      flowAngle: round6(choreography.warp.flowAngle),
    },
    lighting,
  };
}
