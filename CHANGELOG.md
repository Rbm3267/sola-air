# Changelog

All notable fixes and changes to the Sola AIR packages. Dates are UTC.

## Unreleased

## 2026-10-16: core 1.4.0, compiler 1.3.0, ui 1.4.0

### `@sola-air-ui/core`

- **Fixed**: effects were never stopped. An effect now belongs to the component, or
  `{#if}` / `{#each}` branch, that was being built when it was created, and is
  disposed when that owner is destroyed. Before, a removed branch or an unmounted
  child kept its effects subscribed. `createEffect` now returns a function that
  stops the effect for good, and a disposed effect that was already queued no
  longer runs.
- **Fixed**: `createData` with a `refresh` interval kept polling after the component
  that asked for the data was destroyed. It now stops the timer and abandons any
  request in flight when its component is destroyed.
- **Added `__untrack(fn)`** (used by compiled output): runs `fn` without the
  surrounding effect tracking what it reads.
- `esbuild` moved to `devDependencies`; `core` and `sentinel` declare
  `"sideEffects": false`.

### `@sola-air-ui/compiler`

- **Fixed**: props passed to a child component. `<Chip title={ctx.title} />`
  evaluated `ctx.title` on the signal accessor and passed `undefined`. A prop
  expression that reads a signal is now evaluated with the read rewritten, and
  the child is re-mounted when the value changes (so a child's own state resets
  when such a prop changes). A bare name (`value={rps}`) is still passed as-is, so
  the live accessor reaches the child unchanged.
- **Fixed**: a child component's teardown was never called. Children now mount
  untracked and their teardown is registered with the scope that created them,
  so `onDestroy` in a child runs when its `{#if}` branch closes, its keyed
  `{#each}` item is removed, or its parent is destroyed.
- **Fixed**: a `{#if}` or `{#each}` that is switched or rebuilt now destroys what it
  built before, instead of leaving it running.
- A prop with a `null` or `undefined` default is typed `any` in the generated
  `.d.ts` (it was `unknown`).
- **Fixed**: imports in a `.sola` script were deleted, except `.sola` files. Now:
  - A component imported from a package (`import DataCard from
    '@sola-air-ui/ui/data-card'`, or `import { Table } from '@sola-air-ui/ui'`) is
    mounted as a component. Before, `<DataCard />` compiled to
    `document.createElement('DataCard')`, an unknown HTML element, so the import form
    the docs show did nothing.
  - Any other import is kept, so a script can call what it imports.
  - A name imported from `@sola-air-ui/core` that the compiler does not already
    provide (such as `configureData`) is imported; one it does provide is not bound
    twice. For the no-bundler target these names come from `window.SolaCore`.

### `@sola-air-ui/ui`

- **Fixed `DataCard`**: it declared `title`, `value` and `trend` with plain `let`, so
  it ignored every prop and always showed "METRIC $0.00 +0.0%". They are now props.
  With no `trend` the footer is hidden, not filled with a made-up one.

### Chrome extension (`packages/sola-extension`)

- **Fixed**: "Copy code" produced imports that fail when pasted. Five of the twelve
  components it offers (`RangeSlider`, `Tabs`, `Avatar`, `ListBlock`,
  `SentinelCapsule`) are not in `@sola-air-ui/ui`, and `Button` is not re-exported from
  the package root. Code is now generated in `codegen.js` and imports each component by
  its package subpath; an unreleased component gets a one-line comment, and the side
  panel labels it "Studio preview". A test checks every generated import against the
  real `@sola-air-ui/ui` exports.
- **Fixed**: the region picker always drew a DataCard but wrote an import for whichever
  component was selected. Scraped metrics now always produce DataCard code (a
  `StatGrid` of them for several), matching what is drawn.
- **Fixed**: text read from the page went into `innerHTML` and into the generated
  code unescaped. It is escaped, and quotes or braces in a label can no longer break
  the generated markup.
- **Fixed**: the preview was an *open* Shadow DOM, although the manifest and the store
  listing say closed. Both roots are now closed.
