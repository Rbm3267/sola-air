import assert from 'node:assert';
import { compile } from '../src/index.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── Reactivity ──────────────────────────────────────────────────────────────

console.log('\n$state / $derived / $effect');

test('$state compiles to createSignal', () => {
  const { code } = compile(`<script>let count = $state(0);</script><span>{count}</span>`);
  assert(code.includes('const [count, set_count] = createSignal(0)'), 'createSignal');
});

test('$derived wraps expr in arrow and auto-calls the signal', () => {
  const { code } = compile(`<script>let x = $state(1); let doubled = $derived(x * 2);</script><span>{doubled}</span>`);
  assert(code.includes('createDerived(() => x() * 2)'), 'arrow wrap with auto-call');
});

test('$derived passes fn through unchanged', () => {
  const { code } = compile(`<script>let x = $state(1); let d = $derived(() => x() * 2);</script><span>{d}</span>`);
  assert(code.includes('createDerived(() => x() * 2)'), 'fn passthrough');
});

test('count++ rewrites to set_count(count() + 1)', () => {
  const { code } = compile(`<script>let count = $state(0); function inc() { count++; }</script>`);
  assert(code.includes('set_count(count() + 1)'), '++ rewrite');
});

test('count-- rewrites to set_count(count() - 1)', () => {
  const { code } = compile(`<script>let count = $state(0); function dec() { count--; }</script>`);
  assert(code.includes('set_count(count() - 1)'), '-- rewrite');
});

test('compound assignment operators (*=, /=, **=)', () => {
  const { code } = compile(`<script>
    let count = $state(10);
    function multiply() { count *= 2; }
    function divide() { count /= 2; }
    function power() { count **= 2; }
  </script>`);
  assert(code.includes('set_count(count() * (2))'), '*=');
  assert(code.includes('set_count(count() / (2))'), '/=');
  assert(code.includes('set_count(count() ** (2))'), '**=');
});

// ── Reactive auto-call (parenthesis-free syntax) ────────────────────────────

console.log('\nReactive auto-call');

test('bare signal read in text interpolation auto-calls: {count} → count()', () => {
  const { code } = compile(`<script>let count = $state(0);</script><span>{count}</span>`);
  assert(code.includes("String((count()) ?? '')"), 'auto-called in text expr');
});

test('explicit call is left alone: {count()} does not become count()()', () => {
  const { code } = compile(`<script>let count = $state(0);</script><span>{count()}</span>`);
  assert(code.includes("String((count()) ?? '')"), 'single call');
  assert(!code.includes('count()()'), 'no double call');
});

test('the docs "Cluster Dashboard" sample compiles to working code', () => {
  const { code } = compile(`<script>
  export let title = "Cluster Dashboard";
  let count = $state(0);
  let doubled = $derived(count * 2);

  function increment() {
    count++;
  }
</script>

<div class="card">
  <h3>{title}</h3>
  <div class="value">{doubled}</div>
  <button onclick={increment}>Increment Metric</button>
</div>`);
  assert(code.includes('createDerived(() => count() * 2)'), 'derived body auto-calls');
  assert(code.includes("String((doubled()) ?? '')"), 'derived read auto-calls');
  assert(code.includes('set_count(count() + 1)'), 'count++ rewritten');
  assert(code.includes("addEventListener('click', increment)"), 'handler wired');
});

test('member access on a state object auto-calls the base: {user.name} → user().name', () => {
  const { code } = compile(`<script>let user = $state({ name: 'Ada' });</script><span>{user.name}</span>`);
  assert(code.includes('user().name'), 'member object auto-called');
});

test('inline handler with update expr: onclick={() => count++}', () => {
  const { code } = compile(`<script>let count = $state(0);</script><button onclick={() => count++}>+</button>`);
  assert(code.includes('set_count(count() + 1)'), 'update rewritten inside handler');
});

test('inline handler with assignment: onclick={() => count = 5}', () => {
  const { code } = compile(`<script>let count = $state(0);</script><button onclick={() => count = 5}>set</button>`);
  assert(code.includes('set_count(5)'), 'assignment rewritten inside handler');
});

test('signal read in script function body auto-calls', () => {
  const { code } = compile(`<script>let count = $state(0); function log() { console.log(count); }</script>`);
  assert(code.includes('console.log(count())'), 'read in fn body auto-called');
});

test('read before declaration (hoisted handler) still auto-calls', () => {
  const { code } = compile(`<script>function log() { return doubled; } let x = $state(1); let doubled = $derived(x * 2);</script>`);
  assert(code.includes('return doubled()'), 'hoisted read auto-called');
});

