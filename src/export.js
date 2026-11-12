import { clamp, clampToP3Oklab, oklabToLinearP3, oklabToSrgbHex, parseCssColorBytes, srgbEncode } from './palettes.js';

const DEG = Math.PI / 180;
const inG = (c) => c[0] >= 0 && c[0] <= 1 && c[1] >= 0 && c[1] <= 1 && c[2] >= 0 && c[2] <= 1;

export function oklabToP3Css(L, a, b, alpha = 1) {
  const l = clamp(+L || 0, 0, 1), na = +a || 0, nb = +b || 0;
  let c = oklabToLinearP3(l, na, nb);
  if (!inG(c)) c = oklabToLinearP3(...clampToP3Oklab(l, Math.hypot(na, nb), Math.atan2(nb, na) / DEG));
  return `color(display-p3 ${c.map((v) => Math.round(srgbEncode(v) * 1e4) / 1e4).join(' ')}${alpha < 1 ? ` / ${alpha}` : ''})`;
}

function resolveHex(hex, lab, fallback = '#808080') {
  if (typeof hex === 'string' && hex) return hex;
  return Array.isArray(lab) && lab.length >= 3 ? oklabToSrgbHex(lab[0], lab[1], lab[2]) : fallback;
}

function oklabMidHex(labA, labB, t) {
  return oklabToSrgbHex(
    labA[0] + (labB[0] - labA[0]) * t,
    labA[1] + (labB[1] - labA[1]) * t,
    labA[2] + (labB[2] - labA[2]) * t,
  );
}

function buildCssLayers(scene, space = 'oklab') {
  if (!scene) return [];
  const sp = space !== 'srgb' ? ' in oklab' : '';
  const mk = (rx, ry, x, y, lab, hex, al) => {
    if (space === 'p3' && Array.isArray(lab)) {
      return `radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}% in oklab, ${oklabToP3Css(...lab, al)} 0%, ${oklabToP3Css(...lab, 0)} 100%)`;
    }
    const c = parseCssColorBytes(hex || oklabToSrgbHex(...(lab || scene.baseLab))) || [128, 128, 128];
    return `radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%${sp}, rgba(${c[0]}, ${c[1]}, ${c[2]}, ${al}) 0%, rgba(${c[0]}, ${c[1]}, ${c[2]}, 0) 100%)`;
  };
  const out = (scene.poles || []).filter((p) => (p.weight ?? 1) > 0.04).map((p) => {
    const br = clamp((p.radius ?? 0.65) * 68, 24, 92);
    const sx = Math.max(0.25, Math.abs(p.stretch?.[0] ?? 1));
    const sy = Math.max(0.25, Math.abs(p.stretch?.[1] ?? 1));
    const ca = Math.cos(p.angle ?? 0), sa = Math.sin(p.angle ?? 0);
    return mk(
      Math.round(clamp(br * Math.hypot(sx * ca, sy * sa), 18, 125)),
      Math.round(clamp(br * Math.hypot(sx * sa, sy * ca), 18, 125)),
      Math.round((p.pos?.[0] ?? 0.5) * 100),
      Math.round((p.pos?.[1] ?? 0.5) * 100),
      p.lab,
      p.hex,
      Math.round(clamp((p.weight ?? 1) * 0.68, 0.16, 0.88) * 100) / 100,
    );
  });
  const br = Math.round(clamp((scene.bloomRadius ?? 0.65) * 74, 34, 96));
  out.splice(
    Math.min(2, out.length),
    0,
    mk(
      br,
      br,
      Math.round((scene.bloomPos?.[0] ?? 0.5) * 100),
      Math.round((scene.bloomPos?.[1] ?? 0.4) * 100),
      scene.bloomLab,
      scene.bloomHex || scene.baseHex,
      Math.round(clamp((scene.bloomStrength ?? 0.45) * 0.64, 0.12, 0.62) * 100) / 100,
    ),
  );
  return out;
}

export function exportCSS(sceneOrRenderer) {
  const s = sceneOrRenderer?._lastScene ? sceneOrRenderer._lastScene : sceneOrRenderer;
  if (!s) return '';
  const bh = resolveHex(s.baseHex, s.baseLab, '#F5F4F0');
  const p3Base = Array.isArray(s.baseLab) ? oklabToP3Css(...s.baseLab) : bh;
  return `background-color: ${bh};\nbackground-image:\n  ${buildCssLayers(s, 'oklab').join(',\n  ')};\n\n@supports (color: color(display-p3 1 1 1)) and (background: linear-gradient(in oklab, red, blue)) {\n  background-color: ${p3Base};\n  background-image:\n    ${buildCssLayers(s, 'p3').join(',\n    ')};\n}\n\n@supports not (background: linear-gradient(in oklab, red, blue)) {\n  background-image:\n    ${buildCssLayers(s, 'srgb').join(',\n    ')};\n}`;
}

