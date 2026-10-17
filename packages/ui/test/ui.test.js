import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../../compiler/src/index.js';
import { checkSource, findSolaFiles } from '../../compiler/src/check.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../src');
const solaFiles = findSolaFiles([SRC_DIR]);

test('discovers all 37 .sola components in packages/ui/src', () => {
  assert.equal(solaFiles.length, 37, `Expected 37 .sola files, found ${solaFiles.length}`);
});

for (const filePath of solaFiles) {
  const relName = path.relative(SRC_DIR, filePath);

  test(`${relName}: checkSource reports 0 diagnostics`, () => {
    const src = fs.readFileSync(filePath, 'utf8');
    const diags = checkSource(src, relName);
    assert.deepEqual(diags, [], `Unexpected diagnostics in ${relName}: ${JSON.stringify(diags)}`);
  });

  test(`${relName}: compiles to valid JS and .d.ts without string-literal bind:value`, () => {
    const src = fs.readFileSync(filePath, 'utf8');
    assert.equal(
      /bind:value\s*=\s*["']/.test(src),
      false,
      `${relName} must not use string literal bind:value="..."`
    );

    const res = compile(src, { filename: relName, generateDts: true });
    assert.ok(typeof res.code === 'string' && res.code.includes('export default function mount'), `${relName} failed to emit mount function`);
    assert.ok(typeof res.dts === 'string' && res.dts.includes('export interface Props'), `${relName} failed to emit .d.ts declarations`);
  });
}

test('types/index.d.ts defines a typed *Props interface and SolaComponent<*Props> for all 37 components', () => {
  const dts = fs.readFileSync(path.resolve(__dirname, '../types/index.d.ts'), 'utf8');
  for (const filePath of solaFiles) {
    const name = path.basename(filePath, '.sola');
    assert.match(
      dts,
      new RegExp(`export interface ${name}Props\\b`),
      `types/index.d.ts missing interface ${name}Props`
    );
    assert.match(
      dts,
      new RegExp(`export const ${name}: SolaComponent<${name}Props>;`),
      `types/index.d.ts must type ${name} as SolaComponent<${name}Props>`
    );
  }
});

