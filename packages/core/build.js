import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

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
    js: `/* @sola-air-ui/core v${version} — IIFE build for no-bundler environments */`
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
    js: `/* @sola-air-ui/core v${version} | MIT */`
  }
});

console.log('Built dist/sola-core.iife.js and dist/sola-core.iife.min.js');
