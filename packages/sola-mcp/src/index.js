#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { compile } from '@sola-air-ui/compiler';
import { checkSource } from '@sola-air-ui/compiler/check';

export function compileComponentTool({ source, filename }) {
  const file = filename ?? 'Component.sola';
  const diagnostics = checkSource(source, file);
  const blockErrors = diagnostics.filter((d) => d.code !== 'SOLA000');
  if (blockErrors.length > 0) {
    return {
      ok: false,
      error: blockErrors.map((d) => `${d.file}:${d.line}:${d.column} [${d.code}] ${d.message}`).join('\n'),
      diagnostics: blockErrors
    };
  }
  try {
    const result = compile(source, { filename: file });
    return {
      ok: true,
      js: result.code,
      code: result.code,
      css: result.css ?? null,
      scopeHash: result.scopeHash
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message
    };
  }
}

export function validateComponentTool({ source, filename }) {
  const file = filename ?? 'validate.sola';
  const diagnostics = checkSource(source, file);
  const errors = diagnostics.map((d) => `${d.file}:${d.line}:${d.column} [${d.code}] ${d.message}`);
  return {
    valid: errors.length === 0,
    errors,
    diagnostics
  };
}

export const SOLA_DOCS = `
# Sola AIR — Single-File Component (.sola) & Runtime Reference

## 1. File Structure
A \`.sola\` file has up to three sections (no \`<template>\` wrapper tag — markup lives at the top level):

  <script>   reactive logic (JavaScript or TypeScript)
  <!-- top-level HTML markup with Sola expressions and blocks -->
  <style>    scoped CSS (selectors are automatically namespaced per component)

A compiled \`.sola\` file's default export is its mount function:
  export default function mount(target, props = {}) -> () => void (returns teardown disposer)

---

## 2. Script — Reactive Macros (Runes)

$state(initial)
  Reactive signal. Reads in <script> and markup are auto-called by the compiler,
  and assignments/updates (count = 5, count++, count += 1) compile to setter calls.
    let count = $state(0);
    function increment() { count++; }

$derived(expr)
  Lazy computed signal; re-evaluates when dependencies change. Accepts a bare
  expression or an arrow function.
    let doubled = $derived(count * 2);

$effect(() => { ... })
  Runs immediately and re-runs whenever any signal read inside changes.
  Automatically disposed when the owning component or {#if}/{#each} branch unmounts.
    $effect(() => {
      console.log('Current count:', count);
    });

$persist(key, initial, options?)
  Persistent signal backed by sessionStorage (default) or localStorage, synced live
  across same-origin tabs via BroadcastChannel.
    let drawerOpen = $persist('shell.drawer', false, { storage: 'session' });

$intent(promptOrFn, options?)
  Ambient AI intent signal. Resolves structured JSON or streams tokens from the
  configured intent endpoint.
  Options: { debounceMs, trigger: 'auto' | 'manual', transport, stream, model, provider }
    let summary = $intent(() => \`Summarize \${topic}\`, { debounceMs: 400 });
    // Manual trigger:
    let ask = $intent('', { trigger: 'manual' });
    // ask.run('Explain this error');
    // Sub-signals: ask.loading(), ask.error()

$data(source, options?)
  Reactive data connection through the Sola Relay.
  Returns accessor reading { loading, data, error } with .refetch() and .stop().
    let metrics = $data('postgres:metrics', { refresh: '30s', limit: 25 });

$on(type, handler)
  Subscribes to an event on the default Sola event bus and unsubscribes automatically
  when the component is destroyed.
    $on('sola:toast', (payload) => { lastToast = payload.text; });

$lastEvent(type)
  Reactive accessor holding the most recent payload emitted for \`type\` on the bus.
    let ctx = $lastEvent('sola:context');

onMount(fn) / onDestroy(fn)
  Component lifecycle hooks.

---

## 3. Template Syntax

Reactive text & attributes:
  <h1>{title}</h1>
  <p>Count: {count} (Doubled: {doubled})</p>
  <div class="box {active ? 'is-open' : ''}" data-count={count}></div>

Raw HTML (trusted content only):
  {@html renderedHtml}

Conditionals ({#if} / {:else if} / {:else} / {/if}):
  {#if status === 'critical'}
    <span class="crit">Critical</span>
  {:else if status === 'warning'}
    <span class="warn">Warning</span>
  {:else}
    <span class="ok">Nominal</span>
  {/if}

Loops ({#each}):
  {#each items as item, index (item.id)}
    <li>{index + 1}: {item.name}</li>
  {/each}

Event handlers:
  <button onclick={increment}>+1</button>
  <button on:click={() => count = 0}>Reset</button>

Two-way input binding:
  <input type="text" bind:value={query} />

Scoped styles & :global():
  <style>
    .card { padding: 16px; }
    :global(body) { margin: 0; }
  </style>

---

## 4. Compiler & Static Checker API (@sola-air-ui/compiler)

  import { compile } from '@sola-air-ui/compiler';
  import { checkSource, checkFiles } from '@sola-air-ui/compiler/check';

  const { code, css, scopeHash, map, dts } = compile(source, {
    filename: 'Widget.sola',
    target: 'esm',        // 'esm' | 'iife'
    exportStyles: false,  // export css & scopeHash constants when mounting in Shadow DOM
    sourcemap: true
  });

  // Check for compile errors (SOLA000) and unbalanced template blocks (SOLA001-SOLA005):
  const diagnostics = checkSource(source, 'Widget.sola');

---

## 5. Runtime Exports (@sola-air-ui/core)

  createSignal(initial)                 -> [read, write]
  createDerived(fn)                     -> read
  createEffect(fn)                      -> dispose
  flushSync()
  onMount(fn) / onDestroy(fn)
  createIntent(prompt, options?)        -> accessor (.loading, .error, .run)
  configureIntent(config)
  createData(source, options?)          -> accessor (.refetch, .stop)
  configureData(config)
  createPersistentSignal(key, init, o?) -> [read, write, { clear, dispose }]
  clearPersistentState(options?)
  mountShell(Component, props?, opts?)  -> { host, root, teardown }
  createBus(options?) / configureBus(options) / bus
  createSentinel(name?, options?) / SolaSentinel

---

## 6. Official UI Components (@sola-air-ui/ui)

Import by subpath (e.g. \`import DataCard from '@sola-air-ui/ui/data-card'\`) or named from \`@sola-air-ui/ui\`:
  Layout:      Canvas, Card, Stack, Dashboard
  Data:        StatGrid, DataCard, Table, GaugeCard, FlowWaterfall, IncidentTriageMatrix, StreamView, Chart, MarkdownViewer, HtmlViewer
  Inputs:      Button, TextInput, Select, Toggle, DatePicker, TactileDialCard
  Feedback:    Badge, Spinner, Alert, Modal, Toast
  Shell:       LauncherDock, CommandPalette, CompanionDrawer, ToastHost
  AI / Intent: IntentCard, IntentList, AmbientSuggestion, ConversationThread, ActionStrip, ConfidenceBadge, IntentSheet
  Raw HTML:    SolaSafeHTML

---

## 7. Complete Example

<script>
  export let title = "Cluster Dashboard";
  let count = $state(0);
  let doubled = $derived(count * 2);

  function increment() {
    count++;
  }
</script>

<div class="card">
  <h3>{title}</h3>
  <p>Count: {count} (Doubled: {doubled})</p>
  <button onclick={increment}>Increment</button>
</div>

<style>
  .card {
    padding: 1.5rem;
    border-radius: 1rem;
    background: #090d19;
    color: #f8fafc;
  }
</style>
`.trim();