export function exportSVG(scene, { width = 3840, height = 2160, grainScale = 1.0 } = {}) {
  const s = scene?._lastScene ? scene._lastScene : scene;
  if (!s) throw new Error('exportSVG requires a valid scene.');
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const baseLab = s.baseLab || [0.95, 0, 0];
  const baseHex = resolveHex(s.baseHex, baseLab, '#f7f5f0');
  const bloomLab = s.bloomLab || baseLab;
  const bloomHex = resolveHex(s.bloomHex, bloomLab, baseHex);
  const bloomMid = oklabMidHex(bloomLab, baseLab, 0.5);

  const activePoles = (s.poles || []).filter((p) => (p.weight ?? 1) > 0.02);
  const defs = [], shapes = [];

  const bx = ((s.bloomPos?.[0] ?? 0.5) * w).toFixed(1), by = ((s.bloomPos?.[1] ?? 0.4) * h).toFixed(1);
  const br = (Math.max(0.2, s.bloomRadius ?? 0.65) * Math.max(w, h) * 0.68).toFixed(1);
  const bop = clamp((s.bloomStrength ?? 0.45) * 0.78, 0.14, 0.72).toFixed(2);
  defs.push(
    `<radialGradient id="sp-bloom" cx="50%" cy="50%" r="50%" color-interpolation="linearRGB"><stop offset="0%" stop-color="${bloomHex}" stop-opacity="${bop}"/><stop offset="55%" stop-color="${bloomMid}" stop-opacity="${(+bop * 0.4).toFixed(2)}"/><stop offset="100%" stop-color="${bloomHex}" stop-opacity="0"/></radialGradient>`,
  );
  shapes.push(`<circle cx="${bx}" cy="${by}" r="${br}" fill="url(#sp-bloom)"/>`);

  activePoles.forEach((p, idx) => {
    const id = `sp-g-${idx}`, pLab = p.lab || baseLab;
    const hex = resolveHex(p.hex, pLab, baseHex), midHex = oklabMidHex(pLab, baseLab, 0.45);
    const cx = ((p.pos?.[0] ?? 0.5) * w).toFixed(1), cy = ((p.pos?.[1] ?? 0.5) * h).toFixed(1);
    const rx = (Math.max(0.12, p.radius ?? 0.6) * (p.stretch?.[0] ?? 1) * Math.max(w, h) * 0.62).toFixed(1);
    const ry = (Math.max(0.12, p.radius ?? 0.6) * (p.stretch?.[1] ?? 1) * Math.max(w, h) * 0.62).toFixed(1);
    const deg = (((p.angle ?? 0) * 180) / Math.PI).toFixed(1);
    const op = clamp((p.weight ?? 1) * 0.7, 0.2, 0.92).toFixed(2);
    defs.push(
      `<radialGradient id="${id}" cx="50%" cy="50%" r="50%" color-interpolation="linearRGB"><stop offset="0%" stop-color="${hex}" stop-opacity="${op}"/><stop offset="52%" stop-color="${midHex}" stop-opacity="${(+op * 0.45).toFixed(2)}"/><stop offset="100%" stop-color="${hex}" stop-opacity="0"/></radialGradient>`,
    );
    shapes.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${deg} ${cx} ${cy})" fill="url(#${id})"/>`);
  });

  const grainOp = clamp(0.032 * (grainScale ?? 1), 0, 0.14).toFixed(3);
  const grainLayer = +grainOp > 0.002
    ? `<filter id="sp-grain"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="${w}" height="${h}" filter="url(#sp-grain)" opacity="${grainOp}" style="mix-blend-mode:overlay"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" color-interpolation="linearRGB"><defs>${defs.join('')}</defs><rect width="${w}" height="${h}" fill="${baseHex}"/>${shapes.join('')}${grainLayer}</svg>`;
}

function create2DExportSurface(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && typeof OffscreenCanvas.prototype.convertToBlob === 'function') return new OffscreenCanvas(w, h);
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  throw new Error('Cannot allocate 2D export surface in this environment.');
}

async function encodeSurfaceBlob(surface, mime, quality, fmt, degraded) {
  const blob = typeof surface.convertToBlob === 'function'
    ? await surface.convertToBlob({ type: mime, quality })
    : await new Promise((res, rej) => surface.toBlob((b) => (b ? res(b) : rej(new Error(`${fmt.toUpperCase()} encode failed.`))), mime, quality));
  Object.defineProperty(blob, 'degraded', { value: Boolean(degraded), enumerable: true });
  return blob;
}

function ensureExportFbo(renderer, gl, reqW, reqH) {
  if (!renderer._ef || !renderer._er) {
    renderer._ef = gl.createFramebuffer();
    renderer._er = gl.createRenderbuffer();
    renderer._ew = renderer._eh = 0;
  }
  if (renderer._ew < reqW || renderer._eh < reqH) {
    const capW = Math.max(renderer._ew, reqW), capH = Math.max(renderer._eh, reqH);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderer._er);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, capW, capH);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer._ef);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderer._er);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    if (!ok) return false;
    renderer._ew = capW;
    renderer._eh = capH;
  }
  return true;
}

