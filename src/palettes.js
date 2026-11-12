export const STYLE_MODES = ['mesh', 'sphere', 'silk', 'caustic', 'fluted', 'prism', 'topo'];
export const MOOD_MODES = ['system', 'any', 'light', 'split', 'dark'];
export const GAMUT_MODES = ['auto', 'p3', 'srgb'];

const MOODS = ['light', 'split', 'dark'];
const ALPH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const { abs, atan2, cbrt, cos, exp, hypot, imul, max, min, PI, round, sin, tanh } = Math;
const { isFinite: isFin } = Number, { isArray: isArr } = Array;
const DEG = PI / 180;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const wrapH = (h) => ((h % 360) + 360) % 360;
const r4 = (n) => round(n * 1e4) / 1e4;
const rLab = (x) => [r4(x[0]), r4(x[1]), r4(x[2])];

export const hashSeed32 = (s) => {
  const t = String(s ?? 'sphere');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < t.length; i++) h = imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
};

const ALIAS = {};
for (const r of 'skellig-night:ocean,fintech,sapphire,navy,midnight|wicklow-amber:amber,gold,luxury,bronze,honey|dawn-meadow:forest,sage,matcha,meadow,mint|burren-chalk:paper,editorial,minimal,chalk,ivory|antrim-basalt:slate,obsidian,mono,charcoal|dingle-horizon:sunset,coral,horizon,peach|boyne-solstice:eclipse,solstice|achill-dusk:lavender,twilight,violet|connemara-lough:teal,lagoon,jade|moss-stone:moss,stone,granite|peat-bog:peat,earth|gorse-hedgerow:gorse,citrine|moher-slate:cliff,nordic|glen-shade:fern,emerald|oak-canopy:oak,olive'.split('|')) {
  const [t, ks] = r.split(':');
  for (const k of ks.split(',')) ALIAS[k] = t;
}

export function normalizeAtlasId(raw) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return !v || /^(all|auto|none)$/.test(v) ? null : ALIAS[v] || v;
}

const G = globalThis;
const mq = (q) => { try { return !!G.window?.matchMedia?.(q)?.matches; } catch { return false; } };
export function detectColorScheme() {
  const r = G.document?.documentElement, b = G.document?.body;
  if (r) {
    for (const a of ['data-theme', 'data-color-scheme', 'data-bs-theme']) {
      const v = (r.getAttribute(a) || b?.getAttribute(a) || '').trim().toLowerCase();
      if (v === 'dark' || v === 'light') return v;
    }
    for (const m of ['dark', 'light']) if (r.classList?.contains(m) || b?.classList?.contains(m)) return m;
  }
  return mq('(prefers-color-scheme: dark)') ? 'dark' : 'light';
}
export const detectDisplayP3 = () => mq('(color-gamut: p3)');

const ARCH_SPECS = `alabaster-honey|Alabaster & Honey Coral|0 76 29 52 152 95
porcelain-peach-sage|Porcelain Peach & Celadon|0 42 168 86 230 92
morning-lilac-pearl|Morning Lilac & Pearl|2 278 348 232 48 88
solstice-ochre-mist|Travertine Ochre & Chalk|1 66 35 244 78 102
cerulean-tangerine|Cerulean & Sunset Tangerine|1 252 46 246 64 112
steel-lavender-amber|Nordic Steel & Warm Amber|1 248 55 292 30 82
aegean-coral-horizon|Aegean Teal & Coral Dusk|0 228 26 66 214 98
twilight-violet-citrine|Vesper Violet & Citrine|2 282 68 356 256 104
electric-sapphire|Midnight Electric Sapphire|2 262 255 222 274 108
velvet-ember-obsidian|Velvet Ember & Obsidian|1 32 258 54 14 96
abyssal-aurora-jade|Abyssal Jade & Ultramarine|3 184 264 228 198 92
nocturne-amethyst-rose|Nocturne Amethyst & Rose Gold|2 296 352 46 268 94`.split('\n').map((r, i) => {
  const [id, name, ns] = r.split('|'), n = ns.split(' ').map(Number);
  return { id, name, mood: MOODS[(i / 4) | 0], defaultStyle: STYLE_MODES[n[0]], h: n.slice(1, 5), cScale: n[5] / 100 };
});

export const ARCHETYPES = [
  ...ARCH_SPECS.map(({ id, name, mood, defaultStyle }) => ({ id, name, mood, defaultStyle })),
  { id: 'harmonic-wild', name: 'Harmonic Wildcard', mood: 'auto', defaultStyle: 'auto' },
];

export const COLLECTIONS = `burren-chalk|Limestone & Gorse|0 0 26 48 62 86 136 156 74 90 86 0
skellig-night|Atlantic Sapphire|2 2 202 236 302 344 254 284 256 284 138 14
antrim-basalt|Causeway Obsidian|2 2 224 262 48 76 210 245 235 265 13 0 3
boyne-solstice|Chamber Corona|1 2 24 58 46 78 348 378 36 64 124 0 0
wicklow-amber|Peat & Molten Gold|2 2 68 88 42 64 80 94 46 68 108 22
achill-dusk|Heather & Sea-Glass|2 1 222 268 318 358 48 82 252 286 126 0
dingle-horizon|Bay & Sunset Tangerine|1 1 218 256 24 54 282 326 228 268 118 0
connemara-lough|Jade & Teal Cusps|3 2 164 192 196 224 254 286 184 212 116 0
dawn-meadow|Dew & First Light|0 0 128 146 82 96 205 225 96 112 72 0
moss-stone|Lichen on Granite|0 1 125 145 86 100 225 250 220 245 74 0
peat-bog|Turf & Bog Cotton|2 2 38 58 118 136 72 88 42 60 92 8
gorse-hedgerow|Furze & Hawthorn|1 1 90 102 130 150 18 34 112 128 112 0
moher-slate|Cliff & Atlantic Foam|1 1 218 242 182 204 70 88 222 244 88 0
glen-shade|Fern & Rain|3 2 138 162 172 196 108 124 150 172 102 0
oak-canopy|Bark & Sunlit Leaf|2 2 48 66 118 140 100 116 52 70 104 12`.split('\n').map((r, i) => {
  const [id, tag, ns] = r.split('|'), n = ns.split(' ').map(Number), ap = n[12] ?? 6;
  return {
    id, group: i > 7 ? 'emerald' : 'coast',
    name: id === 'moss-stone' ? 'Moss & Stone' : id.replace(/(^|-)\w/g, (m) => m.replace('-', ' ').toUpperCase()),
    tag, style: STYLE_MODES[n[0]], mood: MOODS[n[1]],
    hues: [[n[2], n[3]], [n[4], n[5]], [n[6], n[7]]], baseH: [n[8], n[9]], cScale: n[10] / 100,
    poleLift: n[11] / 100, activePoles: ap || 6, topology: ap ? undefined : 'eclipse',
  };
});
export const ATLASES = COLLECTIONS;
export const ATLAS_GROUPS = [{ id: 'coast', name: 'Coast & Sky' }, { id: 'emerald', name: 'Emerald Isle' }];

