<p align="center">
  <img src="brand/logo/sola-logo-transparent.png" alt="Sola AIR Logo" width="120" height="120" />
</p>

<h1 align="center">Sola AIR</h1>

<p align="center">
  <b>Ambient · Intent · Runtime</b><br>
  Compile <code>.sola</code> components into zero-dependency vanilla DOM with native <code>$intent</code> signals that resolve AI state at the framework level.
</p>

<p align="center">
  <a href="https://sola-air.dev"><b>sola-air.dev →</b></a> • 
  <a href="https://sola-air.dev/changelog"><b>Changelog →</b></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/sola-air"><img src="https://img.shields.io/npm/v/sola-air?label=sola-air&color=3b82f6&style=flat-square" alt="npm sola-air" /></a>
  <a href="https://www.npmjs.com/package/@sola-air-ui/core"><img src="https://img.shields.io/npm/v/@sola-air-ui/core?label=%40sola-air-ui%2Fcore&color=3b82f6&style=flat-square" alt="npm @sola-air-ui/core" /></a>
  <a href="https://www.npmjs.com/package/@sola-air-ui/compiler"><img src="https://img.shields.io/npm/v/@sola-air-ui/compiler?label=%40sola-air-ui%2Fcompiler&color=3b82f6&style=flat-square" alt="npm @sola-air-ui/compiler" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=SolaAIR.sola-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/SolaAIR.sola-vscode?label=VS%20Code&color=6366f1&style=flat-square" alt="VS Code Marketplace" /></a>
  <a href="https://open-vsx.org/extension/SolaAIR/sola-vscode"><img src="https://img.shields.io/open-vsx/v/SolaAIR/sola-vscode?label=Open%20VSX&color=6366f1&style=flat-square" alt="Open VSX Registry" /></a>
  <a href="https://chromewebstore.google.com/detail/sola-air/cahdakefpjocaapggijdbbgidcjdaehc"><img src="https://img.shields.io/chrome-web-store/v/cahdakefpjocaapggijdbbgidcjdaehc?label=Chrome&color=3b82f6&style=flat-square" alt="Chrome Web Store" /></a>
  <a href="https://github.com/rbm3267/sola-air/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0ea5e9?style=flat-square" alt="MIT License" /></a>
</p>

```bash
# Install everything at once
npm install sola-air

# Or install individual packages
npm install @sola-air-ui/core @sola-air-ui/compiler @sola-air-ui/vite-plugin-sola
```

---

## What is Sola AIR?

Sola AIR is a compiler-first JavaScript framework where AI isn't bolted on — it's a first-class reactive primitive. Write `.sola` files with familiar syntax, and the compiler turns them into plain DOM instructions. There is no virtual DOM and no framework runtime beyond the small core.

```html
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
  let dashboard = $intent("Show MRR trend for Q3");
  let customerData = $data("postgres-primary:customers", { sync: "realtime" });
</script>

<div>
  <h1>Count: {count}</h1>
  <p>Doubled: {doubled}</p>
  <input bind:value={count} />

  {#if count > 10}
    <p>High engagement detected.</p>
  {/if}
</div>

<style>
  h1 { color: #0ea5e9; font-weight: 800; }
</style>
```

The compiler transforms this into a self-contained ES module with:
- **Signals-based reactivity** — Fine-grained DOM updates, zero diffing
- **Scoped styles** — Auto-hashed CSS selectors per component
- **Native AI resolution** — `$intent` resolves structured data from any LLM provider
- **Local data relay** — `$data` reads from PostgreSQL, MySQL or a Google Sheet through the Sola Relay, which runs on your machine or network, so database credentials stay out of the browser

---

## Why Sola AIR?

| Feature | Sola AIR | React | Svelte | Vue |
|---|---|---|---|---|
| **Virtual DOM Overhead** | **None (Direct DOM)** | Yes | No | Yes |
| **Built-in AI Intent Primitive** | **`$intent`** | ❌ | ❌ | ❌ |
| **Secure On-Prem Data Signals** | **`$data` (Sola Relay)** | ❌ | ❌ | ❌ |
| **Scoped Styles** | **Native AST** | CSS Modules | Native | Scoped |
| **Compiler Architecture** | **Acorn AST Transformer** | Babel / SWC | Custom | Template |

The core runtime is about 7.5 kB gzipped. `scripts/core-size.mjs` measures it, and a test checks that `AGENTS.md` states the same number.

