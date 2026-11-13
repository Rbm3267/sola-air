#!/usr/bin/env node
//   sola-preview design.sola                 writes design.preview.html
//   sola-preview design.sola -o out.html
//   sola-preview design.sola --theme dark --props '{"title":"Q3"}'
//   sola-preview design.sola --check         diagnostics only, no file
//
// Exit codes: 0 ok, 1 the design has errors (printed as file:line:col), 2 usage.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { preview } from './preview.js';

const args = process.argv.slice(2);
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };

if (args.includes('-v') || args.includes('--version')) {
  console.log(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
  process.exit(0);
}
const input = args.find((a, i) => !a.startsWith('-') && !['-o', '--theme', '--preset', '--props'].includes(args[i - 1]));
if (!input || args.includes('-h') || args.includes('--help')) {
  console.log('usage: sola-preview <design.sola> [-o out.html] [--theme light|dark] [--preset sola|zinc|compact|graphite] [--props JSON] [--check]');
  process.exit(input ? 0 : 2);
}
if (!existsSync(input)) { console.error(`sola-preview: ${input} not found`); process.exit(2); }

let props = {};
try { props = opt('--props') ? JSON.parse(opt('--props')) : {}; } catch { console.error('sola-preview: --props must be JSON'); process.exit(2); }

const { errors, html, components } = preview(input, { theme: opt('--theme'), preset: opt('--preset'), props });
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const count = `${components} component${components === 1 ? '' : 's'}`;
if (args.includes('--check')) {
  console.log(`${path.basename(input)}: ok (${count})`);
  process.exit(0);
}
const out = opt('-o') || input.replace(/\.sola$/, '') + '.preview.html';
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} kB, ${count})`);
