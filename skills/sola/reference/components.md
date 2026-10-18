# @sola-air-ui/ui 1.7.0: components

Generated from the package by scripts/build-skill.mjs. Every component listed here exists, and every prop listed is one it declares with `export let`. Nothing else is accepted.

Import each one by its subpath, for example `import DataCard from '@sola-air-ui/ui/data-card';`. A prop marked "value or getter" also accepts a function, so the component follows a changing value, e.g. `rows={() => data().rows}`. Other props are read once at mount; pass an expression that reads a signal and the child is re-mounted when it changes.

## Layout

### Canvas

`import Canvas from '@sola-air-ui/ui/canvas';`

| Prop | Default | Note |
|---|---|---|
| `theme` | `'light'` | light \| dark |
| `padding` | `'comfortable'` | none \| compact \| comfortable |
| `layout` | `'auto-grid'` | auto-grid \| stack \| none |
| `maxWidth` | `'1200px'` |  |

### Card

`import Card from '@sola-air-ui/ui/card';`

| Prop | Default | Note |
|---|---|---|
| `title` | `""` |  |
| `accentColor` | `""` |  |

### Stack

`import Stack from '@sola-air-ui/ui/stack';`

| Prop | Default | Note |
|---|---|---|
| `direction` | `'column'` |  |
| `gap` | `'12px'` |  |
| `align` | `'stretch'` |  |

### Dashboard

`import Dashboard from '@sola-air-ui/ui/dashboard';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"Cluster Telemetry Mesh"` |  |
| `initialRps` | `1420` |  |
| `initialErrorRate` | `0.04` |  |
| `initialNodes` | `[…]` |  |

### StatGrid

`import StatGrid from '@sola-air-ui/ui/stat-grid';`

| Prop | Default | Note |
|---|---|---|
| `columns` | `3` |  |
| `gap` | `"16px"` |  |

## Data display

### DataCard

`import DataCard from '@sola-air-ui/ui/data-card';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"METRIC"` |  |
| `value` | `"$0.00"` |  |
| `trend` | `""` |  |

### Table

`import Table from '@sola-air-ui/ui/table';`

| Prop | Default | Note |
|---|---|---|
| `columns` | `[]` | value or getter |
| `rows` | `[]` | value or getter |
| `striped` | `false` |  |
| `onRowClick` | `null` |  |
| `dark` | `false` |  |

### Chart

`import Chart from '@sola-air-ui/ui/chart';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"SIGNAL TELEMETRY"` |  |
| `value` | `"94.2 req/s"` |  |
| `delta` | `"+14.8%"` |  |
| `data` | `[35, 55, 40, 80, 65, 95, 70, 88]` |  |

### GaugeCard

`import GaugeCard from '@sola-air-ui/ui/gauge-card';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"Utilization"` |  |
| `value` | `"75%"` |  |
| `percentage` | `75` |  |
| `subtext` | `""` |  |
| `color` | `"emerald"` | emerald \| sky \| violet \| amber \| rose |

### FlowWaterfall

`import FlowWaterfall from '@sola-air-ui/ui/flow-waterfall';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"Net Margin Realization"` |  |
| `steps` | `[…]` |  |

### IncidentTriageMatrix

`import IncidentTriageMatrix from '@sola-air-ui/ui/incident-triage-matrix';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"Live Priority Radar"` |  |
| `description` | `"Active triage items staged for automated mitigation"` |  |
| `incidents` | `[…]` |  |
| `playbooks` | `[…]` |  |

### StreamView

`import StreamView from '@sola-air-ui/ui/stream-view';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"AI Stream Engine"` |  |
| `content` | `""` | value or getter |
| `events` | `null` | value or getter |
| `streaming` | `true` |  |

### MarkdownViewer

`import MarkdownViewer from '@sola-air-ui/ui/markdown-viewer';`

| Prop | Default | Note |
|---|---|---|
| `content` | `''` | value or getter |

### HtmlViewer

`import HtmlViewer from '@sola-air-ui/ui/html-viewer';`

