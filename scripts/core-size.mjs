// The size of the core runtime, measured, not typed.
//
// Bundles @sola-air-ui/core the same way its published IIFE build does (minified,
// es2020, one file), then gzips it. The site, the docs and a test all call this,
// so a size claim can only be wrong if the bundle is.
import { buildSync } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'packages/core/src/index.js');

// Core imports sibling workspace packages (e.g. @sola-air-ui/sentinel). Resolve
// them from packages/ so the measurement does not depend on how dependencies
// were installed: the Vercel build installs only the app workspace, where those
// packages are not linked into node_modules.
function workspaceAliases() {
  const packagesDir = path.join(ROOT, 'packages');
  const alias = {};
  for (const dir of readdirSync(packagesDir)) {
    const manifest = path.join(packagesDir, dir, 'package.json');
    if (!existsSync(manifest)) continue;
    const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (name) alias[name] = path.join(packagesDir, dir);
  }
  return alias;
}

export function measureCore() {
  const { outputFiles } = buildSync({
    entryPoints: [ENTRY],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'SolaCore',
    target: ['es2020'],
    write: false,
    alias: workspaceAliases(),
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
