// Single source of truth for the executable code samples shown in the docs.
//
// These are imported by both the docs page and e2e/docs-snippets.spec.ts, which
// compiles every `.sola` snippet here and mounts it in a real browser, and runs
// every `js` snippet against the real core runtime. Keeping one copy is what
// makes that test meaningful: a sample cannot be published without passing.

const OPEN = '<' + 'script>';
const CLOSE = '<' + '/script>';
const STYLE_OPEN = '<' + 'style>';
const STYLE_CLOSE = '<' + '/style>';

/** A `.sola` component sample, compiled and mounted by the docs snippet test. */
export interface SolaSnippet {
  id: string;
  code: string;
  /** Text the mounted component must render. */
  expectText: string[];
  /** Optional: click this selector once, then assert `expectAfterClick`. */
  click?: string;
  expectAfterClick?: string[];
  /** Props passed to the compiled mount function. */
  props?: Record<string, unknown>;
}

/** A runtime-API sample, executed against @sola-air-ui/core by the same test. */
export interface JsSnippet {
  id: string;
  code: string;
  /** Console output the sample's own comments claim it produces. */
  expectLogs: string[];
}

export const syntaxExample = `${OPEN}
  export let title = "Cluster Dashboard";
  let count = $state(0);
  let doubled = $derived(count * 2);

  function increment() {
    count++;
  }
${CLOSE}

<div class="card">
  <h3>{title}</h3>
  <div class="value">{doubled}</div>
  <button onclick={increment}>Increment Metric</button>
</div>

${STYLE_OPEN}
  .card {
    padding: 1.5rem;
    border-radius: 1rem;
    background: #090d19;
    color: #fff;
  }
  .value {
    font-size: 2rem;
    font-weight: 800;
    color: #10b981;
  }
${STYLE_CLOSE}`;

export const eachExample = `${OPEN}
  let nodes = $state([
    { id: 'eu-west-1', rps: 420 },
    { id: 'us-east-2', rps: 1180 }
  ]);
${CLOSE}

<ul class="nodes">
  {#each nodes as node (node.id)}
    <li>{node.id} — {node.rps} RPS</li>
  {/each}
</ul>`;

export const conditionalExample = `${OPEN}
  let healthy = $state(true);
${CLOSE}

<div class="status">
  {#if healthy}
    <span>All systems nominal</span>
  {:else}
    <span>Degraded</span>
  {/if}
  <button onclick={() => healthy = !healthy}>Toggle</button>
</div>`;

export const signalExample = `import { createSignal } from '@sola-air-ui/core';

// Create a reactive state tuple
const [getCount, setCount] = createSignal(0);

console.log(getCount()); // 0
setCount(prev => prev + 1);
console.log(getCount()); // 1`;

export const derivedExample = `import { createSignal, createDerived } from '@sola-air-ui/core';

const [getRps, setRps] = createSignal(1200);
// Automatically recomputes when getRps updates
const getThroughput = createDerived(() => \`\${getRps() * 60} req/min\`);

console.log(getThroughput()); // "72000 req/min"`;

export const effectExample = `import { createSignal, createEffect } from '@sola-air-ui/core';

const [getLatency, setLatency] = createSignal(12);

// Auto-subscribes to getLatency()
createEffect(() => {
  if (getLatency() > 100) {
    console.warn("High latency threshold breach!");
  }
});`;

export const mountExample = `import MyComponent from './MyComponent.sola';

// Mount directly into vanilla DOM container
const unmount = MyComponent(document.getElementById('root'), {
  title: "Production Ingress Cluster"
});

// Clean up listeners when done
unmount();`;

export const intentMacroExample = `${OPEN}
  // Resolves an ambient component through the configured intent provider
  let liveWidget = $intent("Generate cluster latency gauge with 50ms SLA threshold");
${CLOSE}

<div class="widget-host">
  {#if liveWidget.loading}
    <span>Resolving…</span>
  {:else}
    <div>{liveWidget}</div>
  {/if}
</div>`;

export const dataMacroExample = `${OPEN}
  // Rows from a Google Sheet through the Sola Relay, re-fetched every 15 seconds.
  // Each row is an object keyed by the sheet's header row.
  let rows = $data("sheet://YOUR_SHEET_ID", { refresh: "15s" });
${CLOSE}

{#if rows().loading}
  <p>Loading…</p>
{/if}
{#if rows().error}
  <p>{rows().error}</p>
{/if}
{#if rows().data}
  <ul>
    {#each rows().data as row (row.month)}
      <li>{row.month}: {row.mrr}</li>
    {/each}
  </ul>
{/if}`;

export const dataPostgresExample = `${OPEN}
  // Same shape from a PostgreSQL table. The connection string lives in the
  // relay, so database credentials never reach the browser.
  let nodes = $data("postgres-primary:nodes", { refresh: "15s" });
${CLOSE}

{#if nodes().loading}
  <p>Loading…</p>
{/if}
{#if nodes().error}
  <p>{nodes().error}</p>
{/if}
{#if nodes().data}
  <ul>
    {#each nodes().data as node (node.name)}
      <li>{node.name}: {node.status}</li>
    {/each}
  </ul>
{/if}`;

