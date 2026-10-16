// Compiles the real @sola-air-ui/ui AmbientSuggestion.sola component to an
// IIFE bundle for this plain-HTML demo — same target/convention portal
// widgets use (window['AmbientSuggestion'] = mount).

import { compile } from '@sola-air-ui/compiler';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.resolve(__dirname, '../../packages/ui/src/AmbientSuggestion.sola');
const outDir = path.join(__dirname, 'public', 'vendor');
const outPath = path.join(outDir, 'ambient-suggestion.iife.js');

const source = readFileSync(srcPath, 'utf-8');
const result = compile(source, { target: 'iife', exportName: 'AmbientSuggestion', filename: 'AmbientSuggestion.sola' });

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, result.code);
console.log(`[ambient-poc] compiled AmbientSuggestion.sola -> ${outPath}`);
