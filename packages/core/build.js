import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('./dist', { recursive: true });

await build({
  entryPoints: ['./src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'SolaCore',
  outfile: './dist/sola-core.iife.js',
  minify: false,
  target: ['es2020'],
  banner: {
    js: '/* @sola-air-ui/core — IIFE build for no-bundler environments */'
  }
});

// Also emit a minified version
await build({
  entryPoints: ['./src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'SolaCore',
  outfile: './dist/sola-core.iife.min.js',
  minify: true,
  target: ['es2020'],
  banner: {
    js: '/* @sola-air-ui/core v1.0.2 | MIT */'
  }
});

console.log('Built dist/sola-core.iife.js and dist/sola-core.iife.min.js');