test('shadowed name is not auto-called', () => {
  const { code } = compile(`<script>let count = $state(0); function f(count) { return count + 1; }</script>`);
  assert(code.includes('return count + 1'), 'param shadow respected');
});

test('each item shadows a signal of the same name', () => {
  const { code } = compile(`<script>let items = $state([1,2]); let item = $state('sig');</script><div>{#each items as item}<span>{item}</span>{/each}</div>`);
  assert(code.includes('const _items = items() || []'), 'each source auto-called');
  assert(code.includes("String((item) ?? '')"), 'loop-local item not auto-called');
});

test('{#if} condition auto-calls signals', () => {
  const { code } = compile(`<script>let open = $state(false);</script>{#if open}<span>yes</span>{/if}`);
  assert(code.includes('if (open())'), 'condition auto-called');
});

test('dynamic attribute auto-calls: class={theme}', () => {
  const { code } = compile(`<script>let theme = $state('dark');</script><div class={theme}></div>`);
  assert(code.includes('(theme())'), 'attr expr auto-called');
});

test('object shorthand expands: {count} → {count: count()}', () => {
  const { code } = compile(`<script>let count = $state(0);</script><span>{JSON.stringify({count})}</span>`);
  assert(code.includes('count: count()'), 'shorthand expanded');
});

test('$intent accessor read bare auto-calls; .loading sub-signal call preserved', () => {
  const { code } = compile(`<script>let w = $intent("gauge");</script><div>{w}</div><span>{w.loading}</span>`);
  assert(code.includes("String((w()) ?? '')"), 'intent bare read auto-called');
  assert(code.includes('w.loading()'), 'sub-signal called on the accessor');
  assert(!code.includes('w().loading'), 'accessor identity preserved for sub-signals');
});

test('$data member access goes through the call: {mrr.data} → mrr().data, refetch untouched', () => {
  const { code } = compile(`<script>let mrr = $data("sheet://x");</script><h2>{mrr.data}</h2><button onclick={() => mrr.refetch()}>r</button>`);
  assert(code.includes('mrr().data'), 'data member through call');
  assert(code.includes('mrr.refetch()'), 'accessor methods untouched');
});

test('README syntax remains fully valid (no rewrites of explicit calls)', () => {
  const { code } = compile(`<script>
  let count = $state(0);
  let doubled = $derived(() => count() * 2);
  function inc() { count = count() + 1; }
</script>
<button on:click={inc}>Count: {count()} Doubled: {doubled()}</button>`);
  assert(code.includes('createDerived(() => count() * 2)'), 'derived fn unchanged');
  assert(code.includes('set_count(count() + 1)'), 'assignment RHS unchanged');
  assert(!code.includes('()()'), 'no double calls anywhere');
});

// ── Invalid template expressions ────────────────────────────────────────────

console.log('\nInvalid template expressions');

test('an unparseable template expression fails with a useful message', () => {
  // A literal brace in markup — a rendered code sample containing
  // `setInterval(() => {` — opens an expression and swallows the markup after
  // it. The compiler used to emit that as generated code and let the bundler
  // report a syntax error in a file the author never wrote.
  let err = null;
  try {
    compile(`<pre>setInterval(() =&gt; { doThing(); }, 400);</pre>`, { filename: 'Sample.sola' });
  } catch (e) { err = e; }
  assert(err, 'compile threw');
  assert(err.message.includes('Sample.sola'), 'names the file');
  assert(err.message.includes('&#123;'), 'suggests escaping the brace');
});

test('valid expressions are unaffected by the check', () => {
  const { code } = compile(`<script>let a = $state(1);</script><div>{a > 0 ? 'yes' : 'no'}</div>`);
  assert(code.includes("a() > 0 ? 'yes' : 'no'"), 'ternary compiles');
});

// ── Event handlers with block bodies ────────────────────────────────────────

console.log('\nBlock-bodied event handlers');

function assertValidJs(code, label) {
  new Function(code.replace(/^import.*$/gm, '').replace('export default ', 'globalThis.__t = '));
}

test('on:click with a block body compiles', () => {
  // Handler expressions used to be written back as literal attribute text, so
  // extractExpressions ate their braces, emitted a <sola-expr> tag mid-handler
  // and shredded the rest of the tag into bogus attributes.
  const { code } = compile(`<script>let n = $state(0);</script><button on:click={() => { n = n() + 1; }}>go</button>`);
  assertValidJs(code);
  assert(code.includes("addEventListener('click', () => { set_n(n() + 1); })"), 'handler wired intact');
  assert(!code.includes('sola-expr'), 'handler body not turned into an expression node');
});

