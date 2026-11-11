export const STYLE_MODES = ['mesh', 'sphere', 'silk', 'caustic'];
export const MOOD_MODES = ['system', 'any', 'light', 'split', 'dark'];

const VALID_STYLES = STYLE_MODES;
const VALID_MOODS = ['light', 'split', 'dark'];
const SEED_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEG_TO_RAD = Math.PI / 180;

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
    } catch (_) {}
  }

  return 'light';
}

// OKLCH pole order: [0, 1] primary pair, [2, 3] companions, [4] hue bridge, [5] veil/anchor
const ARCHETYPE_SPECS = [
  {
    id: 'alabaster-honey',
    name: 'Alabaster & Honey Coral',
    mood: 'light',
    defaultStyle: 'mesh',
    hueDrift: 9,
    base: [0.976, 0.013, 84],
    bloom: [0.986, 0.015, 80],
    bridgeHue: 62,
    poles: [
      [0.865, 0.138, 76],
      [0.805, 0.142, 29],
      [0.848, 0.128, 52],
      [0.862, 0.068, 152],
      [0.938, 0.048, 70],
      [0.892, 0.076, 18],
    ],
  },
  {
    id: 'porcelain-peach-sage',
    name: 'Porcelain Peach & Celadon',
    mood: 'light',
    defaultStyle: 'mesh',
    hueDrift: 10,
    base: [0.974, 0.011, 94],
    bloom: [0.986, 0.012, 88],
    bridgeHue: 74,
    poles: [
      [0.822, 0.132, 42],
      [0.858, 0.078, 168],
      [0.908, 0.104, 86],
      [0.872, 0.062, 230],
      [0.946, 0.028, 78],
      [0.882, 0.082, 22],
    ],
  },
  {
    id: 'morning-lilac-pearl',
    name: 'Morning Lilac & Pearl',
    mood: 'light',
    defaultStyle: 'silk',
    hueDrift: 11,
    base: [0.972, 0.012, 286],
    bloom: [0.986, 0.014, 312],
    bridgeHue: 326,
    poles: [
      [0.818, 0.118, 278],
      [0.846, 0.114, 348],
      [0.888, 0.078, 232],
      [0.878, 0.094, 48],
      [0.922, 0.054, 306],
      [0.958, 0.020, 258],
    ],
  },
  {
    id: 'solstice-ochre-mist',
    name: 'Travertine Ochre & Chalk',
    mood: 'light',
    defaultStyle: 'sphere',
    hueDrift: 9,
    base: [0.962, 0.016, 80],
    bloom: [0.984, 0.014, 76],
    bridgeHue: 44,
    poles: [
      [0.788, 0.146, 66],
      [0.772, 0.152, 35],
      [0.878, 0.058, 244],
      [0.886, 0.088, 78],
      [0.896, 0.046, 302],
      [0.952, 0.022, 74],
    ],
  },
  {
    id: 'cerulean-tangerine',
    name: 'Cerulean & Sunset Tangerine',
    mood: 'split',
    defaultStyle: 'sphere',
    hueDrift: 8,
    base: [0.868, 0.042, 256],
    bloom: [0.968, 0.018, 268],
    bridgeHue: 332,
    poles: [
      [0.595, 0.186, 252],
      [0.722, 0.184, 46],
      [0.762, 0.116, 246],
      [0.828, 0.126, 64],
      [0.884, 0.054, 320],
      [0.952, 0.018, 250],
    ],
  },
  {
    id: 'steel-lavender-amber',
    name: 'Nordic Steel & Warm Amber',
    mood: 'split',
    defaultStyle: 'sphere',
    hueDrift: 9,
    base: [0.842, 0.036, 272],
    bloom: [0.960, 0.016, 292],
    bridgeHue: 326,
    poles: [
      [0.565, 0.098, 248],
      [0.748, 0.146, 55],
      [0.742, 0.096, 292],
      [0.768, 0.118, 30],
      [0.882, 0.044, 322],
      [0.946, 0.014, 266],
    ],
  },
  {
    id: 'aegean-coral-horizon',
    name: 'Aegean Teal & Coral Dusk',
    mood: 'split',
    defaultStyle: 'mesh',
    hueDrift: 10,
    base: [0.882, 0.034, 224],
    bloom: [0.970, 0.018, 56],
    bridgeHue: 348,
    poles: [
      [0.585, 0.148, 228],
      [0.712, 0.172, 26],
      [0.822, 0.134, 66],
      [0.748, 0.114, 214],
      [0.892, 0.052, 350],
      [0.952, 0.022, 74],
    ],
  },
  {
    id: 'twilight-violet-citrine',
    name: 'Vesper Violet & Citrine',
    mood: 'split',
    defaultStyle: 'silk',
    hueDrift: 10,
    base: [0.806, 0.048, 284],
    bloom: [0.954, 0.026, 342],
    bridgeHue: 342,
    poles: [
      [0.532, 0.168, 282],
      [0.818, 0.148, 68],
      [0.724, 0.152, 356],
      [0.588, 0.146, 256],
      [0.848, 0.072, 326],
      [0.926, 0.044, 78],
    ],
  },
  {
    id: 'electric-sapphire',
    name: 'Midnight Electric Sapphire',
    mood: 'dark',
    defaultStyle: 'silk',
    hueDrift: 8,
    base: [0.136, 0.034, 260],
    bloom: [0.615, 0.138, 232],
    bridgeHue: 246,
    poles: [
      [0.365, 0.176, 262],
      [0.535, 0.204, 255],
      [0.665, 0.140, 222],
      [0.245, 0.096, 274],
      [0.345, 0.126, 286],
      [0.182, 0.054, 252],
    ],
  },
  {
    id: 'velvet-ember-obsidian',
    name: 'Velvet Ember & Obsidian',
    mood: 'dark',
    defaultStyle: 'sphere',
    hueDrift: 9,
    base: [0.132, 0.024, 48],
    bloom: [0.558, 0.136, 42],
    bridgeHue: 342,
    poles: [
      [0.445, 0.168, 32],
      [0.348, 0.138, 258],
      [0.538, 0.148, 54],
      [0.402, 0.138, 14],
      [0.305, 0.104, 328],
      [0.182, 0.036, 262],
    ],
  },
  {
    id: 'abyssal-aurora-jade',
    name: 'Abyssal Jade & Ultramarine',
    mood: 'dark',
    defaultStyle: 'caustic',
    hueDrift: 9,
    base: [0.134, 0.030, 196],
    bloom: [0.562, 0.118, 202],
    bridgeHue: 216,
    poles: [
      [0.478, 0.132, 184],
      [0.362, 0.168, 264],
      [0.442, 0.138, 228],
      [0.568, 0.114, 198],
      [0.272, 0.094, 286],
      [0.215, 0.062, 178],
    ],
  },
  {
    id: 'nocturne-amethyst-rose',
    name: 'Nocturne Amethyst & Rose Gold',
    mood: 'dark',
    defaultStyle: 'silk',
    hueDrift: 9,
    base: [0.138, 0.032, 302],
    bloom: [0.575, 0.106, 26],
    bridgeHue: 345,
    poles: [
      [0.385, 0.158, 296],
      [0.442, 0.154, 352],
      [0.556, 0.122, 46],
      [0.285, 0.112, 268],
      [0.512, 0.106, 332],
      [0.196, 0.062, 320],
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

export const COLLECTIONS = [
  { id: 'burren-chalk', group: 'coast', name: 'Burren Chalk', tag: 'Limestone & Gorse', style: 'mesh', mood: 'light',
    heroes: ['7F3K9A', 'W4M9P2', 'H8T3C6', 'R2N7K5'], hues: [[26, 48], [62, 86], [136, 156]], baseH: [74, 90], cScale: 0.86, grain: [0.0235, 0.0258] },
  { id: 'skellig-night', group: 'coast', name: 'Skellig Night', tag: 'Atlantic Sapphire', style: 'silk', mood: 'dark',
    heroes: ['X9K2V7', '3M8Q4Z', 'N6F2R9', 'P4W8J3'], hues: [[202, 236], [302, 344], [254, 284]], baseH: [256, 284], baseL: [0.095, 0.122], cScale: 1.38, poleLift: 0.14, fold: [0.38, 0.52], chromaPreserve: [0.58, 0.70] },
  { id: 'antrim-basalt', group: 'coast', name: 'Antrim Basalt', tag: 'Causeway Obsidian', style: 'silk', mood: 'dark',
    heroes: ['2B7K9M', 'Q5V8N2', 'K3D9F4', '8W2M6P'], activePoles: 3, hues: [[224, 262], [48, 76], [210, 245]], baseH: [235, 265], baseL: [0.088, 0.112], baseC: [0.006, 0.014], cScale: 0.13, vignette: [0.068, 0.098] },
  { id: 'boyne-solstice', group: 'coast', name: 'Boyne Solstice', tag: 'Chamber Corona', style: 'sphere', mood: 'dark',
    heroes: ['E9C2L7', 'S4K8M3', '7R2W9P', 'D6F3Q8'], topology: 'eclipse', hues: [[24, 58], [46, 78], [348, 378]], baseH: [36, 64], baseL: [0.080, 0.105], baseC: [0.010, 0.022], cScale: 1.24, vignette: [0.065, 0.100], chromaPreserve: [0.56, 0.69] },
  { id: 'wicklow-amber', group: 'coast', name: 'Wicklow Amber', tag: 'Peat & Molten Gold', style: 'silk', mood: 'dark',
    heroes: ['G8L4D2', '9M3K7W', 'T5P2R8', 'C6V9N4'], hues: [[68, 88], [42, 64], [80, 94]], baseH: [46, 68], baseL: [0.102, 0.128], baseC: [0.018, 0.030], cScale: 1.08, poleLift: 0.22, fold: [0.40, 0.54], stretchX: [1.62, 2.02] },
  { id: 'achill-dusk', group: 'coast', name: 'Achill Dusk', tag: 'Heather & Sea-Glass', style: 'silk', mood: 'split',
    heroes: ['P7R3S9', '4K8V2M', 'Z6N3W7', 'J2F9Q5'], hues: [[222, 268], [318, 358], [48, 82]], baseH: [252, 286], cScale: 1.26, warpScale: [1.14, 1.62], fold: [0.40, 0.55], grain: [0.0190, 0.0208], chromaPreserve: [0.58, 0.70] },
  { id: 'dingle-horizon', group: 'coast', name: 'Dingle Horizon', tag: 'Bay & Sunset Tangerine', style: 'sphere', mood: 'split',
    heroes: ['F4L8G2', 'R7K3M9', '2W6P8C', 'N5V9T4'], hues: [[218, 256], [24, 54], [282, 326]], baseH: [228, 268], cScale: 1.18, chromaPreserve: [0.54, 0.68] },
  { id: 'connemara-lough', group: 'coast', name: 'Connemara Lough', tag: 'Jade & Teal Cusps', style: 'caustic', mood: 'dark',
    heroes: ['B6C3K8', 'A9M4R2', '5T8W3P', 'L2N7Q6'], hues: [[164, 192], [196, 224], [254, 286]], baseH: [184, 212], baseL: [0.105, 0.132], baseC: [0.022, 0.036], cScale: 1.16, chromaPreserve: [0.50, 0.66] },

  { id: 'dawn-meadow', group: 'emerald', name: 'Dawn Meadow', tag: 'Dew & First Light', style: 'mesh', mood: 'light',
    heroes: ['M3D7W2', 'F9K4L8', 'A2P6R5', 'D8T3N9'], hues: [[128, 146], [82, 96], [205, 225]], baseH: [96, 112], cScale: 0.72, grain: [0.0225, 0.0250], scatter: [0.100, 0.150] },
  { id: 'moss-stone', group: 'emerald', name: 'Moss & Stone', tag: 'Lichen on Granite', style: 'mesh', mood: 'split',
    heroes: ['S4M8K2', 'L7G3P9', 'R2W6D4', 'N9C5T3'], hues: [[125, 145], [86, 100], [225, 250]], baseH: [220, 245], cScale: 0.74, chromaPreserve: [0.40, 0.58], grain: [0.0230, 0.0258] },
  { id: 'peat-bog', group: 'emerald', name: 'Peat Bog', tag: 'Turf & Bog Cotton', style: 'silk', mood: 'dark',
    heroes: ['P3B8G6', 'T6K2W9', 'C5R4M7', '9D2L8N'], hues: [[38, 58], [118, 136], [72, 88]], baseH: [42, 60], baseL: [0.098, 0.124], baseC: [0.016, 0.028], cScale: 0.92, poleLift: 0.08, fold: [0.36, 0.50], chromaPreserve: [0.44, 0.60] },
  { id: 'gorse-hedgerow', group: 'emerald', name: 'Gorse Hedgerow', tag: 'Furze & Hawthorn', style: 'sphere', mood: 'split',
    heroes: ['G6H2R9', 'W3F8K5', 'Q7M4D2', 'B9T6P3'], hues: [[90, 102], [130, 150], [18, 34]], baseH: [112, 128], cScale: 1.12, chromaPreserve: [0.52, 0.66] },
  { id: 'moher-slate', group: 'emerald', name: 'Moher Slate', tag: 'Cliff & Atlantic Foam', style: 'sphere', mood: 'split',
    heroes: ['M8S3C7', 'K2F9W4', 'H5R6N2', 'T3D8L9'], hues: [[218, 242], [182, 204], [70, 88]], baseH: [222, 244], cScale: 0.88, chromaPreserve: [0.46, 0.62], vignette: [0.010, 0.050] },
  { id: 'glen-shade', group: 'emerald', name: 'Glen Shade', tag: 'Fern & Rain', style: 'caustic', mood: 'dark',
    heroes: ['F2G7S9', 'R8N3K6', 'W4D2M8', 'L6P9C3'], hues: [[138, 162], [172, 196], [108, 124]], baseH: [150, 172], baseL: [0.100, 0.126], baseC: [0.020, 0.034], cScale: 1.02, chromaPreserve: [0.48, 0.64] },
  { id: 'oak-canopy', group: 'emerald', name: 'Oak Canopy', tag: 'Bark & Sunlit Leaf', style: 'silk', mood: 'dark',
    heroes: ['K7O2B9', 'C3L8W5', 'N6R4G2', 'D9M7T4'], hues: [[48, 66], [118, 140], [100, 116]], baseH: [52, 70], baseL: [0.096, 0.122], baseC: [0.014, 0.026], cScale: 1.04, poleLift: 0.12, fold: [0.38, 0.52], chromaPreserve: [0.46, 0.62] },
];
export const ATLASES = COLLECTIONS;
export const ATLAS_GROUPS = [
  { id: 'coast', name: 'Coast & Sky' },
  { id: 'emerald', name: 'Emerald Isle' },
];

// Local time of day as a sun path: x sweeps east (0) to west (1), elev peaks at solar noon.
export function solarPhase(date = new Date(), hourOverride = null) {
  const h = Number.isFinite(hourOverride)
    ? ((hourOverride % 24) + 24) % 24
    : date.getHours() + date.getMinutes() / 60;
  const t = (h - 6) / 12;
  const day = t >= 0 && t <= 1;
  const nt = (((h + 6) % 24) / 12) % 1;
  return {
    hour: h,
    x: day ? t : nt,
    elev: day ? Math.sin(t * Math.PI) : -Math.sin(nt * Math.PI) * 0.6,
    warmth: day ? 1 - Math.abs(2 * t - 1) : 0,
    isNight: !day,
  };
}

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
  for (let i = 0; i < 8; i++) next();

  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    jitter(center, span) {
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

export function oklchToOklab(L, C, hDeg) {
  const l = clamp(Number(L) || 0, 0, 1);
  const c = Math.max(0, Number(C) || 0);
  const rad = wrapHue(Number(hDeg) || 0) * DEG_TO_RAD;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

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

function relativeLuminanceBytes([r8, g8, b8]) {
  return 0.2126 * srgbChannelToLinear(r8) + 0.7152 * srgbChannelToLinear(g8) + 0.0722 * srgbChannelToLinear(b8);
}

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
  const baseY = relativeLuminanceBytes(rgb);

  let ink = isDark ? '#FFFFFF' : '#0F172A';
  if (isDark && 1.05 / (baseY + 0.05) < 4.5) {
    ink = '#020617';
  } else if (!isDark && (baseY + 0.05) / 0.05857 < 4.5) {
    ink = (baseY + 0.05) / 0.05 >= 4.5 ? '#000000' : '#FFFFFF';
  }
  const effectiveDark = ink === '#FFFFFF';

  const glassR = effectiveDark ? Math.round(rgb[0] * 0.35 + 10 * 0.65) : Math.round(rgb[0] * 0.22 + 255 * 0.78);
  const glassG = effectiveDark ? Math.round(rgb[1] * 0.35 + 14 * 0.65) : Math.round(rgb[1] * 0.22 + 255 * 0.78);
  const glassB = effectiveDark ? Math.round(rgb[2] * 0.35 + 24 * 0.65) : Math.round(rgb[2] * 0.22 + 255 * 0.78);
  const glassAlpha = effectiveDark ? 0.50 : 0.60;

  let bestAccent = paletteSwatches[1] || paletteSwatches[0] || baseHex;
  let bestScore = -1;
  for (const p of poles) {
    if (p.weight <= 0.01) continue;
    const chroma = Math.hypot(p.lab[1], p.lab[2]);
    const contrastBias = effectiveDark ? (p.lab[0] > 0.48 ? 1.2 : 0.7) : (p.lab[0] < 0.78 ? 1.2 : 0.75);
    const score = (chroma + 0.015) * contrastBias * p.weight;
    if (score > bestScore) {
      bestScore = score;
      bestAccent = p.hex;
    }
  }

  return {
    theme: effectiveDark ? 'dark' : 'light',
    bg: baseHex,
    ink,
    inkMuted: effectiveDark ? 'rgba(255, 255, 255, 0.70)' : 'rgba(15, 23, 42, 0.68)',
    glass: `rgba(${glassR}, ${glassG}, ${glassB}, ${glassAlpha})`,
    glassBorder: effectiveDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.10)',
    accent: bestAccent,
  };
}

function sculptPerceptualOklch(L, C, hDeg, mood) {
  let l = clamp(L, 0.06, 0.99);
  let c = Math.max(0, C);
  let h = wrapHue(hDeg);

  if (h > 92 && h < 146) {
    const midDist = 1 - Math.abs(h - 119) / 27;
    if (mood === 'dark' || l < 0.72) {
      h = h < 118 ? h - 22 * midDist : h + 28 * midDist;
      c *= 1 - 0.35 * midDist;
    } else {
      c = Math.min(c, 0.088 - 0.018 * midDist);
    }
  }

  if (mood === 'dark' && c > 0.042 && h > 46 && h < 96 && l < 0.54) {
    const amberFactor = 1 - Math.abs(h - 71) / 25;
    l = Math.max(l, 0.50 + 0.08 * amberFactor);
    h -= 12 * amberFactor;
  }

  if (h > 308 && h < 336 && c > 0.16) {
    c *= 1 - 0.12 * (1 - Math.abs(h - 322) / 14);
  }

  return [l, c, wrapHue(h)];
}

function chooseArtDirectedBridgeHue(hA, hB, mood) {
  const a = wrapHue(hA);
  const b = wrapHue(hB);
  const delta = ((b - a + 540) % 360) - 180;
  const mid1 = wrapHue(a + delta * 0.5);
  const mid2 = wrapHue(mid1 + 180);

  const scoreHue = (h) => {
    let score = 0;
    if (h >= 95 && h <= 165) score -= 2.0 * (1 - Math.abs(h - 130) / 35);
    if (h >= 300 || h <= 25) score += 1.1;
    if (mood === 'light' && h >= 40 && h <= 82) score += 1.25;
    if (mood === 'dark' && ((h >= 210 && h <= 285) || (h >= 38 && h <= 78))) score += 0.9;
    return score;
  };

  if (Math.abs(delta) > 125) return scoreHue(mid1) >= scoreHue(mid2) ? mid1 : mid2;
  if (Math.abs(delta) > 85 && mid1 > 105 && mid1 < 145) return mid2;
  return mid1;
}

function pickDarkGround(rng) {
  const kind = rng.pick(['sapphire', 'espresso', 'emerald', 'titanium']);
  if (kind === 'espresso') return [rng.range(0.108, 0.142), rng.range(0.018, 0.032), rng.range(35, 75)];
  if (kind === 'emerald') return [rng.range(0.112, 0.144), rng.range(0.022, 0.036), rng.range(165, 205)];
  if (kind === 'titanium') return [rng.range(0.095, 0.134), rng.range(0.008, 0.022), rng.range(210, 265)];
  return [rng.range(0.120, 0.148), rng.range(0.026, 0.038), rng.range(235, 300)];
}

function synthesizeChordSpec(rng, mood, { h0, h1, h2, h3, cScale = 1, baseOverride = null, poleLift = 0, eclipse = false }) {
  const bridgeHue = chooseArtDirectedBridgeHue(h0, h1, mood);

  if (eclipse) {
    const dark = mood === 'dark';
    const base = dark && baseOverride
      ? baseOverride
      : dark
        ? [rng.range(0.080, 0.105), rng.range(0.010, 0.022), h0]
        : [rng.range(0.955, 0.975), 0.014, h0];
    const discL = dark ? clamp(base[0] - 0.012, 0.062, 0.098) : rng.range(0.935, 0.962);
    return {
      base,
      bloom: sculptPerceptualOklch(dark ? rng.range(0.70, 0.82) : rng.range(0.97, 0.99), 0.145 * cScale, h1, mood),
      bridgeHue,
      poles: [
        [discL, base[1] * 0.85, base[2]],
        sculptPerceptualOklch(dark ? rng.range(0.60, 0.72) : rng.range(0.74, 0.83), rng.range(0.165, 0.205) * cScale, h0, mood),
        sculptPerceptualOklch(dark ? rng.range(0.72, 0.84) : rng.range(0.80, 0.88), rng.range(0.135, 0.175) * cScale, h1, mood),
        sculptPerceptualOklch(dark ? rng.range(0.46, 0.58) : rng.range(0.78, 0.86), rng.range(0.140, 0.180) * cScale, h2, mood),
        sculptPerceptualOklch(dark ? rng.range(0.34, 0.46) : rng.range(0.89, 0.94), rng.range(0.075, 0.115) * cScale, bridgeHue, mood),
        base,
      ],
    };
  }

  if (mood === 'light') {
    const baseH = baseOverride ? baseOverride[2] : rng.chance(0.65) ? rng.range(58, 96) : h0;
    return {
      base: [rng.range(0.964, 0.980), rng.range(0.007, 0.016) * Math.min(1, cScale), baseH],
      bloom: [rng.range(0.981, 0.991), rng.range(0.008, 0.018) * Math.min(1, cScale), bridgeHue],
      bridgeHue,
      poles: [
        sculptPerceptualOklch(rng.range(0.78, 0.86), rng.range(0.118, 0.158) * cScale, h0, 'light'),
        sculptPerceptualOklch(rng.range(0.78, 0.86), rng.range(0.112, 0.152) * cScale, h1, 'light'),
        sculptPerceptualOklch(rng.range(0.84, 0.90), rng.range(0.088, 0.128) * cScale, h2, 'light'),
        sculptPerceptualOklch(rng.range(0.85, 0.91), rng.range(0.064, 0.102) * cScale, h3, 'light'),
        sculptPerceptualOklch(rng.range(0.91, 0.95), rng.range(0.035, 0.064) * cScale, bridgeHue, 'light'),
        sculptPerceptualOklch(rng.range(0.94, 0.97), rng.range(0.014, 0.032) * cScale, baseH, 'light'),
      ],
    };
  }

  if (mood === 'split') {
    const splitKind = rng.pick(['periwinkle', 'sandstone', 'fjord', 'silver']);
    const base = baseOverride
      ? [rng.range(0.84, 0.89), rng.range(0.024, 0.042) * Math.min(1, cScale), baseOverride[2]]
      : splitKind === 'sandstone'
        ? [rng.range(0.85, 0.90), rng.range(0.022, 0.038), rng.range(48, 86)]
        : splitKind === 'fjord'
          ? [rng.range(0.83, 0.89), rng.range(0.026, 0.042), rng.range(182, 224)]
          : splitKind === 'silver'
            ? [rng.range(0.86, 0.91), rng.range(0.009, 0.020), rng.range(220, 275)]
            : [rng.range(0.82, 0.88), rng.range(0.032, 0.048), rng.range(228, 286)];
    return {
      base,
      bloom: [rng.range(0.954, 0.978), rng.range(0.012, 0.024) * Math.min(1, cScale), bridgeHue],
      bridgeHue,
      poles: [
        sculptPerceptualOklch(rng.range(0.55, 0.65), rng.range(0.138, 0.190) * cScale, h0, 'split'),
        sculptPerceptualOklch(rng.range(0.69, 0.79), rng.range(0.140, 0.188) * cScale, h1, 'split'),
        sculptPerceptualOklch(rng.range(0.72, 0.82), rng.range(0.102, 0.150) * cScale, h2, 'split'),
        sculptPerceptualOklch(rng.range(0.76, 0.85), rng.range(0.100, 0.140) * cScale, h3, 'split'),
        sculptPerceptualOklch(rng.range(0.87, 0.92), rng.range(0.040, 0.070) * cScale, bridgeHue, 'split'),
        sculptPerceptualOklch(rng.range(0.93, 0.96), rng.range(0.012, 0.026) * cScale, base[2], 'split'),
      ],
    };
  }

  const darkBase = baseOverride || pickDarkGround(rng);
  return {
    base: darkBase,
    bloom: sculptPerceptualOklch(rng.range(0.54, 0.66) + poleLift * 0.6, rng.range(0.105, 0.148) * cScale, h2, 'dark'),
    bridgeHue,
    poles: [
      sculptPerceptualOklch(rng.range(0.38, 0.50) + poleLift, rng.range(0.148, 0.196) * cScale, h0, 'dark'),
      sculptPerceptualOklch(rng.range(0.42, 0.56) + poleLift * 0.5, rng.range(0.148, 0.202) * cScale, h1, 'dark'),
      sculptPerceptualOklch(rng.range(0.52, 0.66) + poleLift * 0.8, rng.range(0.115, 0.158) * cScale, h2, 'dark'),
      sculptPerceptualOklch(rng.range(0.28, 0.40), rng.range(0.100, 0.144) * cScale, h3, 'dark'),
      sculptPerceptualOklch(rng.range(0.30, 0.43), rng.range(0.090, 0.132) * cScale, bridgeHue, 'dark'),
      sculptPerceptualOklch(rng.range(0.16, 0.22), rng.range(0.034, 0.066) * cScale, darkBase[2], 'dark'),
    ],
  };
}

function buildHarmonicWildSpec(rng, mood) {
  const chordType = rng.pick(['split-atmosphere', 'analogous-cascade', 'botanical-contrast', 'iridescent-arc', 'titanium']);
  const isTi = chordType === 'titanium';
  let h0;
  let h1;
  let h2;
  let h3;

  if (isTi) {
    h0 = rng.range(210, 265);
    h1 = rng.range(42, 78);
    h2 = wrapHue(h0 + rng.range(-18, 18));
    h3 = wrapHue(h1 + rng.range(-15, 15));
  } else if (chordType === 'split-atmosphere' || mood === 'split') {
    const cool = rng.range(172, 298);
    const warm = rng.range(16, 82);
    [h0, h1] = rng.chance(0.5) ? [cool, warm] : [warm, cool];
    h2 = wrapHue(h0 + rng.range(-24, 24));
    h3 = wrapHue(h1 + rng.range(-22, 22));
  } else if (chordType === 'botanical-contrast') {
    h0 = rng.range(18, 78);
    h1 = rng.range(156, 238);
    h2 = wrapHue(h0 + rng.range(18, 38) * rng.sign());
    h3 = wrapHue(h1 + rng.range(-24, 24));
  } else if (chordType === 'iridescent-arc') {
    const start = rng.range(168, 345);
    const dir = rng.sign();
    h0 = start;
    h1 = wrapHue(start + dir * rng.range(72, 118));
    h2 = wrapHue(start + dir * rng.range(28, 52));
    h3 = wrapHue(start + dir * rng.range(115, 148));
  } else {
    const anchor = rng.range(0, 360);
    h0 = anchor;
    h1 = wrapHue(anchor + rng.range(32, 58) * rng.sign());
    h2 = wrapHue(anchor - rng.range(26, 48));
    h3 = wrapHue(anchor + 155 + rng.range(-20, 20));
  }

  const tiBase = isTi
    ? [mood === 'dark' ? rng.range(0.095, 0.128) : rng.range(0.88, 0.97), rng.range(0.008, 0.020), rng.range(215, 260)]
    : null;
  return synthesizeChordSpec(rng, mood, { h0, h1, h2, h3, cScale: isTi ? 0.14 : 1, baseOverride: tiBase });
}

function buildCollectionSpec(rng, col, mood) {
  const band = (b) => wrapHue(rng.range(b[0], b[1]));
  const h0 = band(col.hues[0]);
  const h1 = band(col.hues[1 % col.hues.length]);
  const h2 = band(col.hues[2 % col.hues.length]);
  const h3 = wrapHue(h0 + rng.jitter(0, 18));
  const baseH = col.baseH ? band(col.baseH) : h0;
  const baseL = col.baseL ? rng.range(col.baseL[0], col.baseL[1]) : rng.range(0.105, 0.136);
  const baseC = col.baseC ? rng.range(col.baseC[0], col.baseC[1]) : rng.range(0.020, 0.034);
  return synthesizeChordSpec(rng, mood, {
    h0,
    h1,
    h2,
    h3,
    cScale: col.cScale ?? 1,
    baseOverride: [baseL, baseC, baseH],
    poleLift: col.poleLift ?? 0,
    eclipse: col.topology === 'eclipse',
  });
}

function mirrorPoint([x, y], flipX, flipY) {
  return [flipX ? 1 - x : x, flipY ? 1 - y : y];
}

function choreographSphere(rng, col = null) {
  if (col?.topology === 'eclipse') {
    const cx = rng.jitter(0.50, 0.055);
    const cy = rng.jitter(0.48, 0.055);
    const ang = rng.range(-Math.PI, Math.PI);
    const fx = Math.cos(ang);
    const fy = Math.sin(ang);
    const cr = rng.range(0.66, 0.82);
    return {
      polesLayout: [
        { pos: [cx - fx * 0.038, cy - fy * 0.038], radius: cr * rng.range(0.58, 0.66), softness: rng.range(0.30, 0.37), stretch: [1, 1], angle: 0, weight: 1.35 },
        { pos: [cx, cy], radius: cr, softness: rng.range(0.48, 0.64), stretch: [1, 1], angle: ang, weight: rng.range(1.20, 1.32) },
        { pos: [clamp(cx + fx * cr * 0.36, 0.12, 0.88), clamp(cy + fy * cr * 0.36, 0.12, 0.88)], radius: rng.range(0.42, 0.58), softness: rng.range(0.44, 0.62), stretch: [1.14, 0.95], angle: ang, weight: rng.range(0.95, 1.16) },
        { pos: [clamp(cx - fx * cr * 0.30, 0.10, 0.90), clamp(cy - fy * cr * 0.30, 0.10, 0.90)], radius: rng.range(0.54, 0.74), softness: rng.range(0.58, 0.82), stretch: [1, 1], angle: -ang, weight: rng.range(0.62, 0.84) },
        { pos: [clamp(cx - fy * 0.22, 0.08, 0.92), clamp(cy + fx * 0.22, 0.08, 0.92)], radius: rng.range(0.56, 0.80), softness: rng.range(0.68, 0.94), stretch: [1.18, 0.90], angle: ang + 1.57, weight: rng.range(0.44, 0.66) },
        { pos: [cx, cy], radius: 0.95, softness: 0.95, stretch: [1, 1], angle: 0, weight: 0.0 },
      ],
      baseBloomPos: [clamp(cx + fx * 0.10, 0.16, 0.84), clamp(cy + fy * 0.10, 0.16, 0.84)],
      bloomRadius: rng.range(0.52, 0.78),
      warp: { scale: rng.range(0.48, 0.76), amount: rng.range(0.030, 0.065), foldStrength: 0.0, phase: [rng.range(-48, 48), rng.range(-48, 48)], flowAngle: ang },
    };
  }

  const flipX = rng.chance(0.5);
  const flipY = rng.chance(0.32);
  const layout = rng.pick(['flanking-horizon', 'diagonal-eclipse', 'triad-orbit']);

  let rawPoles;
  let rawBloomPos;

  if (layout === 'flanking-horizon') {
    const leftY = rng.range(0.36, 0.66);
    const rightY = clamp(1.02 - leftY + rng.jitter(0, 0.08), 0.30, 0.70);
    const p0 = [rng.range(0.04, 0.28), leftY];
    const p1 = [rng.range(0.72, 0.96), rightY];
    const midX = 0.5 * (p0[0] + p1[0]) + rng.jitter(0, 0.05);
    const midY = 0.5 * (p0[1] + p1[1]) - rng.range(0.04, 0.13);

    rawPoles = [
      { pos: p0, radius: rng.range(0.72, 1.02), softness: rng.range(0.46, 0.76), weight: rng.range(1.08, 1.28) },
      { pos: p1, radius: rng.range(0.70, 1.00), softness: rng.range(0.46, 0.76), weight: rng.range(1.06, 1.26) },
      { pos: [p0[0] + rng.range(0.16, 0.28), clamp(p0[1] - rng.range(0.06, 0.18), 0.18, 0.82)], radius: rng.range(0.54, 0.78), softness: rng.range(0.54, 0.82), weight: rng.range(0.66, 0.90) },
      { pos: [p1[0] - rng.range(0.16, 0.28), clamp(p1[1] + rng.range(-0.14, 0.16), 0.20, 0.82)], radius: rng.range(0.52, 0.76), softness: rng.range(0.54, 0.82), weight: rng.range(0.64, 0.88) },
      { pos: [clamp(midX, 0.34, 0.66), clamp(midY, 0.24, 0.62)], radius: rng.range(0.62, 0.92), softness: rng.range(0.66, 0.94), weight: rng.range(0.56, 0.82) },
      { pos: [rng.range(0.32, 0.68), rng.range(0.06, 0.24)], radius: rng.range(0.64, 1.02), softness: rng.range(0.72, 1.02), weight: rng.range(0.48, 0.76) },
    ];
    rawBloomPos = [clamp(midX, 0.36, 0.64), clamp(midY - 0.08, 0.16, 0.48)];
  } else if (layout === 'diagonal-eclipse') {
    const p0 = [rng.range(0.04, 0.26), rng.range(0.56, 0.80)];
    const p1 = [rng.range(0.74, 0.96), rng.range(0.20, 0.44)];
    rawPoles = [
      { pos: p0, radius: rng.range(0.74, 1.04), softness: rng.range(0.46, 0.76), weight: rng.range(1.08, 1.30) },
      { pos: p1, radius: rng.range(0.72, 1.00), softness: rng.range(0.46, 0.78), weight: rng.range(1.06, 1.28) },
      { pos: [rng.range(0.18, 0.42), rng.range(0.22, 0.48)], radius: rng.range(0.56, 0.84), softness: rng.range(0.52, 0.82), weight: rng.range(0.68, 0.92) },
      { pos: [rng.range(0.58, 0.82), rng.range(0.54, 0.80)], radius: rng.range(0.54, 0.80), softness: rng.range(0.54, 0.84), weight: rng.range(0.64, 0.88) },
      { pos: [rng.range(0.40, 0.60), rng.range(0.38, 0.60)], radius: rng.range(0.62, 0.90), softness: rng.range(0.68, 0.96), weight: rng.range(0.55, 0.80) },
      { pos: [rng.range(0.10, 0.34), rng.range(0.06, 0.24)], radius: rng.range(0.64, 0.98), softness: rng.range(0.72, 1.02), weight: rng.range(0.45, 0.74) },
    ];
    rawBloomPos = [rng.range(0.38, 0.62), rng.range(0.24, 0.50)];
  } else {
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
      radius: clamp(p.radius, 0.46, 1.05),
      softness: clamp(p.softness, 0.36, 1.06),
      stretch: [rng.range(0.96, 1.07), rng.range(0.96, 1.07)],
      angle: rng.range(-Math.PI, Math.PI),
      weight: clamp(p.weight, 0.35, 1.32),
    };
  });

  const bloomPos = mirrorPoint(rawBloomPos, flipX, flipY);
  return {
    polesLayout,
    baseBloomPos: [clamp(bloomPos[0], 0.12, 0.88), clamp(bloomPos[1], 0.12, 0.88)],
    bloomRadius: rng.range(0.56, 0.98),
    warp: { scale: rng.range(0.46, 0.84), amount: rng.range(0.032, 0.088), foldStrength: 0.0, phase: [rng.range(-48, 48), rng.range(-48, 48)], flowAngle },
  };
}

function choreographMesh(rng) {
  const flipX = rng.chance(0.5);
  const flipY = rng.chance(0.5);
  const template = rng.pick(['golden-c-curve', 'diagonal-bay', 'archipelago-pool']);

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
    flipY,
  );

  return {
    polesLayout,
    baseBloomPos: [clamp(bloomMirrored[0], 0.08, 0.92), clamp(bloomMirrored[1], 0.08, 0.92)],
    bloomRadius: rng.range(0.52, 0.92),
    warp: {
      scale: rng.range(0.62, 1.06),
      amount: rng.range(0.24, 0.40),
      foldStrength: rng.range(0.050, 0.125),
      phase: [rng.range(-48, 48), rng.range(-48, 48)],
      flowAngle,
    },
  };
}