export function createMcpServer() {
  const server = new McpServer({
    name: 'sola-mcp',
    version: '1.0.4'
  });

  server.tool(
    'compile_component',
    'Compile a Sola single-file component (.sola) to JavaScript. Runs sola-check first to catch unbalanced template blocks, then returns the compiled ES module JS and scoped CSS.',
    {
      source: z.string().describe('The full .sola source — <script>, top-level HTML markup, and <style> sections'),
      filename: z.string().optional().describe('Filename hint used in error messages (default: Component.sola)')
    },
    async ({ source, filename }) => {
      const res = compileComponentTool({ source, filename });
      return {
        content: [{ type: 'text', text: JSON.stringify(res) }],
        ...(res.ok ? {} : { isError: true })
      };
    }
  );

  server.tool(
    'validate_component',
    'Validate a Sola single-file component (.sola) using sola-check and the compiler. Catches syntax errors and unbalanced {#if}/{#each}/{:else} blocks.',
    {
      source: z.string().describe('The .sola source to validate'),
      filename: z.string().optional().describe('Filename hint used in diagnostics (default: validate.sola)')
    },
    async ({ source, filename }) => {
      const res = validateComponentTool({ source, filename });
      return {
        content: [{ type: 'text', text: JSON.stringify(res) }]
      };
    }
  );

  server.resource(
    'sola-docs',
    'sola://docs',
    { description: 'Sola AIR API reference — .sola syntax, runes, shell & bus primitives, and compiler output', mimeType: 'text/plain' },
    async () => ({
      contents: [{
        uri: 'sola://docs',
        mimeType: 'text/plain',
        text: SOLA_DOCS
      }]
    })
  );

  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