test('onclick with several statements keeps all of them', () => {
  const { code } = compile(`<script>let a = $state(0); let b = $state('');</script><button onclick={() => { a++; b = 'x'; }}>go</button>`);
  assertValidJs(code);
  assert(code.includes("set_a(a() + 1); set_b('x');"), 'both statements survive');
});

test('an object literal inside a handler survives', () => {
  const { code } = compile(`<script>let o = $state(null);</script><button onclick={() => { o = { k: 1 }; }}>go</button>`);
  assertValidJs(code);
  assert(code.includes('set_o({ k: 1 })'), 'object literal intact');
});

test('a handler in the quoted form wires a listener, not a string', () => {
  const { code } = compile(`<script>function go(){}</script><button onclick="{() => go()}">go</button>`);
  assertValidJs(code);
  assert(code.includes("addEventListener('click', () => go())"), 'listener wired');
  assert(!code.includes("setAttribute('onclick'"), 'not written as an attribute string');
});

test('bind:value still resolves through the marker', () => {
  const { code } = compile(`<script>let name = $state('');</script><input bind:value={name} />`);
  assertValidJs(code);
  assert(code.includes('set_name(e.target.value)'), 'writes back');
  assert(code.includes('n0.value = name() ?? '), 'reads');
});

test('a callback prop on a component is passed as a function', () => {
  const { code } = compile(`<script>import Toggle from './Toggle.sola'; let v = $state(false);</script><Toggle onChange={(x) => { v = x; }} />`);
  assertValidJs(code.replace(/^import Toggle.*$/gm, ''));
  assert(code.includes('"onChange": ((x) => { set_v(x); })'), 'callback passed live');
});

// ── else-if chains ──────────────────────────────────────────────────────────

console.log('\nelse-if chains');

test('{:else if} compiles to a nested conditional', () => {
  const { code } = compile(
    `<script>let n = $state(2);</script>{#if n === 1}<p>one</p>{:else if n === 2}<p>two</p>{:else}<p>many</p>{/if}`
  );
  new Function(code.replace(/^import.*$/gm, '').replace('export default ', 'globalThis.__t = '));
  assert(code.includes('if (n() === 1)'), 'first branch');
  assert(code.includes('if (n() === 2)'), 'else-if branch became its own condition');
  assert(code.includes('many'), 'final else retained');
});

test('a later branch is not evaluated when an earlier one matches', () => {
  // The failure this guards against: every branch's expression ran regardless
  // of its condition, so `{:else if x.y}` threw as soon as x was null.
  const { code } = compile(
    `<script>let v = $state(null);</script>{#if !v}<p>empty</p>{:else if v.title}<p>{v.title}</p>{/if}`
  );
  const runnable = code
    .replace(/^import.*$/gm, "const { createSignal, createDerived, createEffect, onMount, onDestroy, pushContext, popContext, __flush_mounts, __flush_destroys } = globalThis.__core;")
    .replace('export default ', 'globalThis.__mount = ');
  assert(runnable.includes('v().title'), 'guarded branch still compiled');
  // Structurally, the guarded access must sit inside the else branch.
  const elseIdx = code.indexOf('} else {');
  assert(elseIdx !== -1 && code.indexOf('v().title') > elseIdx, 'guarded access is inside the else branch');
});

test('three-branch chain nests correctly', () => {
  const { code } = compile(
    `<script>let s = $state('b');</script>{#if s === 'a'}<p>A</p>{:else if s === 'b'}<p>B</p>{:else if s === 'c'}<p>C</p>{:else}<p>D</p>{/if}`
  );
  new Function(code.replace(/^import.*$/gm, '').replace('export default ', 'globalThis.__t = '));
  for (const cond of ["s() === 'a'", "s() === 'b'", "s() === 'c'"]) {
    assert(code.includes(`if (${cond})`), `branch ${cond}`);
  }
  assert(code.includes('>D<') || code.includes('`D`'), 'final else retained');
});

// ── Template-literal escaping ───────────────────────────────────────────────

console.log('\nTemplate-literal escaping');

