import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

mkdirSync(new URL('./dist', import.meta.url), { recursive: true });

await build({
  entryPoints: [`${root}src/index.js`],
  bundle: true,
  format: 'iife',
  globalName: 'SolaCore',
  outfile: `${root}dist/sola-core.iife.js`,
  minify: false,
  target: ['es2020'],
  banner: {
    js: `/* @sola-air-ui/core v${version} — IIFE build for no-bundler environments */`
  }
});

// Also emit a minified version
await build({
  entryPoints: [`${root}src/index.js`],
  bundle: true,
  format: 'iife',
  globalName: 'SolaCore',
  outfile: `${root}dist/sola-core.iife.min.js`,
  minify: true,
  target: ['es2020'],
  banner: {
    js: `/* @sola-air-ui/core v${version} | MIT */`
  }
});

console.log('Built dist/sola-core.iife.js and dist/sola-core.iife.min.js');
