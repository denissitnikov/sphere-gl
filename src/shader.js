export const STYLE_MAP = {
  mesh: 0,
  sphere: 1,
  silk: 2,
  caustic: 3,
};

export function styleToIndex(style) {
  return STYLE_MAP[style] ?? 0;
}

const MOOD_MAP = {
  light: 0,
  split: 1,
  dark: 2,
};

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

out vec2 v_uv;

void main() {
    float x = (gl_VertexID == 1) ? 3.0 : -1.0;
    float y = (gl_VertexID == 2) ? 3.0 : -1.0;
    // Top-left (0, 0) to bottom-right (1, 1) CSS UV space
    v_uv = vec2(0.5 * (x + 1.0), 0.5 * (1.0 - y));
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
out vec4 fragColor;

// xy = framebuffer px, zw = isotropic metric scale (width/ref, height/ref)
uniform vec4 u_viewport;
// x = style (0=mesh, 1=sphere, 2=silk, 3=caustic), y = isDark (0..1), z = time, w = mood
uniform vec4 u_modeTime;
uniform vec3 u_baseLab;
uniform vec3 u_bloomLab;
// xy = bloomPos, z = bloomRadius, w = bloomStrength
uniform vec4 u_bloomGeom;
// xy = bridgeDir (unit OKLab a,b), zw = pointer (-1..1)
uniform vec4 u_bridgePointer;
// xy = warp.phase, z = warp.scale, w = warp.amount
uniform vec4 u_warpParams;
// xy = flowDir (cos, sin), z = foldStrength, w = whisperAmt
uniform vec4 u_flowFold;
// x = scatterLift, y = chromaPreserve, z = vignette, w = effectiveGrain
uniform vec4 u_lighting;
uniform uint u_grainSeed;

// (L, a, b, weight), (posX, posY, radius, softness), (invSx, invSy, cosA, sinA)
uniform vec4 u_poleLabWeight[6];
uniform vec4 u_polePosRadSoft[6];
uniform vec4 u_poleTransform[6];

vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289_3(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289_2(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
    return 130.0 * dot(m, g);
}

// Quintic C2 step avoids second-derivative Mach bands on wide optical blurs
float smootherstep01(float x) {
    float t = clamp(x, 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Björn Ottosson OKLab -> linear sRGB
vec3 oklabToLinearSRGB(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    float l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return vec3(
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

// C1 soft-shoulder gamut compression toward perceptual luminance Y
vec3 softGamutCompress(vec3 rgb) {
    float rawY = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    float Y = clamp(rawY, 1e-4, 0.9999);
    if (rawY > 0.88) {
        float excess = rawY - 0.88;
        Y = 0.88 + 0.1199 * (excess / (excess + 0.1199));
    }
    vec3 chroma = rgb - vec3(rawY);
    vec3 eVec = max(max(vec3(0.0), -chroma) / Y, max(vec3(0.0), chroma) / (1.0 - Y));
    float e = max(eVec.r, max(eVec.g, eVec.b));
    if (e > 0.82) {
        float x = e - 0.82;
        chroma *= (0.82 + 0.18 * (x / (x + 0.18))) / e;
    }
    return clamp(vec3(Y) + chroma, 0.0, 1.0);
}

vec3 linearToSRGB(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(1.055 * pow(max(c, vec3(1e-5)), vec3(1.0 / 2.4)) - 0.055, c * 12.92, lessThanEqual(c, vec3(0.0031308)));
}

uint pcgHash(uint v) {
    uint state = v * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float triangularFilmGrain(uvec2 px, uint seed) {
    uint base = px.x * 1664525u + px.y * 1013904223u + seed * 2246822519u;
    return float(pcgHash(base) >> 8u) * (1.0 / 16777216.0) + float(pcgHash(base ^ 2654435769u) >> 8u) * (1.0 / 16777216.0) - 1.0;
}

void main() {
    vec2 uv = v_uv;
    vec2 metric = u_viewport.zw;
    int style = int(u_modeTime.x + 0.5);
    float isDark = u_modeTime.y;
    float time = u_modeTime.z;

    vec2 flowDir = u_flowFold.xy;
    vec2 flowPerp = vec2(-flowDir.y, flowDir.x);
    float foldStrength = u_flowFold.z;

    float warpScale = u_warpParams.z;
    float warpAmount = u_warpParams.w;
    vec2 pointer = u_bridgePointer.zw;

    vec2 pMetric = (uv - 0.5) * metric;
    vec2 timeDrift = flowDir * (time * 0.055) + flowPerp * (sin(time * 0.21) * 0.045);

    vec2 warpOffset = vec2(0.0);
    float silkSheen = 0.0;
    float silkTrough = 0.0;
    float causticCusp = 0.0;

    if (style == 1) {
        vec2 qSphere = pMetric * (warpScale * 0.60) + u_warpParams.xy + timeDrift * 0.55;
        float m1 = snoise(qSphere);
        float m2 = snoise(qSphere + vec2(4.3, -2.1));
        warpOffset = vec2(m1, m2) * (warpAmount * 0.62);
    } else {
        vec2 q0 = pMetric * warpScale + u_warpParams.xy + timeDrift;
        float n1 = snoise(q0);
        float n2 = snoise(q0 * 1.06 + vec2(5.2, 1.3));

        vec2 q1 = q0 * 1.82 + vec2(n1, n2) * 0.62 + vec2(-3.7, 4.1) - timeDrift * 0.65;
        vec2 oct2 = vec2(snoise(q1), snoise(q1 + vec2(2.9, -4.6)));

        vec2 billow = vec2(n1, n2) * 0.72 + oct2 * 0.28 + flowDir * (n1 * 0.22);
        warpOffset = billow * warpAmount;

        if (style == 2) {
            float along = dot(pMetric, flowDir);
            float across = dot(pMetric, flowPerp);
            float ribbonPhase = across * (warpScale * 2.30)
                              + n1 * 1.58
                              + oct2.x * 0.48
                              + along * 0.40
                              + time * 0.16;

            float foldWave = sin(ribbonPhase) + 0.28 * sin(ribbonPhase * 2.0 + 0.75);
            float crestRaw = 0.5 + 0.5 * cos(ribbonPhase + n2 * 0.32);
            float foldAmt = clamp(foldStrength, 0.0, 1.6);
            float sheenAmt = clamp(foldStrength * 1.85, 0.0, 1.4);

            silkSheen = pow(crestRaw, 2.25) * sheenAmt;
            silkTrough = pow(1.0 - crestRaw, 2.10) * sheenAmt;

            warpOffset += (flowPerp * (foldWave * 0.16) + flowDir * (cos(ribbonPhase) * 0.058)) * foldAmt;
        } else if (style == 3) {
            float r1 = 1.0 - abs(snoise(q0 * 1.08 + vec2(n1, n2) * 0.68));
            float r2 = 1.0 - abs(snoise(q1 * 0.88 - vec2(n2, n1) * 0.52));
            float ridge = clamp(r1 * 0.62 + r2 * 0.38, 0.0, 1.0);
            causticCusp = pow(ridge, 3.0);
            warpOffset = billow * (warpAmount * 0.82) + flowPerp * ((r1 - r2) * 0.14);
        } else if (foldStrength > 0.001) {
            float meshWave = sin(dot(pMetric, flowPerp) * (warpScale * 1.65) + n1 * 1.35);
            warpOffset += flowPerp * (meshWave * foldStrength * 0.085);
        }
    }

    float whisperAmt = u_flowFold.w;
    vec2 bloomPos = u_bloomGeom.xy + pointer * (0.055 * max(whisperAmt, 0.25));

    float baseW = (style == 1) ? 0.82 : 0.58;
    vec3 sumLab = u_baseLab * baseW;
    float sumChroma = length(u_baseLab.yz) * baseW;
    float totalW = baseW;

    for (int i = 0; i < 6; i++) {
        vec4 lw = u_poleLabWeight[i];
        float poleWeight = lw.w;
        if (poleWeight <= 0.0001) {
            continue;
        }

        vec4 prs = u_polePosRadSoft[i];
        vec4 tr = u_poleTransform[i];
        float fi = float(i);

        vec2 motionShift = vec2(0.0);
        if (abs(time) > 1e-5) {
            float rate = 0.17 + 0.031 * fi;
            float ph = fi * 2.0943951;
            motionShift = vec2(sin(time * rate + ph), cos(time * (rate * 0.83) + ph)) * (0.022 + 0.004 * fi);
        }
        float depthParallax = (0.006 + 0.0028 * fi) * max(whisperAmt, 0.35);
        vec2 polePos = prs.xy + motionShift + pointer * depthParallax;
        float radius = max(prs.z, 0.05);
        float softness = clamp(prs.w, 0.05, 1.6);

        vec2 dVec = (uv - polePos) * metric + warpOffset;
        vec2 local = vec2(
            ( dVec.x * tr.z + dVec.y * tr.w) * tr.x,
            (-dVec.x * tr.w + dVec.y * tr.z) * tr.y
        );
        float dist = length(local);

        vec3 poleLab = lw.xyz;
        float w = 0.0;

        if (style == 1) {
            float sphereR = max(radius * 0.52, 0.04);
            float rNorm = dist / sphereR;
            float blurW = 0.24 + 0.62 * softness;

            float tEdge = (rNorm - (1.0 - blurW * 0.85)) / max(1.75 * blurW, 1e-3);
            float apertureDisc = 1.0 - smootherstep01(tEdge);

            float chord = sqrt(max(0.0, 1.0 - min(rNorm * rNorm * 0.55, 0.85)));
            float halo = exp(-pow(max(rNorm, 1e-4) / (1.06 + 0.52 * softness), 2.15));
            float density = apertureDisc * (0.62 + 0.24 * chord) + halo * 0.30;

            vec2 toBloom = (bloomPos - polePos) * metric;
            float toBloomLen = length(toBloom);
            vec2 lightDir = (toBloomLen > 1e-3) ? (toBloom / toBloomLen) : vec2(0.0, -1.0);

            float rawFacing = clamp(
                dot(dVec / max(sphereR * (1.08 + 0.38 * softness), 0.04), lightDir),
                -1.0,
                1.0
            );
            float lightWrap = rawFacing * (1.25 - 0.25 * rawFacing * rawFacing) * 0.80;

            poleLab.x = clamp(poleLab.x + lightWrap * 0.078 + (chord - 0.72) * 0.035, 0.02, 0.99);
            poleLab.yz = mix(poleLab.yz, u_bloomLab.yz, max(0.0, lightWrap) * 0.14);

            w = poleWeight * density * 2.45;
        } else if (style == 2) {
            float effRadius = max(radius * (0.44 + 0.24 * softness), 0.035);
            float p = clamp(1.98 - 0.42 * softness, 1.38, 2.20);
            float falloff = exp(-pow(max(dist / effRadius, 1e-5), p));
            w = poleWeight * falloff * (1.58 + 0.26 * silkSheen);
        } else if (style == 3) {
            float effRadius = max(radius * (0.42 + 0.24 * softness), 0.035);
            float falloff = exp(-pow(max(dist / effRadius, 1e-5), 1.78));
            w = poleWeight * falloff * (1.25 + 1.15 * causticCusp);
        } else {
            float effRadius = max(radius * (0.40 + 0.22 * softness), 0.035);
            float p = clamp(2.10 - 0.50 * softness, 1.35, 2.28);
            float falloff = exp(-pow(max(dist / effRadius, 1e-5), p));
            w = poleWeight * falloff * 1.65;
        }

        sumLab += poleLab * w;
        sumChroma += length(poleLab.yz) * w;
        totalW += w;
    }

    float bloomStrength = max(u_bloomGeom.w, 0.0);
    if (bloomStrength > 0.0001) {
        vec2 bloomDelta = (uv - bloomPos) * metric + warpOffset * 0.35;
        float bNorm = length(bloomDelta) / max(u_bloomGeom.z * 0.68, 0.05);
        float bloomFalloff = 0.62 * exp(-pow(max(bNorm, 1e-4), 1.65))
                           + 0.38 / (1.0 + bNorm * bNorm * 1.35);
        float bloomW = bloomStrength * bloomFalloff * ((style == 1) ? 1.35 : 1.05);

        sumLab += u_bloomLab * bloomW;
        sumChroma += length(u_bloomLab.yz) * bloomW;
        totalW += bloomW;
    }

    vec3 blendedLab = sumLab / totalW;
    float avgChroma = sumChroma / totalW;

    // Opposing-hue chroma loss triggers scatter lift in L and bridge arc in (a, b)
    float chromaLoss = max(0.0, avgChroma - length(blendedLab.yz));
    float rawLift = max(0.0, u_lighting.x);
    float liftGain = (rawLift <= 0.22) ? (rawLift * 3.2) : (0.704 + (rawLift - 0.22) * 0.85);
    blendedLab.x += chromaLoss * liftGain;
    blendedLab.yz += u_bridgePointer.xy * (chromaLoss * u_lighting.y * 0.42);

    if (style == 2) {
        float crestGain = mix(0.052, 0.078, isDark);
        float troughGain = mix(0.020, 0.036, isDark);
        blendedLab.x += silkSheen * crestGain - silkTrough * troughGain;
        blendedLab.yz *= (1.0 + silkSheen * 0.07);
    } else if (style == 3) {
        float fieldPresence = (totalW - baseW) / max(totalW, 0.0001);
        blendedLab.x += causticCusp * mix(0.068, 0.115, isDark) * (0.45 + 0.55 * fieldPresence);
        blendedLab.x += chromaLoss * causticCusp * 0.35;
        blendedLab.yz = mix(blendedLab.yz, u_bloomLab.yz, causticCusp * 0.16);
    }

    if (whisperAmt > 0.001) {
        float mass = (totalW - baseW) / max(totalW, 0.0001) + (silkSheen + causticCusp) * 0.45;
        // Negate dFdy to align window-space derivatives with top-down v_uv
        vec2 gradM = vec2(dFdx(mass), -dFdy(mass)) * (u_viewport.x / metric.x);
        vec3 surfN = normalize(vec3(-gradM * 0.88, 1.0));
        vec2 toCursor = (pointer * 0.5 + 0.5 - uv) * metric;
        vec3 keyDir = normalize(vec3(toCursor, 0.68));
        float reach = exp(-dot(toCursor, toCursor) * 0.42);
        float graze = dot(surfN.xy, keyDir.xy);
        float zenith = (pow(max(dot(surfN, keyDir), 0.0), 5.2) - 0.30) * reach;
        float spotPool = (reach - 0.36) * mix(0.024, 0.036, isDark);
        blendedLab.x += clamp((graze * 0.048 + zenith * 0.042 + spotPool) * whisperAmt, -0.056, 0.062);
        blendedLab.yz += (u_bridgePointer.xy * 0.015 + vec2(0.005, 0.015)) * ((graze * 0.75 + (reach - 0.38) * 0.55) * whisperAmt);
    }

    float vignette = clamp(u_lighting.z, -0.25, 0.35);
    if (abs(vignette) > 0.0005) {
        vec2 vigUv = uv - 0.5;
        float vigR2 = dot(vigUv, vigUv) * 2.2;
        float vigMask = smootherstep01((vigR2 - 0.08) / 1.18);
        blendedLab.x -= vignette * vigMask;
    }

    blendedLab.x = clamp(blendedLab.x, 0.0, 1.0);
    vec3 srgb = linearToSRGB(softGamutCompress(oklabToLinearSRGB(blendedLab)));

    float effectiveGrain = u_lighting.w;
    if (effectiveGrain > 0.0) {
        float g = triangularFilmGrain(uvec2(gl_FragCoord.xy), u_grainSeed);
        float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
        float emulsionMask = mix(0.58, 1.0, clamp(4.0 * luma * (1.0 - luma), 0.0, 1.0));
        srgb = clamp(srgb + vec3(g * effectiveGrain * emulsionMask), 0.0, 1.0);
    }

    fragColor = vec4(srgb, 1.0);
}
`;

// FNV-1a 32-bit seed hash
function hashSeed32(seedStr) {
  const s = String(seedStr ?? 'sphere-default');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

function normalizeEffectiveGrain(rawGrain, grainScale) {
  const scale = Math.max(0, Number.isFinite(grainScale) ? grainScale : 1.0);
  if (scale === 0) return 0.0;
  const g = Math.max(0, Number.isFinite(rawGrain) ? rawGrain : 0.026);
  const calibrated = g <= 0.065 ? g : 0.065 + 0.030 * Math.tanh((g - 0.065) * 2.5);
  return Math.max(1.0 / 255.0, calibrated * scale);
}

function computeIsotropicMetric(width, height) {
  const minDim = Math.max(1, Math.min(width, height));
  const refDim = minDim + (Math.sqrt(Math.max(1, width * height)) - minDim) * 0.22;
  return [width / refDim, height / refDim];
}

function oklabToSRGBByte(L, a, b, out, offset) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const rawY = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  let Y = Math.min(0.9999, Math.max(1e-4, rawY));
  if (rawY > 0.88) {
    const ex = rawY - 0.88;
    Y = 0.88 + 0.1199 * (ex / (ex + 0.1199));
  }
  let cr = r - rawY;
  let cg = g - rawY;
  let cb = bl - rawY;

  const e = Math.max(
    cr < 0 ? -cr / Y : cr / (1 - Y),
    cg < 0 ? -cg / Y : cg / (1 - Y),
    cb < 0 ? -cb / Y : cb / (1 - Y),
  );
  if (e > 0.82) {
    const x = e - 0.82;
    const scale = (0.82 + 0.18 * (x / (x + 0.18))) / e;
    cr *= scale;
    cg *= scale;
    cb *= scale;
  }

  r = Math.min(1, Math.max(0, Y + cr));
  g = Math.min(1, Math.max(0, Y + cg));
  bl = Math.min(1, Math.max(0, Y + cb));

  out[offset] = Math.round((r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - 0.055) * 255);
  out[offset + 1] = Math.round((g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 2.4) - 0.055) * 255);
  out[offset + 2] = Math.round((bl <= 0.0031308 ? 12.92 * bl : 1.055 * Math.pow(bl, 1 / 2.4) - 0.055) * 255);
  out[offset + 3] = 255;
}

const _hexBytes = new Uint8Array(4);
function resolveHex(hex, lab, fallback = '#808080') {
  if (typeof hex === 'string' && hex) return hex;
  if (!Array.isArray(lab) || lab.length < 3) return fallback;
  oklabToSRGBByte(Math.min(1, Math.max(0, lab[0])), lab[1], lab[2], _hexBytes, 0);
  return `#${((1 << 24) | (_hexBytes[0] << 16) | (_hexBytes[1] << 8) | _hexBytes[2]).toString(16).slice(1)}`;
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerpArr = (o, a, b, t) => {
  for (let i = 0; i < o.length; i++) o[i] = a[i] + ((b?.[i] ?? a[i]) - a[i]) * t;
};
const lerpKeys = (o, a, b, keys, t) => {
  for (const k of keys) o[k] = (a?.[k] ?? o[k]) + ((b?.[k] ?? a?.[k] ?? o[k]) - (a?.[k] ?? o[k])) * t;
};
const lerpAngle = (a, b, t) => {
  const d = ((b ?? 0) - (a ?? 0)) % (Math.PI * 2);
  return (a ?? 0) + (d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d) * t;
};
const cloneScene = (s) =>
  typeof structuredClone === 'function' ? structuredClone(s) : JSON.parse(JSON.stringify(s));
const LIGHT_KEYS = ['scatterLift', 'chromaPreserve', 'vignette', 'grain'];

function morphSceneInto(out, a, b, u) {
  out._darkFactor = lerp(a._darkFactor ?? (a.isDark ? 1 : 0), b._darkFactor ?? (b.isDark ? 1 : 0), u);
  out.isDark = out._darkFactor >= 0.5;
  out.seed = u < 0.5 ? a.seed : b.seed;
  out.style = u < 0.5 ? a.style : (b.style ?? 'mesh');
  out.mood = u < 0.5 ? a.mood : (b.mood ?? (b.isDark ? 'dark' : 'light'));
  lerpArr(out.baseLab, a.baseLab, b.baseLab, u);
  lerpArr(out.bloomLab, a.bloomLab || a.baseLab, b.bloomLab || b.baseLab, u);
  lerpArr(out.bloomPos, a.bloomPos || [0.5, 0.4], b.bloomPos || [0.5, 0.4], u);
  lerpKeys(out, a, b, ['bloomRadius', 'bloomStrength'], u);
  const aBr = a.bridgeDir || [0, 1], bBr = b.bridgeDir || [0, 1];
  const brAng = lerpAngle(Math.atan2(aBr[1], aBr[0]), Math.atan2(bBr[1], bBr[0]), u);
  out.bridgeDir[0] = Math.cos(brAng);
  out.bridgeDir[1] = Math.sin(brAng);
  for (let i = 0; i < out.poles.length; i++) {
    const op = out.poles[i], ap = a.poles[i], bp = b.poles?.[i];
    if (!ap) continue;
    lerpArr(op.lab, ap.lab, bp?.lab || b.baseLab, u);
    lerpArr(op.pos, ap.pos, bp?.pos || ap.pos, u);
    lerpArr(op.stretch, ap.stretch || [1, 1], bp?.stretch || ap.stretch || [1, 1], u);
    lerpKeys(op, ap, bp, ['radius', 'softness'], u);
    op.angle = lerpAngle(ap.angle, bp?.angle ?? ap.angle, u);
    op.weight = lerp(ap.weight ?? 1, bp ? (bp.weight ?? 1) : 0, u);
  }
  const aw = a.warp || {}, bw = b.warp || {};
  const aPx = aw.phase?.[0] ?? 0, aPy = aw.phase?.[1] ?? 0, bPx = bw.phase?.[0] ?? 0, bPy = bw.phase?.[1] ?? 0;
  const far = Math.hypot(bPx - aPx, bPy - aPy) > 3.5;
  const env = far || styleToIndex(a.style) !== styleToIndex(b.style) ? 1 - 0.9 * Math.sin(u * Math.PI) : 1;
  out.warp.scale = lerp(aw.scale ?? 1.35, bw.scale ?? 1.35, u);
  out.warp.amount = lerp(aw.amount ?? 0.24, bw.amount ?? 0.24, u) * env;
  out.warp.foldStrength = lerp(aw.foldStrength ?? 0, bw.foldStrength ?? 0, u) * env;
  out.warp.phase[0] = far ? (u < 0.5 ? aPx : bPx) : lerp(aPx, bPx, u);
  out.warp.phase[1] = far ? (u < 0.5 ? aPy : bPy) : lerp(aPy, bPy, u);
  out.warp.flowAngle = lerpAngle(aw.flowAngle, bw.flowAngle, u);
  lerpKeys(out.lighting, a.lighting, b.lighting, LIGHT_KEYS, u);
}

export class SphereRenderer {
  constructor(canvas, { onTiming = null, maxDpr = 3, pixelBudget = 5.2e6, interactiveBudget = 1.6e6, preserveDrawingBuffer = false } = {}) {
    if (!canvas) {
      throw new Error('SphereRenderer requires a valid canvas element.');
    }

    this.canvas = canvas;
    this.onTiming = typeof onTiming === 'function' ? onTiming : null;
    this.maxDpr = Math.max(1, Number.isFinite(maxDpr) ? maxDpr : 3);
    this.pixelBudget = Math.max(2.5e5, Number.isFinite(pixelBudget) ? pixelBudget : 5.2e6);
    this.interactiveBudget = Math.max(2.5e5, Number.isFinite(interactiveBudget) ? interactiveBudget : 1.6e6);
    this._tier = 'static';
    this._preserveDrawingBuffer = Boolean(preserveDrawingBuffer);

    this.backend = 'webgl2';
    this.gl = null;
    this.ctx2d = null;

    this.lastCpuMs = 0;
    this.lastGpuMs = null;

    this.pointer = new Float32Array(2);
    this.targetPointer = new Float32Array(2);
    this._whisper = 0;
    this._targetWhisper = 0;
    this._activeGrainScale = 1.0;
    this._whispering = false;
    this._morphActive = null;
    this._morphFrom = null;
    this._morphScratch = null;

    this._poleLabWeight = new Float32Array(24);
    this._polePosRadSoft = new Float32Array(24);
    this._poleTransform = new Float32Array(24);

    this._cachedSeedStr = null;
    this._cachedSeedUint = 0;

    this.isAnimating = false;
    this._rafId = 0;
    this._queryPollRafId = 0;
    this._motionScene = null;
    this._motionOptions = null;
    this._motionTime = 0;
    this._lastFrameNow = 0;
    this._lastScene = null;
    this._destroyed = false;

    this._timerExt = null;
    this._pendingQueries = [];
    this._queryPool = [];

    this._onContextLost = (e) => {
      e.preventDefault();
      this._pendingQueries.length = 0;
      this._queryPool.length = 0;
    };
    this._onContextRestored = () => {
      if (!this._destroyed && this.backend === 'webgl2') {
        this._initWebGLResources();
        if (this._lastScene) this.render(this._lastScene);
      }
    };

    if (typeof canvas.addEventListener === 'function') {
      canvas.addEventListener('webglcontextlost', this._onContextLost, false);
      canvas.addEventListener('webglcontextrestored', this._onContextRestored, false);
    }

    this._initBackend();
  }

  _initBackend() {
    let gl = null;
    try {
      gl = this.canvas.getContext('webgl2', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: this._preserveDrawingBuffer,
        powerPreference: 'high-performance',
      });
    } catch (_) {
      gl = null;
    }

    if (gl) {
      this.gl = gl;
      this.backend = 'webgl2';
      if (this._initWebGLResources()) return;
      this.gl = null;
    }

    this.backend = 'canvas2d';
    this.ctx2d = this.canvas.getContext('2d', { alpha: false });
    this._fallbackW = 0;
    this._fallbackH = 0;
    this._fallbackCanvas = null;
    this._fallbackCtx = null;
    this._fallbackImageData = null;
    this._grainCanvas = null;
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      console.error('[SphereRenderer] GLSL compile error:', info);
      return null;
    }
    return shader;
  }

  _initWebGLResources() {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return false;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      console.error('[SphereRenderer] GLSL link error:', info);
      return false;
    }

    this._program = program;
    // WebGL2 core profile requires a bound VAO even for bufferless gl_VertexID draws
    this._vao = gl.createVertexArray();

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DITHER);

    this._locs = {
      viewport: gl.getUniformLocation(program, 'u_viewport'),
      modeTime: gl.getUniformLocation(program, 'u_modeTime'),
      baseLab: gl.getUniformLocation(program, 'u_baseLab'),
      bloomLab: gl.getUniformLocation(program, 'u_bloomLab'),
      bloomGeom: gl.getUniformLocation(program, 'u_bloomGeom'),
      bridgePointer: gl.getUniformLocation(program, 'u_bridgePointer'),
      warpParams: gl.getUniformLocation(program, 'u_warpParams'),
      flowFold: gl.getUniformLocation(program, 'u_flowFold'),
      lighting: gl.getUniformLocation(program, 'u_lighting'),
      grainSeed: gl.getUniformLocation(program, 'u_grainSeed'),
      poleLabWeight: gl.getUniformLocation(program, 'u_poleLabWeight'),
      polePosRadSoft: gl.getUniformLocation(program, 'u_polePosRadSoft'),
      poleTransform: gl.getUniformLocation(program, 'u_poleTransform'),
    };

    this._timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    return true;
  }

  // Interactive frames (drift, Solas, morph) render under a smaller pixel budget;
  // the settled frame always renders at full device resolution.
  resize(tier = this._tier) {
    this._tier = tier === 'interactive' ? 'interactive' : 'static';
    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const cssW = this.canvas.clientWidth || this.canvas.width || 1280;
    const cssH = this.canvas.clientHeight || this.canvas.height || 720;
    const budget = this._tier === 'static' ? this.pixelBudget : this.interactiveBudget;
    const fit = Math.sqrt(budget / Math.max(1, cssW * cssH));
    const dpr = Math.max(this._tier === 'static' ? 1 : 0.75, Math.min(rawDpr, this.maxDpr, fit));

    const width = Math.max(1, Math.round(cssW * dpr));
    const height = Math.max(1, Math.round(cssH * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }

    return { width, height, dpr };
  }

  get tier() {
    return this._tier;
  }

  get isWhispering() {
    return this._whispering;
  }

  get isMorphing() {
    return this._morphActive !== null;
  }

  setPointer(nx, ny) {
    const cx = Math.max(-1.5, Math.min(1.5, Number.isFinite(nx) ? nx : 0));
    const cy = Math.max(-1.5, Math.min(1.5, Number.isFinite(ny) ? ny : 0));
    this.targetPointer[0] = cx;
    this.targetPointer[1] = cy;
    if (this.isAnimating && this._targetWhisper === 0) this._targetWhisper = 1.0;
    if (!this._rafId) {
      this.pointer[0] = cx;
      this.pointer[1] = cy;
    }
  }

  _ensureLoop() {
    if (this._destroyed || this._rafId || typeof requestAnimationFrame !== 'function') return;
    if (this._queryPollRafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._queryPollRafId);
      this._queryPollRafId = 0;
    }
    this._lastFrameNow = performance.now();
    this.resize('interactive');
    const tick = (now) => {
      this._rafId = 0;
      if (this._destroyed) return;
      const dt = Math.min(0.08, Math.max(0.001, (now - this._lastFrameNow) / 1000));
      this._lastFrameNow = now;
      if (this.isAnimating) this._motionTime += dt * (this._motionOptions?.speed ?? 1.0);

      const a = 1 - Math.exp(-dt * 6.2);
      const dx = this.targetPointer[0] - this.pointer[0];
      const dy = this.targetPointer[1] - this.pointer[1];
      const dw = this._targetWhisper - this._whisper;
      if (this._whispering && !this.isAnimating && Math.hypot(dx, dy) + Math.abs(dw) < 0.0016) {
        this.pointer[0] = this.targetPointer[0];
        this.pointer[1] = this.targetPointer[1];
        this._whisper = this._targetWhisper;
        this._whispering = false;
      } else {
        this.pointer[0] += dx * a;
        this.pointer[1] += dy * a;
        this._whisper += dw * a;
      }

      let sceneToDraw = this.isAnimating ? this._motionScene : this._lastScene;
      let gs = this.isAnimating ? (this._motionOptions?.grainScale ?? this._activeGrainScale) : this._activeGrainScale;
      let cbDone = null;
      const m = this._morphActive;
      if (m) {
        gs = m.gs;
        const rawT = Math.min(1, Math.max(0, (now - m.t0) / m.dur));
        if (rawT >= 1) {
          this._morphActive = null;
          sceneToDraw = m.next;
          if (this.isAnimating) this._motionScene = m.next;
          cbDone = m;
        } else {
          const u = 1 - (1 - rawT) ** 3;
          morphSceneInto(this._morphScratch, this._morphFrom, m.next, u);
          sceneToDraw = this._morphScratch;
          if (this.isAnimating) this._motionScene = this._morphScratch;
          cbDone = { u, m };
        }
      }

      const stillRunning = this.isAnimating || this._whispering || this._morphActive;
      if (stillRunning) {
        if (sceneToDraw) {
          this.render(sceneToDraw, { time: this._motionTime, pointer: this.pointer, whisper: this._whisper, grainScale: gs });
        }
      } else if (sceneToDraw) {
        this.resize('static');
        this.render(sceneToDraw, { time: this._motionTime, pointer: this.pointer, whisper: this._whisper, grainScale: gs });
      }
      if (cbDone) {
        if (cbDone.m) cbDone.m.onUpdate?.(cbDone.u, this._morphScratch);
        else {
          cbDone.onUpdate?.(1, cbDone.next);
          cbDone.onComplete?.(cbDone.next);
        }
      }
      if (stillRunning) {
        this._rafId = requestAnimationFrame(tick);
      }
    };
    this._rafId = requestAnimationFrame(tick);
  }

  wakePointer(nx, ny, { strength = 1.0, grainScale } = {}) {
    if (this._destroyed) return;
    this.targetPointer[0] = Math.max(-1.5, Math.min(1.5, Number.isFinite(nx) ? nx : 0));
    this.targetPointer[1] = Math.max(-1.5, Math.min(1.5, Number.isFinite(ny) ? ny : 0));
    this._targetWhisper = Math.max(0, Math.min(1.5, Number.isFinite(strength) ? strength : 1.0));
    if (grainScale !== undefined) this._activeGrainScale = grainScale;
    if (!this._lastScene) return;
    this._whispering = true;
    this._ensureLoop();
  }

  morphTo(nextScene, { duration = 560, grainScale, onUpdate, onComplete } = {}) {
    if (this._destroyed || !nextScene) return;
    if (grainScale !== undefined) this._activeGrainScale = grainScale;
    const gs = grainScale ?? this._activeGrainScale;
    if (!this._lastScene || duration <= 0 || typeof requestAnimationFrame !== 'function') {
      this._morphActive = null;
      if (this.isAnimating) this._motionScene = nextScene;
      this.render(nextScene, { time: this._motionTime, pointer: this.pointer, whisper: this._whisper, grainScale: gs });
      onUpdate?.(1, nextScene);
      onComplete?.(nextScene);
      return;
    }
    this._morphFrom = cloneScene(this._lastScene);
    if (!this._morphScratch) this._morphScratch = cloneScene(this._lastScene);
    this._morphActive = { t0: performance.now(), dur: Math.max(16, duration), gs, next: nextScene, onUpdate, onComplete };
    this._ensureLoop();
  }

  _drainGpuTimerQueries() {
    const gl = this.gl;
    const ext = this._timerExt;
    if (!gl || !ext || this._pendingQueries.length === 0) return false;

    let updated = false;
    while (this._pendingQueries.length > 0) {
      const q = this._pendingQueries[0];
      const available = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE);
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);

      if (!available && !disjoint) break;

      this._pendingQueries.shift();
      if (available && !disjoint) {
        this.lastGpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        updated = true;
      }
      if (this._queryPool.length < 8) {
        this._queryPool.push(q);
      } else {
        gl.deleteQuery(q);
      }
    }
    return updated;
  }

  _scheduleStaticQueryPoll(attempt = 0) {
    if (
      this._destroyed ||
      this._rafId ||
      this._queryPollRafId ||
      this._pendingQueries.length === 0 ||
      typeof requestAnimationFrame !== 'function' ||
      attempt > 5
    ) {
      return;
    }

    this._queryPollRafId = requestAnimationFrame(() => {
      this._queryPollRafId = 0;
      if (this._destroyed) return;
      const updated = this._drainGpuTimerQueries();
      if (updated && this.onTiming) {
        this.onTiming({
          cpuMs: this.lastCpuMs,
          gpuMs: this.lastGpuMs,
          width: this.canvas.width,
          height: this.canvas.height,
          backend: this.backend,
        });
      }
      if (this._pendingQueries.length > 0 && !this._rafId) {
        this._scheduleStaticQueryPoll(attempt + 1);
      }
    });
  }

  render(scene, options = {}) {
    if (this._destroyed || !scene) {
      return {
        cpuMs: 0,
        lastGpuMs: this.lastGpuMs,
        width: this.canvas.width || 0,
        height: this.canvas.height || 0,
      };
    }

    this._lastScene = scene;

    if (!this.canvas.width || !this.canvas.height) {
      this.resize();
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const time = options.time !== undefined ? options.time : 0;
    const ptr = options.pointer || this.pointer;
    const grainScale = options.grainScale !== undefined ? options.grainScale : 1.0;
    const whisperAmt = options.whisper !== undefined ? options.whisper : this._whisper;

    if (this.backend === 'canvas2d') {
      return this._renderCanvas2D(scene, width, height, time, ptr, grainScale);
    }

    const gl = this.gl;
    if (!gl || gl.isContextLost()) {
      return { cpuMs: 0, lastGpuMs: this.lastGpuMs, width, height };
    }

    this._drainGpuTimerQueries();

    const t0 = performance.now();

    gl.viewport(0, 0, width, height);
    gl.useProgram(this._program);
    gl.bindVertexArray(this._vao);

    const minDim = Math.max(1, Math.min(width, height));
    const refDim = minDim + (Math.sqrt(width * height) - minDim) * 0.22;

    const locs = this._locs;
    gl.uniform4f(locs.viewport, width, height, width / refDim, height / refDim);

    const styleCode = styleToIndex(scene.style);
    const darkFactor =
      typeof scene._darkFactor === 'number' ? scene._darkFactor : scene.isDark ? 1.0 : 0.0;
    const moodCode = MOOD_MAP[scene.mood] ?? (scene.isDark ? 2 : 0);
    gl.uniform4f(locs.modeTime, styleCode, darkFactor, time, moodCode);

    const baseLab = scene.baseLab || [0.95, 0, 0];
    gl.uniform3f(locs.baseLab, baseLab[0], baseLab[1], baseLab[2]);

    const bloomLab = scene.bloomLab || baseLab;
    gl.uniform3f(locs.bloomLab, bloomLab[0], bloomLab[1], bloomLab[2]);

    const bloomPos = scene.bloomPos || [0.5, 0.4];
    gl.uniform4f(locs.bloomGeom, bloomPos[0], bloomPos[1], scene.bloomRadius ?? 0.65, scene.bloomStrength ?? 0.5);

    const bridgeDir = scene.bridgeDir || [0, 1];
    gl.uniform4f(locs.bridgePointer, bridgeDir[0], bridgeDir[1], ptr[0] || 0, ptr[1] || 0);

    const warp = scene.warp || {};
    const phase = warp.phase || [0, 0];
    gl.uniform4f(locs.warpParams, phase[0], phase[1], warp.scale ?? 1.35, warp.amount ?? 0.24);

    const flowAngle = warp.flowAngle ?? 0;
    gl.uniform4f(locs.flowFold, Math.cos(flowAngle), Math.sin(flowAngle), warp.foldStrength ?? 0, whisperAmt);

    const lighting = scene.lighting || {};
    const effectiveGrain = normalizeEffectiveGrain(lighting.grain, grainScale);
    gl.uniform4f(locs.lighting, lighting.scatterLift ?? 0.42, lighting.chromaPreserve ?? 0.78, lighting.vignette ?? 0.25, effectiveGrain);

    if (scene.seed !== this._cachedSeedStr) {
      this._cachedSeedStr = scene.seed;
      this._cachedSeedUint = hashSeed32(scene.seed);
    }
    gl.uniform1ui(locs.grainSeed, this._cachedSeedUint);

    const poles = scene.poles || [];
    const labWeightArr = this._poleLabWeight;
    const posRadSoftArr = this._polePosRadSoft;
    const transformArr = this._poleTransform;

    for (let i = 0; i < 6; i++) {
      const baseIdx = i * 4;
      const p = poles[i];
      if (p) {
        const lab = p.lab || baseLab;
        labWeightArr[baseIdx] = lab[0];
        labWeightArr[baseIdx + 1] = lab[1];
        labWeightArr[baseIdx + 2] = lab[2];
        labWeightArr[baseIdx + 3] = p.weight ?? 1.0;

        const pos = p.pos || [0.5, 0.5];
        posRadSoftArr[baseIdx] = pos[0];
        posRadSoftArr[baseIdx + 1] = pos[1];
        posRadSoftArr[baseIdx + 2] = p.radius ?? 0.4;
        posRadSoftArr[baseIdx + 3] = p.softness ?? 0.65;

        const stretch = p.stretch || [1, 1];
        const sx = Math.max(0.08, Math.abs(stretch[0] || 1));
        const sy = Math.max(0.08, Math.abs(stretch[1] || 1));
        const ang = p.angle ?? 0;

        transformArr[baseIdx] = 1.0 / sx;
        transformArr[baseIdx + 1] = 1.0 / sy;
        transformArr[baseIdx + 2] = Math.cos(ang);
        transformArr[baseIdx + 3] = Math.sin(ang);
      } else {
        labWeightArr[baseIdx + 3] = 0;
      }
    }

    gl.uniform4fv(locs.poleLabWeight, labWeightArr);
    gl.uniform4fv(locs.polePosRadSoft, posRadSoftArr);
    gl.uniform4fv(locs.poleTransform, transformArr);

    const ext = this._timerExt;
    let activeQuery = null;
    if (ext && this._pendingQueries.length < 4) {
      activeQuery = this._queryPool.pop() || gl.createQuery();
      if (activeQuery) gl.beginQuery(ext.TIME_ELAPSED_EXT, activeQuery);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (activeQuery) {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      this._pendingQueries.push(activeQuery);
    }

    gl.bindVertexArray(null);

    const cpuMs = performance.now() - t0;
    this.lastCpuMs = cpuMs;

    if (this.onTiming) {
      this.onTiming({ cpuMs, gpuMs: this.lastGpuMs, width, height, backend: 'webgl2' });
    }

    if (activeQuery && !this._rafId) {
      this._scheduleStaticQueryPoll(0);
    }

    return { cpuMs, lastGpuMs: this.lastGpuMs, width, height };
  }

  renderOnce(scene, options) {
    return this.render(scene, options);
  }

  startMotion(scene, options = {}) {
    if (this._destroyed) return;
    if (scene) this._motionScene = scene;
    else if (!this._motionScene) this._motionScene = this._lastScene;
    this._motionOptions = options;
    if (options.grainScale !== undefined) this._activeGrainScale = options.grainScale;
    this.isAnimating = true;
    this._ensureLoop();
  }

  startLoop(scene, options) {
    return this.startMotion(scene, options);
  }

  stopMotion() {
    this.isAnimating = false;
    this._whispering = false;
    this._morphActive = null;
    if (this._rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    this._tier = 'static';
  }

  stopLoop() {
    return this.stopMotion();
  }

  async exportImage(
    scene,
    {
      width = 3840,
      height = 2160,
      format = 'png',
      quality = 0.94,
      grainScale = 1.0,
      time = 0,
      pointer = [0, 0],
      whisper = 0.0,
    } = {},
  ) {
    const targetScene = scene || this._lastScene;
    if (!targetScene) throw new Error('SphereRenderer.exportImage requires a valid scene.');

    const fmt = String(format || 'png').trim().toLowerCase();
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));

    if (fmt === 'svg') {
      const svgText = this.exportSVG(targetScene, { width: w, height: h, grainScale });
      return new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    }

    const mime =
      fmt === 'webp' ? 'image/webp' : fmt === 'jpg' || fmt === 'jpeg' ? 'image/jpeg' : 'image/png';

    let offscreen;
    if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') {
      offscreen = new OffscreenCanvas(w, h);
    } else if (typeof document !== 'undefined') {
      offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
    } else {
      throw new Error('Cannot allocate export canvas in this environment.');
    }

    const exporter = new SphereRenderer(offscreen, { maxDpr: 1, preserveDrawingBuffer: true });
    try {
      exporter.render(targetScene, { time, pointer, grainScale, whisper });
      if (exporter.gl) exporter.gl.finish();
      if (typeof offscreen.convertToBlob === 'function') {
        return await offscreen.convertToBlob({ type: mime, quality });
      }
      return await new Promise((resolve, reject) => {
        offscreen.toBlob(
          (b) => (b ? resolve(b) : reject(new Error(`${fmt.toUpperCase()} encode failed.`))),
          mime,
          quality,
        );
      });
    } finally {
      const loseExt = exporter.gl?.getExtension('WEBGL_lose_context');
      exporter.destroy();
      if (loseExt) loseExt.loseContext();
    }
  }

  async exportPNG(scene, options = {}) {
    return this.exportImage(scene, { ...options, format: 'png' });
  }

  exportSVG(scene, { width = 3840, height = 2160, grainScale = 1.0 } = {}) {
    const s = scene || this._lastScene;
    if (!s) throw new Error('SphereRenderer.exportSVG requires a valid scene.');
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const baseHex = resolveHex(s.baseHex, s.baseLab, '#f7f5f0');
    const bloomHex = resolveHex(s.bloomHex, s.bloomLab || s.baseLab, baseHex);
    const activePoles = (s.poles || []).filter((p) => (p.weight ?? 1) > 0.02);
    const defs = [];
    const shapes = [];

    activePoles.forEach((p, idx) => {
      const id = `sp-g-${idx}`;
      const hex = resolveHex(p.hex, p.lab, baseHex);
      const cx = ((p.pos?.[0] ?? 0.5) * w).toFixed(1);
      const cy = ((p.pos?.[1] ?? 0.5) * h).toFixed(1);
      const rx = (Math.max(0.12, p.radius ?? 0.6) * (p.stretch?.[0] ?? 1) * Math.max(w, h) * 0.62).toFixed(1);
      const ry = (Math.max(0.12, p.radius ?? 0.6) * (p.stretch?.[1] ?? 1) * Math.max(w, h) * 0.62).toFixed(1);
      const deg = (((p.angle ?? 0) * 180) / Math.PI).toFixed(1);
      const op = Math.min(0.95, Math.max(0.22, (p.weight ?? 1) * 0.72)).toFixed(2);
      defs.push(
        `<radialGradient id="${id}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${hex}" stop-opacity="${op}"/><stop offset="58%" stop-color="${hex}" stop-opacity="${(Number(op) * 0.42).toFixed(2)}"/><stop offset="100%" stop-color="${hex}" stop-opacity="0"/></radialGradient>`,
      );
      shapes.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${deg} ${cx} ${cy})" fill="url(#${id})"/>`,
      );
    });

    const bx = ((s.bloomPos?.[0] ?? 0.5) * w).toFixed(1);
    const by = ((s.bloomPos?.[1] ?? 0.4) * h).toFixed(1);
    const br = (Math.max(0.2, s.bloomRadius ?? 0.65) * Math.max(w, h) * 0.68).toFixed(1);
    const bop = Math.min(0.85, Math.max(0.15, s.bloomStrength ?? 0.45)).toFixed(2);
    defs.push(
      `<radialGradient id="sp-bloom" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${bloomHex}" stop-opacity="${bop}"/><stop offset="100%" stop-color="${bloomHex}" stop-opacity="0"/></radialGradient>`,
    );
    shapes.push(`<circle cx="${bx}" cy="${by}" r="${br}" fill="url(#sp-bloom)"/>`);

    const grainOp = Math.min(0.14, Math.max(0, 0.032 * (grainScale ?? 1))).toFixed(3);
    const grainLayer =
      Number(grainOp) > 0.002
        ? `<filter id="sp-grain"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="${w}" height="${h}" filter="url(#sp-grain)" opacity="${grainOp}" style="mix-blend-mode:overlay"/>`
        : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs.join('')}</defs><rect width="${w}" height="${h}" fill="${baseHex}"/>${shapes.join('')}${grainLayer}</svg>`;
  }

  exportCSS(scene) {
    const s = scene || this._lastScene;
    if (!s) return '';
    const baseHex = resolveHex(s.baseHex, s.baseLab, '#f7f5f0');
    const bloomHex = resolveHex(s.bloomHex, s.bloomLab || s.baseLab, baseHex);
    const stops = (s.poles || [])
      .filter((p) => (p.weight ?? 1) > 0.05)
      .map((p) => {
        const hex = resolveHex(p.hex, p.lab, baseHex);
        const x = Math.round((p.pos?.[0] ?? 0.5) * 100);
        const y = Math.round((p.pos?.[1] ?? 0.5) * 100);
        const r = Math.round(Math.max(32, Math.min(88, (p.radius ?? 0.65) * 72)));
        return `radial-gradient(circle at ${x}% ${y}%, ${hex} 0%, transparent ${r}%)`;
      });
    const bx = Math.round((s.bloomPos?.[0] ?? 0.5) * 100);
    const by = Math.round((s.bloomPos?.[1] ?? 0.4) * 100);
    stops.unshift(`radial-gradient(circle at ${bx}% ${by}%, ${bloomHex} 0%, transparent 68%)`);
    return `background-color: ${baseHex};\nbackground-image:\n  ${stops.join(',\n  ')};`;
  }

  _renderCanvas2D(scene, width, height, time, ptr, grainScale) {
    const ctx = this.ctx2d;
    if (!ctx) return { cpuMs: 0, lastGpuMs: null, width, height };

    const t0 = performance.now();
    const aspect = width / Math.max(1, height);
    const bufH = 108;
    const bufW = Math.max(64, Math.min(256, Math.round(bufH * aspect)));

    if (!this._fallbackCanvas || this._fallbackW !== bufW || this._fallbackH !== bufH) {
      this._fallbackW = bufW;
      this._fallbackH = bufH;
      this._fallbackCanvas =
        typeof document !== 'undefined'
          ? document.createElement('canvas')
          : new OffscreenCanvas(bufW, bufH);
      this._fallbackCanvas.width = bufW;
      this._fallbackCanvas.height = bufH;
      this._fallbackCtx = this._fallbackCanvas.getContext('2d');
      this._fallbackImageData = this._fallbackCtx.createImageData(bufW, bufH);
    }

    const data = this._fallbackImageData.data;
    const [metricX, metricY] = computeIsotropicMetric(width, height);
    const styleCode = styleToIndex(scene.style);
    const isDark = Boolean(scene.isDark);
    const baseLab = scene.baseLab || [0.95, 0, 0];
    const bloomLab = scene.bloomLab || baseLab;
    const bloomPos = scene.bloomPos || [0.5, 0.4];
    const bloomRadius = Math.max(0.05, scene.bloomRadius ?? 0.65);
    const bloomStrength = Math.max(0, scene.bloomStrength ?? 0.5);
    const bridgeDir = scene.bridgeDir || [0, 1];
    const warp = scene.warp || {};
    const warpScale = warp.scale ?? 1.35;
    const warpAmount = warp.amount ?? 0.24;
    const foldStrength = warp.foldStrength ?? 0;
    const phase = warp.phase || [0, 0];
    const flowAngle = warp.flowAngle ?? 0;
    const flowCos = Math.cos(flowAngle);
    const flowSin = Math.sin(flowAngle);
    const lighting = scene.lighting || {};
    const scatterLift = lighting.scatterLift ?? 0.42;
    const chromaPreserve = lighting.chromaPreserve ?? 0.78;
    const vignette = lighting.vignette ?? 0.25;

    const poles = (scene.poles || []).slice(0, 6).map((p, idx) => {
      const stretch = p.stretch || [1, 1];
      const ang = p.angle ?? 0;
      const lab = p.lab || baseLab;
      return {
        L: lab[0],
        a: lab[1],
        b: lab[2],
        chroma: Math.hypot(lab[1], lab[2]),
        posX: (p.pos?.[0] ?? 0.5) + (ptr[0] || 0) * (0.0012 + 0.0003 * idx),
        posY: (p.pos?.[1] ?? 0.5) + (ptr[1] || 0) * (0.0012 + 0.0003 * idx),
        radius: Math.max(0.035, p.radius ?? 0.4),
        softness: Math.min(1.6, Math.max(0.05, p.softness ?? 0.65)),
        invSx: 1 / Math.max(0.08, Math.abs(stretch[0] || 1)),
        invSy: 1 / Math.max(0.08, Math.abs(stretch[1] || 1)),
        cosA: Math.cos(ang),
        sinA: Math.sin(ang),
        weight: p.weight ?? 1.0,
      };
    });

    const baseW = styleCode === 1 ? 0.82 : 0.58;
    const baseChroma = Math.hypot(baseLab[1], baseLab[2]);
    const bloomChroma = Math.hypot(bloomLab[1], bloomLab[2]);

    let offset = 0;
    for (let y = 0; y < bufH; y++) {
      const uvY = (y + 0.5) / bufH;
      for (let x = 0; x < bufW; x++) {
        const uvX = (x + 0.5) / bufW;
        const pmX = (uvX - 0.5) * metricX;
        const pmY = (uvY - 0.5) * metricY;

        const qx = pmX * warpScale + phase[0] + flowCos * time * 0.055;
        const qy = pmY * warpScale + phase[1] + flowSin * time * 0.055;
        const n1 = Math.sin(qx * 2.1 + Math.cos(qy * 1.9 + 0.7)) * 0.65;
        const n2 = Math.cos(qy * 2.0 - Math.sin(qx * 1.8 - 0.4)) * 0.65;
        const wAmt = styleCode === 1 ? warpAmount * 0.5 : warpAmount;
        let wx = n1 * wAmt;
        let wy = n2 * wAmt;

        let silkSheen = 0;
        if (styleCode === 2) {
          const across = -pmX * flowSin + pmY * flowCos;
          const rPhase = across * warpScale * 2.3 + n1 * 1.5 + time * 0.16;
          silkSheen = Math.pow(0.5 + 0.5 * Math.cos(rPhase), 2.25) * Math.min(1.4, foldStrength * 1.85);
          wx += -flowSin * Math.sin(rPhase) * 0.15 * foldStrength;
          wy += flowCos * Math.sin(rPhase) * 0.15 * foldStrength;
        }

        let sumL = baseLab[0] * baseW;
        let sumA = baseLab[1] * baseW;
        let sumB = baseLab[2] * baseW;
        let sumC = baseChroma * baseW;
        let totalW = baseW;

        for (let i = 0; i < poles.length; i++) {
          const p = poles[i];
          if (p.weight <= 0.0001) continue;
          const dx = (uvX - p.posX) * metricX + wx;
          const dy = (uvY - p.posY) * metricY + wy;
          const lx = (dx * p.cosA + dy * p.sinA) * p.invSx;
          const ly = (-dx * p.sinA + dy * p.cosA) * p.invSy;
          const dist = Math.hypot(lx, ly);

          let w = 0;
          if (styleCode === 1) {
            const sphereR = Math.max(0.04, p.radius * 0.52);
            const rNorm = dist / sphereR;
            const blurW = 0.24 + 0.62 * p.softness;
            const t = Math.min(1, Math.max(0, (rNorm - (1 - blurW * 0.85)) / (1.75 * blurW)));
            const disc = 1 - t * t * t * (t * (t * 6 - 15) + 10);
            const halo = Math.exp(-Math.pow(Math.max(1e-4, rNorm) / (1.06 + 0.52 * p.softness), 2.15));
            w = p.weight * (disc * 0.78 + halo * 0.30) * 2.45;
          } else {
            const effR = Math.max(0.035, p.radius * (0.42 + 0.23 * p.softness));
            const expP = Math.max(1.35, 2.05 - 0.46 * p.softness);
            w = p.weight * Math.exp(-Math.pow(Math.max(1e-5, dist / effR), expP)) * 1.62;
          }

          sumL += p.L * w;
          sumA += p.a * w;
          sumB += p.b * w;
          sumC += p.chroma * w;
          totalW += w;
        }

        if (bloomStrength > 0.0001) {
          const bdx = (uvX - bloomPos[0]) * metricX + wx * 0.35;
          const bdy = (uvY - bloomPos[1]) * metricY + wy * 0.35;
          const bNorm = Math.hypot(bdx, bdy) / Math.max(0.05, bloomRadius * 0.68);
          const bf = 0.62 * Math.exp(-Math.pow(Math.max(1e-4, bNorm), 1.65)) + 0.38 / (1 + bNorm * bNorm * 1.35);
          const bw = bloomStrength * bf * (styleCode === 1 ? 1.35 : 1.05);
          sumL += bloomLab[0] * bw;
          sumA += bloomLab[1] * bw;
          sumB += bloomLab[2] * bw;
          sumC += bloomChroma * bw;
          totalW += bw;
        }

        let bL = sumL / totalW;
        let bA = sumA / totalW;
        let bB = sumB / totalW;
        const chromaLoss = Math.max(0, sumC / totalW - Math.hypot(bA, bB));
        const rawLift = Math.max(0, scatterLift);
        const liftGain = rawLift <= 0.22 ? rawLift * 3.2 : 0.704 + (rawLift - 0.22) * 0.85;
        bL += chromaLoss * liftGain + silkSheen * (isDark ? 0.068 : 0.048);
        bA += bridgeDir[0] * chromaLoss * chromaPreserve * 0.42;
        bB += bridgeDir[1] * chromaLoss * chromaPreserve * 0.42;

        if (Math.abs(vignette) > 0.0005) {
          const vx = uvX - 0.5;
          const vy = uvY - 0.5;
          const vt = Math.min(1, Math.max(0, ((vx * vx + vy * vy) * 2.2 - 0.08) / 1.18));
          const vm = vt * vt * (3 - 2 * vt);
          bL -= Math.max(-0.25, Math.min(0.35, vignette)) * vm;
        }

        oklabToSRGBByte(Math.min(1, Math.max(0, bL)), bA, bB, data, offset);
        offset += 4;
      }
    }

    this._fallbackCtx.putImageData(this._fallbackImageData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this._fallbackCanvas, 0, 0, width, height);

    const effectiveGrain = normalizeEffectiveGrain(lighting.grain, grainScale);
    if (effectiveGrain > 0 && typeof document !== 'undefined') {
      this._ensureFallbackGrainTile(scene.seed);
      ctx.save();
      ctx.globalAlpha = Math.min(0.25, effectiveGrain * 1.8);
      ctx.globalCompositeOperation = 'overlay';
      const pattern = ctx.createPattern(this._grainCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }

    const cpuMs = performance.now() - t0;
    this.lastCpuMs = cpuMs;
    this.lastGpuMs = null;

    if (this.onTiming) {
      this.onTiming({ cpuMs, gpuMs: null, width, height, backend: 'canvas2d' });
    }

    return { cpuMs, lastGpuMs: null, width, height };
  }

  _ensureFallbackGrainTile(seed) {
    const seedUint = hashSeed32(seed);
    if (this._grainCanvas && this._grainTileSeed === seedUint) return;
    this._grainTileSeed = seedUint;
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const gctx = c.getContext('2d');
    const img = gctx.createImageData(size, size);
    const d = img.data;
    let s = seedUint || 123456789;
    for (let i = 0; i < d.length; i += 4) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const u1 = (s >>> 8) / 16777216;
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const u2 = (s >>> 8) / 16777216;
      const v = Math.round(127.5 + ((u1 + u2) - 1.0) * 127.0);
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    gctx.putImageData(img, 0, 0);
    this._grainCanvas = c;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this.stopMotion();
    if (this._queryPollRafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._queryPollRafId);
      this._queryPollRafId = 0;
    }

    if (typeof this.canvas?.removeEventListener === 'function') {
      this.canvas.removeEventListener('webglcontextlost', this._onContextLost, false);
      this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored, false);
    }

    const gl = this.gl;
    if (gl && !gl.isContextLost()) {
      for (const q of this._pendingQueries) gl.deleteQuery(q);
      for (const q of this._queryPool) gl.deleteQuery(q);
      if (this._vao) gl.deleteVertexArray(this._vao);
      if (this._program) gl.deleteProgram(this._program);
    }

    this._pendingQueries.length = 0;
    this._queryPool.length = 0;
    this._vao = null;
    this._program = null;
    this.gl = null;
    this.ctx2d = null;
    this._fallbackCanvas = null;
    this._fallbackCtx = null;
    this._fallbackImageData = null;
    this._grainCanvas = null;
    this._lastScene = null;
    this._motionScene = null;
    this._morphFrom = null;
    this._morphScratch = null;
  }
}

export default SphereRenderer;

export { SphereRenderer as AuraRenderer };
