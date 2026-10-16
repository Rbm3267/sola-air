# SOLA FRAMEWORK ARCHITECTURE & AGENT SPECIFICATION (AGENTS.md)

This document provides exact syntax rules, AST schemas, control-flow specifications, and component library references for AI Coding Models (Claude, ChatGPT, Gemini, Antigravity) to author complete, production-ready Sola applications.

> Rewritten 2026-09-01 to match what's actually implemented in `packages/compiler/src/index.js` and `packages/core/src/index.js`, after an external audit found this document had drifted into aspirational/fictional territory (multi-framework adapters, a preset system, and components that were never built). Every code sample below was checked against the real compiler transform, not written from memory.

---

## 1. Core Framework Paradigm

Sola is a **zero-VDOM, fine-grained ambient runtime** (`~3.2 kB`).
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
  // hood; $derived() ALWAYS needs a function body (an expression like
  // `count * 2` with no `() =>` will read `count` once, not track it).
  let count = $state(initialCount);
  let doubled = $derived(() => count() * 2);

  // Event handlers. Bare assignment to a $state variable (count += 1) is
  // rewritten by the compiler into a setter call automatically — you don't
  // call a setter yourself unless you destructured one explicitly.
  function increment() {
    count += 1;
  }
</script>

<div class="card">
  <h3>{title}</h3>
  <!-- Reading a signal in a template always calls it: {count}, not {count()}, will NOT work -->
  <p>Active Nodes: {count()} (Capacity: {doubled()})</p>
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

Only a single `{:else}` is supported — there is no `{:else if}` chaining in the current compiler. For a three-way branch, either nest a second `{#if}` inside the `{:else}` block, or (recommended — nested `{#if}` blocks have been unreliable in practice across this codebase) compute the branch as a derived string/class and use flat, sibling `{#if}` blocks instead of nesting:

```html
{#if status === 'critical'}
  <div class="badge-red">CRITICAL INCIDENT</div>
{:else}
  <div class="badge-emerald">SYSTEM NOMINAL</div>
{/if}
```

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
  <DataCard title="Cluster Volume" value={rps} trend="+14% vs baseline" icon="activity" />
  <StatGrid columns="2" gap="10px">
    <!-- ... -->
  </StatGrid>
</div>
```

---

## 4. Signal Reactivity Primitives (`@sola-air-ui/core`)

| Primitive | Signature | Purpose |
| :--- | :--- | :--- |
| `createSignal(initialVal)` | `[getter: () => T, setter: (v: T) => void]` | Creates a reactive state signal. What `$state()` compiles to. |
| `createDerived(fn)` | `getter: () => T` | Computes a derived value, auto-tracking dependencies. What `$derived(fn)` compiles to — `fn` must be a function, not a bare expression. |
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

`sessionStorage` is per-tab: a new tab starts from defaults but then live-syncs with other tabs. Use `storage: 'local'` if new tabs should inherit state. Only store JSON-serializable, non-sensitive values.

---

## 5. Compiler Macro Primitives

### A. Dynamic Intent Generation (`$intent`)
Transpiles to `createIntent(...)`, which resolves ambient UI state by calling an LLM provider (configured via `configureIntent({ endpoint, provider, model, stream })`, backed by `@sola-air-ui/providers` on the server side). Supports SSE streaming.

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

27 real, shipped `.sola` components (verified against `packages/ui/src/` — not aspirational). Import by subpath, e.g. `import Table from '@sola-air-ui/ui/table'`; see that package's `package.json` `exports` map for every subpath.

**Layout & display** — `Card`, `Stack`, `Dashboard`, `Table`, `DataCard`, `StatGrid`, `Canvas`

**Inputs & forms** — `TextInput`, `Select`, `DatePicker`, `Toggle`, `Button`

**Feedback** — `Alert`, `Toast`, `Spinner`, `Badge`, `Modal`

**Content rendering** — `MarkdownViewer`, `HtmlViewer`, `Chart`, `StreamView`

**AI / intent-driven** — `IntentCard`, `IntentList`, `AmbientSuggestion`, and under `ai/`: `ConversationThread`, `ActionStrip`, `ConfidenceBadge`, `IntentSheet`

None of `GaugeCard`, `DynamicForm`, `ListBlock`, `FlowWaterfall`, `ReportDocViewer`, or `ActionReportGenerator` exist as `.sola` components — an earlier version of this document invented plausible-sounding props schemas for all six. If you need one of these, it doesn't exist yet; check `app/src/lib/components/` for a Svelte-only version before assuming it's missing entirely (the marketing site currently renders several dashboard widgets as Svelte components rather than dogfooding the `.sola` compiler — a known gap, not a spec you should follow).

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
2. Declare computed values with 'let y = $derived(() => expression)' — the arrow function is required, not optional.
3. Read any signal in a template or script by calling it: {x()}, not {x}.
4. Attach native DOM event handlers directly: '<button onclick={handleClick}>'.
5. Control flow uses {#if condition}...{:else}...{/if} (single else only, no else-if chaining) and {#each items as item, index (key)}...{/each}. Avoid nesting {#if} blocks inside each other.
6. Export props with 'export let propName = defaultValue;'.
7. A compiled component's default export is its own mount(target, props) => teardown function — there is no separate core-level mount() helper.
</sola_rules>
```