- **Fixed**: the side panel showed the old `@sola/core @sola/ui` install line and a
  wrong "click anywhere on the page" step.
- A message from a page can only show components the extension knows.
- `sola-extension.zip` is rebuilt (it was stale and used Windows path separators), by
  `node scripts/extension-zip.mjs`. A test fails if the committed zip differs from the
  source. Version 1.1.1 (the store only accepts a higher number than what is live).

## 2026-10-16: core 1.3.0, compiler 1.2.0 (event bus)

### `@sola-air-ui/core`

- **Added `createBus`, `configureBus` and the default `bus`**: typed events across
  components, pages and tabs. Local by default; `broadcast` types reach other tabs;
  `dom.in` / `dom.out` are explicit, disjoint allowlists for host `CustomEvent`s;
  `sticky` replays the last payload to a late-mounting handler. A type that crosses a
  boundary must have a validator or per-type guard, enforced when the bus is created.
  Rejections are reported to an in-page `onReject` without the payload.
  `clearPersistentState()` also clears sticky events. Design: `docs/rfcs/0001-bus.md`.

### `@sola-air-ui/compiler`

- **Added `$on(type, handler)`** (subscribes for the life of the component) and
  **`let x = $lastEvent(type)`** (latest payload as a reactive accessor). Both use the
  default bus, imported under an alias so a variable named `bus` cannot shadow it.

## 2026-10-16: compiler fixes from production feedback (in compiler 1.2.0)

### `@sola-air-ui/compiler`

- **Fixed**: object shorthand of a reactive variable in `<script>` (`{ open, n }`)
  compiled to `{ open: open()(), n: n()() }` and threw at runtime. Each signal
  is now read once.
- **Added `:global(...)` in `<style>`**: opts part of a selector out of scoping, so
  a scoped component can style markup it did not create, such as `{@html}`
  output. `.msg :global(table)` becomes `.msg.sola-x table`; `:global(body)` is
  left alone; `:global(.x, .y)` stays grouped as `:is(.x, .y)`. Previously the
  scope class was appended after the `:global(...)` text, producing invalid CSS.
- **Fixed**: commas inside `:is()`, `:not()`, `:where()` or `:global()` no longer
  split a selector into separate rules during scoping.
- **Added `exportStyles: true`** (opt-in): the ESM module also exports `css` and
  `scopeHash`, for hosts that mount into a Shadow Root and adopt the stylesheet
  themselves. Off by default because it would collide with build scripts that
  append those exports already.
- **Added `dts` to the `compile()` result**: a `.d.ts` for the component with its
  `export let` props typed from their defaults (`unknown` where a default cannot
  be read confidently).

## 2026-10-16: core 1.2.0, compiler 1.1.0 (persistent cross-page state)

### `@sola-air-ui/core`

- **Added `createPersistentSignal` / `$persist`**: a signal hydrated
  synchronously from storage, written back on change, and mirrored live to other
  same-origin tabs and frames over `BroadcastChannel`.
- **Added `mountShell`**: mounts a compiled component into an idempotent host on
  `document.body`, inside a closed Shadow DOM by default.
- **Added `clearPersistentState`**: wipes persisted values and resets live
  signals everywhere; intended for sign-out.

### `@sola-air-ui/compiler`

- **Added the `$persist` macro.**
- **Fixed**: component `<style>` blocks were always injected into
  `document.head`, so they never applied inside a Shadow DOM. They now go into
  the root the component is mounted in, de-duplicated per root.

## 2026-09-01 (new primitives)

Scoped down from a larger proposed "engine architecture" spec (Shadow DOM
encapsulation, an atomic utility-class dictionary, a new state-mutation API)
to the one part of it that was genuinely additive and low-risk: two new
primitives. The rest would have meant either breaking every current
consumer's reliance on cross-component `<style>`-block cascading (Shadow
DOM) or building a second, parallel styling system alongside the existing
scoped-`<style>` model (utility classes) — real decisions that deserve their
own scoping pass, not something to fold into a component addition.

### `@sola-air-ui/ui@1.3.0`