test('a backtick inside <style> does not break out of the generated literal', () => {
  // A CSS comment quoting a class name in backticks used to terminate the
  // template literal the stylesheet is emitted into, so the rest of the CSS was
  // parsed as JavaScript and threw ReferenceError at mount time.
  const { code } = compile(`<script>let a = $state(1);</script><div class="x">{a}</div><style>
  .x {
    /* some hosts ship their own \`.x\` class */
    color: red;
  }
</style>`);
  // Must still be valid JavaScript...
  new Function(code.replace(/^import.*$/gm, '').replace('export default ', 'globalThis.__t = '));
  // ...with the backtick escaped rather than closing the literal.
  assert(code.includes('\\`.x\\`'), 'backtick escaped inside the style literal');
});

test('${ inside <style> is escaped rather than interpolated', () => {
  const { code } = compile(`<div class="y"></div><style>.y::after { content: "\${notAVar}"; }</style>`);
  new Function(code.replace(/^import.*$/gm, '').replace('export default ', 'globalThis.__t = '));
  assert(code.includes('\\${notAVar}'), 'interpolation escaped');
});

test('a backtick in a static attribute value cannot break out', () => {
  const { code } = compile('<div title="a `b` c" class="d `e`"></div>');
  new Function(code.replace(/^import.*$/gm, '').replace('export default ', 'globalThis.__t = '));
  assert(code.includes('"a `b` c"'), 'attribute emitted as a string literal');
});

// ── Source maps ─────────────────────────────────────────────────────────────

console.log('\nSource maps');

test('emits a v3 source map naming the .sola file', () => {
  const { map } = compile(`<script>let count = $state(0);</script><span>{count}</span>`, {
    filename: 'src/Widget.sola'
  });
  assert(map, 'map emitted');
  assert.strictEqual(map.version, 3);
  assert.deepStrictEqual(map.sources, ['src/Widget.sola']);
  assert(map.sourcesContent[0].includes('$state(0)'), 'original source embedded');
  assert(map.mappings.length > 0, 'mappings present');
});

test('source map points a user-script line back at its line in the .sola file', () => {
  // `let total = $state(7);` is on line 2 (zero-based) of the file below.
  const source = `<script>
  // a comment
  let total = $state(7);
</script>
<span>{total}</span>`;
  const { code, map } = compile(source, { filename: 'W.sola' });

  const generatedLine = code.split('\n').findIndex((l) => l.includes('createSignal(7)'));
  assert(generatedLine >= 0, 'found generated signal line');

  // Decode just enough VLQ to read the source line each generated line maps to.
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lines = map.mappings.split(';');
  let sourceLine = 0;
  let found = null;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    const fields = [];
    let shift = 0, value = 0;
    for (const ch of lines[i]) {
      const digit = B64.indexOf(ch);
      value += (digit & 31) << shift;
      if (digit & 32) { shift += 5; continue; }
      fields.push(value & 1 ? -(value >> 1) : value >> 1);
      shift = 0; value = 0;
    }
    sourceLine += fields[2];
    if (i === generatedLine) { found = sourceLine; break; }
  }
  assert.strictEqual(found, 2, 'maps to line 2 of the .sola source');
});

test('sourcemap:false suppresses the map', () => {
  const { map } = compile(`<script>let a = $state(1);</script>`, { sourcemap: false });
  assert.strictEqual(map, null);
});

// ── Nested brace expressions ─────────────────────────────────────────────────

console.log('\nNested brace expressions');

test('text interpolation with object literal {fn({key: val})}', () => {
  const { code } = compile(`<div>{JSON.stringify({a: 1, b: 2})}</div>`);
  assert(code.includes('JSON.stringify({a: 1, b: 2})'), 'nested object in text expr');
});

test('{@html expr} renders via innerHTML, not textContent', () => {
  const { code } = compile(`<script>let html = $state('<b>hi</b>');</script><div>{@html html()}</div>`);
  assert(code.includes('.innerHTML = String((html()) ?? \'\')'), 'innerHTML assignment with parenthesized expr');
  assert(!code.includes('.textContent = String((html()'), 'does not also go through textContent');
});

test('text interpolation with {a || b} does not produce invalid ?? mixing', () => {
  // JS forbids `x || y ?? ''` without explicit grouping — a naive `String(expr ?? '')`
  // wrapper breaks the extremely common {a || b} fallback pattern used throughout
  // this framework's own component library (e.g. Table.sola: {col.label || col}).
  const { code } = compile(`<div>{col.label || col}</div>`);
  assert(code.includes("String((col.label || col) ?? '')"), 'expr parenthesized before ??');
  new Function(code.replace(/^import.*\n/gm, '').replace('export default ', 'globalThis.__t = '));
});