export function solarPhase(date = new Date(), hourOverride = null) {
  const hour = isFin(hourOverride) ? ((hourOverride % 24) + 24) % 24 : date.getHours() + date.getMinutes() / 60;
  const t = (hour - 6) / 12, day = t >= 0 && t <= 1, nt = (((hour + 6) % 24) / 12) % 1;
  return { hour, x: day ? t : nt, elev: day ? sin(t * PI) : -sin(nt * PI) * 0.6, warmth: day ? 1 - abs(2 * t - 1) : 0, isNight: !day };
}

export function randomSeed() {
  const b = new Uint8Array(6);
  if (G.crypto?.getRandomValues) G.crypto.getRandomValues(b);
  else for (let i = 0; i < 6; i++) b[i] = (Math.random() * 256) | 0;
  return Array.from(b, (v) => ALPH[v & 31]).join('');
}

function rngOf(seed) {
  let a = hashSeed32(`sp:${seed}`) || 1;
  const nx = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = imul(a ^ (a >>> 15), 1 | a);
    t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  nx(); nx();
  return { R: (lo, hi) => lo + (hi - lo) * nx(), J: (c, s) => c + (nx() + nx() - 1) * s, P: (x) => x[(nx() * x.length) | 0], C: (p) => nx() < p, S: () => (nx() < 0.5 ? -1 : 1) };
}

export function oklchToOklab(L, C, h) {
  const l = clamp(+L || 0, 0, 1), c = max(0, +C || 0), r = wrapH(+h || 0) * DEG;
  return [l, c * cos(r), c * sin(r)];
}

const lms3 = (L, a, b) => [L + 0.3963378 * a + 0.2158038 * b, L - 0.1055613 * a - 0.0638542 * b, L - 0.0894842 * a - 1.2914855 * b].map((x) => x * x * x);
const dot9 = (M, v) => [0, 3, 6].map((k) => M[k] * v[0] + M[k + 1] * v[1] + M[k + 2] * v[2]);
const M_SRGB = [4.0767417, -3.3077116, 0.2309699, -1.268438, 2.6097574, -0.3413194, -0.0041961, -0.7034186, 1.7076147];
const M_P3 = [3.127769, -2.2571358, 0.1293668, -1.091009, 2.4133318, -0.3223227, -0.0260108, -0.5080413, 1.5340521];
export const oklabToLinearSrgb = (L, a, b) => dot9(M_SRGB, lms3(L, a, b));
export const oklabToLinearP3 = (L, a, b) => dot9(M_P3, lms3(L, a, b));

const inG = (c) => c[0] >= 0 && c[0] <= 1 && c[1] >= 0 && c[1] <= 1 && c[2] >= 0 && c[2] <= 1;
const gFit = (fn, L, C, h) => {
  const l = clamp(+L || 0, 0, 1);
  if (l <= 1e-4 || l >= 0.9999) return [l <= 1e-4 ? 0 : 1, 0, 0];
  const ct = max(0, +C || 0), r = wrapH(+h || 0) * DEG, ch = cos(r), sh = sin(r);
  if (inG(fn(l, ct * ch, ct * sh))) return [l, ct * ch, ct * sh];
  let lo = 0, hi = ct;
  for (let i = 0; i < 14; i++) { const m = 0.5 * (lo + hi); if (inG(fn(l, m * ch, m * sh))) lo = m; else hi = m; }
  return [l, lo * 0.999 * ch, lo * 0.999 * sh];
};
export const clampToGamutOklab = (L, C, h) => gFit(oklabToLinearSrgb, L, C, h);
export const clampToP3Oklab = (L, C, h) => gFit(oklabToLinearP3, L, C, h);

