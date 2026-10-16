#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { compile } from './index.js';

const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
  Usage:
    sola compile <file.sola> [options]

  Options:
    -o, --out <file>          Write compiled output to a file (default: stdout)
    --target <esm|iife>       Output format (default: esm)
                                esm  — ES module with import/export (default, for bundlers)
                                iife — Self-contained IIFE for no-bundler environments
                                       (enterprise portal widgets, plain <script> tags)
    --export-name <Name>      Global name for IIFE target (default: SolaComponent)
                              The compiled component mounts as window['Name'](el, props)
    -v, --version             Print compiler version
    -h, --help                Show this help message

  Examples:
    sola compile App.sola -o dist/App.js
    sola compile Widget.sola --target iife --export-name MyWidget -o dist/my-widget.js
  `);
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  console.log(`Sola Compiler v${version}`);
  process.exit(0);
}

let inputFile = null;
let outputFile = null;
let target = 'esm';
let exportName = 'SolaComponent';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === 'compile') continue;
  if (arg === '-o' || arg === '--out') {
    outputFile = args[++i];
  } else if (arg === '--target') {
    target = args[++i];
  } else if (arg === '--export-name') {
    exportName = args[++i];
  } else if (!inputFile && !arg.startsWith('-')) {
    inputFile = arg;
  }
}

if (!inputFile) {
  console.error('Error: No input .sola file specified.');
  process.exit(1);
}

if (target !== 'esm' && target !== 'iife') {
  console.error(`Error: --target must be "esm" or "iife", got "${target}"`);
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputFile);
if (!fs.existsSync(inputPath)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

try {
  const source = fs.readFileSync(inputPath, 'utf8');
  const result = compile(source, { filename: inputFile, target, exportName });
  const code = result.code || result;

  if (outputFile) {
    const outPath = path.resolve(process.cwd(), outputFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, code, 'utf8');
    console.log(`✓ Compiled ${inputFile} -> ${outputFile} [${target}] (${code.length} bytes)`);
  } else {
    console.log(code);
  }
} catch (err) {
  console.error(`Compilation Error: ${err.message}`);
  process.exit(1);
}
