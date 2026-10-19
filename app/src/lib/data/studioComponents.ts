// The components Studio offers: real @sola-air-ui/ui components, each with
// sample props that render something worth looking at. What the canvas mounts is
// the compiled component itself, and Export writes the same component and props,
// so what you arrange is what you get. Pure data, so tests can import it; the
// mount functions are in studioMounts.ts.
//
// Left out on purpose: layout containers that need children (Canvas, Stack,
// StatGrid, Card), overlays and shell pieces that need a page around them (Modal,
// IntentSheet, CompanionDrawer, CommandPalette, LauncherDock, ToastHost, Toast),
// and components that need a live service (ConversationThread, AmbientSuggestion,
// HtmlViewer, Dashboard).


export interface StudioComponent {
  /** Export name in @sola-air-ui/ui, e.g. "DataCard". */
  name: string;
  /** Short id used in ?add=, e.g. "data-card". */
  id: string;
  group: 'Data' | 'Inputs' | 'Feedback' | 'Content' | 'AI';
  blurb: string;
  /** Props a new block starts with. Only props the component declares. */
  sample: Record<string, unknown>;
  /** Default width on the 3-column canvas. */
  span: 1 | 2 | 3;
}

export const STUDIO_COMPONENTS: StudioComponent[] = [
  {
    name: 'DataCard', id: 'data-card', group: 'Data', span: 1,
    blurb: 'One number with a title and a trend.',
    sample: { title: 'Monthly revenue', value: '$48,500', trend: '+14.2%' }
  },
  {
    name: 'Chart', id: 'chart', group: 'Data', span: 2,
    blurb: 'A small line chart with a headline value.',
    sample: { title: 'Requests per second', value: '94.2', delta: '+14.8%', data: [35, 55, 40, 80, 65, 95, 70, 88] }
  },
  {
    name: 'GaugeCard', id: 'gauge-card', group: 'Data', span: 1,
    blurb: 'A ring showing a percentage.',
    sample: { title: 'Goal completion', value: '78%', percentage: 78, subtext: 'Target 70%', color: 'emerald' }
  },
  {
    name: 'TactileDialCard', id: 'tactile-dial-card', group: 'Data', span: 1,
    blurb: 'A dial you drag to set a value.',
    sample: { title: 'Rate limit', unit: 'requests per minute', min: 0, max: 100, currentValue: 48, color: 'amber' }
  },
  {
    name: 'FlowWaterfall', id: 'flow-waterfall', group: 'Data', span: 2,
    blurb: 'Steps that add up to a total.',
    sample: {
      title: 'Margin',
      steps: [
        { name: 'Revenue', value: 840000, type: 'positive' },
        { name: 'Infrastructure', value: -140000, type: 'negative' },
        { name: 'Support', value: -60000, type: 'negative' },
        { name: 'Net margin', value: 640000, type: 'total' }
      ]
    }
  },
  {
    name: 'Table', id: 'table', group: 'Data', span: 2,
    blurb: 'Rows of data. Columns come from the row keys.',
    sample: {
      rows: [
        { Customer: 'Atlas Co', Plan: 'Team', Seats: 24 },
        { Customer: 'Birch Labs', Plan: 'Enterprise', Seats: 310 },
        { Customer: 'Cobalt Studio', Plan: 'Solo', Seats: 1 }
      ]
    }
  },
  {
    name: 'IncidentTriageMatrix', id: 'incident-triage-matrix', group: 'Data', span: 2,
    blurb: 'Open incidents and the playbooks to run.',
    sample: {
      title: 'Open incidents',
      description: 'Staged for mitigation',
      incidents: [
        { id: 'INC-204', service: 'Checkout API', severity: 'P1', status: 'Investigating', latency: '320ms' },
        { id: 'INC-203', service: 'Search index', severity: 'P2', status: 'Mitigating', latency: '48ms' }
      ],
      playbooks: [
        { id: 'pb-1', title: 'Fail over to the second region', action: 'DNS failover' },
        { id: 'pb-2', title: 'Page the on-call engineer', action: 'Page' }
      ]
    }
  },
  {
    name: 'StreamView', id: 'stream-view', group: 'Data', span: 2,
    blurb: 'A live log of events.',
    sample: {
      title: 'Deploy log',
      streaming: false,
      events: [
        { timestamp: '09:12:04', type: 'info', message: 'Build started' },
        { timestamp: '09:12:41', type: 'success', message: 'Tests passed' },
        { timestamp: '09:13:02', type: 'warning', message: 'Bundle grew by 4 kB' }
      ]
    }
  },
  {
    name: 'TextInput', id: 'text-input', group: 'Inputs', span: 1,
    blurb: 'A labelled text field.',
    sample: { label: 'Work email', placeholder: 'you@company.com', type: 'email', helpText: 'We never share it.' }
  },
  {
    name: 'Select', id: 'select', group: 'Inputs', span: 1,
    blurb: 'A labelled dropdown.',
    sample: {
      label: 'Plan',
      initialSelected: 'team',
      options: [
        { value: 'solo', label: 'Solo' },
        { value: 'team', label: 'Team' },
        { value: 'enterprise', label: 'Enterprise' }
      ]
    }
  },
  {
    name: 'DatePicker', id: 'date-picker', group: 'Inputs', span: 1,
    blurb: 'A labelled date field.',
    sample: { label: 'Start date', initialValue: '2026-11-02' }
  },
  {
    name: 'Toggle', id: 'toggle', group: 'Inputs', span: 1,
    blurb: 'An on/off switch.',
    sample: { label: 'Email me updates', initialChecked: true }
  },
  {
    name: 'Button', id: 'button', group: 'Inputs', span: 1,
    blurb: 'A button in five styles.',
    sample: { label: 'Save changes', variant: 'primary' }
  },
  {
    name: 'Alert', id: 'alert', group: 'Feedback', span: 2,
    blurb: 'A message in info, success, warning or error.',
    sample: { message: 'Your workspace was created. Check your inbox to confirm.', variant: 'success' }
  },
  {
    name: 'Badge', id: 'badge', group: 'Feedback', span: 1,
    blurb: 'A short status label.',
    sample: { label: 'Healthy', variant: 'success' }
  },
  {
    name: 'Spinner', id: 'spinner', group: 'Feedback', span: 1,
    blurb: 'A loading indicator with a label.',
    sample: { size: '28px', label: 'Loading results' }
  },
  {
    name: 'ConfidenceBadge', id: 'confidence-badge', group: 'AI', span: 1,
    blurb: 'How sure a model is, from 0 to 1.',
    sample: { score: 0.86, size: 'md' }
  },
  {
    name: 'IntentCard', id: 'intent-card', group: 'AI', span: 1,
    blurb: 'Shows one resolved $intent result.',
    sample: { data: { title: 'Churn risk', value: '3 accounts', trend: 'Up 1 this week' } }
  },
  {
    name: 'IntentList', id: 'intent-list', group: 'AI', span: 1,
    blurb: 'Shows a list from an $intent result.',
    sample: {
      title: 'Suggested follow-ups',
      data: [
        { label: 'Email Birch Labs', description: 'Renewal in 12 days', status: 'Due' },
        { label: 'Review INC-204', description: 'Still investigating', status: 'Open' }
      ]
    }
  },
  {
    name: 'ActionStrip', id: 'action-strip', group: 'AI', span: 2,
    blurb: 'A row of suggested actions.',
    sample: {
      label: 'Suggested actions',
      actions: [
        { id: 'approve', label: 'Approve', variant: 'primary' },
        { id: 'snooze', label: 'Snooze a day' },
        { id: 'dismiss', label: 'Dismiss' }
      ]
    }
  },
  {
    name: 'MarkdownViewer', id: 'markdown-viewer', group: 'Content', span: 2,
    blurb: 'Renders Markdown safely.',
    sample: { content: '## Release notes\n\n- Faster search\n- **New** export to CSV\n\nSee the changelog for details.' }
  },
  {
    name: 'SolaSafeHTML', id: 'safe-html', group: 'Content', span: 2,
    blurb: 'Renders HTML with scripts and handlers removed.',
    sample: { title: 'Policy', content: '<p>Gifts over <strong>$50</strong> must be reported to your manager.</p>' }
  }
];

export const STUDIO_BY_NAME: Record<string, StudioComponent> = Object.fromEntries(
  STUDIO_COMPONENTS.map((c) => [c.name, c])
);

export interface StudioBlockData {
  component: string;
  props: Record<string, unknown>;
  span: 1 | 2 | 3;
}

/**
 * A block for `name`: its sample props with `props` merged over them, keeping
 * only props the component declares (`declared`, from the ui manifest) and no
 * callbacks. Null when Studio does not offer the component.
 */
export function buildBlock(
  name: string,
  props: Record<string, unknown> = {},
  span: unknown,
  declared: readonly string[]
): StudioBlockData | null {
  const def = STUDIO_BY_NAME[name];
  if (!def) return null;
  const merged = { ...structuredClone(def.sample), ...(props && typeof props === 'object' ? props : {}) };
  const clean = Object.fromEntries(
    Object.entries(merged).filter(([k, v]) => declared.includes(k) && !/^on[A-Za-z]/.test(k) && v !== undefined)
  );
  const s = Math.min(3, Math.max(1, Math.round(Number(span) || def.span))) as 1 | 2 | 3;
  return { component: name, props: clean, span: s };
}
