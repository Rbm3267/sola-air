# @sola-air-ui/ui

Real, importable `.sola` components for [Sola AIR](https://sola-air.dev) — a component library, not a set of code snippets to copy-paste. Each export below is a real `.sola` single-file component compiled the same way your own components are.

## Install

```bash
npm install @sola-air-ui/ui
```

## Usage

Import individual components by subpath or from the package root:

```html
<script>
  import Table from '@sola-air-ui/ui/table';
  import Badge from '@sola-air-ui/ui/badge';
  import Modal from '@sola-air-ui/ui/modal';
</script>

<Table columns={columns} rows={rows} />
<Badge label="In Progress" variant="warning" />
```

## Components (37 total)

**Layout & display** — `Card`, `Stack`, `Dashboard`, `Table`, `DataCard`, `StatGrid`, `Canvas`

**Inputs & forms** — `TextInput`, `Select`, `DatePicker`, `Toggle`, `Button`

**Feedback** — `Alert`, `Toast`, `Spinner`, `Badge`, `Modal`

**Shell** — `LauncherDock`, `CommandPalette`, `CompanionDrawer`, `ToastHost`

**Gauges & telemetry** — `GaugeCard`, `TactileDialCard`, `FlowWaterfall`, `IncidentTriageMatrix`

**Content rendering** — `MarkdownViewer`, `HtmlViewer`, `SolaSafeHTML`, `Chart`, `StreamView`

**AI / intent-driven** — `IntentCard`, `IntentList`, `AmbientSuggestion`, and under `./ai/`: `ConversationThread`, `ActionStrip`, `ConfidenceBadge`, `IntentSheet`

Each of the 37 components has its own subpath export (e.g. `@sola-air-ui/ui/data-card`, `@sola-air-ui/ui/safe-html`, `@sola-air-ui/ui/launcher-dock`) and is also exported from the package root (`import { Table, GaugeCard, SolaSafeHTML } from '@sola-air-ui/ui'`) — see `package.json` `exports` for the full map.

## Peer dependency

Requires `@sola-air-ui/core` (installed automatically as a dependency) and expects your build to compile `.sola` files — use `@sola-air-ui/vite-plugin-sola`, or the `sola-air` meta-package for a complete setup.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
