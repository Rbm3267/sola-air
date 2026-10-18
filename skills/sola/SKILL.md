---
name: sola-ui
description: Design and build user interfaces with Sola AIR (.sola single-file components and the @sola-air-ui/ui component library), and render a live HTML preview of the design. Use when the user asks for a UI, dashboard, form, portal widget or shell in Sola, or mentions .sola files or @sola-air-ui packages.
---

# Designing with Sola AIR

Sola AIR is a compiler-first UI framework. A `.sola` file holds a component's script, markup and scoped styles; the compiler turns it into plain DOM code driven by signals. `@sola-air-ui/ui` 1.7.0 ships 37 components. This skill vendors core 1.5.2, compiler 1.5.2 and those components, so you can check a design and render it to HTML with no install.

`<skill-dir>` below means the folder this file is in.

## Workflow

1. **Look up the components you need** in `<skill-dir>/reference/components.md`. Use only the components and props listed there. It is generated from the package; anything not in it does not exist.
2. **Write the design as one `.sola` file** (split into several only if asked). Follow the syntax below.
3. **Preview it.** Run:

   ```bash
   node <skill-dir>/scripts/preview.mjs design.sola
   ```

   It prints errors as `file:line:col  CODE  message` and exits 1, or writes `design.preview.html`: one self-contained file with the runtime, design tokens and every component inlined. Fix every error and run it again. Add `--theme dark` for the dark theme, `--preset sola|zinc|compact|graphite` for one of the built-in token presets, `--props '{"title":"Q3"}'` to pass props, or `--check` to check without writing a file.
4. **Show the result.** Give the user the `.sola` source. Then show the preview: where you can render HTML (a Claude artifact, Gemini canvas), render the contents of `design.preview.html`; otherwise give its path.

If the `sola-mcp` tools are available, `validate_component` runs the same checks without writing a file, and the `sola://docs` resource has the full syntax reference.

## Syntax

```html
<script>
  import DataCard from '@sola-air-ui/ui/data-card';
  import Button from '@sola-air-ui/ui/button';

  export let title = 'Cluster';          // a prop the parent can set

  let count = $state(0);                 // a signal
  let doubled = $derived(count * 2);     // recomputed when count changes

  function add() {
    count += 1;                          // assignment updates the signal
  }
</script>

<section class="panel">
  <h2>{title}</h2>
  <DataCard title="Requests" value="1,420" trend="+12%" />
  <p>{count} clicks, doubled {doubled}</p>
  <Button label="Add one" onClick={add} />

  {#if count > 5}
    <p class="hot">Busy</p>
  {:else if count > 0}
    <p>Warming up</p>
  {:else}
    <p>Idle</p>
  {/if}

  <ul>
    {#each [1, 2, 3] as n (n)}
      <li>{n}</li>
    {/each}
  </ul>
</section>

<style>
  .panel { display: grid; gap: var(--sola-space-md, 12px); }
  .hot { color: var(--sola-alert-critical, #b91c1c); }
</style>
```

- Read signals by their plain name, in the script and the markup. `count += 1`, `count = 0` and `count++` all update the signal.
- Native events are attributes: `onclick={fn}`, `oninput={(e) => (query = e.target.value)}`. Two-way input binding: `bind:value={query}`. Element reference: `bind:this={el}`.
- `{#if}`, `{:else if}`, `{:else}`, `{/if}` and `{#each list as item, i (key)}` … `{/each}`. Blocks may nest. **Close every block you open**: an unclosed block compiles without error and shows as literal text, which the preview check catches.
- Child components: import each one by its subpath from the reference. A literal (`title="Requests"`) passes a string; `{expr}` passes a value. A prop marked "value or getter" in the reference can take a function, e.g. `rows={() => rows}`, and then follows changes; any other prop is read once, and the child is re-mounted if you pass an expression that changes.
- Styles in `<style>` are scoped to the component. Use the design tokens (`var(--sola-space-md)`, `var(--sola-text-secondary)`, `var(--sola-surface-1)`, `var(--sola-radius-lg)`) with a fallback value, so the design follows the light and dark themes.
- Shared state across a page or tabs: `let open = $persist('key', false)`. Events: `$on('type', fn)` and `bus.emit('type', payload)` (import `bus` from `@sola-air-ui/core`).

## Do not

- Do not invent components, props or packages. If the reference has nothing suitable, build it from markup and styles in the `.sola` file.
- Do not write React, JSX, Svelte or Vue syntax, `class:` directives, or a `<template>` wrapper. A compiled component is a function: `mount(target, props)` returns a function that unmounts it.
- Do not use `$intent` or `$data` in a preview unless the user has an endpoint: they call a server, so the preview shows only their loading or error state.

## Components

- Layout: Canvas, Card, Stack, Dashboard, StatGrid
- Data display: DataCard, Table, Chart, GaugeCard, FlowWaterfall, IncidentTriageMatrix, StreamView, MarkdownViewer, HtmlViewer, SolaSafeHTML
- Inputs: Button, TextInput, Select, DatePicker, Toggle, TactileDialCard
- Feedback: Alert, Badge, Spinner, Toast, Modal
- Shell: LauncherDock, CommandPalette, CompanionDrawer, ToastHost
- AI and intent: IntentCard, IntentList, AmbientSuggestion, ConversationThread, ActionStrip, ConfidenceBadge, IntentSheet

Props and defaults for each are in `reference/components.md`. The full language spec is `reference/AGENTS.md`. Working examples are in `examples/`.
