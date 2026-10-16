// The size of the core runtime, measured, not typed.
//
// Bundles @sola-air-ui/core the same way its published IIFE build does (minified,
// es2020, one file), then gzips it. The site, the docs and a test all call this,
// so a size claim can only be wrong if the bundle is.
import { buildSync } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ENTRY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/core/src/index.js');

export function measureCore() {
  const { outputFiles } = buildSync({
    entryPoints: [ENTRY],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'SolaCore',
    target: ['es2020'],
    write: false,
  });
  const bytes = Buffer.from(outputFiles[0].contents);
  const gzipBytes = gzipSync(bytes, { level: 9 }).length;
  return {
    minBytes: bytes.length,
    gzipBytes,
    /** One decimal, 1 kB = 1000 bytes: the way the site writes sizes. */
    gzipKb: (gzipBytes / 1000).toFixed(1),
    minKb: (bytes.length / 1000).toFixed(1),
  };
}