| Prop | Default | Note |
|---|---|---|
| `content` | `''` | value or getter |
| `height` | `'480px'` |  |
| `title` | `'Embedded content'` |  |
| `allowScripts` | `false` |  |

### SolaSafeHTML

`import SolaSafeHTML from '@sola-air-ui/ui/safe-html';`

| Prop | Default | Note |
|---|---|---|
| `content` | `''` | value or getter |
| `maxHeight` | `''` | e.g. "130px" — caps height and adds a bottom mask-fade |
| `title` | `'Rich text content'` |  |

## Inputs

### Button

`import Button from '@sola-air-ui/ui/button';`

| Prop | Default | Note |
|---|---|---|
| `label` | `"Button"` |  |
| `variant` | `"primary"` | primary \| secondary \| ghost \| destructive \| outline |
| `size` | `"default"` | sm \| default \| lg \| icon |
| `disabled` | `false` |  |
| `loading` | `false` |  |
| `onClick` | `null` |  |

### TextInput

`import TextInput from '@sola-air-ui/ui/text-input';`

| Prop | Default | Note |
|---|---|---|
| `label` | `"Label"` |  |
| `placeholder` | `"Enter value..."` |  |
| `initialValue` | `""` |  |
| `type` | `"text"` |  |
| `name` | `""` |  |
| `disabled` | `false` |  |
| `required` | `false` |  |
| `helpText` | `""` |  |
| `errorText` | `""` |  |
| `onInput` | `null` |  |
| `onChange` | `null` |  |
| `id` | `"sola-input-" + Math.random().toString(36).slice(2, 9)` |  |

### Select

`import Select from '@sola-air-ui/ui/select';`

| Prop | Default | Note |
|---|---|---|
| `label` | `"Select option"` |  |
| `initialSelected` | `""` |  |
| `placeholder` | `"Choose an option..."` |  |
| `name` | `""` |  |
| `disabled` | `false` |  |
| `required` | `false` |  |
| `options` | `[]` |  |
| `onChange` | `null` |  |
| `id` | `"sola-select-" + Math.random().toString(36).slice(2, 9)` |  |

### DatePicker

`import DatePicker from '@sola-air-ui/ui/date-picker';`

| Prop | Default | Note |
|---|---|---|
| `label` | `"DATE PICKER"` |  |
| `value` | `""` |  |
| `initialValue` | `""` |  |
| `placeholder` | `"Pick a date..."` |  |
| `onChange` | `null` |  |

### Toggle

`import Toggle from '@sola-air-ui/ui/toggle';`

| Prop | Default | Note |
|---|---|---|
| `label` | `""` |  |
| `checked` | `undefined` |  |
| `initialChecked` | `false` |  |
| `disabled` | `false` |  |
| `onChange` | `null` |  |

### TactileDialCard

`import TactileDialCard from '@sola-air-ui/ui/tactile-dial-card';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"Rotary Touch Controller"` |  |
| `metric` | `""` | formatted center readout; falls back to "<currentValue>" if unset |
| `unit` | `"Drag to adjust"` |  |
| `min` | `0` |  |
| `max` | `100` |  |
| `currentValue` | `48` |  |
| `color` | `"amber"` | amber \| emerald \| sky |
| `onChange` | `null` |  |

## Feedback

### Alert

`import Alert from '@sola-air-ui/ui/alert';`

| Prop | Default | Note |
|---|---|---|
| `message` | `''` |  |
| `variant` | `'info'` |  |

### Badge

`import Badge from '@sola-air-ui/ui/badge';`

| Prop | Default | Note |
|---|---|---|
| `label` | `''` |  |
| `variant` | `'default'` |  |

### Spinner

`import Spinner from '@sola-air-ui/ui/spinner';`

| Prop | Default | Note |
|---|---|---|
| `size` | `'24px'` |  |
| `label` | `'Loading'` |  |

### Toast

`import Toast from '@sola-air-ui/ui/toast';`

| Prop | Default | Note |
|---|---|---|
| `message` | `"Action completed successfully."` |  |
| `type` | `"success"` |  |
| `initialVisible` | `true` |  |
| `duration` | `0` |  |
| `onDismiss` | `null` |  |