---

## Reactive Primitives

- **`$state(initial)`** — Fine-grained reactive signal
- **`$derived(expr)`** — Computed values with automatic dependency tracking (a `() => expr` function also works)
- **`$effect(() => fn)`** — Side effects with automatic cleanup
- **`$intent(prompt, options)`** — Signal that asks an LLM provider for structured UI and data. Options: `debounceMs` (wait for the prompt to settle), `trigger: 'manual'` with `.run(input)` (ask only when told to), `transport` (your own fetch-compatible function)
- **`$data(source, options)`** — Signal of `{ loading, data, error }` fed by the Sola Relay
- **`$persist(key, initial, options)`** — Like `$state`, but kept in storage and synced across tabs, so it survives page loads
- **`$on(type, fn)`** — Run a function for every event of a type on the bus; unsubscribes when the component is destroyed
- **`$lastEvent(type)`** — The latest payload of an event type, as a reactive value

---

## Shells and Events

`mountShell(component, props, { id, shadow, css })` mounts a compiled component into a host element on `document.body`, inside a closed Shadow DOM by default, so host-page CSS cannot leak in or out. Pair it with `$persist` and the same bootstrap on every page rebuilds the shell in the state the user left it.

`createBus` / `configureBus` carry events between components, the page and other tabs. Events are not state: a repeated payload is still delivered. Types that cross the page boundary need an explicit allowlist and a validator. See the [docs](https://sola-air.dev/docs) for the full configuration.

---

## Editor and browser tools

- **VS Code**: `SolaAIR.sola-vscode` adds `.sola` syntax highlighting, snippets and bracket pairing (source in [`packages/vscode-extension`](./packages/vscode-extension)).
- **Chrome extension**: pick elements on any page and get matching Sola component code in a side panel (source in [`packages/sola-extension`](./packages/sola-extension)).
- **Claude and Gemini skill**: teaches an assistant the syntax and the real component props, and renders a `.sola` design to one self-contained HTML file. Install from [Rbm3267/sola-ui-skill](https://github.com/Rbm3267/sola-ui-skill): `claude plugin marketplace add Rbm3267/sola-ui-skill` then `claude plugin install sola-ui@sola-air` (Claude Code), or `gemini extensions install https://github.com/Rbm3267/sola-ui-skill` (Gemini CLI). For Claude.ai, zip `skills/sola-ui` from that repo and upload it with code execution on. The source is [`skills/sola`](./skills/sola), generated by `node scripts/build-skill.mjs`; the `Publish skill repo` workflow keeps the standalone repo in sync.

---

## Ambient Behavior Observation (Sola Sentinel)

`SolaSentinel` observes real user behavior — clicks, field focus, revisits, typed content — and turns it into two things: a real computed friction score (`flowIndex`), and, paired with `$intent`, proactive next-step suggestions.

```js
import { createSentinel } from '@sola-air-ui/core';

const sentinel = createSentinel('checkout-form');
sentinel.onFriction((event) => console.log(event.message)); // e.g. rage-click bursts

field.onfocus = () => sentinel.recordFieldFocus('short_description');
field.onblur = () => sentinel.recordFieldBlur('short_description', field.value);

// The poll decides *when* the observed behavior is worth interrupting the user
// for. trigger: 'manual' keeps createIntent from asking on its own; run() asks.
const suggestion = createIntent('', { trigger: 'manual' });
setInterval(() => {
  if (sentinel.checkSignificance()) suggestion.run(sentinel.buildPrompt());
}, 400);
```

Render the result with `<AmbientSuggestion suggestion={suggestion} />` (`@sola-air-ui/ui/ambient-suggestion`) — a small, dismissible, non-blocking suggestion that renders model output as text, never `innerHTML`. A full working example — real Gemini call, real browser-verified, no mocked data — lives in [`examples/ambient-poc`](./examples/ambient-poc).

`flowIndex` (0–100) is computed from actual signal density: recent friction events weighted by severity and recency, how often the user backtracks between fields, and how erratic their pacing is — not a fixed decrement per event.

---

## Packages

| Package | npm | Description |
|---|---|---|
| `sola-air` | [![npm](https://img.shields.io/npm/v/sola-air)](https://www.npmjs.com/package/sola-air) | Meta-package — install everything at once |
| `create-sola` | [![npm](https://img.shields.io/npm/v/create-sola)](https://www.npmjs.com/package/create-sola) | Project scaffolder (`npx create-sola my-app`) |
| `@sola-air-ui/core` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/core)](https://www.npmjs.com/package/@sola-air-ui/core) | Reactive runtime engine (signals, effects, `$persist`, `$intent`, `$data`, `createBus`, `mountShell`) |
| `@sola-air-ui/compiler` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/compiler)](https://www.npmjs.com/package/@sola-air-ui/compiler) | Acorn AST compiler & `sola-check` static validator (`.sola` → JS + CSS) |
| `@sola-air-ui/vite-plugin-sola` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/vite-plugin-sola)](https://www.npmjs.com/package/@sola-air-ui/vite-plugin-sola) | Vite plugin for `.sola` single-file components |
| `@sola-air-ui/ui` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/ui)](https://www.npmjs.com/package/@sola-air-ui/ui) | 37 compiled `.sola` UI, shell, and ambient-intent primitives |
| `@sola-air-ui/tokens` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/tokens)](https://www.npmjs.com/package/@sola-air-ui/tokens) | CSS custom-property design tokens (spacing, radius, type scale, light/dark semantic palette) |
| `@sola-air-ui/sentinel` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/sentinel)](https://www.npmjs.com/package/@sola-air-ui/sentinel) | Framework-agnostic behavioral friction & ambient field observer (`SolaSentinel`) |
| `@sola-air-ui/relay` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/relay)](https://www.npmjs.com/package/@sola-air-ui/relay) | Local data proxy (PostgreSQL, MySQL, Google Sheets) |
| `@sola-air-ui/mcp` | [![npm](https://img.shields.io/npm/v/@sola-air-ui/mcp)](https://www.npmjs.com/package/@sola-air-ui/mcp) | MCP server for AI-driven component compilation, `sola-check` validation, and `sola://docs` |

---

## Monorepo Architecture

```
sola/
├── packages/
│   ├── compiler/          # Custom Acorn AST compiler (.sola -> JS + CSS)
│   ├── core/              # Reactive runtime engine (signals, effects, $intent, $data)
│   ├── ui/                # Standard component library (.sola files)
│   ├── relay/             # Local data proxy (PostgreSQL, MySQL, Google Sheets)
│   ├── providers/         # Server-side LLM adapters for $intent
│   ├── sentinel/          # Form-hesitation observer that builds a prompt
│   ├── behavior/          # Behavior and playbook helpers
│   ├── tokens/            # Design tokens (CSS variables)
│   ├── sola-mcp/          # MCP server for AI-driven component generation
│   ├── sola-air/          # Meta-package (installs the full Sola AIR stack)
│   ├── vite-plugin-sola/  # Vite plugin for .sola SFC compilation
│   ├── create-sola/       # Project scaffolding CLI
│   ├── vscode-extension/  # VS Code language support for .sola
│   └── sola-extension/    # Chrome extension (side panel code generator)
├── examples/
│   └── ambient-poc/       # Standalone Sola Sentinel + $intent ambient-suggestion demo
├── brand/                 # Official brand kit, logos, and favicons
└── app/                   # Marketing site & interactive playground
```

---

## Operational Guide (By Role)

### Application Developers
*   **Workflow**: Build frontends using `.sola` files. Use `$state` and `$derived` for local state, and `$intent` to bind AI capability.
*   **Data Binding**: Connect components to backend databases or APIs using `$data("sheet://...")` or `$data("postgres://...")`.
*   **Security Caret**: Never commit credentials in code; pass only resource identifiers to `$data`.

### System Administrators
*   **Deployment**: Deploy the Sola Relay server on-premises or close to the databases.
    ```bash
    npm install -g @sola-air-ui/relay
    sola-relay --config ./relay.json
    ```
*   **Access Provisioning**: Configure connection strings and table filters in `relay.json`.
*   **Monitoring**: Check the relay logs for latency targets and query performance (default target is sub-1ms signal propagation).

### Security Engineers
*   **Credential Isolation**: Ensure that connection credentials (passwords, certificates) are set via local environment variables on the Sola Relay server. They never leave the private network.
*   **Query Sanitation**: Define read-only schema mappings and query rate-limits in Sola Relay config to prevent injections.
*   **Write-Back Gates**: Assign `TransactionCapability` parameters and security levels (Tiers 1 & 2) to control which mutations require confirmation overlays.

---

## License

MIT © 2026 Sola AIR Contributors
