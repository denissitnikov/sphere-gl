function hashSeed32(seedStr) {
  const s = String(seedStr ?? 'sphere-default');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

function oklabToSRGBByte(L, a, b, out, offset) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

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

function ensureGrainTile(state, seed) {
  const seedUint = hashSeed32(seed);
  if (state.grainCanvas && state.grainTileSeed === seedUint) return state.grainCanvas;
  state.grainTileSeed = seedUint;
  const size = 128;
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(size, size);
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
    const v = Math.round(127.5 + (u1 + u2 - 1.0) * 127.0);
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  gctx.putImageData(img, 0, 0);
  state.grainCanvas = c;
  return c;
}

const STYLE_CODES = { mesh: 0, sphere: 1, silk: 2, caustic: 3, fluted: 4, prism: 5, topo: 6 };

export function renderCanvas2DFallback(ctx, state, scene, width, height, time = 0, ptr = [0, 0], grainScale = 1.0) {
  if (!ctx || !scene) return { cpuMs: 0, lastGpuMs: null, width, height };

  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const aspect = width / Math.max(1, height);
  const bufH = 108;
  const bufW = Math.max(64, Math.min(256, Math.round(bufH * aspect)));

  if (!state.canvas || state.w !== bufW || state.h !== bufH) {
    state.w = bufW;
    state.h = bufH;
    state.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(bufW, bufH);
    state.canvas.width = bufW;
    state.canvas.height = bufH;
    state.ctx = state.canvas.getContext('2d');
    state.imageData = state.ctx.createImageData(bufW, bufH);
  }

  const data = state.imageData.data;
  const minDim = Math.max(1, Math.min(width, height));
  const refDim = minDim + (Math.sqrt(Math.max(1, width * height)) - minDim) * 0.22;
  const metricX = width / refDim;
  const metricY = height / refDim;

  const styleCode = STYLE_CODES[scene.style] ?? 0;
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
      } else if (styleCode === 4) {
        const across = -pmX * flowSin + pmY * flowCos;
        const rib = Math.sin(((across * 22) % 1) * Math.PI * 2);
        wx += -flowSin * rib * 0.038;
        wy += flowCos * rib * 0.038;
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
          w = p.weight * (disc * 0.78 + halo * 0.3) * 2.45;
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

  state.ctx.putImageData(state.imageData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(state.canvas, 0, 0, width, height);

  const rawGrain = Math.max(0, Number.isFinite(lighting.grain) ? lighting.grain : 0.024);
  const gScale = Math.max(0, Number.isFinite(grainScale) ? grainScale : 1.0);
  const effGrain = gScale === 0 ? 0 : Math.max(1 / 255, rawGrain * gScale);
  if (effGrain > 0 && (typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined')) {
    const tile = ensureGrainTile(state, scene.seed);
    ctx.save();
    ctx.globalAlpha = Math.min(0.25, effGrain * 1.8);
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  const cpuMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  return { cpuMs, lastGpuMs: null, width, height };
}

export default renderCanvas2DFallback;
