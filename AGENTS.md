# SOLA FRAMEWORK ARCHITECTURE & AGENT SPECIFICATION (AGENTS.md)

This document provides exact syntax rules, AST schemas, control-flow specifications, and component library references for AI Coding Models (Claude, ChatGPT, Gemini, Antigravity) to author complete, production-ready Sola applications.

> Rewritten 2026-09-01 to match what's actually implemented in `packages/compiler/src/index.js` and `packages/core/src/index.js`, after an external audit found this document had drifted into aspirational/fictional territory (multi-framework adapters, a preset system, and components that were never built). Every code sample below was checked against the real compiler transform, not written from memory.

---

## 1. Core Framework Paradigm

Sola is a **zero-VDOM, fine-grained ambient runtime** (`~7.5 kB` gzipped for the whole core runtime; measured by `scripts/core-size.mjs`, and checked against this line by `packages/core/test/size.test.js`).
- Components compile into **native JavaScript ES modules** that perform direct DOM node operations without virtual DOM diffing loops.
- Reactivity relies on fine-grained getter/setter signals (`createSignal`, `createDerived`, `createEffect`).
- A compiled component's default export **is** its mount function: `export default function mount(target, props) { ... }`. There is no separate `mount(el, Component, props)` helper exported from `@sola-air-ui/core` — you call the compiled component itself.

---

## 2. Component File Format (`.sola`)

A Sola component encapsulates logic (`<script>`), template markup (`HTML`), and scoped styling (`<style>`).

```html
<script>
  // Props received from parent host
  export let title = "Telemetry Monitor";
  export let initialCount = 0;

  // Local reactive signals. $state() compiles to createSignal() under the
  // hood. $derived() takes a bare expression; the compiler wraps it so it
  // is tracked. `$derived(() => count * 2)` works too.
  let count = $state(initialCount);
  let doubled = $derived(count * 2);

  // Event handlers. Bare assignment to a $state variable (count += 1) is
  // rewritten by the compiler into a setter call automatically — you don't
  // call a setter yourself unless you destructured one explicitly.
  function increment() {
    count += 1;
  }
</script>

<div class="card">
  <h3>{title}</h3>
  <!-- Write plain names in templates: {count}. The compiler turns reads into tracked calls. -->
  <p>Active Nodes: {count} (Capacity: {doubled})</p>
  <button onclick={increment}>Scale Node +1</button>
</div>

<style>
  .card {
    padding: 20px;
    background: #090d19;
    border-radius: 16px;
    color: #f8fafc;
  }
</style>
```

---

## 3. Template Control Flow & Expressions

### A. Conditionals (`{#if}`)

`{#if}`, `{:else if}` and `{:else}` all work, and blocks nest. The compiler rewrites an `{:else if}` chain into nested if/else blocks, and a later branch's expression is only evaluated when the earlier conditions are false (`compiler.test.js`: "{:else if} compiles to a nested conditional"). `IntentSheet.sola` in the shipped library uses a three-way chain.

```html
{#if status === 'critical'}
  <div class="badge-red">CRITICAL INCIDENT</div>
{:else if status === 'degraded'}
  <div class="badge-amber">DEGRADED</div>
{:else}
  <div class="badge-emerald">SYSTEM NOMINAL</div>
{/if}
```

An earlier version of this document said `{:else if}` was unsupported and nested `{#if}` was unreliable; both were fixed in the block scanner rewrite. One thing the compiler still does **not** catch: an unbalanced block (an unclosed `{#if}`, a stray `{/each}`, a `{:else}` outside an `{#if}`) compiles without error and renders as literal text on the page. Run `sola-check` (in `@sola-air-ui/compiler` 1.4.0+) to find those.

### B. Iteration Loops (`{#each}`)
```html
<ul>
  {#each items as item, index (item.id)}
    <li class="item-row">
      <span>{index + 1}. {item.name}</span>
      <button onclick={() => removeItem(item.id)}>Delete</button>
    </li>
  {/each}
</ul>
```