test('attribute {expr} with nested object literal', () => {
  const { code } = compile(`<div class={getClass({active: true})}></div>`);
  assert(code.includes('getClass({active: true})'), 'nested object in attr expr');
});

test('ternary in attribute: attr={cond ? a : b}', () => {
  const { code } = compile(`<button disabled={count > 0 ? false : true}></button>`);
  assert(code.includes('count > 0 ? false : true'), 'ternary attr expr');
});

test('quoted attr with embedded {expr} compiles to string concatenation, not a template literal', () => {
  // Deliberately not a backtick template literal: confirmed via a real browser against a
  // live enterprise portal instance that its widget-script delivery pipeline
  // mangles `${expr}` down to bare unevaluated expression text. Concatenation is immune.
  const { code } = compile(`<div class="item-{index}"></div>`);
  assert(code.includes('"item-" + (index)'), 'compiles to concatenation');
  assert(!code.includes('`item-${index}`'), 'does not use a backtick template literal');
});

test('quoted attr with multiple {expr} segments concatenates all of them', () => {
  const { code } = compile(`<div style="background: {bg}; color: {fg};"></div>`);
  assert(code.includes('"background: " + (bg) + "; color: " + (fg) + ";"'), 'all segments concatenated in order');
});

// ── TypeScript support ────────────────────────────────────────────────────────

console.log('\nTypeScript support');

test('type annotation stripped: let x: number = $state(0)', () => {
  const { code } = compile(`<script lang="ts">let x: number = $state(0);</script><span>{x}</span>`);
  assert(code.includes('createSignal(0)'), 'TS type annotation stripped');
  assert(!code.includes(': number'), 'no leftover annotation');
});

test('interface declaration stripped', () => {
  const { code } = compile(`<script lang="ts">
interface User { name: string; age: number; }
let name = $state('Alice');
</script><span>{name}</span>`);
  assert(code.includes('createSignal'), 'compiles after interface');
  assert(!code.includes('interface User'), 'interface removed');
});

test('as cast stripped', () => {
  const { code } = compile(`<script lang="ts">const el = document.getElementById('x') as HTMLElement;</script>`);
  assert(!code.includes(' as HTMLElement'), 'as cast removed');
});

// ── Conditionals ──────────────────────────────────────────────────────────────

console.log('\nConditionals');

test('{#if}{:else} emits both branches', () => {
  const { code } = compile(`
<script>let ok = $state(true);</script>
{#if ok}<span>Yes</span>{:else}<span>No</span>{/if}`);
  assert(code.includes('if (ok())'), 'condition auto-called');
  assert(code.includes('Yes'), 'then branch');
  assert(code.includes('No'), 'else branch');
});

test('{#if} without else compiles', () => {
  const { code } = compile(`{#if show}<p>Visible</p>{/if}`);
  assert(code.includes('if (show)'), 'condition');
  assert(code.includes('Visible'), 'content');
});

// ── Each loops ────────────────────────────────────────────────────────────────

console.log('\nEach loops');

test('unkeyed {#each} iterates ascending', () => {
  const { code } = compile(`
<script>let items = $state(['A', 'B']);</script>
{#each items as item}<div>{item}</div>{/each}`);
  assert(code.includes('for (let _i = 0; _i < _items.length; _i++)'), 'ascending loop');
  assert(code.includes('createDocumentFragment()'), 'fragment batching');
});

test('keyed {#each items as item (item.id)} uses Map reconciliation', () => {
  const { code } = compile(`
<script>let rows = $state([{id:1, name:'A'}]);</script>
{#each rows as row (row.id)}<div>{row.name}</div>{/each}`);
  assert(code.includes('_keyMap'), 'keyed map');
  assert(code.includes('String(row.id)'), 'key expression');
  assert(code.includes('e0_keyMap.get(_key)'), 'looks the key up so existing nodes are reused, not rebuilt');
  assert(code.includes('e0_keyMap.delete(_k)'), 'stale key removal');
});

test('{#each} with index variable', () => {
  const { code } = compile(`{#each items as item, i}<li>{i}: {item}</li>{/each}`);
  assert(code.includes('const i = _i'), 'index variable bound');
});

test('keyed {#each} emits a reconciler that can move nodes', () => {
  // The old emitter only inserted, against an anchor it never advanced, so
  // reordering a keyed list left the DOM in its original order — silently.
  const { code } = compile(`<script>let items = $state([]);</script><ul>{#each items as it (it.id)}<li>{it.n}</li>{/each}</ul>`);
  assert(code.includes('insertBefore(_n, _cursor)'), 'moves existing nodes into place');
  assert(code.includes('_cursor = _cursor.nextSibling'), 'advances a cursor');
  assert(code.includes('_seen.add(_key)'), 'tracks live keys');
  assert(!code.includes('_nextKeys.includes'), 'no O(n^2) key scan');
});

