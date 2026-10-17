// What @sola-air-ui/ui really ships, read from the package itself: the import
// path for every component (its subpath export) and the props each one
// declares with `export let`. The site's build (app/vite.config.ts) and the
// code-export test both use this, so generated code can only name components
// and props that exist.

import { readFileSync } from 'node:fs';
import path from 'node:path';

/** @param {string} repoRoot */
export function readUiManifest(repoRoot) {
  const uiDir = path.join(repoRoot, 'packages', 'ui');
  const manifest = JSON.parse(readFileSync(path.join(uiDir, 'package.json'), 'utf8'));

  /** @type {Record<string, string>} component name → import path */
  const subpaths = {};
  /** @type {Record<string, string[]>} component name → declared props */
  const props = {};

  for (const [subpath, file] of Object.entries(manifest.exports)) {
    if (typeof file !== 'string' || !file.endsWith('.sola')) continue;
    const name = path.basename(file, '.sola');
    subpaths[name] = `@sola-air-ui/ui${subpath.slice(1)}`;
    const source = readFileSync(path.join(uiDir, file), 'utf8');
    props[name] = [...source.matchAll(/^\s*export\s+let\s+(\w+)/gm)].map((m) => m[1]);
  }

  return { subpaths, props };
}
