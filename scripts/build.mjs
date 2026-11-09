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

const banner = `/*! sphere-gl v1.0.0 | MIT License | (c) 2026 Denis S. | https://github.com/denissitnikov/sphere-gl */`;

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

execFileSync(
  esbuildBin,
  [
    path.join(rootDir, 'src', 'browser.js'),
    '--bundle',
    '--minify',
    '--format=iife',
    '--target=es2020',
    `--banner:js=${banner}`,
    `--outfile=${path.join(distDir, 'sphere-gl.min.js')}`,
  ],
  { stdio: 'inherit' },
);

execFileSync(
  esbuildBin,
  [
    path.join(rootDir, 'src', 'index.js'),
    '--bundle',
    '--minify',
    '--format=esm',
    '--target=es2020',
    `--banner:js=${banner}`,
    `--outfile=${path.join(distDir, 'sphere-gl.esm.min.js')}`,
  ],
  { stdio: 'inherit' },
);

for (const file of ['sphere-gl.min.js', 'sphere-gl.esm.min.js']) {
  const buf = fs.readFileSync(path.join(distDir, file));
  const gz = zlib.gzipSync(buf, { level: 9 });
  console.log(
    `Built dist/${file}: ${(buf.length / 1024).toFixed(1)} KB (${(gz.length / 1024).toFixed(1)} KB gzipped)`,
  );
}
