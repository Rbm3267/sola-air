// Builds the no-bundler (script tag) versions of @sola-air-ui/sentinel.
//
// The package itself needs no build step: `import { observe } from
// '@sola-air-ui/sentinel'` works as-is in any bundler. This is only for pages
// that load plain <script> tags, such as portals and CMS templates. It exposes
// the same API as one global, SolaSentinelKit.
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

mkdirSync(here('./dist'), { recursive: true });

const shared = {
  entryPoints: [here('./src/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'SolaSentinelKit',
  target: ['es2020']
};

await build({
  ...shared,
  outfile: here('./dist/sola-sentinel.iife.js'),
  minify: false,
  banner: { js: `/* @sola-air-ui/sentinel v${version} — IIFE build for no-bundler environments */` }
});

await build({
  ...shared,
  outfile: here('./dist/sola-sentinel.iife.min.js'),
  minify: true,
  banner: { js: `/* @sola-air-ui/sentinel v${version} | MIT */` }
});

console.log('Built dist/sola-sentinel.iife.js and dist/sola-sentinel.iife.min.js');
