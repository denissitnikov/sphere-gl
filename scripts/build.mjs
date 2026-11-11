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
const banner = `/*! sphere-gl v${pkg.version} | MIT License | (c) 2026 Denis S. | https://github.com/denissitnikov/sphere-gl */`;

function findEsbuild() {
  const candidates = [
    path.join(rootDir, 'node_modules', '.bin', 'esbuild'),
    path.resolve(rootDir, '..', '..', 'raycast-extension', 'node_modules', '.bin', 'esbuild'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'esbuild';
}

const esbuildBin = findEsbuild();

const targets = [
  {
    entry: 'src/browser.js',
    out: 'sphere-gl.min.js',
    format: 'iife',
    external: [],
  },
  {
    entry: 'src/index.js',
    out: 'sphere-gl.esm.min.js',
    format: 'esm',
    external: [],
  },
  {
    entry: 'src/react.js',
    out: 'sphere-gl.react.js',
    format: 'esm',
    external: ['react'],
  },
  {
    entry: 'src/framer.js',
    out: 'sphere-gl.framer.js',
    format: 'esm',
    external: ['react', 'framer'],
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
  // Strip GLSL comments and redundant whitespace inside #version 300 es shader literals
  code = code.replace(/#version 300 es[\s\S]*?(?=`)/g, (glsl) =>
    glsl
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/\s*([=+*\-/,;(){}?:<>])\s*/g, '$1'),
  );
  fs.writeFileSync(outPath, code, 'utf8');
  const buf = Buffer.from(code, 'utf8');
  const gz = zlib.gzipSync(buf, { level: 9 });
  const gzKb = gz.length / 1024;
  console.log(
    `Built dist/${t.out}: ${(buf.length / 1024).toFixed(1)} KB (${gzKb.toFixed(1)} KB gzipped)`,
  );
  if (gzKb > 29.5) {
    throw new Error(`Bundle size budget exceeded for ${t.out}: ${gzKb.toFixed(1)} KB > 29.5 KB`);
  }
}
