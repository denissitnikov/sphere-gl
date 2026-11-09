#!/usr/bin/env node
/**
 * Synthesizes genuine high-res showcase & Open Graph images from sphere-gl's
 * exact OKLCH/OKLab + C2 quintic sphere + domain-warped mesh + PCG grain math.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateScene, oklabToLinearSrgb, srgbHexToOklab } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

function smootherstep01(x) {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// 2D Simplex noise matching shader.js
function permute3(x, y, z) {
  const mod289 = (v) => v - Math.floor(v / 289) * 289;
  return [
    mod289((x * 34 + 10) * x),
    mod289((y * 34 + 10) * y),
    mod289((z * 34 + 10) * z),
  ];
}

function snoise(vx, vy) {
  const C0 = 0.211324865405187;
  const C1 = 0.366025403784439;
  const C2 = -0.577350269189626;
  const C3 = 0.024390243902439;

  const s = (vx + vy) * C1;
  let ix = Math.floor(vx + s);
  let iy = Math.floor(vy + s);
  const t = (ix + iy) * C0;
  const x0 = vx - ix + t;
  const y0 = vy - iy + t;

  const i1x = x0 > y0 ? 1 : 0;
  const i1y = x0 > y0 ? 0 : 1;

  const x1 = x0 - i1x + C0;
  const y1 = y0 - i1y + C0;
  const x2 = x0 + C2;
  const y2 = y0 + C2;

  ix -= Math.floor(ix / 289) * 289;
  iy -= Math.floor(iy / 289) * 289;

  const p1 = permute3(iy, iy + i1y, iy + 1);
  const p = permute3(p1[0] + ix, p1[1] + ix + i1x, p1[2] + ix + 1);

  let m0 = Math.max(0.5 - (x0 * x0 + y0 * y0), 0);
  let m1 = Math.max(0.5 - (x1 * x1 + y1 * y1), 0);
  let m2 = Math.max(0.5 - (x2 * x2 + y2 * y2), 0);
  m0 = m0 * m0 * m0 * m0;
  m1 = m1 * m1 * m1 * m1;
  m2 = m2 * m2 * m2 * m2;

  const frac = (v) => v - Math.floor(v);
  const grad = (pv, gx, gy) => {
    const xx = 2 * frac(pv * C3) - 1;
    const hh = Math.abs(xx) - 0.5;
    const ox = Math.floor(xx + 0.5);
    const a0 = xx - ox;
    const inv = 1.79284291400159 - 0.85373472095314 * (a0 * a0 + hh * hh);
    return inv * (a0 * gx + hh * gy);
  };

  return 130 * (m0 * grad(p[0], x0, y0) + m1 * grad(p[1], x1, y1) + m2 * grad(p[2], x2, y2));
}

function pcgGrain(x, y, seed) {
  let h = (Math.imul(x >>> 0, 1664525) + Math.imul(y >>> 0, 1013904223) + (seed >>> 0)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  const u1 = (h & 0xffff) / 65535;
  const u2 = ((h >>> 16) & 0xffff) / 65535;
  return u1 + u2 - 1.0;
}

function softGamutAndEncode(L, a, b, grainVal) {
  let [r, g, bl] = oklabToLinearSrgb(L, a, b);
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

  const enc = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  let sr = enc(r);
  let sg = enc(g);
  let sb = enc(bl);

  const luma = 0.299 * sr + 0.587 * sg + 0.114 * sb;
  const em = 0.58 + 0.42 * Math.min(1, Math.max(0, 4 * luma * (1 - luma)));
  const dg = grainVal * em;
  sr = Math.min(1, Math.max(0, sr + dg));
  sg = Math.min(1, Math.max(0, sg + dg));
  sb = Math.min(1, Math.max(0, sb + dg));

  return [Math.round(sr * 255), Math.round(sg * 255), Math.round(sb * 255)];
}

function renderSceneToPPM(scene, width, height, outPath, grainScale = 1.45) {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  const pixels = Buffer.alloc(width * height * 3);

  const minDim = Math.min(width, height);
  const geomDim = Math.sqrt(width * height);
  const refDim = minDim + (geomDim - minDim) * 0.22;
  const metricX = width / refDim;
  const metricY = height / refDim;

  const styleCode = scene.style === 'sphere' ? 1 : scene.style === 'silk' ? 2 : 0;
  const isDark = scene.isDark ? 1 : 0;
  const [px, py] = scene.warp.phase;
  const wScale = scene.warp.scale;
  const wAmt = scene.warp.amount;
  const flowCos = Math.cos(scene.warp.flowAngle);
  const flowSin = Math.sin(scene.warp.flowAngle);
  const foldStr = scene.warp.foldStrength;
  const effGrain = scene.lighting.grain * grainScale;

  const prePoles = scene.poles.map((p) => ({
    ...p,
    invSx: 1 / Math.max(0.08, p.stretch[0]),
    invSy: 1 / Math.max(0.08, p.stretch[1]),
    cosA: Math.cos(p.angle),
    sinA: Math.sin(p.angle),
  }));

  let idx = 0;
  for (let y = 0; y < height; y++) {
    const uvy = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const uvx = (x + 0.5) / width;
      const pMetricX = (uvx - 0.5) * metricX;
      const pMetricY = (uvy - 0.5) * metricY;

      // Warp
      let wx = 0;
      let wy = 0;
      if (styleCode === 1) {
        const qx = pMetricX * wScale + px;
        const qy = pMetricY * wScale + py;
        wx = snoise(qx, qy) * wAmt;
        wy = snoise(qx + 31.4, qy - 17.8) * wAmt;
      } else {
        const qx = pMetricX * wScale + px;
        const qy = pMetricY * wScale + py;
        const n1x = snoise(qx, qy);
        const n1y = snoise(qx + 43.1, qy - 29.7);
        const q2x = (pMetricX + 0.38 * n1x) * (wScale * 1.85) - py * 0.6;
        const q2y = (pMetricY + 0.38 * n1y) * (wScale * 1.85) + px * 0.6;
        const n2x = snoise(q2x, q2y);
        const n2y = snoise(q2x - 19.3, q2y + 51.2);
        wx = (0.68 * n1x + 0.32 * n2x) * wAmt;
        wy = (0.68 * n1y + 0.32 * n2y) * wAmt;
      }

      let silkSheen = 0;
      let silkTrough = 0;
      if (styleCode === 2 && foldStr > 0) {
        const cross = -(pMetricX + wx) * flowSin + (pMetricY + wy) * flowCos;
        const wave = Math.sin(cross * 6.8 + snoise(pMetricX * 1.4, pMetricY * 1.4) * 1.5);
        wx += flowCos * wave * foldStr * 0.16;
        wy += flowSin * wave * foldStr * 0.16;
        silkSheen = Math.pow(Math.max(0, wave), 3) * foldStr * 2.1;
        silkTrough = Math.pow(Math.max(0, -wave), 2) * foldStr * 1.5;
      }

      const baseW = styleCode === 1 ? 0.42 : styleCode === 0 ? 0.52 : 0.46;
      let sumL = scene.baseLab[0] * baseW;
      let sumA = scene.baseLab[1] * baseW;
      let sumB = scene.baseLab[2] * baseW;
      let sumC = Math.hypot(scene.baseLab[1], scene.baseLab[2]) * baseW;
      let totalW = baseW;

      for (let i = 0; i < 6; i++) {
        const p = prePoles[i];
        if (p.weight <= 0.0001) continue;
        const dx = (uvx - p.pos[0]) * metricX + wx;
        const dy = (uvy - p.pos[1]) * metricY + wy;
        const rx = (dx * p.cosA + dy * p.sinA) * p.invSx;
        const ry = (-dx * p.sinA + dy * p.cosA) * p.invSy;
        const dist = Math.hypot(rx, ry);

        let w = 0;
        let poleL = p.lab[0];
        if (styleCode === 1) {
          const R = p.radius * 0.56;
          const blur = R * (0.48 + 0.62 * p.softness);
          const dome = smootherstep01((R + blur - dist) / Math.max(1e-4, 2 * blur));
          const halo = Math.exp(-Math.pow(dist / Math.max(0.08, R + blur * 0.85), 1.85)) * 0.44;
          w = p.weight * (dome * 1.18 + halo);

          const toBx = scene.bloomPos[0] - p.pos[0];
          const toBy = scene.bloomPos[1] - p.pos[1];
          const toBLen = Math.hypot(toBx, toBy) || 1;
          const relDot = ((uvx - p.pos[0]) * (toBx / toBLen) + (uvy - p.pos[1]) * (toBy / toBLen)) / Math.max(0.2, R);
          poleL = Math.min(0.99, Math.max(0.02, poleL + Math.max(-0.5, Math.min(0.6, relDot)) * (isDark ? 0.065 : 0.045)));
        } else {
          const rEff = p.radius * (0.50 + 0.28 * p.softness);
          const expP = 1.68 + (1 - Math.min(1, p.softness)) * 0.55;
          w = p.weight * Math.exp(-Math.pow(dist / Math.max(0.05, rEff), expP));
        }

        sumL += poleL * w;
        sumA += p.lab[1] * w;
        sumB += p.lab[2] * w;
        sumC += Math.hypot(p.lab[1], p.lab[2]) * w;
        totalW += w;
      }

      if (scene.bloomStrength > 0.0001) {
        const bdx = (uvx - scene.bloomPos[0]) * metricX + wx * 0.35;
        const bdy = (uvy - scene.bloomPos[1]) * metricY + wy * 0.35;
        const bNorm = Math.hypot(bdx, bdy) / Math.max(0.05, scene.bloomRadius * 0.68);
        const bf = 0.62 * Math.exp(-Math.pow(Math.max(1e-4, bNorm), 1.65)) + 0.38 / (1 + bNorm * bNorm * 1.35);
        const bw = scene.bloomStrength * bf * (styleCode === 1 ? 1.35 : 1.05);
        sumL += scene.bloomLab[0] * bw;
        sumA += scene.bloomLab[1] * bw;
        sumB += scene.bloomLab[2] * bw;
        sumC += Math.hypot(scene.bloomLab[1], scene.bloomLab[2]) * bw;
        totalW += bw;
      }

      let bL = sumL / totalW;
      let bA = sumA / totalW;
      let bB = sumB / totalW;
      const avgC = sumC / totalW;

      const chromaLoss = Math.max(0, avgC - Math.hypot(bA, bB));
      const rawLift = Math.max(0, scene.lighting.scatterLift);
      const liftGain = rawLift <= 0.22 ? rawLift * 3.2 : 0.704 + (rawLift - 0.22) * 0.85;
      bL += chromaLoss * liftGain;
      bA += scene.bridgeDir[0] * (chromaLoss * scene.lighting.chromaPreserve * 0.42);
      bB += scene.bridgeDir[1] * (chromaLoss * scene.lighting.chromaPreserve * 0.42);

      if (styleCode === 2) {
        bL += silkSheen * (isDark ? 0.078 : 0.052) - silkTrough * (isDark ? 0.036 : 0.020);
        bA *= 1 + silkSheen * 0.07;
        bB *= 1 + silkSheen * 0.07;
      }

      const vig = scene.lighting.vignette;
      const vx = uvx - 0.5;
      const vy = uvy - 0.5;
      const vigMask = smootherstep01(((vx * vx + vy * vy) * 2.2 - 0.08) / 1.18);
      bL = Math.min(1, Math.max(0, bL - vig * vigMask));

      const g = pcgGrain(x, y, 0x9e3779b9) * effGrain;
      const [r8, g8, b8] = softGamutAndEncode(bL, bA, bB, g);
      pixels[idx++] = r8;
      pixels[idx++] = g8;
      pixels[idx++] = b8;
    }
  }

  fs.writeFileSync(outPath, Buffer.concat([header, pixels]));
}

function renderComparisonPPM(width, height, outPath) {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  const pixels = Buffer.alloc(width * height * 3);

  const hexLeft = '#2563EB';   // Cerulean Blue
  const hexRight = '#FF7A2F';  // Sunset Tangerine
  const labLeft = srgbHexToOklab(hexLeft);
  const labRight = srgbHexToOklab(hexRight);

  // sRGB bytes
  const srgbL = [0x25, 0x63, 0xeb];
  const srgbR = [0xff, 0x7a, 0x2f];

  const halfW = Math.floor(width / 2);
  let idx = 0;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      // Divider line in center
      if (Math.abs(x - halfW) <= 2) {
        pixels[idx++] = 15;
        pixels[idx++] = 20;
        pixels[idx++] = 32;
        continue;
      }

      const isRightPanel = x > halfW;
      const localX = isRightPanel ? (x - halfW) / (width - halfW) : x / halfW;
      // Smooth horizontal + radial blend factor
      const t = smootherstep01(Math.min(1, Math.max(0, (localX - 0.08) / 0.84)));
      const g = pcgGrain(x, y, 42) * 0.022;

      if (!isRightPanel) {
        // Naive sRGB mix (demonstrating muddy desaturated gray-brown center)
        const r = Math.round(srgbL[0] * (1 - t) + srgbR[0] * t);
        const gr = Math.round(srgbL[1] * (1 - t) + srgbR[1] * t);
        const b = Math.round(srgbL[2] * (1 - t) + srgbR[2] * t);
        pixels[idx++] = r;
        pixels[idx++] = gr;
        pixels[idx++] = b;
      } else {
        // sphere-gl OKLab + Chroma-Loss Scatter Lift + Periwinkle/Peach Bridge
        const bloomBell = Math.exp(-Math.pow((localX - 0.5) / 0.28, 2)) * Math.exp(-Math.pow((ny - 0.42) / 0.55, 2));
        let L = labLeft[0] * (1 - t) + labRight[0] * t + bloomBell * 0.13;
        let a = labLeft[1] * (1 - t) + labRight[1] * t;
        let b = labLeft[2] * (1 - t) + labRight[2] * t;
        const avgC = Math.hypot(labLeft[1], labLeft[2]) * (1 - t) + Math.hypot(labRight[1], labRight[2]) * t;
        const cLoss = Math.max(0, avgC - Math.hypot(a, b));
        L = Math.min(0.985, L + cLoss * 0.48);
        // Rose-periwinkle bridge vector (-30 deg)
        a += Math.cos((-28 * Math.PI) / 180) * cLoss * 0.30;
        b += Math.sin((-28 * Math.PI) / 180) * cLoss * 0.30;
        const [r8, g8, b8] = softGamutAndEncode(L, a, b, g);
        pixels[idx++] = r8;
        pixels[idx++] = g8;
        pixels[idx++] = b8;
      }
    }
  }

  fs.writeFileSync(outPath, Buffer.concat([header, pixels]));
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sphere-gl-assets-'));

// 1. Render 3 signature panels + OG base
const sMesh = generateScene({ seed: '7K9P2M', style: 'mesh', archetype: 'alabaster-honey' });
const sSphere = generateScene({ seed: '4R8W3X', style: 'sphere', archetype: 'cerulean-tangerine' });
const sSilk = generateScene({ seed: '9M2V6D', style: 'silk', archetype: 'electric-sapphire' });

const ppm1 = path.join(tmpDir, 'p1.ppm');
const ppm2 = path.join(tmpDir, 'p2.ppm');
const ppm3 = path.join(tmpDir, 'p3.ppm');
const ppmOg = path.join(tmpDir, 'og.ppm');
const ppmCmp = path.join(tmpDir, 'cmp.ppm');

renderSceneToPPM(sMesh, 640, 440, ppm1);
renderSceneToPPM(sSphere, 640, 440, ppm2);
renderSceneToPPM(sSilk, 640, 440, ppm3);
renderSceneToPPM(sSphere, 1200, 630, ppmOg);
renderComparisonPPM(1600, 460, ppmCmp);

// Convert PPMs to PNG via sips so AppKit/CoreGraphics can composite crisp typography & rounded cards
for (const base of ['p1', 'p2', 'p3', 'og', 'cmp']) {
  execFileSync('/usr/bin/sips', ['-s', 'format', 'png', path.join(tmpDir, `${base}.ppm`), '--out', path.join(tmpDir, `${base}.png`)], { stdio: 'ignore' });
}

const swiftScript = `
import AppKit

func saveJPEG(_ image: NSImage, to path: String, quality: CGFloat = 0.92) {
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: quality]) else {
        fatalError("Failed to encode JPEG: \\(path)")
    }
    try! jpg.write(to: URL(fileURLWithPath: path))
}

func drawPill(text: String, at point: NSPoint, darkBg: Bool = true) {
    let font = NSFont.systemFont(ofSize: 15, weight: .semibold)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor.white
    ]
    let size = (text as NSString).size(withAttributes: attrs)
    let rect = NSRect(x: point.x, y: point.y, width: size.width + 26, height: size.height + 12)
    let path = NSBezierPath(roundedRect: rect, xRadius: rect.height / 2, yRadius: rect.height / 2)
    (darkBg ? NSColor(calibratedRed: 0.05, green: 0.07, blue: 0.12, alpha: 0.72) : NSColor(calibratedWhite: 0, alpha: 0.55)).setFill()
    path.fill()
    NSColor(calibratedWhite: 1.0, alpha: 0.20).setStroke()
    path.lineWidth = 1
    path.stroke()
    (text as NSString).draw(at: NSPoint(x: rect.minX + 13, y: rect.minY + 6), withAttributes: attrs)
}

let tmp = "${tmpDir}"
let out = "${assetsDir}"

// 1. 3-up Showcase Banner (1980 x 500)
let bannerW: CGFloat = 1980
let bannerH: CGFloat = 480
let banner = NSImage(size: NSSize(width: bannerW, height: bannerH))
banner.lockFocus()
NSColor(calibratedRed: 0.043, green: 0.058, blue: 0.098, alpha: 1.0).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: bannerW, height: bannerH)).fill()

let cardW: CGFloat = 632
let cardH: CGFloat = 440
let gap: CGFloat = 21
let labels = [
    ("Mesh · Light (Alabaster & Honey)", "p1.png"),
    ("Sphere · Split (Cerulean & Tangerine)", "p2.png"),
    ("Silk · Dark (Electric Sapphire)", "p3.png")
]

for (idx, item) in labels.enumerated() {
    let x = 21 + CGFloat(idx) * (cardW + gap)
    let rect = NSRect(x: x, y: 20, width: cardW, height: cardH)
    NSGraphicsContext.current?.saveGraphicsState()
    let clip = NSBezierPath(roundedRect: rect, xRadius: 22, yRadius: 22)
    clip.addClip()
    if let img = NSImage(contentsOfFile: tmp + "/" + item.1) {
        img.draw(in: rect)
    }
    NSGraphicsContext.current?.restoreGraphicsState()
    NSColor(calibratedWhite: 1.0, alpha: 0.14).setStroke()
    clip.lineWidth = 1.5
    clip.stroke()
    drawPill(text: item.0, at: NSPoint(x: x + 18, y: 36))
}
banner.unlockFocus()
saveJPEG(banner, to: out + "/banner-showcase.jpg", quality: 0.92)

// 2. sRGB vs OKLab Scatter Comparison (1600 x 460)
if let cmpImg = NSImage(contentsOfFile: tmp + "/cmp.png") {
    let canvas = NSImage(size: NSSize(width: 1600, height: 460))
    canvas.lockFocus()
    cmpImg.draw(in: NSRect(x: 0, y: 0, width: 1600, height: 460))
    drawPill(text: "✗ Naive sRGB Mix (Muddy Gray Midtones)", at: NSPoint(x: 24, y: 24))
    drawPill(text: "✓ sphere-gl OKLab + Scatter Lift (Luminous Horizon)", at: NSPoint(x: 824, y: 24))
    canvas.unlockFocus()
    saveJPEG(canvas, to: out + "/oklab-vs-srgb.jpg", quality: 0.92)
}

// 3. Open Graph Card (1200 x 630)
if let ogBase = NSImage(contentsOfFile: tmp + "/og.png") {
    let og = NSImage(size: NSSize(width: 1200, height: 630))
    og.lockFocus()
    ogBase.draw(in: NSRect(x: 0, y: 0, width: 1200, height: 630))

    drawPill(text: "sphere-gl · MIT Open Source · 22 KB gzip · 0% Idle GPU", at: NSPoint(x: 64, y: 526))

    let titleFont = NSFont.systemFont(ofSize: 66, weight: .bold)
    let titleAttrs: [NSAttributedString.Key: Any] = [
        .font: titleFont,
        .foregroundColor: NSColor(calibratedRed: 0.06, green: 0.09, blue: 0.16, alpha: 1.0),
        .kern: -2.2
    ]
    ("Fresh studio canvas\\non every visit." as NSString).draw(in: NSRect(x: 64, y: 250, width: 920, height: 210), withAttributes: titleAttrs)

    let subFont = NSFont.systemFont(ofSize: 25, weight: .medium)
    let subAttrs: [NSAttributedString.Key: Any] = [
        .font: subFont,
        .foregroundColor: NSColor(calibratedRed: 0.06, green: 0.09, blue: 0.16, alpha: 0.76),
        .kern: -0.4
    ]
    ("Sub-millisecond WebGL2 & OKLCH spheres, meshes, and 5K wallpapers." as NSString).draw(at: NSPoint(x: 66, y: 205), withAttributes: subAttrs)

    drawPill(text: "HTML · CSS Variables · React · Framer · 5K PNG", at: NSPoint(x: 64, y: 64))
    og.unlockFocus()
    saveJPEG(og, to: out + "/og-card.jpg", quality: 0.92)
}
`;

const swiftPath = path.join(tmpDir, 'compose.swift');
fs.writeFileSync(swiftPath, swiftScript);
execFileSync('swift', [swiftPath], { stdio: 'inherit' });
fs.rmSync(tmpDir, { recursive: true, force: true });

for (const f of ['banner-showcase.jpg', 'oklab-vs-srgb.jpg', 'og-card.jpg']) {
  const sz = fs.statSync(path.join(assetsDir, f)).size;
  console.log(`Generated assets/${f} (${(sz / 1024).toFixed(1)} KB)`);
}
