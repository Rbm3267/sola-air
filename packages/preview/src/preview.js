// Turns a .sola design into one self-contained HTML file: the core runtime, the
// design tokens, every @sola-air-ui/ui component the design imports, and the
// design itself, all inline. Everything comes from the installed packages, so
// the file opens anywhere with no network, including as a chat artifact.

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { compile } from '@sola-air-ui/compiler';
import { checkSource } from '@sola-air-ui/compiler/check';

const require = createRequire(import.meta.url);

/** The @sola-air-ui/ui package folder, found from one of its subpath exports. */
function uiDir() {
  let dir = path.dirname(require.resolve('@sola-air-ui/ui/button'));
  while (!existsSync(path.join(dir, 'package.json')) || JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name !== '@sola-air-ui/ui') {
    const up = path.dirname(dir);
    if (up === dir) throw new Error('sola-preview: cannot find @sola-air-ui/ui');
    dir = up;
  }
  return dir;
}

/** Component name → { importPath, file } for every .sola component @sola-air-ui/ui exports. */
export function uiManifest() {
  const dir = uiDir();
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const out = {};
  for (const [subpath, file] of Object.entries(pkg.exports)) {
    if (typeof file !== 'string' || !file.endsWith('.sola')) continue;
    out[path.basename(file, '.sola')] = { importPath: `@sola-air-ui/ui${subpath.slice(1)}`, file: path.join(dir, file) };
  }
  return out;
}

const PRESETS = ['sola', 'zinc', 'compact', 'graphite'];

/**
 * Check a design and build its preview.
 * @param {string} input path to the .sola file
 * @param {{ theme?: 'light'|'dark', preset?: string, props?: object }} [options]
 * @returns {{ errors: string[], html: string|null, components: number }}
 */
export function preview(input, options = {}) {
  const theme = options.theme === 'dark' ? 'dark' : 'light';
  const preset = PRESETS.includes(options.preset) ? options.preset : 'sola';
  const props = options.props || {};
  const manifest = uiManifest();
  const bySubpath = Object.fromEntries(Object.entries(manifest).map(([name, m]) => [m.importPath, name]));

  const errors = [];
  const scripts = [];          // compiled IIFEs, dependencies first
  const loaded = new Set();    // global names already defined

  function addSola(file, globalName, label) {
    const source = readFileSync(file, 'utf8');
    for (const d of checkSource(source, label)) errors.push(`${label}:${d.line}:${d.column}  ${d.code}  ${d.message}`);
    if (errors.length) return;

    // Imports become globals in the no-bundler build, under their local names.
    // Only reads the import lines; the compiler does the real parse.
    const script = (source.match(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/i) || [, ''])[1];
    for (const m of script.matchAll(/^\s*import\s+([^;'"]+?)\s+from\s+['"]([^'"]+)['"]/gm)) {
      const [, what, from] = m;
      if (/^type\b/.test(what.trim())) continue;
      if (from === '@sola-air-ui/core' || from === '@sola/core') continue;
      const named = what.match(/^\{([\s\S]*)\}$/);
      const locals = named
        ? named[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
            const [imported, local = imported] = s.split(/\s+as\s+/);
            return { imported: imported.trim(), local: local.trim() };
          })
        : [{ imported: null, local: what.trim() }];

      for (const { imported, local } of locals) {
        if (loaded.has(local)) continue;
        let componentName = null;
        if (from === '@sola-air-ui/ui') componentName = imported && manifest[imported] ? imported : null;
        else if (bySubpath[from]) componentName = bySubpath[from];
        else if (from.startsWith('@sola-air-ui/ui/')) {
          // Also accept the file form (@sola-air-ui/ui/DataCard.sola) some examples use.
          const base = path.basename(from, '.sola');
          componentName = manifest[base] ? base : null;
        }
        if (componentName) {
          loaded.add(local);
          addSola(manifest[componentName].file, local, `${componentName}.sola`);
        } else if (from.endsWith('.sola') && (from.startsWith('./') || from.startsWith('../'))) {
          loaded.add(local);
          addSola(path.resolve(path.dirname(file), from), local, from);
        } else {
          errors.push(`${label}: cannot preview import '${from}'. Use @sola-air-ui/ui components, @sola-air-ui/core, or a relative .sola file.`);
        }
      }
    }
    if (errors.length) return;

    try {
      scripts.push(compile(source, { target: 'iife', exportName: globalName, filename: label, sourcemap: false }).code);
    } catch (err) {
      errors.push(`${label}: ${err.message.replace(/^\[sola compiler\]\s*/, '').split('\n').join(' ')}`);
    }
  }

  addSola(path.resolve(input), '__SolaPreviewApp', path.basename(input));
  const components = Math.max(scripts.length - 1, 0);
  if (errors.length) return { errors, html: null, components };

  const title = path.basename(input, '.sola').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inline = (code) => code.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html>
<html lang="en" data-theme="${theme}" data-preset="${preset}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Sola preview</title>
<style>
${readFileSync(require.resolve('@sola-air-ui/tokens/css'), 'utf8')}
html { color-scheme: ${theme}; }
body { margin: 0; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: var(--sola-surface-0, ${theme === 'dark' ? '#090d19' : '#ffffff'}); color: var(--sola-text-primary, ${theme === 'dark' ? '#f8fafc' : '#0f172a'}); }
</style>
</head>
<body>
<div id="app"></div>
<script>${inline(readFileSync(require.resolve('@sola-air-ui/core/iife'), 'utf8'))}</script>
${scripts.map((s) => `<script>${inline(s)}</script>`).join('\n')}
<script>window.__SolaPreviewApp(document.getElementById('app'), ${inline(JSON.stringify(props))});</script>
</body>
</html>
`;
  return { errors, html, components };
}