function choreographSilk(rng, isCaustic = false, col = null) {
  const baseFlow = rng.range(0.24, 0.90) * rng.sign();
  const flipOffset = rng.chance(0.5) ? 0 : Math.PI;
  const flowAngle = Math.atan2(Math.sin(baseFlow + flipOffset), Math.cos(baseFlow + flipOffset));

  const dirX = Math.cos(flowAngle);
  const dirY = Math.sin(flowAngle);
  const normX = -dirY;
  const normY = dirX;
  const laneSign = rng.sign();

  const ribbons = [
    { u: -0.16, v: -0.18 * laneSign, r: [0.54, 0.78], s: [0.42, 0.68], w: [1.00, 1.26] },
    { u: 0.18,  v: 0.14 * laneSign,  r: [0.52, 0.76], s: [0.42, 0.68], w: [0.96, 1.22] },
    { u: -0.28, v: 0.04 * laneSign,  r: [0.46, 0.68], s: [0.46, 0.72], w: [0.76, 1.02] },
    { u: 0.28,  v: -0.06 * laneSign, r: [0.44, 0.66], s: [0.48, 0.74], w: [0.72, 0.96] },
    { u: 0.02,  v: -0.02 * laneSign, r: [0.48, 0.72], s: [0.54, 0.82], w: [0.58, 0.86] },
    { u: -0.06, v: 0.32 * laneSign,  r: [0.44, 0.68], s: [0.58, 0.88], w: [0.42, 0.68] },
  ];

  const sxRange = col?.stretchX || (isCaustic ? [1.34, 1.88] : [1.42, 1.98]);
  const activeLimit = col?.activePoles ?? 6;

  const polesLayout = ribbons.map((rb, idx) => {
    const u = rb.u + rng.jitter(0, 0.08);
    const v = rb.v + rng.jitter(0, 0.06) + (isCaustic ? 0.08 * (u * u) * laneSign : 0);
    const px = 0.5 + u * dirX + v * normX;
    const py = 0.5 + u * dirY + v * normY;
    const crossCusp = isCaustic ? (idx % 2 === 0 ? 0.32 : -0.32) : 0;
    const poleAngle = flowAngle + crossCusp + rng.jitter(0, 0.22);
    return {
      pos: [clamp(px, -0.12, 1.12), clamp(py, -0.12, 1.12)],
      radius: rng.range(rb.r[0], rb.r[1]) * (isCaustic ? 0.92 : 1.0),
      softness: rng.range(rb.s[0], rb.s[1]) * (isCaustic ? 0.78 : 1.0),
      stretch: [rng.range(sxRange[0], sxRange[1]), rng.range(isCaustic ? 0.62 : 0.66, isCaustic ? 0.84 : 0.89)],
      angle: Math.atan2(Math.sin(poleAngle), Math.cos(poleAngle)),
      weight: idx < activeLimit ? rng.range(rb.w[0], rb.w[1]) : 0.0,
    };
  });

  const bloomU = rng.jitter(0.04, 0.16);
  const bloomV = -0.12 * laneSign + rng.jitter(0, 0.08);
  const scaleRange = col?.warpScale || (isCaustic ? [1.04, 1.66] : [0.86, 1.54]);
  const foldRange = col?.fold || (isCaustic ? [0.34, 0.54] : [0.29, 0.47]);

  return {
    polesLayout,
    baseBloomPos: [clamp(0.5 + bloomU * dirX + bloomV * normX, 0.14, 0.86), clamp(0.5 + bloomU * dirY + bloomV * normY, 0.14, 0.86)],
    bloomRadius: rng.range(0.46, 0.84),
    warp: {
      scale: rng.range(scaleRange[0], scaleRange[1]),
      amount: rng.range(isCaustic ? 0.32 : 0.35, isCaustic ? 0.52 : 0.54),
      foldStrength: rng.range(foldRange[0], foldRange[1]),
      phase: [rng.range(-48, 48), rng.range(-48, 48)],
      flowAngle,
    },
  };
}

function labDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function extractPaletteSwatches(baseLab, baseHex, poles, bloomLab, bloomHex) {
  const active = poles.filter((p) => p.weight > 0.01);
  const source = active.length >= 2 ? active : poles;
  const candidates = [
    { lab: baseLab, hex: baseHex, score: 2.0 },
    ...source.map((p) => ({ lab: p.lab, hex: p.hex, score: p.weight * p.radius })).sort((x, y) => y.score - x.score),
    { lab: bloomLab, hex: bloomHex, score: 0.4 },
  ];

  const chosen = [];
  for (const cand of candidates) {
    if (chosen.length >= 5) break;
    if (!chosen.some((ex) => ex.hex === cand.hex || labDistance(ex.lab, cand.lab) < 0.042)) {
      chosen.push(cand);
    }
  }
  for (const cand of candidates) {
    if (chosen.length >= 4) break;
    if (!chosen.some((ex) => ex.hex === cand.hex)) chosen.push(cand);
  }
  while (chosen.length < 4) chosen.push(candidates[chosen.length % candidates.length]);
  return chosen.slice(0, 5).map((c) => c.hex);
}

function calibrateLighting(rng, mood, col = null) {
  const pickR = (ov, lo, hi) => round6(ov ? rng.range(ov[0], ov[1]) : rng.range(lo, hi));
  if (mood === 'light') {
    return { scatterLift: pickR(col?.scatter, 0.085, 0.145), chromaPreserve: pickR(col?.chromaPreserve, 0.36, 0.58), vignette: pickR(col?.vignette, -0.045, 0.025), grain: pickR(col?.grain, 0.0195, 0.0245) };
  }
  if (mood === 'split') {
    return { scatterLift: pickR(col?.scatter, 0.100, 0.158), chromaPreserve: pickR(col?.chromaPreserve, 0.46, 0.68), vignette: pickR(col?.vignette, -0.025, 0.055), grain: pickR(col?.grain, 0.0200, 0.0255) };
  }
  return { scatterLift: pickR(col?.scatter, 0.042, 0.076), chromaPreserve: pickR(col?.chromaPreserve, 0.32, 0.56), vignette: pickR(col?.vignette, 0.032, 0.095), grain: pickR(col?.grain, 0.0200, 0.0258) };
}