### C. Two-Way Form Inputs (`bind:value`)
```html
<input type="text" bind:value={searchQuery} placeholder="Filter incidents..." />
```

### D. Component Composition & Props
```html
<script>
  import DataCard from '@sola-air-ui/ui/data-card';
  import StatGrid from '@sola-air-ui/ui/stat-grid';

  let rps = $state("1,420 RPS");
</script>

<div class="grid grid-cols-2 gap-4">
  <DataCard title="Cluster Volume" value={rps} trend="+14% vs baseline" />
  <StatGrid columns="2" gap="10px">
    <!-- ... -->
  </StatGrid>
</div>
```

How props reach a child:

- A literal (`title="Cluster Volume"`) is passed as a string.
- A bare name (`value={rps}`) is passed as-is. For a `$state` that is the signal accessor, so the child can read it live; the shipped components accept either an accessor or a plain value.
- An expression that reads a signal (`title={ctx.title}`) is evaluated with the signal read rewritten. When its value changes the child is re-mounted with the new value, so the child's own state resets. If a child needs to keep state across changes, pass the accessor (`ctx={ctx}`) and read it inside the child.
- A callback (`onChange={handler}`) is passed as the function.

A child's `onDestroy` runs when its `{#if}` branch closes, its keyed `{#each}` item is removed, or its parent is destroyed.

---

## 4. Signal Reactivity Primitives (`@sola-air-ui/core`)

| Primitive | Signature | Purpose |
| :--- | :--- | :--- |
| `createSignal(initialVal)` | `[getter: () => T, setter: (v: T) => void]` | Creates a reactive state signal. What `$state()` compiles to. |
| `createDerived(fn)` | `getter: () => T` | Computes a derived value, auto-tracking dependencies. What `$derived(expr)` compiles to. A bare expression is wrapped by the compiler; an explicit `() => expr` also works. |
| `createEffect(fn)` | `cleanupFn: () => void` | Runs a side-effect whenever dependent signals update. What `$effect(fn)` compiles to. |
| `onMount(fn)` / `onDestroy(fn)` | `void` | Lifecycle hooks, scoped to the current component via an internal context stack (`pushContext`/`popContext`). |
| `createData(source, options?)` | `getter: () => { loading, data, error }` | What `$data(source, options)` compiles to — see §5B. |
| `createIntent(prompt, options?)` | resolver object | What `$intent(prompt)` compiles to — see §5A. |

There is **no** `mount(el, props)` export from core. Each compiled `.sola` file's own default export is its mount function — see §1 and §6.

---

## 4b. State That Survives Page Navigation

Full page loads destroy the DOM, so UI that should feel continuous across pages (an open drawer, a conversation, a theme) must be rebuilt from stored state. Two pieces:

- **`$persist(key, initial, options?)`** (compiles to `createPersistentSignal`) — behaves exactly like `$state`, but hydrates synchronously from storage, writes back on change, and mirrors live to other same-origin tabs/frames over `BroadcastChannel`. Options: `storage` (`'session'` default, `'local'`, `'memory'`, or a custom `{getItem,setItem,removeItem}`), `sync`, `channel`, `version` (bump to discard old shapes), `validate`, `ttlMs`. It degrades to a plain signal if storage is blocked.
- **`mountShell(component, props, { id, shadow, css })`** (from `@sola-air-ui/core`) — mounts a compiled component into a host element on `document.body`, inside a closed Shadow DOM by default so host-page CSS can't leak in or out. Idempotent per `id`. Compiled component styles are injected into the shadow root automatically. Run the same bootstrap on every page and the shell reappears in the state the user left it.

```html
<script>
  let open = $persist('dock.open', false);
  let thread = $persist('dock.thread', [], { storage: 'local', version: 2 });
</script>
```