export const srgbEncode = (x) => { const c = clamp(x, 0, 1); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const dec = (u) => { const c = clamp(u, 0, 1); return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const b8 = (x) => clamp(round(srgbEncode(x) * 255), 0, 255);

export function oklabToSrgbHex(L, a, b) {
  const l = clamp(+L || 0, 0, 1), na = +a || 0, nb = +b || 0;
  let c = oklabToLinearSrgb(l, na, nb);
  if (!inG(c)) c = oklabToLinearSrgb(...clampToGamutOklab(l, hypot(na, nb), atan2(nb, na) / DEG));
  return `#${c.map((v) => b8(v).toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

const M_RL = [0.4122215, 0.5363325, 0.051446, 0.2119035, 0.6806995, 0.107397, 0.0883025, 0.2817188, 0.6299787];
const M_LL = [0.2104543, 0.7936178, -0.004072, 1.9779985, -2.4285922, 0.4505937, 0.025904, 0.7827718, -0.8086758];
const linLab = (c) => dot9(M_LL, dot9(M_RL, c).map((v) => cbrt(max(0, v))));
const hexB = (s) => {
  if (s[0] !== '#') return null;
  const h = s.slice(1);
  return /^[0-9a-f]{3,4}$/i.test(h) ? [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16))
    : /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h) ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : null;
};
const pVal = (t, r = 1) => (!t || t === 'none' ? 0 : t.endsWith('%') ? (+t.slice(0, -1) / 100) * r : +t);
const pAng = (t) => {
  if (!t || t === 'none') return 0;
  const m = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|turn|grad)?$/i), u = m?.[2]?.toLowerCase();
  return !m ? NaN : u === 'rad' ? +m[1] / DEG : u === 'turn' ? +m[1] * 360 : u === 'grad' ? +m[1] * 0.9 : +m[1];
};

export function parseColorToOklab(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim(), hb = hexB(s);
  if (hb) return linLab(hb.map((x) => dec(x / 255)));
  const m = s.match(/^([a-z]+)\(\s*([\s\S]*?)\s*\)$/i);
  if (!m) return null;
  const fn = m[1].toLowerCase(), b = m[2].split('/')[0].trim();
  const p = (b.includes(',') ? b.split(',') : b.split(/\s+/)).map((x) => x.trim()).filter(Boolean);
  if (p.length < 3) return null;
  if (fn === 'oklch') { const L = pVal(p[0]), C = pVal(p[1], 0.4), H = pAng(p[2]); return isFin(L + C + H) ? oklchToOklab(L, C, H) : null; }
  if (fn === 'oklab') { const L = pVal(p[0]), a = pVal(p[1], 0.4), c = pVal(p[2], 0.4); return isFin(L + a + c) ? [clamp(L, 0, 1), a, c] : null; }
  if (fn === 'rgb' || fn === 'rgba') { const c = p.slice(0, 3).map((x) => (x.endsWith('%') ? pVal(x) : pVal(x, 255) / 255)); return isFin(c[0] + c[1] + c[2]) ? linLab(c.map(dec)) : null; }
  if (fn === 'hsl' || fn === 'hsla') {
    const h = wrapH(pAng(p[0])) / 360, sat = clamp(pVal(p[1]), 0, 1), lig = clamp(pVal(p[2]), 0, 1);
    if (!isFin(h + sat + lig)) return null;
    const a = sat * min(lig, 1 - lig), f = (n) => { const k = (n + h * 12) % 12; return dec(lig - a * max(-1, min(k - 3, 9 - k, 1))); };
    return linLab([0, 8, 4].map(f));
  }
  return null;
}
export const srgbHexToOklab = parseColorToOklab;

const softRgb = (c) => {
  const rY = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], Y = rY > 0.88 ? 0.88 + (0.1199 * (rY - 0.88)) / (rY - 0.7601) : clamp(rY, 1e-4, 0.9999);
  const d = c.map((v) => v - rY), e = max(...d.map((v) => (v < 0 ? -v / Y : v / (1 - Y))));
  const sc = e > 0.82 ? (0.82 + (0.18 * (e - 0.82)) / (e - 0.64)) / e : 1;
  return d.map((v) => clamp(Y + v * sc, 0, 1));
};
export function parseCssColorBytes(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim(), hb = hexB(s);
  if (hb) return hb;
  const l = parseColorToOklab(s);
  return l && softRgb(oklabToLinearSrgb(...l)).map(b8);
}

const labY = (l) => { const c = softRgb(oklabToLinearSrgb(...l)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const toLch = ([L, a, b]) => { const c = hypot(a, b); return [L, c, c > 1e-5 ? wrapH(atan2(b, a) / DEG) : 0]; };
const qStep = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const crY = (a, b) => (max(a, b) + 0.05) / (min(a, b) + 0.05);

function evalField(ux, uy, { style, baseLab, poles, bloomLab, bloomPos, bloomRadius, bloomStrength, lighting }) {
  const sp = style === 'sphere', bW = sp ? 0.82 : 0.58;
  let sL = baseLab[0] * bW, sA = baseLab[1] * bW, sB = baseLab[2] * bW, sC = hypot(baseLab[1], baseLab[2]) * bW, tot = bW;
  for (const p of poles) {
    if (!p || p.weight <= 1e-4) continue;
    const dx = (ux - p.pos[0]) * 1.28, dy = (uy - p.pos[1]) * 0.96, ca = cos(p.angle || 0), sa = sin(p.angle || 0);
    const d = hypot((dx * ca + dy * sa) / max(0.08, abs(p.stretch?.[0] || 1)), (-dx * sa + dy * ca) / max(0.08, abs(p.stretch?.[1] || 1)));
    const rad = max(0.05, p.radius || 0.5), sf = clamp(p.softness ?? 0.6, 0.05, 1.6), rn = d / max(rad * 0.52, 0.04);
    const w = sp
      ? p.weight * ((1 - qStep((rn - (1 - (0.24 + 0.62 * sf) * 0.85)) / max(0.42 + 1.085 * sf, 1e-3))) * 0.78 + exp(-((max(rn, 1e-4) / (1.06 + 0.52 * sf)) ** 2.15)) * 0.3) * 2.45
      : p.weight * exp(-((max(d / max(rad * (0.41 + 0.23 * sf), 0.035), 1e-5)) ** 1.85)) * (style === 'caustic' ? 1.25 : 1.68);
    sL += p.lab[0] * w; sA += p.lab[1] * w; sB += p.lab[2] * w; sC += hypot(p.lab[1], p.lab[2]) * w; tot += w;
  }
  if (bloomStrength > 1e-4) {
    const bn = hypot((ux - bloomPos[0]) * 1.28, (uy - bloomPos[1]) * 0.96) / max(bloomRadius * 0.68, 0.05);
    const bw = bloomStrength * (0.62 * exp(-(max(bn, 1e-4) ** 1.65)) + 0.38 / (1 + bn * bn * 1.35)) * (sp ? 1.35 : 1.05);
    sL += bloomLab[0] * bw; sA += bloomLab[1] * bw; sB += bloomLab[2] * bw; sC += hypot(bloomLab[1], bloomLab[2]) * bw; tot += bw;
  }
  const bA = sA / tot, bB = sB / tot, cl = max(0, sC / tot - hypot(bA, bB)), rl = max(0, lighting?.scatterLift ?? 0.08);
  return [clamp(sL / tot + cl * (rl <= 0.22 ? rl * 3.2 : 0.704 + (rl - 0.22) * 0.85) - clamp(lighting?.vignette ?? 0, -0.25, 0.35) * qStep((((ux - 0.5) ** 2 + (uy - 0.5) ** 2) * 2.2 - 0.08) / 1.18), 0, 1), bA, bB];
}

export function sampleHeroGridLuminance(ctx, bounds = null) {
  const xs = bounds ? [bounds[0], 0.5 * (bounds[0] + bounds[2]), bounds[2]] : [0.2, 0.5, 0.8];
  const ys = bounds ? [bounds[1], 0.5 * (bounds[1] + bounds[3]), bounds[3]] : [0.2, 0.5, 0.8];
  const lumas = [];
  let midLab = [0.5, 0, 0];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const lab = evalField(xs[x], ys[y], ctx);
    if (x === 1 && y === 1) midLab = lab;
    lumas.push(labY(lab));
  }
  lumas.sort((a, b) => a - b);
  return { sorted: lumas, min: lumas[0], q1: lumas[2], median: lumas[4], q3: lumas[6], max: lumas[8], midLab };
}

export function computeUiTokens(ctx, baseHex, poles, swatches, focusBounds = null) {
  if (!baseHex && ctx?.poles) { baseHex = ctx.baseHex; poles = ctx.poles; swatches = ctx.paletteSwatches || []; focusBounds = ctx.focusRect || null; }
  const g = sampleHeroGridLuminance(ctx, focusBounds), bY = labY(ctx.baseLab);
  const wCr = min(crY(1, g.median), crY(1, g.q3)), sCr = min(crY(0.00882, g.median), crY(0.00882, g.q1)), oCr = min(crY(0.00192, g.median), crY(0.00192, g.q1));
  const ink = ctx.preferDark ? (wCr >= 4.5 || wCr >= oCr ? '#FFFFFF' : sCr >= 4.5 ? '#0F172A' : '#020617')
    : sCr >= 4.5 && crY(0.00882, bY) >= 4.5 ? '#0F172A'
    : oCr >= 4.5 && (ctx.hasCustomPalette || crY(0.00192, bY) >= 4.5) ? '#020617'
    : wCr >= oCr ? '#FFFFFF' : sCr >= 4.5 ? '#0F172A' : '#020617';
  const dk = ink === '#FFFFFF', [mr, mg, mb] = softRgb(oklabToLinearSrgb(...g.midLab)).map(b8);
  const mx = (c, t) => round(c * (dk ? 0.32 : 0.22) + t * (dk ? 0.68 : 0.78));
  let accent = swatches?.[1] || swatches?.[0] || baseHex, best = -1;
  for (const p of poles) if (p.weight > 0.01) {
    const sc = (hypot(p.lab[1], p.lab[2]) + 0.015) * (dk ? (p.lab[0] > 0.48 ? 1.2 : 0.7) : (p.lab[0] < 0.78 ? 1.2 : 0.75)) * p.weight;
    if (sc > best) { best = sc; accent = p.hex; }
  }
  return { theme: dk ? 'dark' : 'light', bg: baseHex, ink, inkMuted: dk ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 23, 42, 0.68)', glass: `rgba(${mx(mr, 10)}, ${mx(mg, 14)}, ${mx(mb, 24)}, ${dk ? 0.52 : 0.62})`, glassBorder: dk ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.10)', accent };
}

function sculpt(L, C, hDeg, mood) {
  let l = clamp(L, 0.06, 0.99), c = max(0, C), h = wrapH(hDeg);
  if (h > 92 && h < 146) { const m = 1 - abs(h - 119) / 27; if (mood === 'dark' || l < 0.72) { h += (h < 118 ? -22 : 28) * m; c *= 1 - 0.35 * m; } else c = min(c, 0.088 - 0.018 * m); }
  if (mood === 'dark' && c > 0.042 && h > 46 && h < 96 && l < 0.54) { const f = 1 - abs(h - 71) / 25; l = max(l, 0.5 + 0.08 * f); h -= 12 * f; }
  return [l, h > 308 && h < 336 && c > 0.16 ? c * (1 - 0.12 * (1 - abs(h - 322) / 14)) : c, wrapH(h)];
}

function bridgeOf(hA, hB, mood) {
  const a = wrapH(hA), d = ((wrapH(hB) - a + 540) % 360) - 180, m1 = wrapH(a + d * 0.5), m2 = wrapH(m1 + 180);
  const sc = (h) => (h >= 95 && h <= 165 ? -2 * (1 - abs(h - 130) / 35) : 0) + (h >= 300 || h <= 25 ? 1.1 : 0) + (mood === 'light' && h >= 40 && h <= 82 ? 1.25 : 0) + (mood === 'dark' && ((h >= 210 && h <= 285) || (h >= 38 && h <= 78)) ? 0.9 : 0);
  return abs(d) > 125 ? (sc(m1) >= sc(m2) ? m1 : m2) : abs(d) > 85 && m1 > 105 && m1 < 145 ? m2 : m1;
}

const BANDS = {
  light: [[0.78, 0.86, 0.12, 0.16], [0.78, 0.86, 0.11, 0.15], [0.84, 0.9, 0.09, 0.13], [0.85, 0.91, 0.06, 0.1], [0.91, 0.95, 0.035, 0.064], [0.94, 0.97, 0.014, 0.032]],
  split: [[0.62, 0.69, 0.14, 0.19], [0.7, 0.79, 0.14, 0.19], [0.73, 0.82, 0.1, 0.15], [0.76, 0.85, 0.1, 0.14], [0.87, 0.92, 0.04, 0.07], [0.93, 0.96, 0.012, 0.026]],
  dark: [[0.38, 0.5, 0.15, 0.2, 1], [0.42, 0.56, 0.15, 0.2, 0.5], [0.52, 0.66, 0.12, 0.16, 0.8], [0.28, 0.4, 0.1, 0.14], [0.3, 0.43, 0.09, 0.13], [0.16, 0.22, 0.034, 0.066]],
};

function synthChord(rng, mood, h, cScale = 1, bHue = null, lift = 0, eclipse = false) {
  const bh = bridgeOf(h[0], h[1], mood), mc = min(1, cScale), dk = mood === 'dark';
  if (eclipse) {
    const base = dk ? [rng.R(0.08, 0.105), rng.R(0.01, 0.022), bHue ?? h[0]] : [rng.R(0.955, 0.975), 0.014, h[0]];
    const ls = dk ? [0.6, 0.72, 0.72, 0.84, 0.46, 0.58, 0.34, 0.46] : [0.74, 0.83, 0.8, 0.88, 0.78, 0.86, 0.89, 0.94];
    const cs = [[0.17, 0.2, h[0]], [0.14, 0.18, h[1]], [0.14, 0.18, h[2]], [0.08, 0.11, bh]];
    return { base, bloom: sculpt(dk ? rng.R(0.7, 0.82) : rng.R(0.97, 0.99), 0.145 * cScale, h[1], mood), bridgeHue: bh, poles: [[dk ? clamp(base[0] - 0.012, 0.062, 0.098) : rng.R(0.935, 0.962), base[1] * 0.85, base[2]], ...cs.map((r, i) => sculpt(rng.R(ls[i * 2], ls[i * 2 + 1]), rng.R(r[0], r[1]) * cScale, r[2], mood)), base] };
  }
  const base = mood === 'light' ? [rng.R(0.964, 0.98), rng.R(0.007, 0.016) * mc, bHue ?? (rng.C(0.65) ? rng.R(58, 96) : h[0])]
    : mood === 'split' ? [rng.R(0.84, 0.89), rng.R(0.02, 0.042) * mc, bHue ?? rng.P([rng.R(220, 284), rng.R(48, 86), rng.R(182, 224)])]
    : [rng.R(0.098, 0.138), rng.R(0.014, 0.034) * mc, bHue ?? rng.P([rng.R(220, 298), rng.R(35, 75), rng.R(165, 205)])];
  const bloom = dk ? sculpt(rng.R(0.54, 0.66) + lift * 0.6, rng.R(0.105, 0.148) * cScale, h[2], 'dark') : [rng.R(mood === 'light' ? 0.981 : 0.954, mood === 'light' ? 0.991 : 0.978), rng.R(0.01, 0.022) * mc, bh];
  const hs = [h[0], h[1], h[2], h[3], bh, base[2]];
  return { base, bloom, bridgeHue: bh, poles: BANDS[mood].map((r, i) => sculpt(rng.R(r[0], r[1]) + (r[4] || 0) * lift, rng.R(r[2], r[3]) * cScale, hs[i], mood)) };
}

const ANCHORS = [[-0.28, 0.18, 0.82, 0.6, 1.16], [0.28, -0.18, 0.8, 0.6, 1.14], [-0.22, -0.2, 0.64, 0.65, 0.86], [0.24, 0.2, 0.62, 0.67, 0.82], [0, -0.02, 0.68, 0.78, 0.7], [-0.08, 0.32, 0.64, 0.82, 0.58]];

function choreo(rng, gKey, col) {
  const ang = rng.R(-PI, PI), dx = cos(ang), dy = sin(ang), cl = (v, m) => clamp(v, m, 1 - m);
  if (col?.topology === 'eclipse' && gKey === 'sphere') {
    const cx = rng.J(0.5, 0.05), cy = rng.J(0.48, 0.05), cr = rng.R(0.66, 0.82);
    return [
      [[cx - dx * 0.038, cy - dy * 0.038, cr * rng.R(0.58, 0.66), 0.34, 1, 1, 0, 1.35], [cx, cy, cr, 0.56, 1, 1, ang, 1.26], [cl(cx + dx * cr * 0.36, 0.12), cl(cy + dy * cr * 0.36, 0.12), 0.5, 0.52, 1.14, 0.95, ang, 1.06], [cl(cx - dx * cr * 0.3, 0.1), cl(cy - dy * cr * 0.3, 0.1), 0.64, 0.7, 1, 1, -ang, 0.73], [cl(cx - dy * 0.22, 0.08), cl(cy + dx * 0.22, 0.08), 0.68, 0.8, 1.18, 0.9, ang + 1.57, 0.55], [cx, cy, 0.95, 0.95, 1, 1, 0, 0]],
      [cl(cx + dx * 0.1, 0.16), cl(cy + dy * 0.1, 0.16)], rng.R(0.52, 0.78),
      { scale: rng.R(0.48, 0.76), amount: rng.R(0.03, 0.065), foldStrength: 0, phase: [rng.R(-48, 48), rng.R(-48, 48)], flowAngle: ang },
    ];
  }
  const sp = gKey === 'sphere', sk = gKey === 'silk' || gKey === 'caustic', ca = gKey === 'caustic', ls = rng.S(), lim = col?.activePoles ?? 6;
  const poles = ANCHORS.map((a, i) => {
    const u = a[0] + rng.J(0, 0.09), v = a[1] * ls + rng.J(0, 0.09);
    const x = clamp(0.5 + u * dx - v * dy, -0.14, 1.14), y = clamp(0.5 + u * dy + v * dx, -0.14, 1.14);
    const pa = sp ? rng.R(-PI, PI) : ang + (ca ? (i % 2 ? -0.32 : 0.32) : 0) + rng.J(0, sk ? 0.22 : 0.45);
    return [x, y, clamp(a[2] * (sk ? 0.84 : 1) + rng.J(0, 0.12), 0.42, 1.05), clamp(a[3] * (ca ? 0.8 : 1) + rng.J(0, 0.14), 0.36, 1.04), sp ? rng.R(0.96, 1.06) : sk ? rng.R(1.42, 1.94) : rng.R(1.14, 1.46), sp ? rng.R(0.96, 1.06) : sk ? rng.R(0.64, 0.88) : rng.R(0.76, 0.96), atan2(sin(pa), cos(pa)), i < lim ? clamp(a[4] + rng.J(0, 0.12), 0.38, 1.3) : 0];
  });
  return [
    poles, [clamp(0.5 + rng.J(0, 0.16), 0.12, 0.88), clamp(0.38 + rng.J(0, 0.12), 0.12, 0.84)], rng.R(0.5, 0.92),
    { scale: sp ? rng.R(0.46, 0.84) : sk ? rng.R(0.9, 1.6) : rng.R(0.62, 1.06), amount: sp ? rng.R(0.032, 0.088) : sk ? rng.R(0.34, 0.53) : rng.R(0.24, 0.4), foldStrength: sp ? 0 : ca ? rng.R(0.34, 0.54) : sk ? rng.R(0.3, 0.47) : rng.R(0.05, 0.125), phase: [rng.R(-48, 48), rng.R(-48, 48)], flowAngle: ang },
  ];
}

export function generateScene({ seed, style = 'auto', mode, mood = 'system', archetype, harmony, collection, atlas, colors = null, colorScheme = null, lockGeometrySeed = true, solar = false, solarHour = null, gamut = 'auto', focusRect = null } = {}) {
  const sd = typeof seed === 'string' && seed.trim() ? seed.trim().toUpperCase() : randomSeed();
  const rng = rngOf(sd), reqArch = harmony ?? archetype ?? 'auto', colId = normalizeAtlasId(collection ?? atlas ?? null);
  const col = colId ? COLLECTIONS.find((c) => c.id === colId) || null : null;
  const cLabs = isArr(colors) ? colors.map(parseColorToOklab).filter(Boolean) : [], hasCustomPalette = cLabs.length >= 2;
  const rawM = typeof mood === 'string' ? mood.trim().toLowerCase() : 'system';
  const stC = String(mode ?? style ?? 'auto').trim().toLowerCase(), reqSt = STYLE_MODES.includes(stC) ? stC : 'auto';
  const resGamut = gamut === 'p3' || (gamut === 'auto' && detectDisplayP3()) ? 'p3' : 'srgb', gClamp = resGamut === 'p3' ? clampToP3Oklab : clampToGamutOklab;
  const sch = rawM === 'system' ? (colorScheme === 'dark' || colorScheme === 'light' ? colorScheme : col && colorScheme == null ? null : detectColorScheme()) : rawM === 'daylight' ? 'light' : null;
  const reqM = MOODS.includes(rawM) ? rawM : sch === 'dark' ? 'dark' : sch === 'light' ? 'daylight' : 'any';

  let meta = !hasCustomPalette && !col && reqArch && reqArch !== 'auto' && reqArch !== 'harmonic-wild' ? ARCH_SPECS.find((a) => a.id === reqArch) || null : null;
  let wild = !hasCustomPalette && !col && reqArch === 'harmonic-wild';
  const resMood = MOODS.includes(reqM) ? reqM
    : hasCustomPalette ? (cLabs[0][0] < 0.38 || (cLabs.length >= 3 ? cLabs.slice(1) : cLabs).reduce((s, c) => s + c[0], 0) / max(1, cLabs.length >= 3 ? cLabs.length - 1 : cLabs.length) < 0.5 ? 'dark' : cLabs[1][0] > 0.78 ? 'light' : 'split')
    : col ? (reqM === 'daylight' ? (col.mood === 'split' ? 'split' : 'light') : rawM === 'any' ? rng.P(MOODS) : col.mood || 'dark')
    : meta ? meta.mood : reqM === 'daylight' ? (rng.C(0.6) ? 'light' : 'split') : rng.P(MOODS);

  if (!hasCustomPalette && !col && !meta && !wild) { if (rng.C(0.34)) wild = true; else meta = rng.P(ARCH_SPECS.filter((a) => a.mood === resMood)); }
  const sRng = lockGeometrySeed ? rngOf(`${sd}:st`) : rng;
  const resStyle = reqSt !== 'auto' ? reqSt : col ? col.style : reqArch !== 'auto' && meta ? meta.defaultStyle : !lockGeometrySeed && meta && sRng.C(0.55) ? meta.defaultStyle : sRng.P(STYLE_MODES);

  let archetypeId, archetypeName, rawBase, rawBloom, bridgeHue, rawPoles;
  if (hasCustomPalette) {
    archetypeId = 'custom-palette'; archetypeName = 'Custom Brand Palette';
    let lch = cLabs.map(toLch);
    if (lch.length === 2) lch = [0.5 * (lch[0][0] + lch[1][0]) < 0.48 ? [0.14, 0.025, lch[0][2]] : [0.968, 0.014, bridgeOf(lch[0][2], lch[1][2], resMood)], lch[0], lch[1]];
    rawBase = lch[0];
    const h = lch.slice(1), p0 = h[0], p1 = h[1 % h.length], avg = h.reduce((s, c) => s + c[0], 0) / h.length;
    bridgeHue = bridgeOf(p0[2], p1[2], resMood);
    rawBloom = [resMood === 'dark' || avg < 0.52 ? clamp(max(p0[0], p1[0]) + 0.1, 0.28, 0.62) : 0.965, min(0.035, (p0[1] + p1[1]) * 0.2), bridgeHue];
    rawPoles = [p0, p1, h[2] || [clamp(p0[0] + 0.08, 0.18, 0.92), p0[1] * 0.78, wrapH(p0[2] + 16)], h[3] || [clamp(p1[0] + 0.08, 0.18, 0.92), p1[1] * 0.78, wrapH(p1[2] - 16)], [clamp((p0[0] + p1[0]) * 0.5 + 0.08, 0.22, 0.94), min(0.065, (p0[1] + p1[1]) * 0.35), bridgeHue], rawBase];
  } else if (col) {
    archetypeId = col.id; archetypeName = col.name;
    const cr = rngOf(`${sd}:c:${col.id}:${resMood}`), bd = (b) => wrapH(cr.R(b[0], b[1])), h0 = bd(col.hues[0]);
    ({ base: rawBase, bloom: rawBloom, bridgeHue, poles: rawPoles } = synthChord(cr, resMood, [h0, bd(col.hues[1]), bd(col.hues[2]), wrapH(h0 + cr.J(0, 18))], col.cScale, bd(col.baseH), col.poleLift, col.topology === 'eclipse'));
  } else if (meta && !wild) {
    archetypeId = meta.id; archetypeName = meta.name;
    const ar = rngOf(`${sd}:a:${meta.id}:${resMood}`), sh = ar.J(0, 9);
    ({ base: rawBase, bloom: rawBloom, bridgeHue, poles: rawPoles } = synthChord(ar, resMood, meta.h.map((v) => wrapH(v + sh + ar.J(0, 5))), meta.cScale));
  } else {
    archetypeId = 'harmonic-wild'; archetypeName = 'Harmonic Wildcard';
    const wr = rngOf(`${sd}:w:${resMood}`), ct = wr.P([0, 1, 2, 3]), h0 = ct === 3 ? wr.R(210, 265) : wr.R(0, 360);
    const h1 = ct === 3 ? wr.R(42, 78) : wrapH(h0 + (ct === 0 || resMood === 'split' ? wr.R(135, 205) : wr.R(36, 110) * wr.S()));
    ({ base: rawBase, bloom: rawBloom, bridgeHue, poles: rawPoles } = synthChord(wr, resMood, [h0, h1, wrapH(h0 + wr.J(0, 26)), wrapH(h1 + wr.J(0, 24))], ct === 3 ? 0.14 : 1));
  }

  let baseLab = rLab(gClamp(...rawBase)), bloomLab = rLab(gClamp(...rawBloom));
  const sun = solar && col?.topology !== 'eclipse' ? solarPhase(new Date(), solarHour) : null;
  if (sun) {
    const wH = sun.isNight ? 232 : 48 + sun.elev * 22, wA = sun.isNight ? 0.35 : 0.22 + sun.warmth * 0.45, [bL, bC, bH] = toLch(bloomLab);
    bloomLab = rLab(gClamp(clamp(bL + (sun.isNight ? -0.06 : sun.elev * 0.03), 0.15, 0.992), max(0.01, bC * (1 + wA * 0.5)), wrapH(bH + (atan2(sin((wH - bH) * DEG), cos((wH - bH) * DEG)) / DEG) * wA)));
  }

  const bridgeDir = [r4(cos(bridgeHue * DEG)), r4(sin(bridgeHue * DEG))];
  const gKey = resStyle === 'fluted' || resStyle === 'prism' ? 'sphere' : resStyle === 'topo' ? 'mesh' : resStyle;
  const [pLay, bBp, bRad, wp] = choreo(lockGeometrySeed ? rngOf(`${sd}:g:${gKey}:${col?.id || 0}`) : rng, gKey, col);
  const er = rngOf(`${sd}:e:${resMood}`);
  const bloomPos = sun ? [r4(0.18 + sun.x * 0.64), r4(sun.isNight ? 0.58 + abs(sun.elev) * 0.1 : 0.62 - sun.elev * 0.48)] : [r4(clamp(bBp[0] + (resMood === 'dark' ? 0.03 : -0.02), 0.06, 0.94)), r4(clamp(bBp[1] + (resMood === 'dark' ? 0.07 : -0.05), 0.06, 0.94))];
  let bloomStrength = r4(sun ? (sun.isNight ? 0.22 + abs(sun.elev) * 0.1 : 0.3 + sun.elev * 0.42) : er.R(resMood === 'dark' ? 0.18 : 0.32, resMood === 'dark' ? 0.38 : 0.72));
  const bloomRadius = r4(clamp(bRad, 0.4, 1.05));

  const fb = pFocus(focusRect);

  const poles = pLay.map((g, i) => {
    const lab = rLab(gClamp(...rawPoles[i])), px = r4(g[0]), py = r4(g[1]), radius = r4(clamp(g[2], 0.3, 1.15));
    let weight = clamp(g[7], 0, 1.35);
    if (fb && weight > 0) {
      const d = hypot(max(fb[0] - px, 0, px - fb[2]), max(fb[1] - py, 0, py - fb[3])), rc = radius * 0.7;
      if (d < rc) weight *= 1 - (1 - d / max(rc, 1e-4)) * clamp(hypot(lab[1], lab[2]) * 2.6 + (resMood === 'dark' ? max(0, lab[0] - 0.34) : max(0, 0.84 - lab[0])) * 1.45, 0.28, 1) * 0.72;
    }
    return { lab, hex: oklabToSrgbHex(...lab), pos: [px, py], radius, softness: r4(clamp(g[3], 0.3, 1.15)), stretch: [r4(g[4]), r4(g[5])], angle: r4(g[6]), weight: r4(weight) };
  });

  const lr = rngOf(`${sd}:l:${resMood}`);
  const [s0, s1, c0, c1, v0, v1] = resMood === 'light' ? [0.085, 0.145, 0.36, 0.58, -0.04, 0.025] : resMood === 'split' ? [0.1, 0.158, 0.46, 0.68, -0.02, 0.055] : [0.042, 0.076, 0.36, 0.62, 0.035, 0.095];
  const lighting = { scatterLift: r4(lr.R(s0, s1)), chromaPreserve: r4(lr.R(c0, c1)), vignette: r4(lr.R(v0, v1)), grain: r4(lr.R(0.02, 0.0255)) };

  const fCtx = { style: resStyle, baseLab, poles, bloomLab, bloomPos, bloomRadius, bloomStrength, lighting, hasCustomPalette, preferDark: resMood === 'dark' };
  let grid = sampleHeroGridLuminance(fCtx, fb);
  if (hasCustomPalette && resMood !== 'dark') fCtx.preferDark = grid.median <= 0.1833;
  const shift = (lab, dL, lo, hi, cm = 1) => { const [L, C, H] = toLch(lab); return rLab(gClamp(clamp(L + dL, lo, hi), C * cm, H)); };
  for (let st = 0; st < 6; st++) {
    const dk = fCtx.preferDark, fl = hasCustomPalette ? 0.188 : 0.222;
    if (dk ? grid.q3 <= 0.18 && grid.median <= 0.18 : grid.q1 >= fl && grid.median >= fl) break;
    for (const p of poles) if (p.weight > 1e-3 && (dk ? p.lab[0] > 0.42 : p.lab[0] < 0.76)) { p.lab = shift(p.lab, dk ? -0.055 : 0.055, 0.32, 0.82, dk ? 1 : 0.96); p.hex = oklabToSrgbHex(...p.lab); }
    if (dk && bloomLab[0] > 0.52) { bloomLab = fCtx.bloomLab = shift(bloomLab, -0.07, 0.42, 0.99); fCtx.bloomStrength = bloomStrength = r4(max(0.15, bloomStrength * 0.85)); }
    if (hasCustomPalette && (dk ? baseLab[0] > 0.52 : baseLab[0] < 0.62)) baseLab = fCtx.baseLab = shift(baseLab, dk ? -0.12 : 0.07, 0.38, 0.76, dk ? 1 : 0.95);
    grid = sampleHeroGridLuminance(fCtx, fb);
  }

  const baseHex = oklabToSrgbHex(...baseLab), bloomHex = oklabToSrgbHex(...bloomLab);
  const cands = [baseHex, ...poles.filter((p) => p.weight > 0.01).sort((x, y) => y.weight * y.radius - x.weight * x.radius).map((p) => p.hex), bloomHex];
  const paletteSwatches = [...new Set(cands)];
  while (paletteSwatches.length < 4) paletteSwatches.push(baseHex);
  paletteSwatches.length = min(5, paletteSwatches.length);
  const uiTokens = computeUiTokens(fCtx, baseHex, poles, paletteSwatches, fb);

  return {
    seed: sd, style: resStyle, mode: resStyle, mood: resMood, gamut: resGamut,
    collection: col ? col.id : null, atlas: col ? col.id : null, focusRect: fb,
    solar: sun ? { hour: r4(sun.hour), x: r4(sun.x), elev: r4(sun.elev), isNight: sun.isNight } : null,
    archetypeId, archetypeName, isDark: uiTokens.theme === 'dark',
    baseLab, baseHex, bloomLab, bloomHex, bloomPos, bloomRadius, bloomStrength: r4(clamp(bloomStrength, 0.15, 0.85)),
    bridgeDir, poles, paletteSwatches, swatches: paletteSwatches, uiTokens,
    warp: { scale: r4(wp.scale), amount: r4(wp.amount), foldStrength: r4(wp.foldStrength), phase: [r4(wp.phase[0]), r4(wp.phase[1])], flowAngle: r4(wp.flowAngle) },
    lighting,
  };
}

export function buildInlineCssLayers(s) {
  if (!s) return [];
  const R = Math.round, mk = (rx, ry, p, h, a, d) => { const c = parseCssColorBytes(h || s.baseHex) || [128, 128, 128]; return `radial-gradient(ellipse ${rx}% ${ry}% at ${R((p?.[0] ?? 0.5) * 100)}% ${R((p?.[1] ?? d) * 100)}% in oklab,rgba(${c[0]},${c[1]},${c[2]},${a}) 0%,rgba(${c[0]},${c[1]},${c[2]},0) 100%)`; };
  const out = (s.poles || []).filter((p) => (p.weight ?? 1) > 0.04).map((p) => {
    const br = clamp((p.radius ?? 0.65) * 68, 24, 92), [sx = 1, sy = 1] = p.stretch || [], ux = max(0.25, abs(sx)), uy = max(0.25, abs(sy)), ca = cos(p.angle ?? 0), sa = sin(p.angle ?? 0);
    return mk(R(clamp(br * hypot(ux * ca, uy * sa), 18, 125)), R(clamp(br * hypot(ux * sa, uy * ca), 18, 125)), p.pos, p.hex, R(clamp((p.weight ?? 1) * 0.68, 0.16, 0.88) * 100) / 100, 0.5);
  });
  const br = R(clamp((s.bloomRadius ?? 0.65) * 74, 34, 96));
  out.splice(min(2, out.length), 0, mk(br, br, s.bloomPos, s.bloomHex, R(clamp((s.bloomStrength ?? 0.45) * 0.64, 0.12, 0.62) * 100) / 100, 0.4));
  return out;
}

export function buildInlineCssBackground(scene) {
  if (!scene) return '';
  const bh = scene.baseHex || '#F5F4F0', ls = buildInlineCssLayers(scene);
  return ls.length ? `${ls.join(',')},${bh}` : bh;
}

const pBool = (v, fb = false) => (v == null || v === '' ? fb : typeof v === 'boolean' ? v : /^(true|1|yes|on)$/i.test(String(v).trim()) ? true : /^(false|0|no|off)$/i.test(String(v).trim()) ? false : fb);
const pNum = (v, fb) => (v == null || v === '' ? fb : isFin(+v) ? +v : fb);
const pFocus = (v) => {
  const a = (isArr(v) ? v : typeof v === 'string' ? v.split(/[,\s]+/) : []).map(Number);
  if (a.length < 4 || !a.slice(0, 4).every(isFin)) return null;
  const x0 = clamp(min(a[0], a[2]), 0, 1), y0 = clamp(min(a[1], a[3]), 0, 1), x1 = clamp(max(a[0], a[2]), 0, 1), y1 = clamp(max(a[1], a[3]), 0, 1);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
};
const splitCols = (v) => {
  if (!v) return [];
  const o = [];
  let d = 0, c = '';
  for (const ch of v) {
    if (ch === '(') d++; else if (ch === ')') d = max(0, d - 1);
    if (ch === ',' && !d) { if (c.trim()) o.push(c.trim()); c = ''; } else c += ch;
  }
  if (c.trim()) o.push(c.trim());
  return o;
};
function packScene(scn, sc, tm, ptr, wAmt, gSc, mfW, mfH, mx, my, tile, p3, U, P) {
  const bL = scn.baseLab || [0.95, 0, 0], bmL = scn.bloomLab || bL, [px0 = 0, py0 = 0] = ptr;
  const [bx = 0.5, by = 0.4] = scn.bloomPos || [], bps = 0.055 * max(wAmt, 0.25), sbx = bx + px0 * bps, sby = by + py0 * bps;
  const [bdx = 0, bdy = 1] = scn.bridgeDir || [], wp = scn.warp || {}, [phx = 0, phy = 0] = wp.phase || [], fa = wp.flowAngle ?? 0, fc = cos(fa), fs = sin(fa), sw = sin(tm * 0.21) * 0.045, lt = scn.lighting || {};
  const gs = max(0, isFin(gSc) ? gSc : 1), rg = max(0, isFin(lt.grain) ? lt.grain : 0.026);
  const gr = gs ? max(1 / 255, (rg <= 0.065 ? rg : 0.065 + 0.03 * tanh((rg - 0.065) * 2.5)) * gs) : 0;
  U.set([mfW, mfH, mx, my, scn._darkFactor ?? +!!scn.isDark, tm, !tile && p3 ? 1 : 0, gr, bL[0], bL[1], bL[2], wAmt, bmL[0], bmL[1], bmL[2], max(0, scn.bloomStrength ?? 0.5), sbx, sby, 1 / max((scn.bloomRadius ?? 0.65) * 0.68, 0.05), wp.foldStrength ?? 0, phx, phy, wp.scale ?? 1.35, wp.amount ?? 0.24, fc, fs, fc * tm * 0.055 - fs * sw, fs * tm * 0.055 + fc * sw, bdx, bdy, px0, py0, lt.scatterLift ?? 0.42, lt.chromaPreserve ?? 0.78, lt.vignette ?? 0.25, 0, tile ? tile.tx : 0, tile ? mfH - tile.ty - (tile.th || mfH) : 0]);
  const poles = scn.poles || [], hasT = abs(tm) > 1e-5, pWh = max(wAmt, 0.35);
  for (let i = 0; i < 6; i++) {
    const b = i * 16, p = poles[i];
    if (p && (p.weight ?? 1) > 1e-4) {
      const lb = p.lab || bL, [ox = 0.5, oy = 0.5] = p.pos || [], [sx = 1, sy = 1] = p.stretch || [], dp = (0.006 + 0.0028 * i) * pWh;
      let dmx = 0, dmy = 0;
      if (hasT) { const rt = 0.17 + 0.031 * i, phi = i * 2.0943951, amp = 0.022 + 0.004 * i; dmx = sin(tm * rt + phi) * amp; dmy = cos(tm * rt * 0.83 + phi) * amp; }
      const px = ox + dmx + px0 * dp, py = oy + dmy + py0 * dp, rad = max(p.radius ?? 0.4, 0.05), soft = clamp(p.softness ?? 0.65, 0.05, 1.6), ang = p.angle ?? 0;
      P[b] = lb[0]; P[b + 1] = lb[1]; P[b + 2] = lb[2]; P[b + 3] = p.weight ?? 1; P[b + 4] = px; P[b + 5] = py;
      if (sc === 1) {
        const sr = max(rad * 0.52, 0.04), bw = 0.24 + 0.62 * soft, tbx = (sbx - px) * mx, tby = (sby - py) * my, tbl = hypot(tbx, tby), ils = 1 / max(sr * (1.08 + 0.38 * soft), 0.04);
        P[b + 6] = 1 / sr; P[b + 7] = 1 / (1.06 + 0.52 * soft); P[b + 12] = 1 - bw * 0.85; P[b + 13] = 1 / max(1.75 * bw, 1e-3);
        P[b + 14] = (tbl > 1e-3 ? tbx / tbl : 0) * ils; P[b + 15] = (tbl > 1e-3 ? tby / tbl : -1) * ils;
      } else {
        P[b + 6] = 1 / max(rad * (sc === 2 ? 0.44 + 0.24 * soft : sc === 3 ? 0.42 + 0.24 * soft : 0.4 + 0.22 * soft), 0.035);
        P[b + 7] = soft; P[b + 12] = sc === 2 ? clamp(1.98 - 0.42 * soft, 1.38, 2.2) : sc === 3 ? 1.78 : clamp(2.1 - 0.5 * soft, 1.35, 2.28);
        P[b + 13] = P[b + 14] = P[b + 15] = 0;
      }
      P[b + 8] = 1 / max(0.08, abs(sx)); P[b + 9] = 1 / max(0.08, abs(sy));
      P[b + 10] = cos(ang); P[b + 11] = sin(ang);
    } else P[b + 3] = 0;
  }
}
export const _p = { pBool, pNum, pFocus, splitCols, packScene };

export function parsePresetUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return {};
  const raw = rawUrl.trim(), m = new URLSearchParams();
  const add = (s) => { const c = s?.replace(/^[?#]+/, ''); if (c) for (const [k, v] of new URLSearchParams(c)) m.set(k, v); };
  try {
    if (raw.includes('://')) { const u = new URL(raw); add(u.search); add(u.hash); }
    else { const [b, a] = raw.split('#'); if (b && (b.includes('=') || b[0] === '?')) add(b); if (a) add(a); }
  } catch { add(raw); }
  const o = {}, g = (k) => m.get(k)?.trim(), h = (k) => m.has(k);
  const pv = (g('preview') || g('view') || '').toLowerCase();
  if (/^(website|wallpaper|canvas)$/.test(pv)) o.preview = pv;
  if (g('seed') && !/^(auto|random)$/i.test(g('seed'))) o.seed = g('seed').toUpperCase();
  const md = (g('mode') || g('style') || '').toLowerCase();
  if (md) o.style = o.mode = md;
  if (g('mood')) o.mood = g('mood').toLowerCase();
  const hm = g('harmony') || g('arch') || g('archetype');
  if (hm) o.harmony = hm;
  const col = normalizeAtlasId(g('atlas') ?? g('collection') ?? g('col'));
  if (col) o.atlas = o.collection = col;
  if (g('grain') && isFin(+g('grain'))) o.grain = +g('grain');
  if (h('motion')) o.motion = pBool(g('motion'), false);
  const lt = g('light') ?? g('whisper') ?? g('solas');
  if (lt !== undefined) o.lightFollow = !lt || /^(1|true|on|yes)$/i.test(lt) ? true : /^(0|false|off|no)$/i.test(lt) ? false : isFin(+lt) ? +lt : true;
  if (h('solar')) o.solar = pBool(g('solar'), true);
  if (g('hour') && isFin(+g('hour'))) { o.solarHour = +g('hour'); if (!h('solar')) o.solar = true; }
  if (g('colors')) { const ls = splitCols(g('colors')); if (ls.length > 1) o.colors = ls; }
  const gm = g('gamut')?.toLowerCase();
  if (GAMUT_MODES.includes(gm)) o.gamut = gm;
  const fr = h('focus') && pFocus(g('focus'));
  if (fr) o.focusRect = fr;
  return o;
}

export function getSphereTokensAndCss(o = {}) {
  const cl = {};
  for (const [k, v] of Object.entries(o || {})) if (v !== undefined) cl[k] = v;
  const scene = cl.scene || generateScene({ ...(cl.url || cl.preset ? parsePresetUrl(cl.url || cl.preset) : null), ...cl });
  return { tokens: scene.uiTokens, cssBackground: buildInlineCssBackground(scene), theme: scene.uiTokens.theme, scene };
}
