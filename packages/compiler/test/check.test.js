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

  it('flags malformed {#each} missing "as <ident>" and empty {#if}/{:else if} conditions as SOLA001', () => {
    assert.deepStrictEqual(codes(`<script>let xs=$state([1]);</script>\n{#each xs}<p>x</p>{/each}`), ['SOLA001']);
    assert.deepStrictEqual(codes(`<script>let a=$state(1);</script>\n{#if}<p>x</p>{/if}`), ['SOLA001']);
    assert.deepStrictEqual(codes(`<script>let a=$state(1);</script>\n{#if a}<p>1</p>{:else if}<p>2</p>{/if}`), ['SOLA001']);
  });

  it('flags .set() and .update() on state as SOLA002, which compile but throw when run', () => {
    assert.deepStrictEqual(codes(`<script>let n=$state(0); function f(){ n.update(x=>x+1); }</script><p>{n}</p>`), ['SOLA002']);
    assert.deepStrictEqual(codes(`<script>let t=$state('a');</script><button onclick={() => t.set('b')}>{t}</button>`), ['SOLA002']);
    assert.deepStrictEqual(codes(`<script>let t=$state('a'); function f(){ t().set('b'); }</script><p>{t}</p>`), ['SOLA002']);
    assert.deepStrictEqual(codes(`<script>let o=$persist('k', false); function f(){ o.set(true); }</script><p>{o}</p>`), ['SOLA002']);
  });

  it('allows assignment, and .set() on things that are not state', () => {
    assert.deepStrictEqual(codes(`<script>let n=$state(0); function f(){ n += 1; }</script><p>{n}</p>`), []);
    assert.deepStrictEqual(codes(`<script>const m=new Map(); let n=$state(0); function f(){ m.set('a',1); }</script><p>{n}</p>`), []);
    assert.deepStrictEqual(codes(`<script>let n=$state(0); const o={n:{set(){}}}; function f(){ o.n.set(1); }</script><p>{n}</p>`), []);
    assert.deepStrictEqual(codes(`<script>let n=$state(0); // n.set(1) is wrong\n</script><p>{n}</p>`), []);
  });

  it('ignores a commented-out block', () => {
    const src = `<script>let a=$state(1);</script>\n<!-- {#if a} old branch -->\n<p>{a}</p>\n<!--\n  {:else}\n-->`;
    assert.deepStrictEqual(codes(src), []);
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

describe('SOLA003 undeclared names', () => {
  const undeclared = (src) => checkSource(src, 'T.sola').filter((d) => d.code === 'SOLA003');

  it('flags a template name the script never declares, at its first use', () => {
    const src = `<script>let q = $state('');</script>\n<p>{q}</p>\n<p class={activeId === 1 ? 'on' : ''}>x</p>`;
    const [d, ...rest] = undeclared(src);
    assert.strictEqual(rest.length, 0);
    assert.strictEqual(d.severity, 'error');
    assert.strictEqual(d.line, 3);
    assert.match(d.message, /`activeId` is used but never declared/);
  });

  it('flags an undeclared helper called from a handler', () => {
    const src = `<script>let ms = $state(0);</script>\n<button onclick={() => alert(formatMs(ms))}>t</button>`;
    assert.deepStrictEqual(undeclared(src).map((d) => d.message.split(' ')[0]), ['`formatMs`']);
  });

  it('flags a macro used outside a declaration', () => {
    const src = `<script>let n = 0; const list = [$state(1)];</script>\n<p>{n}</p>`;
    const [d] = undeclared(src);
    assert.match(d.message, /`\$state` is only a macro/);
  });

  it('accepts props, locals, each items, globals, window.x and typeof checks', () => {
    const src = `<script>
  export let items = [];
  import Badge from '@sola-air-ui/ui/badge';
  let open = $state(false);
  let total = $derived(items.length);
  function toggle(e) { open = !open; console.log(e.target, Math.max(1, total)); }
  const has = typeof gtag !== 'undefined';
  window.solaReady = true;
</script>
{#each items as item, i (item.id)}<p onclick={toggle}>{i}: {item.name} {JSON.stringify(item)}</p>{/each}
<Badge label="x" />
<style>.a { color: undefinedVar; }</style>`;
    assert.deepStrictEqual(undeclared(src), []);
  });

  it('passes every component in packages/ui', () => {
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'ui', 'src');
    const { diagnostics } = checkFiles([dir]);
    assert.deepStrictEqual(diagnostics.filter((d) => d.code === 'SOLA003'), []);
  });
});

describe('{#each} destructuring', () => {
  it('names the destructuring in SOLA001 and does not repeat its names as SOLA003', () => {
    const src = `<script>let pairs = $state([['a', 1]]);</script>\n<ul>{#each pairs as [k, v] (k)}<li>{k}: {v}</li>{/each}</ul>`;
    const diags = checkSource(src, 'T.sola');
    assert.deepStrictEqual(diags.map((d) => d.code), ['SOLA001']);
    assert.match(diags[0].message, /can't destructure its item \(`as \[k, v\]`\)/);
    assert.match(diags[0].message, /`\{#each pairs as entry\}` \.\.\. `\{entry\[0\]\}`/);
  });

  it('passes an exported $state prop', () => {
    assert.deepStrictEqual(codes(`<script>export let unread = $state(5);</script>\n<span>{unread}</span>`), []);
  });

  it('suggests a field for an object pattern and still reports unrelated undeclared names', () => {
    const src = `<script>let rows = $state([{ id: 1 }]);</script>\n<p>{missing}</p>\n{#each rows as { id, label } (id)}<i>{label}</i>{/each}`;
    const diags = checkSource(src, 'T.sola');
    assert.deepStrictEqual(diags.map((d) => d.code).sort(), ['SOLA001', 'SOLA003']);
    assert.match(diags.find((d) => d.code === 'SOLA001').message, /`\{entry\.id\}`/);
    assert.match(diags.find((d) => d.code === 'SOLA003').message, /`missing`/);
  });
});