Call **`clearPersistentState()`** on sign-out: it removes every persisted Sola value and resets the live signals in this page and every other open tab.

`sessionStorage` is per-tab: a new tab starts from defaults but then live-syncs with other tabs. Use `storage: 'local'` if new tabs should inherit state. Only store JSON-serializable, non-sensitive values.

---

## 4c. Events: `createBus`, `$on`, `$lastEvent`

Events are not state. Signals drop a write equal to the current value; an event repeated with the same payload must still be delivered. The bus is a separate primitive (design: `docs/rfcs/0001-bus.md`), and `$intent` is unrelated to it.

```html
<script>
  let toast = $state('');
  let ctx = $lastEvent('sola:context');            // latest payload as a reactive accessor
  $on('sola:toast', (t) => { toast = t.text; });   // runs on every emission, unsubscribes on destroy
</script>
<p>{ctx?.title}</p><p>{toast}</p>
```

Configure the default bus once, before any component subscribes:

```js
import { configureBus, bus } from '@sola-air-ui/core';
configureBus({
  dom: { target: window, in: ['sola:context'], out: ['sola:navigate'] }, // explicit, disjoint allowlists
  broadcast: ['sola:toast'],                                             // only these reach other tabs
  validate: { 'sola:context': (p) => typeof p?.title === 'string', 'sola:toast': (p) => typeof p?.text === 'string' },
  sticky: { 'sola:context': { store: 'session', ttlMs: 30000, consume: true } },
  guard: { 'sola:context': ({ from }) => from !== 'remote' },            // per-type; app policy lives here
  onReject: (info) => {},                                                // in-page only; carries no payload
});
```

Rules that `createBus()` enforces by throwing: a type in `dom.in` or `broadcast` needs `validate[type]` or a per-type guard (write `() => true` to accept unchecked on purpose); a type cannot be in both `dom.in` and `dom.out`; `sticky` needs a positive `ttlMs`; a `session` sticky needs an explicit `consume`. Events are local by default; do not make consequential actions sticky (a replay can repeat work; handlers see `meta.replayed`). Never put sensitive data in a `dom.out` payload: any script on the page can read it.

---

## 5. Compiler Macro Primitives

### A. Dynamic Intent Generation (`$intent`)
Transpiles to `createIntent(...)`, which resolves ambient UI state by calling an LLM provider (configured via `configureIntent({ endpoint, provider, model, stream })`, backed by `@sola-air-ui/providers` on the server side). Supports SSE streaming.

Per-call options (second argument, or globally through `configureIntent`):

- `debounceMs`: wait this long after the prompt last changed before asking. The prompt must be a function to be reactive: `$intent(() => query, { debounceMs: 300 })`.
- `trigger: 'manual'`: never ask on its own. Call `widget.run(input)` to ask; `widget.run()` with no input uses the current prompt. `run` also exists in the default mode and skips any debounce.
- `transport`: a fetch-compatible `(url, init) => Promise<Response>` used instead of global `fetch`, for hosts that must sign or route the request.

```html
<script>
  const analyticsWidget = $intent("Show cluster metric graphs");
</script>
```