// ── Styles ────────────────────────────────────────────────────────────────────

console.log('\nStyles');

test('scoped style: button.hash:hover (pseudo after hash)', () => {
  const { code, css } = compile(`
<style>button:hover { color: red; }</style>
<button>Hi</button>`);
  assert(/button\.sola-[a-z0-9]+:hover/.test(css), 'hash before pseudo');
  assert(!/button:hover\./.test(css), 'hash not appended after pseudo');
});

test('style deduplication guard emitted', () => {
  const { code } = compile(`<style>.x { color: red; }</style><div class="x">Hi</div>`);
  assert(code.includes('__solaStyles'), 'dedup guard');
});

test('styles target the ShadowRoot when mounted inside one', () => {
  const { code } = compile(`<style>.x { color: red; }</style><div class="x">Hi</div>`);
  assert(code.includes('getRootNode()'), 'resolves the root the component lives in');
  assert(code.includes('instanceof ShadowRoot'), 'detects a shadow root');
  assert(code.includes('document.head'), 'still falls back to document.head');
});

test('$persist compiles to a persistent signal that reads and assigns like $state', () => {
  const { code } = compile(`<script>let open = $persist('k', false);\nfunction t(){ open = !open; }</script><div>{open}</div>`);
  assert(code.includes("const [open, set_open] = createPersistentSignal('k', false)"), 'factory');
  assert(code.includes('set_open(!open())'), 'assignment rewritten');
  assert(code.includes('createPersistentSignal,'), 'imported from core');
});


// ── Production-feedback regressions ───────────────────────────────────────────

console.log('\nScoped styles: :global()');