export function generateScene({
  seed,
  style = 'auto',
  mood = 'system',
  archetype,
  harmony,
  collection,
  atlas,
  colors = null,
  colorScheme = null,
  lockGeometrySeed = true,
  solar = false,
  solarHour = null,
} = {}) {
  const normalizedSeed = typeof seed === 'string' && seed.trim().length > 0 ? seed.trim().toUpperCase() : randomSeed();
  const rng = createRng(normalizedSeed);
  const requestedArchetype = harmony ?? archetype ?? 'auto';
  const requestedCollection = collection ?? atlas ?? null;
  const activeCol =
    typeof requestedCollection === 'string' && requestedCollection.trim() && requestedCollection !== 'auto' && requestedCollection !== 'none'
      ? COLLECTIONS.find((c) => c.id === requestedCollection.trim().toLowerCase()) || null
      : null;

  const parsedCustomLabs = Array.isArray(colors) ? colors.map(srgbHexToOklab).filter(Boolean) : [];
  const hasCustomPalette = parsedCustomLabs.length >= 2;
  const rawMood = typeof mood === 'string' ? mood.trim().toLowerCase() : 'system';
  const requestedStyle = VALID_STYLES.includes(style) ? style : 'auto';

  let targetScheme = null;
  if (rawMood === 'system') {
    targetScheme = colorScheme === 'dark' || colorScheme === 'light' ? colorScheme : activeCol && colorScheme == null ? null : detectColorScheme();
  } else if (rawMood === 'daylight') {
    targetScheme = 'light';
  }
  const requestedMood = VALID_MOODS.includes(rawMood) ? rawMood : targetScheme === 'dark' ? 'dark' : targetScheme === 'light' ? 'daylight' : 'any';

  let selectedMeta = null;
  let useWild = false;
  if (!hasCustomPalette && !activeCol) {
    if (requestedArchetype === 'harmonic-wild') useWild = true;
    else if (requestedArchetype && requestedArchetype !== 'auto') selectedMeta = ARCHETYPE_SPECS.find((a) => a.id === requestedArchetype) || null;
  }

  let resolvedMood;
  if (hasCustomPalette) {
    const avgL = parsedCustomLabs.reduce((acc, c) => acc + c[0], 0) / parsedCustomLabs.length;
    resolvedMood = VALID_MOODS.includes(requestedMood) ? requestedMood : avgL < 0.45 ? 'dark' : avgL > 0.78 ? 'light' : 'split';
  } else if (activeCol) {
    resolvedMood = VALID_MOODS.includes(requestedMood)
      ? requestedMood
      : requestedMood === 'daylight'
        ? activeCol.mood === 'split'
          ? 'split'
          : 'light'
        : rawMood === 'any'
          ? rng.pick(VALID_MOODS)
          : activeCol.mood || 'dark';
  } else if (selectedMeta) {
    resolvedMood = VALID_MOODS.includes(requestedMood) ? requestedMood : selectedMeta.mood;
  } else if (VALID_MOODS.includes(requestedMood)) {
    resolvedMood = requestedMood;
  } else if (requestedMood === 'daylight') {
    resolvedMood = rng.chance(0.60) ? 'light' : 'split';
  } else {
    resolvedMood = rng.pick(VALID_MOODS);
  }

  if (!hasCustomPalette && !activeCol && !selectedMeta && !useWild) {
    if (rng.chance(0.34)) useWild = true;
    else selectedMeta = rng.pick(ARCHETYPE_SPECS.filter((a) => a.mood === resolvedMood));
  }

  const explicitArch = Boolean(requestedArchetype && requestedArchetype !== 'auto' && requestedArchetype !== 'harmonic-wild');
  const styleRng = lockGeometrySeed ? createRng(`${normalizedSeed}:style`) : rng;
  let resolvedStyle;
  if (requestedStyle !== 'auto') resolvedStyle = requestedStyle;
  else if (activeCol && VALID_STYLES.includes(activeCol.style)) resolvedStyle = activeCol.style;
  else if (explicitArch && selectedMeta && VALID_STYLES.includes(selectedMeta.defaultStyle)) resolvedStyle = selectedMeta.defaultStyle;
  else if (!lockGeometrySeed && selectedMeta && VALID_STYLES.includes(selectedMeta.defaultStyle)) resolvedStyle = styleRng.chance(0.55) ? selectedMeta.defaultStyle : styleRng.pick(VALID_STYLES);
  else resolvedStyle = styleRng.pick(VALID_STYLES);

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
    if (lchList.length >= 3) {
      rawBase = lchList[0];
      const hero = lchList.slice(1);
      const [p0, p1] = [hero[0], hero[1 % hero.length]];
      bridgeHue = chooseArtDirectedBridgeHue(p0[2], p1[2], resolvedMood);
      rawBloom = [resolvedMood === 'dark' ? clamp(Math.max(p0[0], p1[0]) + 0.12, 0.38, 0.72) : 0.965, Math.min(0.035, (p0[1] + p1[1]) * 0.2), bridgeHue];
      rawPolesOklch = [
        p0,
        p1,
        hero[2 % hero.length],
        hero[3 % hero.length] || [clamp(p0[0] + 0.06, 0.15, 0.95), p0[1] * 0.82, wrapHue(p0[2] + 14)],
        [clamp((p0[0] + p1[0]) * 0.5 + 0.08, 0.22, 0.94), Math.min(0.065, (p0[1] + p1[1]) * 0.35), bridgeHue],
        rawBase,
      ];
    } else {
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
  } else if (activeCol) {
    archetypeId = activeCol.id;
    archetypeName = activeCol.name;
    const spec = buildCollectionSpec(createRng(`${normalizedSeed}:col:${activeCol.id}:${resolvedMood}`), activeCol, resolvedMood);
    ({ base: rawBase, bloom: rawBloom, bridgeHue, poles: rawPolesOklch } = spec);
  } else if (useWild || (selectedMeta && selectedMeta.mood !== resolvedMood)) {
    archetypeId = selectedMeta ? selectedMeta.id : 'harmonic-wild';
    archetypeName = selectedMeta ? selectedMeta.name : 'Harmonic Wildcard';
    const colorRng = createRng(`${normalizedSeed}:wild:${archetypeId}:${resolvedMood}`);
    const spec = buildHarmonicWildSpec(colorRng, resolvedMood);
    if (selectedMeta) {
      spec.poles = spec.poles.map(([wL, wC], i) => [wL, Math.min(wC, selectedMeta.poles[i][1] * 1.15), wrapHue(selectedMeta.poles[i][2] + colorRng.jitter(0, 6))]);
      spec.bridgeHue = selectedMeta.bridgeHue;
    }
    ({ base: rawBase, bloom: rawBloom, bridgeHue, poles: rawPolesOklch } = spec);
  } else {
    archetypeId = selectedMeta.id;
    archetypeName = selectedMeta.name;
    const shift = rng.jitter(0, selectedMeta.hueDrift || 8);
    rawBase = [clamp(selectedMeta.base[0] + rng.jitter(0, 0.008), 0.08, 0.99), Math.max(0, selectedMeta.base[1] + rng.jitter(0, 0.004)), wrapHue(selectedMeta.base[2] + shift * 0.5)];
    rawBloom = [clamp(selectedMeta.bloom[0] + rng.jitter(0, 0.010), 0.15, 0.992), Math.max(0, selectedMeta.bloom[1] + rng.jitter(0, 0.006)), wrapHue(selectedMeta.bloom[2] + shift * 0.6)];
    bridgeHue = wrapHue(selectedMeta.bridgeHue + shift * 0.6);
    rawPolesOklch = selectedMeta.poles.map(([pL, pC, pH]) => [
      clamp(pL + rng.jitter(0, 0.024), 0.12, 0.98),
      Math.max(0.005, pC * rng.range(0.89, 1.12)),
      wrapHue(pH + shift + rng.jitter(0, 6.5)),
    ]);
    if (rng.chance(0.5)) [rawPolesOklch[0], rawPolesOklch[1]] = [rawPolesOklch[1], rawPolesOklch[0]];
    if (rng.chance(0.5)) [rawPolesOklch[2], rawPolesOklch[3]] = [rawPolesOklch[3], rawPolesOklch[2]];
  }

  const baseLabRaw = clampToGamutOklab(rawBase[0], rawBase[1], rawBase[2]);
  const baseLab = [round6(baseLabRaw[0]), round6(baseLabRaw[1]), round6(baseLabRaw[2])];
  const baseHex = oklabToSrgbHex(baseLab[0], baseLab[1], baseLab[2]);

  const bloomLabRaw = clampToGamutOklab(rawBloom[0], rawBloom[1], rawBloom[2]);
  const bloomLab = [round6(bloomLabRaw[0]), round6(bloomLabRaw[1]), round6(bloomLabRaw[2])];

  const sun = solar && activeCol?.topology !== 'eclipse' ? solarPhase(new Date(), solarHour) : null;
  if (sun) {
    const warmHue = sun.isNight ? 232 : 48 + sun.elev * 22;
    const warmAmt = sun.isNight ? 0.35 : 0.22 + sun.warmth * 0.45;
    const [bL, bC, bH] = oklabToOklchTuple(bloomLab);
    const mixedH = bH + Math.atan2(Math.sin((warmHue - bH) * DEG_TO_RAD), Math.cos((warmHue - bH) * DEG_TO_RAD)) / DEG_TO_RAD * warmAmt;
    const tinted = clampToGamutOklab(
      clamp(bL + (sun.isNight ? -0.06 : sun.elev * 0.03), 0.15, 0.992),
      Math.max(0.01, bC * (1 + warmAmt * 0.5)),
      wrapHue(mixedH),
    );
    bloomLab[0] = round6(tinted[0]);
    bloomLab[1] = round6(tinted[1]);
    bloomLab[2] = round6(tinted[2]);
  }
  const bloomHex = oklabToSrgbHex(bloomLab[0], bloomLab[1], bloomLab[2]);

  const bridgeRad = bridgeHue * DEG_TO_RAD;
  const bridgeDir = [round6(Math.cos(bridgeRad)), round6(Math.sin(bridgeRad))];
  const bridgeLen = Math.hypot(bridgeDir[0], bridgeDir[1]) || 1;
  bridgeDir[0] = round6(bridgeDir[0] / bridgeLen);
  bridgeDir[1] = round6(bridgeDir[1] / bridgeLen);

  // Separate spatial stream keeps pole geometry fixed across Day/Night mood switches
  const geomRng = lockGeometrySeed ? createRng(`${normalizedSeed}:geom:${resolvedStyle}:${activeCol?.id || 'std'}`) : rng;
  const choreography =
    resolvedStyle === 'sphere'
      ? choreographSphere(geomRng, activeCol)
      : resolvedStyle === 'silk' || resolvedStyle === 'caustic'
        ? choreographSilk(geomRng, resolvedStyle === 'caustic', activeCol)
        : choreographMesh(geomRng);

  const elevRng = createRng(`${normalizedSeed}:elev:${resolvedMood}`);
  const solarShift = activeCol?.topology === 'eclipse' ? [0, 0] : resolvedMood === 'light' ? [-0.025, -0.065] : resolvedMood === 'dark' ? [0.035, 0.075] : [0.010, 0.005];
  const bloomPos = sun
    ? [
        round6(0.18 + sun.x * 0.64),
        round6(sun.isNight ? 0.58 + Math.abs(sun.elev) * 0.1 : 0.62 - sun.elev * 0.48),
      ]
    : [
        round6(clamp(choreography.baseBloomPos[0] + solarShift[0], 0.06, 0.94)),
        round6(clamp(choreography.baseBloomPos[1] + solarShift[1], 0.06, 0.94)),
      ];
  const bloomStrength = sun
    ? round6(sun.isNight ? 0.22 + Math.abs(sun.elev) * 0.1 : 0.30 + sun.elev * 0.42)
    : activeCol?.topology === 'eclipse'
      ? round6(resolvedMood === 'dark' ? elevRng.range(0.54, 0.76) : elevRng.range(0.45, 0.68))
      : round6(resolvedMood === 'dark' ? elevRng.range(0.18, 0.36) : elevRng.range(0.32, 0.72));

  const activeLimit = activeCol?.activePoles ?? 6;
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
      weight: round6(clamp(idx < activeLimit ? geom.weight : 0.0, 0.0, 1.35)),
    };
  });

  let poleWeightSum = 0;
  let poleLumaSum = 0;
  for (const p of poles) {
    const inf = p.weight * p.radius;
    poleWeightSum += inf;
    poleLumaSum += p.lab[0] * inf;
  }
  const avgPoleL = poleWeightSum > 0 ? poleLumaSum / poleWeightSum : baseLab[0];
  const perceivedL = 0.44 * baseLab[0] + 0.44 * avgPoleL + 0.12 * (bloomLab[0] * bloomStrength + baseLab[0] * (1 - bloomStrength));
  const isDark = hasCustomPalette ? perceivedL < 0.54 : resolvedMood === 'dark';

  const paletteSwatches = extractPaletteSwatches(baseLab, baseHex, poles, bloomLab, bloomHex);
  const lighting = calibrateLighting(createRng(`${normalizedSeed}:light:${resolvedMood}:${activeCol?.id || 'std'}`), resolvedMood, activeCol);
  const uiTokens = computeUiTokens(isDark, baseHex, poles, paletteSwatches);

  return {
    seed: normalizedSeed,
    style: resolvedStyle,
    mood: resolvedMood,
    collection: activeCol ? activeCol.id : null,
    atlas: activeCol ? activeCol.id : null,
    solar: sun ? { hour: round6(sun.hour), x: round6(sun.x), elev: round6(sun.elev), isNight: sun.isNight } : null,
    archetypeId,
    archetypeName,
    isDark: uiTokens.theme === 'dark',
    baseLab,
    baseHex,
    bloomLab,
    bloomHex,
    bloomPos,
    bloomRadius: round6(clamp(choreography.bloomRadius, 0.40, 1.05)),
    bloomStrength: round6(clamp(bloomStrength, 0.15, 0.85)),
    bridgeDir,
    poles,
    paletteSwatches,
    swatches: paletteSwatches,
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
