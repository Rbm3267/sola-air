import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkSource, checkFiles } from '../src/check.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'check-cli.js');
const codes = (src) => checkSource(src, 'T.sola').map((d) => d.code);

describe('checkSource', () => {
  it('passes a well-formed component', () => {
    const src = `<script>let a = $state(1);</script>\n{#if a}<p>{a}</p>{:else}<p>none</p>{/if}\n{#each [1,2] as n (n)}<i>{n}</i>{/each}\n<style>p{color:red}</style>`;
    assert.deepStrictEqual(checkSource(src, 'T.sola'), []);
  });

  it('reports a script parse error with its position', () => {
    const [d] = checkSource(`<script>let a = ;</script><p>x</p>`, 'T.sola');
    assert.strictEqual(d.code, 'SOLA000');
    assert.strictEqual(d.severity, 'error');
    assert.strictEqual(d.line, 1);
  });

  it('accepts {:else if} chains and nested {#if}, which the compiler supports', () => {
    const chain = `<script>let a=$state(1);</script>
{#if a===1}<p>1</p>{:else if a===2}<p>2</p>{:else}<p>3</p>{/if}`;
    assert.deepStrictEqual(codes(chain), []);
    const nested = `<script>let a=$state(1);</script>
{#if a}{#if a>0}<p>x</p>{/if}{/if}`;
    assert.deepStrictEqual(codes(nested), []);
  });

  it('flags unclosed, stray and mismatched blocks', () => {
    assert.deepStrictEqual(codes(`<script>let a=$state(1);</script>\n{#if a}<p>x</p>`), ['SOLA001']);
    assert.deepStrictEqual(codes(`<script>let a=$state(1);</script>\n<p>x</p>{/if}`), ['SOLA001']);
    assert.deepStrictEqual(codes(`<script>let a=$state(1);</script>\n{#if a}<p>x</p>{/each}`), ['SOLA001']);
  });

  it('ignores block-looking text inside <script> and <style>', () => {
    const src = `<script>const s = '{#if x}';\nlet a=$state(1);</script>\n<p>{a}</p>\n<style>/* {:else} */ p{color:red}</style>`;
    assert.deepStrictEqual(codes(src), []);
  });
});

describe('sola-check CLI', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sola-check-'));
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.writeFileSync(path.join(dir, 'Good.sola'), `<script>let a=$state(1);</script>\n<p>{a}</p>`);
  fs.writeFileSync(path.join(dir, 'node_modules', 'Skipped.sola'), `{#if a}`);
  const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8' });

  it('finds .sola files and skips node_modules', () => {
    const { files } = checkFiles([dir]);
    assert.deepStrictEqual(files.map((f) => path.basename(f)), ['Good.sola']);
  });

  it('exits 0 when clean', () => {
    const r = run();
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /1 file checked: 0 errors, 0 warnings/);
  });

  it('exits 1 on an error and prints file:line:col', () => {
    fs.writeFileSync(path.join(dir, 'Bad.sola'), `<script>let a=$state(1);</script>\n{#if a}<p>x</p>`);
    const r = run();
    assert.strictEqual(r.status, 1);
    assert.match(r.stdout, /Bad\.sola:2:1  error  SOLA001/);
  });

  it('prints JSON with --json', () => {
    fs.writeFileSync(path.join(dir, 'Bad.sola'), `<script>let a=$state(1);</script>
{#if a}<p>x</p>`);
    const r = run('--json');
    assert.strictEqual(r.status, 1);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.errors, 1);
    assert.strictEqual(out.diagnostics[0].code, 'SOLA001');
  });
});