- **Added `SolaSafeHTML`**: renders external rich-text HTML (a CMS field, a
  KB article) as real inherited-typography DOM instead of an isolated
  `<iframe>` — generalized from a pattern hand-built once already this
  session for a real consumer's featured-article card. Deliberately *not*
  presented as equivalent to `HtmlViewer`'s iframe-sandbox isolation — that
  distinction is documented directly in the component, since `{@html}`
  injection runs in the host page's own document and no amount of string
  stripping changes that. Does real defensive stripping (`<script>` tags,
  `on*` event-handler attributes, `javascript:` URLs, nested
  `<iframe>`/`<object>`/`<embed>`) rather than just being named "safe" and
  doing nothing — for genuinely untrusted content, `HtmlViewer`'s real
  sandbox is still the right tool. Supports an optional `maxHeight` with a
  mask-image fade for preview/excerpt use.
- **`Table.sola`**: added a `dark` prop with real built-in dark-mode
  styling. Previously every consumer with a dark mode had to hand-roll
  `th`/`td` color/border/hover overrides via cascade (three separate real
  examples of this exist in this codebase's own consumer projects) — now
  `dark={darkMode()}` replaces that boilerplate. This is the actual gap
  behind an external review's "SolaDataGrid" request; built as an
  enhancement to the existing table rather than a second, parallel table
  component, since a real one already existed and did most of the job.

## 2026-09-01 (audit follow-up: live wiring + prop-shape fixes)

### `@sola-air-ui/ui@1.2.1`

- **Fixed:** `TactileDialCard.sola`, `FlowWaterfall.sola`, and
  `IncidentTriageMatrix.sola` (added in `1.2.0`, same day) were faithful
  ports of the original Svelte components' *behavior*, but their prop
  shapes didn't match what the website's own component catalog
  (`componentCatalog.ts`) actually declares and drives its live playground
  with — e.g. `IncidentTriageMatrix` was ported as a single-incident command
  card with playbooks, while the catalog's real, load-bearing schema
  describes a multi-row incident list. Found only once the components were
  actually wired into the live site (see below) instead of just
  compile-checked in isolation. Reconciled all three against the catalog's
  real prop contracts: `TactileDialCard` now takes `{title, metric, min,
  max, currentValue}`; `FlowWaterfall` takes `steps: {name, value,
  type}[]`; `IncidentTriageMatrix` renders a real multi-row `incidents:
  {id, service, severity, status, latency}[]` matrix with a compact
  playbooks section underneath (keeping the 1-click mitigation feature the
  catalog's own description text still promises).

### Website (`app/`)

- **The four components above are now actually rendered by the live site**,
  not just present in the package. `/components` previously hardcoded
  Svelte-native versions of `GaugeCard`, `TactileDialCard`, `FlowWaterfall`,
  and `IncidentTriageMatrix` in its live-preview panel; it now mounts the
  real compiled `.sola` components via a small existing bridge
  (`SolaMount.svelte`, already used by `/overview` — confirmed real infra,
  not something built for this fix) wrapped in a `{#key}` block so the
  interactive props playground still live-updates the preview on every
  edit. Verified in a real browser (not just a build check): all four
  render correctly, zero console errors, `GaugeCard`'s ring animates,
  `TactileDialCard`'s drag interaction works, `FlowWaterfall`'s bars scale
  correctly, `IncidentTriageMatrix`'s playbook buttons run.
- Fixed a real same-role radius inconsistency: `DataCard.svelte` and
  `ListBlock.svelte` used `rounded-2xl` on their outer card while the other
  9 catalog card components use `rounded-3xl` for the same role — the two
  outliers now match. Audited the rest of the touched pages (`Navbar`,
  homepage, `/components`, `InteractiveHero`) for the same class of bug and
  found none — most of what a raw `rounded-xl`/`2xl`/`3xl` grep flags
  turns out to be legitimate outer-card/inner-box size hierarchy, not
  actual inconsistency. A full site-wide spacing/radius audit (72 files
  touch these classes in some form) remains open by choice — scoped down
  to already-touched pages rather than attempted blind across the whole
  site in one pass.

## 2026-09-01 (design + engineering audit)

A comprehensive external review of the whole project (marketing site, `.sola`
component library, `AGENTS.md`) found the same underlying problem in several
places: the project's own documentation and demo site had drifted ahead of
what was actually implemented. This pass fixes the drift rather than the
symptoms.

### `AGENTS.md`

Rewritten against the real compiler/core source, not memory. Removed an
entire fictional section presenting production code samples for React, Vue,
Angular, Web Components, SwiftUI, and React Native adapters — none of these
packages exist. Removed a fictional "preset system" table (`stripe`,
`linear`, `vercel`, etc. — no `packages/presets/` exists). Replaced a
component-props table that documented six components (`GaugeCard`,
`DynamicForm`, `ListBlock`, `FlowWaterfall`, `ReportDocViewer`,
`ActionReportGenerator`) that had never been built as `.sola` files with the
real, verified 27-component list. Corrected the `$state`/`$derived` example
against the actual compiler transform (`$derived` requires an arrow
function; template reads require an explicit `()` call) and corrected
`{:else if}` to the single `{:else}` the compiler actually implements.

### `@sola-air-ui/tokens@1.1.0`

- **Added:** a z-index scale (`nav`, `dropdown`, `overlay`, `modal`,
  `sheet`, `toast`) and a motion scale (one easing curve, two durations).
  Both were missing — `Modal.sola` and `IntentSheet.sola` each independently
  hardcoded their own z-index (`999` vs `9999`) and their own animation
  timing (three different values across the two components combined).

### `@sola-air-ui/ui@1.2.0`

- **Fixed:** `Modal.sola` and `IntentSheet.sola` now consume the shared
  z-index/motion scale from `@sola-air-ui/tokens` (with hardcoded fallbacks,
  so they still work standalone without the tokens package loaded) instead
  of inventing their own numbers.
- **Fixed:** `Button.sola` documented a `variant="outline"` in its own
  top-of-file comment that was never implemented — a button passed that
  variant silently rendered with no background or border. Implemented it.
- **Fixed:** `Canvas.sola` accepted `theme`, `padding`, and `layout` props
  that were declared but never read anywhere in the component — every
  Canvas rendered identically regardless of what was passed. Made all three
  functional (verified first that no real consumer depended on the old
  no-op behavior).
- **Added:** four new real `.sola` components — `GaugeCard`,
  `FlowWaterfall`, `IncidentTriageMatrix`, `TactileDialCard` — ported from
  Svelte-only versions that previously existed solely in the marketing
  site's `app/src/lib/components/`, not as installable library components.
  The site was rendering its own showcase with components the library
  itself didn't ship, which is the credibility problem the external review
  called out directly. Fixed a real bug in the process: `GaugeCard`'s
  Svelte version mapped its `emerald` color option to `text-blue-600`
  Tailwind classes.

### Website (`app/`, not published to npm)

- Consolidated five different per-route accent colors in the nav (amber,
  blue, violet, sky, blue again) and the homepage's three pillar cards down
  to one — the brand color `@sola-air-ui/tokens` already documented as
  primary (emerald) but the site itself wasn't consistently using.
- Removed `backdrop-blur-2xl`/`-xl` from 15 content-card components that
  were blurring a background already ~90–95% opaque — no visible effect,
  just cost and haze. Left it in place on the actual modal/dropdown
  overlays, where it does something.
- Homepage pillar cards no longer trigger three simultaneous hover
  animations (card lift + icon scale + link shift) at once — just the card
  lift.
- Corrected an inflated "28 components... instant multi-framework code
  export" homepage claim (real count: 27; there is no multi-framework
  export) and a homepage line referencing the fictional "preset showcase
  across 5 universal tiers."
- Discovered `app/src/lib/sola-engine/` (a second, duplicated copy of the
  compiler) is dead code — nothing imports it. The site's real `.sola`
  pipeline is the `vite-plugin-sola` in `vite.config.ts`, which imports
  `compile` directly from `packages/compiler/src/index.js` and aliases
  `@sola-air-ui/ui` to `packages/ui/src`. Left the dead directory in place
  rather than deleting it blind, but noting it here so it doesn't get
  mistaken for the real integration path later.

## 2026-09-01

Found while dogfooding again — this time an enterprise portal widget
whose `onMount` callback never fired once the same page also mounted other
nested `@sola-air-ui/ui` components (`Table`, `Modal`, etc.), even though the
identical `onMount` pattern worked correctly on a page with no nested
components. Root-caused to the core lifecycle context stack, not the
consuming app.

### `@sola-air-ui/core@1.1.1`

- **Fixed:** `__flush_mounts()` and `__flush_destroys()` operated on the
  module-global `activeContext` instead of the specific context
  `pushContext()` returned for the component being flushed. A mounted child
  component's own `pushContext()` call reassigns `activeContext` and never
  pops it back (a mounted child stays on the context stack until it
  unmounts), so once a component mounted any nested child during its own DOM
  construction, `activeContext` no longer pointed at the parent by the time
  the parent tried to flush its own mount/destroy callbacks — silently
  dropping them, with no error. Both functions now take an explicit `ctx`
  argument (defaulting to `activeContext` for compiled bundles built before
  this fix, so existing published output degrades gracefully rather than
  breaking). Added a regression test exercising nested mounting explicitly;
  the previous test suite only pushed/popped contexts in perfect order and
  never exercised a nested-mount scenario, which is why this shipped
  unnoticed.

### `@sola-air-ui/compiler@1.0.8`

- **Fixed:** generated `mount()` output now calls `__flush_mounts(__ctx)`
  and `__flush_destroys(__ctx)` with the component's own captured context,
  matching the `core@1.1.1` fix above — previously only `popContext(__ctx)`
  passed the explicit context; the two flush calls did not.

### Documentation

- Every published package (`core`, `compiler`, `ui`, `tokens`, `relay`,
  `providers`, `vite-plugin-sola`, `create-sola`, `mcp`, `sola-air`, plus
  `behavior`) now has its own `README.md` — previously only the monorepo
  root did, so a package's own npmjs.com page had nothing on it.
- Fixed `@sola-air-ui/vite-plugin-sola`'s `repository` field, which pointed
  at `github.com/rbm3267/sola` (a stale/incorrect URL) instead of
  `sola-air`.

## 2026-08-31

Found and fixed while dogfooding the published `sola-air` npm package end-to-end
in a real host application (an enterprise portal widget) — building an
actual multi-page app surfaced a class of bug that isolated unit tests hadn't
caught, since several of them only manifest when consuming the *published*
package the way a real user would, not the local monorepo source.

### `@sola-air-ui/core@1.0.3`

- **Fixed:** the IIFE build (`dist/sola-core.iife.js`, used by the `./iife`
  export and by anyone targeting a no-bundler environment) was never present
  in the published tarball. The `prepare` script that builds it was present
  in source, but `esbuild` — the tool that script depends on — was never
  declared as a dependency, so the build silently failed for any real
  consumer, and separately, `dist/` was still being excluded by an inherited
  root `.gitignore` rule even after that was fixed. Added `esbuild` as a
  dependency and an explicit `files` allowlist; verified with a clean install
  from the registry (not local source) that `dist/` now ships and needs no
  manual build step.

### `@sola-air-ui/compiler@1.0.6`

- **Fixed:** `stripTypeScript()` ran on every `<script>` block regardless of
  whether it declared `lang="ts"`, and its regex couldn't distinguish a type
  annotation's `:` from a ternary's `: falsyBranch` or an object literal's
  `key: value` — silently corrupting ordinary JavaScript. Now only runs on
  `<script lang="ts">`.
- **Fixed:** htmlparser2 lowercases tag names by default, so a component
  import comparison against a PascalCase tag (`<Table>` arrives as `"table"`)
  never matched. This made the entire nested-component code path unreachable
  for any component named the way this library's own components are named,
  and was the underlying cause of the next two bugs going unnoticed.
- **Fixed:** with components actually reachable, two more surfaced — dynamic
  props (`rows={items}`) were passed through as a stringified placeholder
  instead of the real value, and slot content (children between a
  component's open/close tags) was silently dropped with no projection
  mechanism at all. Both fixed: dynamic props resolve correctly, and a
  `<slot>` element now projects a parent's children.
- **Fixed:** bare `onclick={fn}` (no colon) compiled to
  `setAttribute('onclick', String(fn))` — the handler's source text, never
  invoked, so clicks did nothing. This is the exact syntax used in this
  README's own quickstart example and in `create-sola`'s scaffolded starter.
  The colon form (`on:click={fn}`) already worked; extended the same
  handling to the bare form.
- **Fixed:** text interpolation always wrapped an expression as
  `String(expr ?? '')`. JavaScript forbids mixing `??` with `||`/`&&`
  without explicit parentheses, so any `{a || b}`-style fallback — including
  this library's own `Table.sola` (`{col.label || col}`) — was a
  compile-time `SyntaxError`. Fixed by parenthesizing the expression.
- **Fixed:** `bin.sola` was `"./src/cli.js"` — npm's bin normalizer rejects
  the leading `./` and silently strips the entire `bin` field on publish.
  The `sola` CLI has never been reachable as an installed command until this
  fix; verified by installing the packed tarball fresh and running
  `npx sola --help` / `npx sola -v` through the real installed bin symlink.
- **Fixed:** the CLI's `--version` output and the `// Compiled by...` header
  stamped on every compiled file both hardcoded a version string that was
  already stale. Both now read the real version from `package.json`.

### `@sola-air-ui/ui@1.0.2`

- **Fixed:** most components declared their configurable state as a plain
  `let` instead of `export let` — silently ignoring any props passed in and
  always rendering fixed demo content regardless of usage. Fixed across the
  whole library: `Card`, `StatGrid`, `DatePicker`, `Select`, `Toggle`,
  `Toast`, `Chart`, `Modal`, `StreamView`, `Dashboard`.
- **Fixed:** `Card` and `StatGrid`'s slot content was a dead HTML comment
  ("Slot content mounts here") with no actual `<slot>` element — children
  passed to them were always dropped. `Select`'s `<option>` children had the
  same problem. All three now have a real `<slot>`.
- **Fixed:** `Toggle`, `Toast`, and `Modal` each called `.set(...)` directly
  on a `$state` signal (e.g. `checked.set(!checked())`) — that method
  doesn't exist on this framework's signals, which pair a plain getter
  function with a separate compiler-generated `set_x` function. Moved the
  toggle/dismiss/close logic into a named `<script>`-level function using
  the correct `x = newValue` assignment (which the compiler *does* rewrite
  to `set_x(...)`), mirroring the pattern `Dashboard.sola`'s own
  `boostTraffic`/`throttleTraffic` already used correctly.
- **Changed:** `Chart`'s sparkline now renders from a `data` prop via
  `{#each}` instead of eight hardcoded bar heights.

### `@sola-air-ui/core@1.1.0`

- **Added:** `SolaSentinel` gains ambient field-behavior observation —
  `recordFieldFocus`/`recordFieldBlur` (with automatic revisit detection),
  a debounced significance gate (`checkSignificance`, since `createIntent`
  has no built-in throttle), and `buildPrompt()` to turn observed activity
  into a prompt for `$intent`. Moved out of `index.js` into its own
  `sentinel.js` (`index.js` was already over this repo's file-size
  guideline).
- **Changed:** `flowIndex` is now a real computed score — weighted by recent
  friction severity/recency, field-revisit ratio, and pacing variance —
  instead of a fixed `-3.8` per friction event floored at a hardcoded 68.5.
  Two different behavior sequences now produce two different scores; see
  `packages/core/test/sentinel.test.js`.

### `@sola-air-ui/ui@1.1.0`

- **Added:** `AmbientSuggestion` component — renders a `SolaSentinel` +
  `$intent` suggestion (accepts a plain object or a getter/signal, matching
  `StreamView`/`IntentCard`'s convention), dismissible, non-blocking, and
  renders model output as text only (never `innerHTML`). Verified end-to-end
  against a real LLM in a real browser — see `examples/ambient-poc`.
