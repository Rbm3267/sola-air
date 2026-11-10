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


// ── Production props: GaugeCard demo chrome, Table semantics, Spinner theming ──

const read = (name) => fs.readFileSync(path.join(SRC_DIR, name), 'utf8');
const compiled = (name) => compile(read(name), { filename: name }).code;

test('GaugeCard: badge, footer and subtext can be hidden; ring has a spoken label and a max', () => {
  const src = read('GaugeCard.sola');
  for (const prop of ['badge', 'footerLeft', 'footerRight', 'max', 'ringLabel']) {
    assert.match(src, new RegExp(`export let ${prop} =`), `GaugeCard exports ${prop}`);
  }
  // Defaults keep the original look for existing users.
  assert.match(src, /export let badge = "Live Gauge"/);
  assert.match(src, /export let footerLeft = "Telemetry Synchronized"/);
  assert.match(src, /export let footerRight = "zero-vdom"/);
  // Each piece of demo chrome is conditional, not hard-coded.
  assert.match(src, /\{#if badgeText\(\)\}/);
  assert.match(src, /\{#if footerLeftText\(\) \|\| footerRightText\(\)\}/);
  assert.match(src, /\{#if resolvedSubtext\(\)\}/);
  assert.doesNotMatch(src, />Live Gauge</, 'badge text is not hard-coded in the markup');
  assert.doesNotMatch(src, />Telemetry Synchronized</, 'footer text is not hard-coded in the markup');
  const code = compiled('GaugeCard.sola');
  assert.match(code, /role/, 'ring has a role');
  assert.match(code, /aria-label/, 'ring has an aria-label');
});

test('GaugeCard: the ring fills percentage / max and accepts signal accessors', () => {
  const src = read('GaugeCard.sola');
  assert.match(src, /const read = \(v\) => \(typeof v === "function" \? v\(\) : v\)/);
  assert.match(src, /Math\.max\(0, Math\.min\(1, amount\(\) \/ ceiling\(\)\)\)/, 'ratio is clamped to 0..1');
});

test('Table: optional caption, scope="col" headers, rowHeader cells and pill renders', () => {
  const src = read('Table.sola');
  assert.match(src, /export let caption = ""/);
  assert.match(src, /export let captionHidden = false/);
  assert.match(src, /<th scope="col">/);
  assert.match(src, /<th scope="row" class="row-header">/);
  assert.match(src, /<caption /);
  assert.match(src, /col\.render\(row, i\)/, 'per-column render is used');
  for (const tone of ['ok', 'warn', 'neutral']) {
    assert.ok(src.includes(`.pill-${tone} {`), `pill-${tone} is styled`);
  }
  const code = compiled('Table.sola');
  assert.match(code, /'caption'|"caption"/, 'caption element is emitted');
});

test('Table: plain string columns and rows keep working unchanged', () => {
  const src = read('Table.sola');
  // String columns read row[col] and label as the column name, as before.
  assert.match(src, /function columnKey\(col\) \{\s*return typeof col === 'string' \? col : col\.key;/);
  assert.match(src, /function columnLabel\(col\) \{\s*return typeof col === 'string' \? col : \(col\.label \?\? col\.key \?\? ''\);/);
});

test('Spinner: ring colour follows --sola-color-primary-500', () => {
  const src = read('Spinner.sola');
  assert.match(src, /border-top-color: var\(--sola-color-primary-500, #0ea5e9\)/);
  assert.doesNotMatch(src, /border-top-color: #0ea5e9;/);
});