### Modal

`import Modal from '@sola-air-ui/ui/modal';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"Modal Dialog"` | value or getter |
| `initialOpen` | `false` |  |
| `isOpen` | `null` | value or getter |
| `onClose` | `null` |  |

## Shell

### LauncherDock

`import LauncherDock from '@sola-air-ui/ui/launcher-dock';`

| Prop | Default | Note |
|---|---|---|
| `items` | `[]` | value or getter |
| `active` | `null` | value or getter |
| `position` | `"bottom"` |  |
| `label` | `"Launcher"` |  |
| `onSelect` | `null` |  |

### CommandPalette

`import CommandPalette from '@sola-air-ui/ui/command-palette';`

| Prop | Default | Note |
|---|---|---|
| `commands` | `[]` | value or getter |
| `isOpen` | `null` | value or getter |
| `hotkey` | `"mod+k"` |  |
| `placeholder` | `"Type a command…"` |  |
| `label` | `"Command palette"` |  |
| `onSelect` | `null` |  |
| `onClose` | `null` |  |

### CompanionDrawer

`import CompanionDrawer from '@sola-air-ui/ui/companion-drawer';`

| Prop | Default | Note |
|---|---|---|
| `title` | `"Companion"` | value or getter |
| `initialOpen` | `false` |  |
| `isOpen` | `null` | value or getter |
| `side` | `"right"` |  |
| `width` | `"380px"` |  |
| `onClose` | `null` |  |

### ToastHost

`import ToastHost from '@sola-air-ui/ui/toast-host';`

| Prop | Default | Note |
|---|---|---|
| `listen` | `"sola:toast"` |  |
| `duration` | `5000` |  |
| `max` | `4` |  |
| `onDismiss` | `null` |  |

## AI and intent

### IntentCard

`import IntentCard from '@sola-air-ui/ui/intent-card';`

| Prop | Default | Note |
|---|---|---|
| `data` | `null` | value or getter |
| `loading` | `false` |  |

### IntentList

`import IntentList from '@sola-air-ui/ui/intent-list';`

| Prop | Default | Note |
|---|---|---|
| `data` | `null` | value or getter |
| `title` | `'Results'` |  |

### AmbientSuggestion

`import AmbientSuggestion from '@sola-air-ui/ui/ambient-suggestion';`

| Prop | Default | Note |
|---|---|---|
| `suggestion` | `null` | value or getter |
| `onDismiss` | `null` |  |

### ConversationThread

`import ConversationThread from '@sola-air-ui/ui/ai/conversation-thread';`

| Prop | Default | Note |
|---|---|---|
| `endpoint` | `'/api/intent'` |  |
| `model` | `null` |  |
| `provider` | `null` |  |
| `placeholder` | `'Ask anything…'` |  |
| `systemLabel` | `'AI'` |  |
| `userLabel` | `'You'` |  |
| `onmessage` | `null` |  |

### ActionStrip

`import ActionStrip from '@sola-air-ui/ui/ai/action-strip';`

| Prop | Default | Note |
|---|---|---|
| `actions` | `[]` |  |
| `onaction` | `null` |  |
| `label` | `'Suggested actions'` |  |
| `variant` | `'default'` | 'default' \| 'compact' |

### ConfidenceBadge

`import ConfidenceBadge from '@sola-air-ui/ui/ai/confidence-badge';`

| Prop | Default | Note |
|---|---|---|
| `score` | `null` | value or getter; 0–1 float, or null for unknown |
| `label` | `null` | value or getter; override label text |
| `size` | `'md'` | 'sm' \| 'md' \| 'lg' |

### IntentSheet

`import IntentSheet from '@sola-air-ui/ui/ai/intent-sheet';`

| Prop | Default | Note |
|---|---|---|
| `open` | `false` | value or getter |
| `title` | `'AI Response'` |  |
| `intent` | `null` | value or getter; $intent signal or plain value |
| `actions` | `[]` |  |
| `onclose` | `null` |  |
| `onaction` | `null` |  |
| `side` | `'right'` | 'right' \| 'bottom' |