function flipRowsRgbaInPlace(bytes, w, h) {
  const u32 = new Uint32Array(bytes.buffer, bytes.byteOffset, w * h), halfH = h >> 1;
  for (let y = 0; y < halfH; y++) {
    const topOff = y * w, botOff = (h - 1 - y) * w;
    for (let x = 0; x < w; x++) { const tmp = u32[topOff + x]; u32[topOff + x] = u32[botOff + x]; u32[botOff + x] = tmp; }
  }
}

let _sharedExportRenderer = null;
async function getSharedRenderer() {
  if (_sharedExportRenderer && !_sharedExportRenderer._destroyed) return _sharedExportRenderer;
  const { SphereRenderer } = await import('./shader.js');
  _sharedExportRenderer = new SphereRenderer(create2DExportSurface(64, 64), { maxDpr: 1 });
  return _sharedExportRenderer;
}

export async function exportImage(rendererOrScene, sceneOrOpts = {}, maybeOpts = {}) {
  const isRenderer = Boolean(rendererOrScene && typeof rendererOrScene.render === 'function');
  const renderer = isRenderer ? rendererOrScene : null;
  const targetScene = isRenderer ? (sceneOrOpts || renderer._lastScene) : rendererOrScene;
  const opts = (isRenderer ? maybeOpts : sceneOrOpts) || {};
  if (!targetScene) throw new Error('exportImage requires a valid scene.');

  const { width = 3840, height = 2160, format = 'png', quality = 0.94, grainScale = 1.0, time = 0, pointer = [0, 0], whisper = 0.0, strict = false, onDegraded = null } = opts;
  const fmt = String(format || 'png').trim().toLowerCase(), w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));

  if (fmt === 'svg') {
    const blob = new Blob([exportSVG(targetScene, { width: w, height: h, grainScale })], { type: 'image/svg+xml;charset=utf-8' });
    Object.defineProperty(blob, 'degraded', { value: false, enumerable: true });
    return blob;
  }

  const mime = fmt === 'webp' ? 'image/webp' : fmt === 'jpg' || fmt === 'jpeg' ? 'image/jpeg' : 'image/png';
  const activeRenderer = renderer || (await getSharedRenderer());
  const gl = activeRenderer?.gl, outSurface = create2DExportSurface(w, h), ctx2d = outSurface.getContext('2d', { alpha: false });

  if (gl && !gl.isContextLost()) {
    const maxRb = Math.max(256, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096);
    const tileMaxW = Math.min(w, maxRb), tileMaxH = Math.min(h, maxRb);
    if (ensureExportFbo(activeRenderer, gl, tileMaxW, tileMaxH) && ctx2d) {
      const pixelBuf = new Uint8ClampedArray(tileMaxW * tileMaxH * 4);
      try {
        for (let ty = 0; ty < h; ty += tileMaxH) {
          const th = Math.min(tileMaxH, h - ty);
          for (let tx = 0; tx < w; tx += tileMaxW) {
            const tw = Math.min(tileMaxW, w - tx);
            activeRenderer.render(targetScene, { time, pointer, grainScale, whisper, sync: true, _exportTile: { fbo: activeRenderer._ef, fullW: w, fullH: h, tx, ty, tw, th } });
            const view = tw * th * 4 === pixelBuf.length ? pixelBuf : pixelBuf.subarray(0, tw * th * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, activeRenderer._ef);
            gl.readPixels(0, 0, tw, th, gl.RGBA, gl.UNSIGNED_BYTE, view);
            flipRowsRgbaInPlace(view, tw, th);
            ctx2d.putImageData(new ImageData(new Uint8ClampedArray(view), tw, th), tx, ty);
          }
        }
      } finally {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth || activeRenderer.canvas.width || 1, gl.drawingBufferHeight || activeRenderer.canvas.height || 1);
      }
      return encodeSurfaceBlob(outSurface, mime, quality, fmt, false);
    }
  }

  if (strict) throw new Error('exportImage: WebGL2 context unavailable for full-resolution export.');
  const { renderCanvas2DFallback } = await import('./fallback.js');
  renderCanvas2DFallback(ctx2d, activeRenderer?._fs || {}, targetScene, w, h, time, pointer, grainScale);
  onDegraded?.({ degraded: true, reason: 'webgl2-unavailable' });
  return encodeSurfaceBlob(outSurface, mime, quality, fmt, true);
}

export async function exportPNG(rendererOrScene, sceneOrOpts = {}, maybeOpts = {}) {
  return rendererOrScene && typeof rendererOrScene.render === 'function'
    ? exportImage(rendererOrScene, sceneOrOpts, { ...maybeOpts, format: 'png' })
    : exportImage(rendererOrScene, { ...sceneOrOpts, format: 'png' });
}