### B. Remote Data Binding (`$data`)
Transpiles to `createData(source, options)`, which POSTs `{ source, query, filters, sort, limit, offset }` to a local **Sola Relay** endpoint (`@sola-air-ui/relay`, default `http://localhost:4040/api/query`) and returns a signal of `{ loading, data, error }` — not a flat object with arbitrary named fields. The relay currently proxies **PostgreSQL and MySQL** (see `@sola-air-ui/relay`'s dependencies); treat any other source scheme as unverified until the relay itself documents it.

```html
<script>
  let customers = $data('postgres-primary:customers', { sync: 'realtime' });
</script>

<div>
  {#if customers().loading}
    <Spinner />
  {/if}
  {#if customers().data}
    <Table rows={customers().data} />
  {/if}
</div>
```

---

## 6. Component Library (`@sola-air-ui/ui`)

37 real, shipped `.sola` components (verified against `packages/ui/src/` and the `exports` map in its `package.json`). Every one is importable both by subpath (e.g. `import Table from '@sola-air-ui/ui/table'`) and from the package root (`import { Table } from '@sola-air-ui/ui'`).

**Layout & display** — `Card`, `Stack`, `Dashboard`, `Table`, `DataCard`, `StatGrid`, `Canvas`

**Inputs & forms** — `TextInput`, `Select`, `DatePicker`, `Toggle`, `Button`

**Feedback** — `Alert`, `Toast`, `Spinner`, `Badge`, `Modal`

**Shell** — `LauncherDock`, `CommandPalette`, `CompanionDrawer`, `ToastHost` (spec: `docs/rfcs/0002-shell-primitives.md`)

**Content rendering** — `MarkdownViewer`, `HtmlViewer`, `SolaSafeHTML`, `Chart`, `StreamView`

**Gauges & dashboards** — `GaugeCard`, `TactileDialCard`, `FlowWaterfall`, `IncidentTriageMatrix`

**AI / intent-driven** — `IntentCard`, `IntentList`, `AmbientSuggestion`, and under `ai/`: `ConversationThread`, `ActionStrip`, `ConfidenceBadge`, `IntentSheet`

`DynamicForm`, `ListBlock`, `ReportDocViewer` and `ActionReportGenerator` do not exist as `.sola` components. The marketing site's `/components` catalog and the Studio also list many entries that are Svelte previews, not part of `@sola-air-ui/ui`; the catalog marks which is which. Do not treat a catalog entry as installable unless it is in the package's `exports` map.

For exact props, read the component's own `.sola` source in `packages/ui/src/` — it's short (most are under 100 lines) and the props are declared right at the top via `export let`.

---

## 7. Framework Interop

There is **no maintained React, Vue, Angular, Svelte, Web Component, Swift, or React Native adapter package** — despite an earlier version of this document presenting full production code samples for all seven. If you need to embed a compiled Sola component inside a host framework, the real, verified mechanism is:

```js
import IncidentWidget from './IncidentWidget.sola'; // compiled component's default export IS its mount function

// In a React effect / Vue onMounted / any framework's "after DOM exists" hook:
const teardown = IncidentWidget(containerElement, { incidentId, severity });
// teardown() unmounts and cleans up onDestroy callbacks when you're done.
```

This works in any framework that gives you a real DOM node and a mount/unmount lifecycle hook — React's `useEffect`, Vue's `onMounted`/`onUnmounted`, plain JS `connectedCallback`/`disconnectedCallback` on a Web Component, etc. There's nothing framework-specific to import; just call the compiled component like the function it is. If a real adapter package gets built for one of these, it belongs in its own `packages/adapter-*` directory with its own `package.json`, tests, and npm listing — not as a code sample in this file.

---

## 8. Complete System Prompt for AI Coding Models

```xml
<sola_rules>
You are an expert Sola developer. Follow these rules when authoring .sola components:
1. Always declare reactive signals with 'let x = $state(initialVal)'.
2. Declare computed values with 'let y = $derived(expression)'. The compiler wraps it so it is tracked; 'let y = $derived(() => expression)' also works.
3. Read a signal by its plain name in templates and script ({x}); the compiler turns reads into tracked calls. An explicit {x()} also compiles, but the plain form is what the docs use.
4. Attach native DOM event handlers directly: '<button onclick={handleClick}>'.
5. Control flow uses {#if condition}...{:else if other}...{:else}...{/if} and {#each items as item, index (key)}...{/each}. Blocks may nest. Close every block you open: an unbalanced block compiles without error and shows up as literal text.
6. Export props with 'export let propName = defaultValue;'.
7. A compiled component's default export is its own mount(target, props) => teardown function — there is no separate core-level mount() helper.
</sola_rules>
```