/** Snippets that talk to the relay. The e2e suite answers the relay request itself. */
export const dataSnippets = [
  {
    id: 'data-sheet',
    code: dataMacroExample,
    rows: [
      { month: 'Aug', mrr: 169400 },
      { month: 'Sep', mrr: 184200 }
    ],
    expectText: ['Loading…', 'Aug: 169400', 'Sep: 184200']
  },
  {
    id: 'data-postgres',
    code: dataPostgresExample,
    rows: [
      { name: 'node-a', status: 'ready' },
      { name: 'node-b', status: 'draining' }
    ],
    expectText: ['node-a: ready', 'node-b: draining']
  }
];

export const persistDockExample = `${OPEN}
  // $persist reads like $state, but survives page loads and syncs across tabs.
  let open = $persist('dock.open', false);
  let note = $persist('dock.note', '');

  function toggle() {
    open = !open;
  }
${CLOSE}

<div class="dock">
  <button onclick={toggle}>Toggle assistant</button>
  {#if open}
    <aside>Assistant is open</aside>
  {/if}
  <input bind:value={note} placeholder="Notes follow you between pages" />
</div>

${STYLE_OPEN}
  .dock { font-family: system-ui, sans-serif; display: grid; gap: 8px; max-width: 280px; }
${STYLE_CLOSE}`;

/** Shown in the docs, not executed as a snippet: it needs a real multi-page site. */
export const shellBootstrapExample = `// portal-shell.js — load this file on EVERY page of the portal.
import Dock from './Dock.sola';
import tokensCss from '@sola-air-ui/tokens/css?raw';
import { mountShell, clearPersistentState } from '@sola-air-ui/core';

const shell = mountShell(Dock, {}, {
  id: 'portal-dock',                       // same id on every page; mounting twice is a no-op
  shadow: import.meta.env?.DEV ? 'open' : 'closed',
  css: tokensCss,                          // design tokens don't cross the shadow boundary on their own
  hostStyle: { position: 'fixed', right: '16px', bottom: '16px', zIndex: '900' }
});

// Persisted state outlives the page, so wipe it when the person signs out.
export function onSignOut() {
  clearPersistentState();                  // storage + every open tab
  shell.teardown();
}`;

export const busBasicsExample = `import { createBus } from '@sola-air-ui/core';

const bus = createBus();

bus.on('ask', (payload) => console.log('asked about', payload.topic));

const payload = { topic: 'latency' };
bus.emit('ask', payload);
bus.emit('ask', payload); // the same payload again: still delivered

bus.dispose();`;

export const busComponentExample = `${OPEN}
  let toast = $state('');
  // The latest payload of an event, as a reactive value.
  let ctx = $lastEvent('sola:context');
  // Runs on every emission, duplicates included. Unsubscribes when the component is destroyed.
  $on('sola:toast', (t) => { toast = t.text; });
${CLOSE}

<div>
  <p>{ctx?.title ?? 'No context yet'}</p>
  <p>{toast}</p>
</div>`;

export const busConfigExample = `import { configureBus } from '@sola-air-ui/core';

// Once, at bootstrap, before any component subscribes.
configureBus({
  dom: {
    target: window,
    in:  ['sola:context'],    // host page CustomEvents -> bus
    out: ['sola:navigate'],   // bus -> host page CustomEvents
  },
  broadcast: ['sola:toast'],  // the only type that reaches other tabs
  validate: {
    'sola:context': (p) => typeof p?.title === 'string',
    'sola:toast':   (p) => typeof p?.text === 'string',
  },
  sticky: {
    // A one-shot handoff that survives a page navigation, once.
    'sola:context': { store: 'session', ttlMs: 30000, consume: true },
  },
  guard: {
    // Your policy lives here, not in the library.
    'sola:context': ({ from }) => from !== 'remote',
  },
  onReject: (info) => console.warn('rejected', info.type, info.reason), // no payload
});`;

export const busHostExample = `// Host page code: no Sola import needed.

// Tell the shell what the user is looking at.
window.dispatchEvent(new CustomEvent('sola:context', {
  detail: { title: 'Incident INC0012' }
}));

// Hear what the shell asks the host to do.
window.addEventListener('sola:navigate', (e) => {
  router.go(e.detail.view);
});`;

/** Every `.sola` snippet the docs publish, with what it must render. */
export const solaSnippets: SolaSnippet[] = [
  {
    id: 'syntax',
    code: syntaxExample,
    props: { title: 'Cluster Dashboard' },
    expectText: ['Cluster Dashboard', '0', 'Increment Metric'],
    click: 'button',
    // count 1 → doubled 2
    expectAfterClick: ['2']
  },
  {
    id: 'each',
    code: eachExample,
    expectText: ['eu-west-1', '420 RPS', 'us-east-2', '1180 RPS']
  },
  {
    id: 'conditional',
    code: conditionalExample,
    expectText: ['All systems nominal'],
    click: 'button',
    expectAfterClick: ['Degraded']
  },
  {
    id: 'persist-dock',
    code: persistDockExample,
    expectText: ['Toggle assistant'],
    click: 'button',
    expectAfterClick: ['Assistant is open']
  },
  {
    id: 'bus-component',
    code: busComponentExample,
    expectText: ['No context yet']
  }
];

/** Every runtime-API snippet, with the output its own comments promise. */
export const jsSnippets: JsSnippet[] = [
  { id: 'signal', code: signalExample, expectLogs: ['0', '1'] },
  { id: 'derived', code: derivedExample, expectLogs: ['72000 req/min'] },
  { id: 'effect', code: effectExample, expectLogs: [] },
  // The second emit repeats the first payload exactly: events are not state, so it still arrives.
  { id: 'bus-basics', code: busBasicsExample, expectLogs: ['asked about latency', 'asked about latency'] }
];