test(':global(x) after a scoped selector leaves x unscoped', () => {
  const { css } = compile(`<div class="a">x</div><style>.a :global(table) { color: red; }</style>`);
  assert(/\.a\.sola-[a-z0-9]+ table\s*\{/.test(css), 'hash on .a, none on table: ' + css);
  assert(!css.includes(':global'), ':global wrapper removed');
});

test(':global(body) alone is not scoped at all', () => {
  const { css } = compile(`<p>x</p><style>:global(body) { margin: 0; }</style>`);
  assert(/^body\s*\{/.test(css.trim()), css);
});

test(':global first, scoped last: the hash goes on the last scoped compound', () => {
  const { css } = compile(`<p class="y">x</p><style>:global(.theme-dark) .y { color: white; }</style>`);
  assert(/\.theme-dark \.y\.sola-[a-z0-9]+\s*\{/.test(css), css);
});

test('a comma inside :is() / :global() does not split the selector', () => {
  const { css } = compile(`<p class="a">x</p><style>.a :is(b, i) { color: red; } .a :global(.x, .y) { color: blue; }</style>`);
  assert(/\.a :is\(b, i\)\.sola-[a-z0-9]+\s*\{/.test(css), 'list stays grouped: ' + css);
  assert(/\.a\.sola-[a-z0-9]+ :is\(\.x, \.y\)\s*\{/.test(css), 'grouped, still under .a: ' + css);
});

console.log('\nScript rewrite: object shorthand');

test('{ open, n } shorthand reads each signal exactly once', () => {
  const { code } = compile(`<script>let open = $state(false); let n = $state(0);\nfunction b(){ return { open, n }; }</script><p>{n}</p>`);
  assert(code.includes('{ open: open(), n: n() }'), 'single call each');
  assert(!/\(\)\(\)/.test(code), 'no double call');
});

console.log('\nModule outputs');

test('ESM output adds no extra exports unless asked', () => {
  const { code, dts } = compile(`<p class="a">x</p><style>.a { color: red; }</style>`);
  assert(!/export const (css|scopeHash)/.test(code), 'default output is unchanged');
  assert(!dts.includes('scopeHash'), 'dts matches the module');
});

test('exportStyles: true exports css and scopeHash for Shadow DOM hosts', () => {
  const { code, css, scopeHash, dts } = compile(`<p class="a">x</p><style>.a { color: red; }</style>`, { exportStyles: true });
  assert(dts.includes('export declare const css: string;'), 'dts declares them');
  assert(code.includes(`export const scopeHash = ${JSON.stringify(scopeHash)}`), 'scopeHash exported');
  assert(code.includes('export const css = `') && code.includes(css), 'css exported');
});

test('IIFE output stays free of ES exports', () => {
  const { code } = compile(`<p class="a">x</p><style>.a { color: red; }</style>`, { target: 'iife', exportStyles: true });
  assert(!/\nexport /.test(code), 'no export statements in an IIFE');
});

test('.d.ts types a prop with a null or undefined default as any', () => {
  const { dts } = compile(`<script>export let onAction = null; export let context = undefined; export let label = 'x';</script><p>{label}</p>`);
  assert(dts.includes('onAction?: any;'), dts);
  assert(dts.includes('context?: any;'), dts);
  assert(dts.includes('label?: string;'), 'other defaults keep their inferred type');
});

test('compile() returns a .d.ts with typed props', () => {
  const { dts } = compile(`<script>export let title = 'x'; export let n = 0; export let on = false; export let xs = [];</script><p>{title}</p>`);
  assert(dts.includes('title?: string;') && dts.includes('n?: number;') && dts.includes('on?: boolean;') && dts.includes('xs?: unknown[];'), dts);
  assert(dts.includes('export default mount;'), 'default export declared');
});


console.log('\nBus macros');

test('$on subscribes through the aliased default bus and unsubscribes on destroy', () => {
  const { code } = compile(`<script>let title = $state('');\n$on('sola:toast', (t) => { title = t.text; });</script><p>{title}</p>`);
  assert(code.includes("onDestroy(__solaBus.on('sola:toast', (t) => { set_title(t.text); }))"), 'wired + handler state rewritten');
  assert(code.includes('bus as __solaBus'), 'bus imported under an alias');
});

test('$lastEvent is a read-only reactive accessor released on destroy', () => {
  const { code } = compile(`<script>let ctx = $lastEvent('sola:context');</script><p>{ctx?.title}</p>`);
  assert(code.includes("const ctx = __solaBus.signal('sola:context'); onDestroy(ctx.dispose);"), code);
  assert(/ctx\(\)\?\.title/.test(code), 'reads call the accessor');
});

test('a user variable named bus does not collide with the macros', () => {
  const { code } = compile(`<script>let bus = $state(1);\n$on('x', () => { bus = 2; });</script><p>{bus}</p>`);
  assert(code.includes('__solaBus.on') && code.includes('set_bus(2)'), code);
});

test('the IIFE target pulls the bus off the SolaCore global', () => {
  const { code } = compile(`<script>$on('x', () => {});</script><p>x</p>`, { target: 'iife' });
  assert(code.includes('bus: __solaBus } = window.SolaCore'), code.split('\n').find(l => l.includes('SolaCore')));
});

// ── Events and bindings ───────────────────────────────────────────────────────

console.log('\nEvents and bindings');

test('on:click={handler} wires addEventListener', () => {
  const { code } = compile(`<script>function go() {}</script><button on:click={go}>Go</button>`);
  assert(code.includes("addEventListener('click', go)"), 'on:click');
});

test('bind:value={signal} wires two-way', () => {
  const { code } = compile(`<script>let val = $state('');</script><input bind:value={val} />`);
  assert(code.includes("addEventListener('input'"), 'input listener');
  assert(code.includes('set_val(e.target.value)'), 'setter call');
  assert(code.includes('val() ??'), 'reactive read');
});

test('onXxx-named callback prop on a component passes the real function, not a string', () => {
  // htmlparser2 lowercases attribute names by default (onChange -> onchange), and the
  // on:/bare-on exception meant for real DOM event handlers (onclick, on:click) can't yet
  // tell a <button onclick> apart from a <Toggle onChange> at preprocessing time — both bugs
  // combined to silently turn a callback prop into the literal string "handleChange".
  const { code } = compile(
    `<script>import Toggle from './Toggle.sola'; function handleChange(v) {}</script><Toggle onChange={handleChange} />`
  );
  assert(code.includes('"onChange": (handleChange)'), 'onChange prop passed as a raw reference, correct case');
  assert(!code.includes('"onchange"'), 'attribute name not lowercased');
  assert(!code.includes('"onChange": "handleChange"'), 'value not passed as a literal string');
});

// ── imports from packages ───────────────────────────────────────

console.log('\nimports from packages');

test('a component imported from a package subpath is mounted, not created as an HTML element', () => {
  // The documented form. It used to compile to document.createElement('DataCard'),
  // because only a path ending in .sola counted as a component.
  const { code } = compile(
    `<script>import DataCard from '@sola-air-ui/ui/data-card';</script><DataCard title="A" value="1" />`
  );
  assertValidJs(code.replace(/^import .*$/gm, ''));
  assert(code.includes("import DataCard from '@sola-air-ui/ui/data-card';"), 'the import is kept');
  assert(code.includes('DataCard(comp'), 'it is mounted as a component');
  assert(!code.includes("createElement('DataCard')"), 'not an unknown HTML element');
  assert(code.includes('"title": "A"') && code.includes('"value": "1"'), 'props are passed');
});

test('a named import from a package root is a component too', () => {
  const { code } = compile(`<script>import { Table } from '@sola-air-ui/ui';</script><Table rows={[]} />`);
  assert(code.includes("import { Table } from '@sola-air-ui/ui';"), 'import kept');
  assert(code.includes('Table(comp'), 'mounted as a component');
});

test('a package import that is not a component is kept for the script to use', () => {
  const { code } = compile(`<script>import { format } from 'some-lib'; let s = format(1);</script><p>{s}</p>`);
  assert(code.includes("import { format } from 'some-lib';"), 'the import survives');
  assert(code.includes('format(1)'), 'and the script still calls it');
});

test('an import from core of a name the compiler does not provide is kept', () => {
  const { code } = compile(`<script>import { configureData } from '@sola-air-ui/core'; configureData({ relayEndpoint: '/x' });</script><p>x</p>`);
  assert(/import \{ configureData \} from '@sola-air-ui\/core';/.test(code), 'extra core import emitted');
});

test('a core name the compiler already provides is not imported twice', () => {
  const { code } = compile(
    `<script>import { createEffect, configureData } from '@sola-air-ui/core'; createEffect(() => {}); configureData({});</script><p>x</p>`
  );
  const importLines = code.split('\n').filter(l => l.startsWith('import') && l.includes("'@sola-air-ui/core'"));
  const bindings = importLines.join(',').match(/\bcreateEffect\b/g) || [];
  assert.strictEqual(bindings.length, 1, 'createEffect is bound once, got: ' + importLines.join(' | '));
  assert(code.includes('configureData'), 'configureData is still imported');
  // Two bindings of one name is a SyntaxError in a module.
  assertValidJs(code.replace(/^import .*$/gm, ''));
});

test('an aliased core import keeps its alias', () => {
  const { code } = compile(`<script>import { createEffect as watch } from '@sola-air-ui/core'; watch(() => {});</script><p>x</p>`);
  assert(code.includes('createEffect as watch'), 'alias preserved');
});

test('iife output pulls extra core names from window.SolaCore', () => {
  const { code } = compile(
    `<script>import { configureData } from '@sola-air-ui/core'; configureData({});</script><p>x</p>`,
    { target: 'iife', exportName: 'X' }
  );
  assert(/const \{[^}]*configureData[^}]*\} = window\.SolaCore;/.test(code), 'destructured from the global');
  assert(!/^import /m.test(code), 'no import statements in an IIFE');
});

test('a lowercase tag is never mistaken for an imported component', () => {
  const { code } = compile(`<script>import card from 'x';</script><card></card>`);
  assert(code.includes("createElement('card')"), 'still a plain element');
});

// ── IIFE target (no-bundler) ────────────────────────────────────

console.log('\nIIFE target');

test('iife target wraps output in IIFE and uses window.SolaCore', () => {
  const src = '<script>let n = $state(0);</script><span>{n}</span>';
  const { code } = compile(src, { target: 'iife', exportName: 'MyWidget' });
  assert(code.includes('(function()'), 'IIFE wrapper');
  assert(code.includes('window.SolaCore'), 'pulls from global');
  assert(code.includes("window['MyWidget']"), 'exports named global');
  assert(code.includes('createSignal(0)'), '$state compiled inside IIFE');
  assert(!code.includes("import {"), 'no ESM import');
  assert(!code.includes('export default'), 'no ESM export');
});

test('iife target closes IIFE correctly', () => {
  const { code } = compile('<div>Hello</div>', { target: 'iife' });
  assert(code.trimEnd().endsWith('})();'), 'IIFE closes');
});

// ── Error messages ────────────────────────────────────────────────────────────

console.log('\nError messages');

test('parse error includes file path and line number', () => {
  try {
    compile(`<script>const x = @@@;</script>`, { filename: 'Test.sola' });
    assert.fail('should have thrown');
  } catch (err) {
    assert(err.message.includes('Test.sola'), 'filename in error');
    assert(/line \d+/.test(err.message), 'line number in error');
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
