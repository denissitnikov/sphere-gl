#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
fs.mkdirSync(distDir, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const banner = `/*! sphere-gl v${pkg.version} | MIT (c) Denis S. */`;

function findEsbuild() {
  const localBin = path.join(rootDir, 'node_modules', '.bin', 'esbuild');
  return fs.existsSync(localBin) ? localBin : 'esbuild';
}
const esbuildBin = findEsbuild();

function minifyGlsl(glsl) {
  const lines = glsl.split('\n');
  const out = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = '';
    }
  };
  for (const rawLine of lines) {
    const clean = rawLine.replace(/\/\/.*$/, '').trim();
    if (!clean) continue;
    if (clean.startsWith('#')) {
      flush();
      out.push(clean.replace(/\s+/g, ' '));
    } else {
      buf += clean
        .replace(/\s+/g, ' ')
        .replace(/\s*([=+*\-/,;(){}?:<>|&^!])\s*/g, '$1')
        .replace(/\b0\.(\d+)/g, '.$1');
    }
  }
  flush();
  return out.join('\n');
}

const targets = [
  {
    entry: 'src/index.js',
    out: 'sphere-gl.esm.min.js',
    format: 'esm',
    external: ['./palettes.js', './fallback.js', './export.js'],
    rewrites: [
      ['./palettes.js', './sphere-gl.palettes.js'],
      ['./fallback.js', './sphere-gl.fallback.js'],
      ['./export.js', './sphere-gl.export.js'],
    ],
    maxGzKb: 12.5,
  },
  {
    entry: 'src/palettes.js',
    out: 'sphere-gl.palettes.js',
    format: 'esm',
    external: [],
    rewrites: [],
    maxGzKb: 12.5,
  },
  {
    entry: 'src/browser.js',
    out: 'sphere-gl.min.js',
    format: 'iife',
    external: ['./fallback.js', './export.js'],
    rewrites: [
      ['import("./fallback.js")', 'import(new URL("./sphere-gl.fallback.js",globalThis.__spB||location.href).href)'],
      ['import("./export.js")', 'import(new URL("./sphere-gl.export.js",globalThis.__spB||location.href).href)'],
    ],
    maxGzKb: 25.0,
  },
  {
    entry: 'src/react.js',
    out: 'sphere-gl.react.js',
    format: 'esm',
    external: ['react', 'sphere-gl'],
    rewrites: [],
    maxGzKb: 2.5,
  },
  {
    entry: 'src/framer.js',
    out: 'sphere-gl.framer.js',
    format: 'esm',
    external: ['react', 'framer', 'sphere-gl'],
    rewrites: [],
    maxGzKb: 3.5,
  },
  {
    entry: 'src/export.js',
    out: 'sphere-gl.export.js',
    format: 'esm',
    external: ['./palettes.js', './shader.js', './fallback.js'],
    rewrites: [
      ['./palettes.js', './sphere-gl.palettes.js'],
      ['./shader.js', './sphere-gl.esm.min.js'],
      ['./fallback.js', './sphere-gl.fallback.js'],
    ],
    maxGzKb: 5.0,
  },
  {
    entry: 'src/fallback.js',
    out: 'sphere-gl.fallback.js',
    format: 'esm',
    external: [],
    rewrites: [],
    maxGzKb: 5.0,
  },
  {
    entry: 'src/studio.js',
    out: 'sphere-gl.studio.js',
    format: 'esm',
    external: [],
    rewrites: [],
    maxGzKb: 2.0,
  },
];

for (const t of targets) {
  const args = [
    path.join(rootDir, t.entry),
    '--bundle',
    '--minify',
    `--format=${t.format}`,
    '--target=es2020',
    `--banner:js=${banner}`,
    ...t.external.map((ext) => `--external:${ext}`),
    `--outfile=${path.join(distDir, t.out)}`,
  ];
  execFileSync(esbuildBin, args, { stdio: 'inherit' });
}

for (const t of targets) {
  const outPath = path.join(distDir, t.out);
  let code = fs.readFileSync(outPath, 'utf8');

  code = code.replace(/`(#version 300 es[\s\S]*?|precision highp float;[\s\S]*?)`/g, (_, glsl) => `\`${minifyGlsl(glsl)}\``);

  for (const [from, to] of t.rewrites) {
    if (from.startsWith('import(')) {
      code = code.split(from).join(to);
    } else {
      code = code.split(`"${from}"`).join(`"${to}"`).split(`'${from}'`).join(`'${to}'`);
    }
  }

  fs.writeFileSync(outPath, code, 'utf8');
  const buf = Buffer.from(code, 'utf8');
  const gz = zlib.gzipSync(buf, { level: 9 });
  const gzKb = gz.length / 1024;
  console.log(
    `Built dist/${t.out}: ${(buf.length / 1024).toFixed(2)} KB (${gzKb.toFixed(2)} KB gzipped, limit ${t.maxGzKb} KB)`,
  );
  if (gzKb > t.maxGzKb) {
    throw new Error(`Bundle size budget exceeded for ${t.out}: ${gzKb.toFixed(2)} KB > ${t.maxGzKb} KB`);
  }
}
