# @sola-air-ui/compiler

Compiler for [Sola AIR](https://sola-air.dev) single-file `.sola` components — transforms `<script>` + template + `<style>` into a dependency-free ES module (or IIFE) that mounts real DOM nodes with fine-grained reactivity. No virtual DOM, no diffing.

## Install

```bash
npm install @sola-air-ui/compiler
```

## Programmatic use

```js
import { compile } from '@sola-air-ui/compiler';
import { checkSource, checkFiles } from '@sola-air-ui/compiler/check';
import { readFileSync } from 'node:fs';

const source = readFileSync('App.sola', 'utf-8');
const diagnostics = checkSource(source, 'App.sola');

const result = compile(source, {
  target: 'esm',           // or 'iife'
  exportName: 'App',       // used for iife builds
  filename: 'App.sola',    // improves error messages
});

console.log(result.code); // compiled JS
console.log(result.css);  // scoped CSS
console.log(result.dts);  // generated .d.ts
```

## CLI

```bash
npx sola build App.sola
npx sola-check src/
```

`sola-check` validates `.sola` files on disk (pass `--json` for machine-readable output), reporting syntax errors (`SOLA000`) and unbalanced or malformed `{#if}` / `{#each}` / `{:else}` blocks (`SOLA001`).

## What a `.sola` file looks like

```html
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<div>
  <h1>Count: {count}</h1>
  <p>Doubled: {doubled}</p>
  <button onclick={() => count++}>+1</button>
</div>

<style>
  h1 { color: #0ea5e9; font-weight: 800; }
</style>
```

Most projects won't call this package directly — use `@sola-air-ui/vite-plugin-sola` for a normal Vite dev/build setup, or the `sola-air` meta-package to install everything at once.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
