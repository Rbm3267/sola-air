// Starting layouts for Studio, built only from STUDIO_COMPONENTS with props the
// components declare. A block's props are merged over the component's sample.

export interface TemplateBlock {
  component: string;
  span?: 1 | 2 | 3;
  props?: Record<string, unknown>;
}

export interface StudioTemplate {
  id: string;
  name: string;
  blurb: string;
  blocks: TemplateBlock[];
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'revenue',
    name: 'Revenue overview',
    blurb: 'Headline numbers, a trend and where the margin goes.',
    blocks: [
      { component: 'DataCard', props: { title: 'Monthly revenue', value: '$48,500', trend: '+14.2%' } },
      { component: 'DataCard', props: { title: 'Paying customers', value: '1,284', trend: '+3.1%' } },
      { component: 'GaugeCard', props: { title: 'Quarter target', value: '82%', percentage: 82, subtext: '$1.2M of $1.46M', color: 'sky' } },
      { component: 'Chart', span: 3, props: { title: 'Weekly revenue', value: '$12.1k', delta: '+8.4%', data: [52, 58, 55, 64, 61, 70, 73, 80] } },
      { component: 'FlowWaterfall', span: 3 }
    ]
  },
  {
    id: 'on-call',
    name: 'On-call board',
    blurb: 'Error budget, open incidents and the deploy log.',
    blocks: [
      { component: 'GaugeCard', props: { title: 'Error budget left', value: '64%', percentage: 64, subtext: '30-day window', color: 'amber' } },
      { component: 'DataCard', props: { title: 'p99 latency', value: '212 ms', trend: '-18 ms' } },
      { component: 'Badge', props: { label: 'Degraded', variant: 'warning' } },
      { component: 'IncidentTriageMatrix', span: 2 },
      { component: 'StreamView', span: 1 }
    ]
  },
  {
    id: 'signup',
    name: 'Sign-up form',
    blurb: 'Fields, a plan picker and a confirmation.',
    blocks: [
      { component: 'TextInput', span: 2, props: { label: 'Full name', placeholder: 'Ada Lovelace' } },
      { component: 'TextInput', props: { label: 'Work email', placeholder: 'you@company.com', type: 'email' } },
      { component: 'Select', span: 2 },
      { component: 'DatePicker' },
      { component: 'Toggle', span: 2 },
      { component: 'Button', props: { label: 'Create account', variant: 'primary' } },
      { component: 'Alert', span: 3, props: { message: 'Account created. Check your inbox to confirm.', variant: 'success' } }
    ]
  },
  {
    id: 'support',
    name: 'Support desk',
    blurb: 'Queue size, SLA and the tickets that need a reply.',
    blocks: [
      { component: 'DataCard', props: { title: 'Open tickets', value: '142', trend: '+8 since 9:00' } },
      { component: 'GaugeCard', props: { title: 'Within SLA', value: '88%', percentage: 88, subtext: '14 close to breach', color: 'emerald' } },
      { component: 'ConfidenceBadge', props: { score: 0.72, label: 'Auto-triage confidence' } },
      {
        component: 'Table', span: 3,
        props: {
          rows: [
            { Ticket: '#4821', Customer: 'Atlas Co', Subject: 'Cannot export invoices', Waiting: '2h 10m' },
            { Ticket: '#4819', Customer: 'Birch Labs', Subject: 'SSO login loop', Waiting: '1h 42m' },
            { Ticket: '#4816', Customer: 'Cobalt Studio', Subject: 'Seat count wrong', Waiting: '58m' }
          ]
        }
      },
      { component: 'ActionStrip', span: 3, props: { label: 'Bulk actions', actions: [{ id: 'assign', label: 'Assign to me', variant: 'primary' }, { id: 'macro', label: 'Apply macro' }, { id: 'escalate', label: 'Escalate' }] } }
    ]
  },
  {
    id: 'assistant',
    name: 'Assistant results',
    blurb: 'What an $intent answer looks like on screen.',
    blocks: [
      { component: 'IntentCard' },
      { component: 'ConfidenceBadge', props: { score: 0.91 } },
      { component: 'IntentList' },
      { component: 'MarkdownViewer', span: 3, props: { content: '### Why these accounts\n\nUsage dropped by more than **40%** in the last two weeks, and each has an open ticket.' } },
      { component: 'ActionStrip', span: 3 }
    ]
  }
];
