// The @sola-air-ui/ui components the catalog did not list before: every one of
// the package's 37 now has an entry on /components. Entries for components Studio
// can mount reuse its blurb and sample props, so the two pages agree. The rest
// need children or a page around them, so they list their props and the code
// to install, with no live stage.
import type { CatalogComponent, ComponentPropSpec } from './componentCatalog';
import { STUDIO_COMPONENTS } from './studioComponents';

type Category = CatalogComponent['category'];

const studio = new Map(STUDIO_COMPONENTS.map((c) => [c.name, c]));

function specs(config: Record<string, unknown>): ComponentPropSpec[] {
  return Object.entries(config).map(([name, value]) => ({
    name,
    type: Array.isArray(value) ? 'array' : typeof value,
    defaultValue: value,
    description: ''
  }));
}

function entry(
  componentName: string,
  id: string,
  category: Category,
  description: string,
  tagline: string,
  fallback: Record<string, unknown> = {}
): CatalogComponent {
  const s = studio.get(componentName);
  const defaultConfig = s ? { ...s.sample } : { ...fallback };
  return {
    id,
    name: componentName.replace(/([a-z])([A-Z])/g, '$1 $2'),
    category,
    description: s?.blurb ?? description,
    tagline,
    badge: 'Package',
    componentName,
    defaultConfig,
    props: specs(defaultConfig)
  };
}

export const PACKAGE_CATALOG_ADDITIONS: CatalogComponent[] = [
  entry('ActionStrip', 'action-strip', 'Buttons & Actions', 'A row of actions an assistant suggests.', 'Suggested next steps'),
  entry('Alert', 'alert', 'Status & HUD', 'A message bar for info, success, warning or error.', 'Inline messages'),
  entry('AmbientSuggestion', 'ambient-suggestion', 'Status & HUD', 'A small suggestion that appears beside the work and can be dismissed. It reads an intent, so it needs a configured provider.', 'Unobtrusive suggestions', { suggestion: null }),
  entry('Badge', 'badge', 'Status & HUD', 'A small label for a status or count.', 'Status labels'),
  entry('Button', 'button', 'Buttons & Actions', 'A button with variants.', 'Actions'),
  entry('Canvas', 'canvas', 'Data Display', 'A page-level wrapper that sets the theme, padding and grid for what it holds. It takes children.', 'Layout container', { theme: 'light', padding: 'comfortable', layout: 'auto-grid', maxWidth: '1200px' }),
  entry('Card', 'card', 'Data Display', 'A titled box for grouping content. It takes children.', 'Layout container', { title: 'Card title', accentColor: '' }),
  entry('Chart', 'chart', 'Matrices & Graphs', 'A small line chart with a headline value.', 'Trends'),
  entry('CommandPalette', 'command-palette', 'Navigation', 'A searchable list of commands opened with a hotkey. It covers the page when open.', 'Keyboard-first navigation', { commands: [{ id: 'new', label: 'New report' }], hotkey: 'mod+k', placeholder: 'Type a command…' }),
  entry('CompanionDrawer', 'companion-drawer', 'Overlays & Dialogs', 'A side drawer for a companion panel. It slides over the page.', 'Side panel', { title: 'Companion', side: 'right', width: '380px' }),
  entry('ConfidenceBadge', 'confidence-badge', 'Status & HUD', 'A badge showing how sure the model is.', 'Model confidence'),
  entry('ConversationThread', 'conversation-thread', 'Lists & Feeds', 'A chat thread that talks to an intent endpoint. It needs a running endpoint.', 'Chat', { endpoint: '/api/intent', placeholder: 'Ask anything…' }),
  entry('Dashboard', 'dashboard', 'Metrics & KPIs', 'A full telemetry dashboard with live-updating numbers.', 'Whole-page example', { title: 'Cluster Telemetry Mesh', initialRps: 1420, initialErrorRate: 0.04 }),
  entry('DatePicker', 'date-picker', 'Forms & Inputs', 'A date field with a calendar.', 'Dates'),
  entry('HtmlViewer', 'html-viewer', 'Data Display', 'Shows HTML in a sandboxed frame. Scripts are off unless you allow them.', 'Embedded content', { content: '<p>Hello</p>', height: '480px', title: 'Embedded content', allowScripts: false }),
  entry('IntentCard', 'intent-card', 'Data Display', 'A card filled by an intent prompt.', 'Generated content'),
  entry('IntentList', 'intent-list', 'Lists & Feeds', 'A list filled by an intent prompt.', 'Generated lists'),
  entry('IntentSheet', 'intent-sheet', 'Overlays & Dialogs', 'A sheet that shows an intent response with actions. It slides over the page.', 'Response sheet', { open: false, title: 'AI Response', side: 'right' }),
  entry('LauncherDock', 'launcher-dock', 'Navigation', 'A dock of launcher buttons along one edge of the page.', 'App launcher', { items: [], position: 'bottom', label: 'Launcher' }),
  entry('MarkdownViewer', 'markdown-viewer', 'Data Display', 'Renders Markdown as safe HTML.', 'Formatted text'),
  entry('Modal', 'modal', 'Overlays & Dialogs', 'A dialog that covers the page. It takes children.', 'Dialog', { title: 'Modal Dialog', initialOpen: false }),
  entry('Select', 'select', 'Forms & Inputs', 'A drop-down list of options.', 'Choices'),
  entry('Spinner', 'spinner', 'Status & HUD', 'A loading indicator.', 'Loading'),
  entry('Stack', 'stack', 'Data Display', 'Lays its children out in a row or column with a gap. It takes children.', 'Layout container', { direction: 'column', gap: '12px', align: 'stretch' }),
  entry('StatGrid', 'stat-grid', 'Metrics & KPIs', 'A grid for a set of stat cards. It takes children.', 'Layout container', { columns: 3, gap: '16px' }),
  entry('Table', 'table', 'Data Display', 'A table of rows with column headings.', 'Rows and columns'),
  entry('TextInput', 'text-input', 'Forms & Inputs', 'A text field with a label.', 'Text entry'),
  entry('Toast', 'toast', 'Status & HUD', 'A short message that can close itself.', 'Notifications', { message: 'Action completed successfully.', type: 'success', initialVisible: true, duration: 0 }),
  entry('ToastHost', 'toast-host', 'Status & HUD', 'Collects toast events and shows them stacked in a corner of the page.', 'Toast container', { listen: 'sola:toast', duration: 5000, max: 4 }),
  entry('Toggle', 'toggle', 'Forms & Inputs', 'An on/off switch.', 'Switches')
];
