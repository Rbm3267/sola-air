#!/usr/bin/env node

import { checkFiles, RULES } from './check.js';

const args = process.argv.slice(2);

if (args.includes('-h') || args.includes('--help')) {
  console.log(`
  Usage:
    sola-check [paths...] [options]

  Checks .sola files for compile errors and for unbalanced template blocks.
  The compiler accepts an unclosed {#if} or a stray {/each} without an error
  and renders it as literal text. With no paths it checks the current directory. node_modules, dist and .git
  are skipped.

  Options:
    --strict      Exit 1 on warnings as well as errors (no rule warns yet)
    --json        Print diagnostics as JSON
    -h, --help    Show this help message

  Rules:
${Object.entries(RULES).map(([code, text]) => `    ${code}  ${text}`).join('\n')}
  `);
  process.exit(0);
}

const strict = args.includes('--strict');
const json = args.includes('--json');
const targets = args.filter((a) => !a.startsWith('-'));

let result;
try {
  result = checkFiles(targets.length ? targets : ['.']);
} catch (err) {
  console.error(`sola-check: ${err.message}`);
  process.exit(2);
}

const { files, diagnostics } = result;
const errors = diagnostics.filter((d) => d.severity === 'error').length;
const warnings = diagnostics.length - errors;

if (json) {
  console.log(JSON.stringify({ files: files.length, errors, warnings, diagnostics }, null, 2));
} else {
  for (const d of diagnostics) {
    console.log(`${d.file}:${d.line}:${d.column}  ${d.severity}  ${d.code}  ${d.message}`);
  }
  const noun = files.length === 1 ? 'file' : 'files';
  console.log(`${diagnostics.length ? '\n' : ''}${files.length} ${noun} checked: ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`);
}

process.exit(errors || (strict && warnings) ? 1 : 0);
