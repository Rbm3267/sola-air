#!/usr/bin/env node
// Turns a .sola design into one self-contained HTML file: core runtime, design
// tokens, every @sola-air-ui/ui component the design imports, and the design
// itself, all inline. No install, no network, so the file opens anywhere,
// including as a chat artifact.
//
//   node preview.mjs design.sola                 writes design.preview.html
//   node preview.mjs design.sola -o out.html
//   node preview.mjs design.sola --theme dark --props '{"title":"Q3"}'
//   node preview.mjs design.sola --check         diagnostics only, no file
//
// Exit codes: 0 ok, 1 the design has errors (printed as file:line:col), 2 usage.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, checkSource } from '../vendor/sola-compiler.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VENDOR = path.join(HERE, '..', 'vendor');
const manifest = JSON.parse(readFileSync(path.join(VENDOR, 'ui-manifest.json'), 'utf8'));
const bySubpath = Object.fromEntries(Object.entries(manifest).map(([name, m]) => [m.importPath, name]));

const args = process.argv.slice(2);
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const input = args.find((a, i) => !a.startsWith('-') && !['-o', '--theme', '--props'].includes(args[i - 1]));
if (!input || args.includes('-h') || args.includes('--help')) {
  console.log('usage: node preview.mjs <design.sola> [-o out.html] [--theme light|dark] [--props JSON] [--check]');
  process.exit(input ? 0 : 2);
}
if (!existsSync(input)) { console.error(`preview: ${input} not found`); process.exit(2); }

const theme = opt('--theme') === 'dark' ? 'dark' : 'light';
let props = {};
try { props = opt('--props') ? JSON.parse(opt('--props')) : {}; } catch { console.error('preview: --props must be JSON'); process.exit(2); }

const errors = [];
const scripts = [];          // compiled IIFEs, dependencies first
const loaded = new Set();    // global names already defined

/** Compile one .sola file to an IIFE that defines window[globalName], after its imports. */
function addSola(file, globalName, label) {
  const source = readFileSync(file, 'utf8');
  for (const d of checkSource(source, label)) {
    errors.push(`${label}:${d.line}:${d.column}  ${d.code}  ${d.message}`);
  }
  if (errors.length) return;

  // Imports become globals in the no-bundler build, under their local names.
  const script = (source.match(/<script[^>]*>([\s\S]*?)<\/script>/) || [, ''])[1];
  for (const m of script.matchAll(/^\s*import\s+([\s\S]+?)\s+from\s+['"]([^'"]+)['"]/gm)) {
    const [, what, from] = m;
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
        addSola(path.join(VENDOR, manifest[componentName].file), local, `${componentName}.sola`);
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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
if (args.includes('--check')) {
  console.log(`${path.basename(input)}: ok (${scripts.length - 1} component${scripts.length === 2 ? '' : 's'})`);
  process.exit(0);
}

const out = opt('-o') || input.replace(/\.sola$/, '') + '.preview.html';
const title = path.basename(input, '.sola');
const inline = (code) => code.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Sola preview</title>
<style>
${readFileSync(path.join(VENDOR, 'tokens.css'), 'utf8')}
html { color-scheme: ${theme}; }
body { margin: 0; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: var(--sola-surface-0, ${theme === 'dark' ? '#090d19' : '#ffffff'}); color: var(--sola-text-primary, ${theme === 'dark' ? '#f8fafc' : '#0f172a'}); }
</style>
</head>
<body>
<div id="app"></div>
<script>${inline(readFileSync(path.join(VENDOR, 'sola-core.iife.min.js'), 'utf8'))}</script>
${scripts.map((s) => `<script>${inline(s)}</script>`).join('\n')}
<script>window.__SolaPreviewApp(document.getElementById('app'), ${JSON.stringify(props)});</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} kB, ${scripts.length - 1} component${scripts.length === 2 ? '' : 's'})`);
