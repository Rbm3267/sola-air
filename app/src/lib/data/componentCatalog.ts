export interface ComponentPropSpec {
  name: string;
  type: string;
  defaultValue: any;
  description: string;
  options?: string[];
}

export interface CatalogComponent {
  id: string;
  name: string;
  category: 'Metrics & KPIs' | 'Gauges & Rings' | 'Controllers & Sliders' | 'Flows & Cascades' | 'Lists & Feeds' | 'Matrices & Graphs' | 'Forms & Inputs' | 'Status & HUD' | 'Overlays & Dialogs' | 'Navigation' | 'Data Display' | 'Buttons & Actions';
  description: string;
  tagline: string;
  badge?: string;
  componentName: string;
  defaultConfig: Record<string, any>;
  props: ComponentPropSpec[];
  codeSnippets: {
    sola: string;
    react: string;
    svelte: string;
    html: string;
  };
}

export const COMPONENT_CATALOG: CatalogComponent[] = [
  // 1. MetricCard
  {
    id: 'metric-card',
    name: 'Metric Card',
    category: 'Metrics & KPIs',
    description: 'Primary KPI metric tile with configurable numerical value, delta trend percentage, and clean vector icon.',
    tagline: 'Statistics and key performance indicators',
    badge: 'Foundational',
    componentName: 'DataCard',
    defaultConfig: {
      title: 'Net Revenue Retention',
      value: '138.4%',
      trend: '+12.6% vs target',
      icon: 'activity',
      accentColor: 'emerald'
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Metric Title', description: 'Label displayed at the top of the card' },
      { name: 'value', type: 'string', defaultValue: '$184,200', description: 'Primary prominent metric value' },
      { name: 'trend', type: 'string', defaultValue: '+14.2%', description: 'Subtext or trend percentage badge' },
      { name: 'icon', type: 'string', defaultValue: 'activity', description: 'Vector icon glyph identifier', options: ['activity', 'trending-up', 'check-circle', 'zap', 'shield'] }
    ],
    codeSnippets: {
      sola: `<DataCard \n  title="Net Revenue Retention"\n  value="138.4%"\n  trend="+12.6% vs target"\n  icon="activity"\n/>`,
      react: `import { DataCard } from '@sola-air-ui/ui';\n\nexport function KPIWidget() {\n  return (\n    <DataCard\n      title="Net Revenue Retention"\n      value="138.4%"\n      trend="+12.6% vs target"\n      icon="activity"\n    />\n  );\n}`,
      svelte: `<script>\n  import { DataCard } from '@sola-air-ui/ui';\n</script>\n\n<DataCard config={{\n  title: "Net Revenue Retention",\n  value: "138.4%",\n  trend: "+12.6% vs target",\n  icon: "activity"\n}} />`,
      html: `<sola-data-card\n  title="Net Revenue Retention"\n  value="138.4%"\n  trend="+12.6% vs target"\n  icon="activity"\n></sola-data-card>`
    }
  },

  // 2. GaugeCard
  {
    id: 'gauge-ring',
    name: 'Progress Gauge Ring',
    category: 'Gauges & Rings',
    description: 'SVG circular ring gauge with smooth animated strokes, percentage calculation, and ambient status color.',
    tagline: 'Radial capacity indicators and milestone progress rings',
    badge: 'Vector SVG',
    componentName: 'GaugeCard',
    defaultConfig: {
      title: 'Target SLA Utilization',
      value: '94.2%',
      percentage: 94,
      subtext: 'Optimal threshold: 90%',
      color: 'emerald'
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Utilization', description: 'Card title' },
      { name: 'percentage', type: 'number', defaultValue: 86, description: 'Progress percentage (0 - 100)' },
      { name: 'value', type: 'string', defaultValue: '86%', description: 'Centered display string' },
      { name: 'subtext', type: 'string', defaultValue: 'Normal range', description: 'Contextual sub-label' },
      { name: 'color', type: 'string', defaultValue: 'emerald', description: 'Ring accent color', options: ['emerald', 'sky', 'amber', 'violet', 'rose'] }
    ],
    codeSnippets: {
      sola: `<GaugeCard\n  title="Target SLA Utilization"\n  percentage={94}\n  value="94.2%"\n  color="emerald"\n/>`,
      react: `import { GaugeCard } from '@sola-air-ui/ui';\n\nexport function CapacityGauge() {\n  return (\n    <GaugeCard\n      title="Target SLA Utilization"\n      percentage={94}\n      value="94.2%"\n      color="emerald"\n    />\n  );\n}`,
      svelte: `<script>\n  import { GaugeCard } from '@sola-air-ui/ui';\n</script>\n\n<GaugeCard config={{\n  title: "Target SLA Utilization",\n  percentage: 94,\n  value: "94.2%",\n  color: "emerald"\n}} />`,
      html: `<sola-gauge-card\n  title="Target SLA Utilization"\n  percentage="94"\n  value="94.2%"\n  color="emerald"\n></sola-gauge-card>`
    }
  },

  // 3. TactileDialCard
  {
    id: 'tactile-dial',
    name: 'Rotary Dial Controller',
    category: 'Controllers & Sliders',
    description: 'Rotary dial driven by drag and wheel input with eased motion, bound to a reactive signal.',
    tagline: 'Tactile rotary controllers and haptic adjustment dials',
    badge: 'Interactive',
    componentName: 'TactileDialCard',
    defaultConfig: {
      title: 'Bandwidth Rate Limiter',
      metric: '48 Nodes',
      min: 1,
      max: 100,
      currentValue: 48,
      unit: 'Active Allocation'
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Throttle Controller', description: 'Dial label' },
      { name: 'metric', type: 'string', defaultValue: '48 Units', description: 'Formatted value display' },
      { name: 'min', type: 'number', defaultValue: 0, description: 'Minimum dial threshold' },
      { name: 'max', type: 'number', defaultValue: 100, description: 'Maximum dial threshold' },
      { name: 'currentValue', type: 'number', defaultValue: 48, description: 'Active rotational value' }
    ],
    codeSnippets: {
      sola: `<TactileDialCard\n  title="Bandwidth Rate Limiter"\n  metric="48 Nodes"\n  min={1}\n  max={100}\n  currentValue={48}\n/>`,
      react: `import { TactileDialCard } from '@sola-air-ui/ui';\n\nexport function ThrottleControl() {\n  return (\n    <TactileDialCard\n      title="Bandwidth Rate Limiter"\n      min={1}\n      max={100}\n      defaultValue={48}\n      onChange={(val) => console.log('Dial changed:', val)}\n    />\n  );\n}`,
      svelte: `<script>\n  import { TactileDialCard } from '@sola-air-ui/ui';\n</script>\n\n<TactileDialCard config={{\n  title: "Bandwidth Rate Limiter",\n  metric: "48 Nodes",\n  min: 1,\n  max: 100,\n  currentValue: 48\n}} />`,
      html: `<sola-tactile-dial\n  title="Bandwidth Rate Limiter"\n  min="1"\n  max="100"\n  value="48"\n></sola-tactile-dial>`
    }
  },

  // 4. FlowWaterfall
  {
    id: 'flow-waterfall',
    name: 'Step & Margin Waterfall',
    category: 'Flows & Cascades',
    description: 'Progressive breakdown chart visualizing positive contributions, deductions, and running net balances.',
    tagline: 'Waterfall cascades, pipeline progressions, and margin flows',
    badge: 'Visual Flow',
    componentName: 'FlowWaterfall',
    defaultConfig: {
      title: 'Net Margin Realization',
      steps: [
        { name: 'Gross Revenue Ingress', value: 840000, type: 'positive' },
        { name: 'Cloud Infrastructure & Egress', value: -140000, type: 'negative' },
        { name: 'Zero-VDOM Compute Efficiency', value: 24000, type: 'positive' },
        { name: 'Net Realized Margin', value: 724000, type: 'total' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Cash Flow Breakdown', description: 'Header title of the waterfall' },
      { name: 'steps', type: 'Array<Step>', defaultValue: [], description: 'Array of steps with name, value, and type (positive/negative/total)' }
    ],
    codeSnippets: {
      sola: `<FlowWaterfall\n  title="Net Margin Realization"\n  steps={[\n    { name: "Gross Ingress", value: 840000, type: "positive" },\n    { name: "Overhead", value: -140000, type: "negative" },\n    { name: "Net Balance", value: 700000, type: "total" }\n  ]}\n/>`,
      react: `import { FlowWaterfall } from '@sola-air-ui/ui';\n\nexport function MarginChart() {\n  return (\n    <FlowWaterfall\n      title="Net Margin Realization"\n      steps={[\n        { name: "Gross Ingress", value: 840000, type: "positive" },\n        { name: "Overhead", value: -140000, type: "negative" },\n        { name: "Net Balance", value: 700000, type: "total" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { FlowWaterfall } from '@sola-air-ui/ui';\n</script>\n\n<FlowWaterfall config={{\n  title: "Net Margin Realization",\n  steps: [\n    { name: "Gross Ingress", value: 840000, type: "positive" },\n    { name: "Overhead", value: -140000, type: "negative" },\n    { name: "Net Balance", value: 700000, type: "total" }\n  ]\n}} />`,
      html: `<sola-flow-waterfall title="Net Margin Realization"></sola-flow-waterfall>`
    }
  },

  // 5. ListBlock
  {
    id: 'list-feed',
    name: 'Signal Feed & Activity List',
    category: 'Lists & Feeds',
    description: 'Activity feed and key-value list with live status pills and metadata.',
    tagline: 'Event streams, transaction feeds, and status lists',
    badge: 'Reactive Feed',
    componentName: 'ListBlock',
    defaultConfig: {
      title: 'Active Signal Stream',
      items: [
        { label: 'ingress-relay-us-east', description: 'p99 Latency: 4.2ms • 32 Nodes', status: 'Active' },
        { label: 'postgres-primary-pool', description: 'Replication Lag: 0ms • Sync', status: 'Active' },
        { label: 'edge-cache-frankfurt', description: 'Cache Hit Ratio: 98.4%', status: 'Completed' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Active Feed', description: 'List block header' },
      { name: 'items', type: 'Array<Item>', defaultValue: [], description: 'List items containing label, description, and status' }
    ],
    codeSnippets: {
      sola: `<ListBlock\n  title="Active Signal Stream"\n  items={[\n    { label: "Worker-01", description: "Healthy", status: "Active" }\n  ]}\n/>`,
      react: `import { ListBlock } from '@sola-air-ui/ui';\n\nexport function SignalStream() {\n  return (\n    <ListBlock\n      title="Active Signal Stream"\n      items={[\n        { label: "Worker-01", description: "Healthy", status: "Active" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { ListBlock } from '@sola-air-ui/ui';\n</script>\n\n<ListBlock config={{\n  title: "Active Signal Stream",\n  items: [{ label: "Worker-01", description: "Healthy", status: "Active" }]\n}} />`,
      html: `<sola-list-block title="Active Signal Stream"></sola-list-block>`
    }
  },

  // 6. DynamicForm
  {
    id: 'dynamic-form',
    name: 'Schema-Driven Dynamic Form',
    category: 'Forms & Inputs',
    description: 'Declarative JSON schema-driven form generator with built-in validation, reactive signal binding, and async submission.',
    tagline: 'Zero-code forms, parameter tuners, and wizard inputs',
    badge: 'Schema-Driven',
    componentName: 'DynamicForm',
    defaultConfig: {
      title: 'Cluster Provisioning Schema',
      endpoint: '/api/provision',
      fields: [
        { name: 'cluster_name', label: 'Cluster Identifier', type: 'text', required: true },
        { name: 'node_count', label: 'Max Node Allocation', type: 'number', required: true },
        { name: 'region', label: 'Deployment Region', type: 'text', required: true }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Configuration Form', description: 'Form title' },
      { name: 'endpoint', type: 'string', defaultValue: '/api/submit', description: 'Form submission endpoint' },
      { name: 'fields', type: 'Array<Field>', defaultValue: [], description: 'Array of form field definitions' }
    ],
    codeSnippets: {
      sola: `<DynamicForm\n  title="Cluster Configuration"\n  endpoint="/api/provision"\n  fields={[\n    { name: "cluster_name", label: "Identifier", type: "text", required: true }\n  ]}\n/>`,
      react: `import { DynamicForm } from '@sola-air-ui/ui';\n\nexport function ConfigForm() {\n  return (\n    <DynamicForm\n      title="Cluster Configuration"\n      endpoint="/api/provision"\n      fields={[\n        { name: "cluster_name", label: "Identifier", type: "text", required: true }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { DynamicForm } from '@sola-air-ui/ui';\n</script>\n\n<DynamicForm config={{\n  title: "Cluster Configuration",\n  endpoint: "/api/provision",\n  fields: [{ name: "cluster_name", label: "Identifier", type: "text", required: true }]\n}} />`,
      html: `<sola-dynamic-form title="Cluster Configuration"></sola-dynamic-form>`
    }
  },

  // 7. ClusterMatrix
  {
    id: 'cluster-matrix',
    name: 'Multi-Node Topology Matrix',
    category: 'Matrices & Graphs',
    description: 'Multi-region topology status matrix visualizing node health, load percentages, and microsecond latency pips.',
    tagline: 'Infrastructure health grids and cluster matrices',
    badge: 'Topologies',
    componentName: 'ClusterMatrix',
    defaultConfig: {
      title: 'Global Node Topologies',
      clusters: [
        { name: 'us-east-1a (Primary)', status: 'healthy', load: '38%', p99: '8.4ms' },
        { name: 'eu-central-1 (Frankfurt)', status: 'healthy', load: '52%', p99: '14.2ms' },
        { name: 'ap-southeast-1 (Singapore)', status: 'healthy', load: '64%', p99: '21.0ms' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Topology Grid', description: 'Matrix title' },
      { name: 'clusters', type: 'Array<Cluster>', defaultValue: [], description: 'Cluster telemetry nodes' }
    ],
    codeSnippets: {
      sola: `<ClusterMatrix\n  title="Global Node Topologies"\n  clusters={[\n    { name: "us-east-1", status: "healthy", load: "38%", p99: "8.4ms" }\n  ]}\n/>`,
      react: `import { ClusterMatrix } from '@sola-air-ui/ui';\n\nexport function ClusterView() {\n  return (\n    <ClusterMatrix\n      title="Global Node Topologies"\n      clusters={[\n        { name: "us-east-1", status: "healthy", load: "38%", p99: "8.4ms" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { ClusterMatrix } from '@sola-air-ui/ui';\n</script>\n\n<ClusterMatrix config={{\n  title: "Global Node Topologies",\n  clusters: [{ name: "us-east-1", status: "healthy", load: "38%", p99: "8.4ms" }]\n}} />`,
      html: `<sola-cluster-matrix title="Global Node Topologies"></sola-cluster-matrix>`
    }
  },

  // 8. IncidentTriageMatrix
  {
    id: 'status-radar',
    name: 'Status & Priority Matrix',
    category: 'Status & HUD',
    description: 'High-priority status matrix with severity pill flags, live SLA breach timers, and 1-click action playbooks.',
    tagline: 'Incident command, SLA tracking, and priority triage',
    badge: 'Action Radar',
    componentName: 'IncidentTriageMatrix',
    defaultConfig: {
      title: 'Live Priority Radar',
      description: 'Active triage items staged for automated mitigation',
      incidents: [
        { id: 'TICKET-492', service: 'Authentication Token Gateway', severity: 'P1', status: 'Investigating', latency: '320ms' },
        { id: 'TICKET-495', service: 'Database Connection Pool', severity: 'P2', status: 'Mitigating', latency: '48ms' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Status Matrix', description: 'Radar title' },
      { name: 'incidents', type: 'Array<Incident>', defaultValue: [], description: 'Priority items array' }
    ],
    codeSnippets: {
      sola: `<IncidentTriageMatrix\n  title="Live Priority Radar"\n  incidents={[\n    { id: "T-100", service: "Auth API", severity: "P1", status: "Active" }\n  ]}\n/>`,
      react: `import { IncidentTriageMatrix } from '@sola-air-ui/ui';\n\nexport function PriorityRadar() {\n  return (\n    <IncidentTriageMatrix\n      title="Live Priority Radar"\n      incidents={[\n        { id: "T-100", service: "Auth API", severity: "P1", status: "Active" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { IncidentTriageMatrix } from '@sola-air-ui/ui';\n</script>\n\n<IncidentTriageMatrix config={{\n  title: "Live Priority Radar",\n  incidents: [{ id: "T-100", service: "Auth API", severity: "P1", status: "Active" }]\n}} />`,
      html: `<sola-incident-triage title="Live Priority Radar"></sola-incident-triage>`
    }
  },

  // ───────────────────────────────────────────
  // 9. StreamView (existing component)
  // ───────────────────────────────────────────
  {
    id: 'stream-view',
    name: 'Live Event Stream',
    category: 'Lists & Feeds',
    description: 'Real-time chronological event log with typed severity indicators, millisecond-resolution timestamps, and auto-scrolling tail.',
    tagline: 'Live event streams, audit logs, and system output tails',
    badge: 'Streaming',
    componentName: 'StreamView',
    defaultConfig: {
      title: 'Runtime Event Log',
      events: [
        { id: '1', message: 'Runtime attached to DOM root', timestamp: '00:01.02', type: 'success' },
        { id: '2', message: 'Signal effect registered', timestamp: '00:01.18', type: 'info' },
        { id: '3', message: 'Batch flush completed (0.4ms)', timestamp: '00:01.45', type: 'info' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Live Stream', description: 'Stream header label' },
      { name: 'events', type: 'Array<Event>', defaultValue: [], description: 'Array of event objects with id, message, timestamp, and type' }
    ],
    codeSnippets: {
      sola: `<StreamView\n  title="Runtime Event Log"\n  events={[\n    { id: "1", message: "Connected", timestamp: "00:01.02", type: "success" }\n  ]}\n/>`,
      react: `import { StreamView } from '@sola-air-ui/ui';\n\nexport function EventLog() {\n  return (\n    <StreamView\n      title="Runtime Event Log"\n      events={[\n        { id: "1", message: "Connected", timestamp: "00:01.02", type: "success" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { StreamView } from '@sola-air-ui/ui';\n</script>\n\n<StreamView config={{\n  title: "Runtime Event Log",\n  events: [{ id: "1", message: "Connected", timestamp: "00:01.02", type: "success" }]\n}} />`,
      html: `<sola-stream-view title="Runtime Event Log"></sola-stream-view>`
    }
  },

  // ───────────────────────────────────────────
  // 10. DiffAudit (existing component)
  // ───────────────────────────────────────────
  {
    id: 'diff-audit',
    name: 'Diff & Change Audit',
    category: 'Status & HUD',
    description: 'Side-by-side or inline diff viewer with risk scoring, approval workflows, and line-level add/remove highlighting.',
    tagline: 'Configuration diffs, change reviews, and audit trails',
    badge: 'Audit',
    componentName: 'DiffAudit',
    defaultConfig: {
      title: 'Configuration Change Review',
      entityId: 'CFG-2847',
      entityType: 'Firewall Policy',
      riskLevel: 'Moderate',
      riskScore: 45,
      requester: 'Platform Engineering',
      window: 'Maintenance Window B (02:00–04:00 UTC)',
      diffLines: [
        { type: 'context', content: 'rule: allow_ingress_443' },
        { type: 'remove', content: 'source_range: 10.0.0.0/8' },
        { type: 'add', content: 'source_range: 172.16.0.0/12' },
        { type: 'context', content: 'protocol: TCP' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Change Review', description: 'Audit card title' },
      { name: 'entityId', type: 'string', defaultValue: 'CFG-001', description: 'Change request identifier' },
      { name: 'riskLevel', type: 'string', defaultValue: 'Moderate', description: 'Risk severity level', options: ['Low', 'Moderate', 'High', 'Destructive'] },
      { name: 'riskScore', type: 'number', defaultValue: 45, description: 'Numerical risk score (0–100)' }
    ],
    codeSnippets: {
      sola: `<DiffAudit\n  title="Config Change Review"\n  entityId="CFG-2847"\n  riskLevel="Moderate"\n  riskScore={45}\n/>`,
      react: `import { DiffAudit } from '@sola-air-ui/ui';\n\nexport function ChangeReview() {\n  return (\n    <DiffAudit\n      title="Config Change Review"\n      entityId="CFG-2847"\n      riskLevel="Moderate"\n      riskScore={45}\n    />\n  );\n}`,
      svelte: `<script>\n  import { DiffAudit } from '@sola-air-ui/ui';\n</script>\n\n<DiffAudit config={{\n  title: "Config Change Review",\n  entityId: "CFG-2847",\n  riskLevel: "Moderate",\n  riskScore: 45\n}} />`,
      html: `<sola-diff-audit\n  title="Config Change Review"\n  entity-id="CFG-2847"\n  risk-level="Moderate"\n></sola-diff-audit>`
    }
  },

  // ───────────────────────────────────────────
  // 11. SchemaInspector (existing component)
  // ───────────────────────────────────────────
  {
    id: 'schema-inspector',
    name: 'Schema & Table Inspector',
    category: 'Matrices & Graphs',
    description: 'Database table schema viewer displaying columns, types, primary keys, foreign key relationships, and table statistics.',
    tagline: 'Database schemas, API contracts, and type introspection',
    badge: 'Introspection',
    componentName: 'SchemaInspector',
    defaultConfig: {
      table: 'users',
      rowCount: '2.4M',
      sizeBytes: '1.8 GB',
      bloatPct: 3.2,
      columns: [
        { name: 'id', type: 'UUID', isPrimary: true, isNullable: false },
        { name: 'email', type: 'VARCHAR(255)', isNullable: false },
        { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false },
        { name: 'org_id', type: 'UUID', isNullable: true, foreignKey: 'organizations.id' }
      ]
    },
    props: [
      { name: 'table', type: 'string', defaultValue: 'users', description: 'Table or entity name' },
      { name: 'rowCount', type: 'string', defaultValue: '2.4M', description: 'Formatted row count' },
      { name: 'sizeBytes', type: 'string', defaultValue: '1.8 GB', description: 'Table size on disk' },
      { name: 'columns', type: 'Array<Column>', defaultValue: [], description: 'Column definitions array' }
    ],
    codeSnippets: {
      sola: `<SchemaInspector\n  table="users"\n  rowCount="2.4M"\n  sizeBytes="1.8 GB"\n  columns={[\n    { name: "id", type: "UUID", isPrimary: true }\n  ]}\n/>`,
      react: `import { SchemaInspector } from '@sola-air-ui/ui';\n\nexport function TableView() {\n  return (\n    <SchemaInspector\n      table="users"\n      rowCount="2.4M"\n      columns={[\n        { name: "id", type: "UUID", isPrimary: true }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { SchemaInspector } from '@sola-air-ui/ui';\n</script>\n\n<SchemaInspector config={{\n  table: "users",\n  rowCount: "2.4M",\n  columns: [{ name: "id", type: "UUID", isPrimary: true }]\n}} />`,
      html: `<sola-schema-inspector table="users" row-count="2.4M"></sola-schema-inspector>`
    }
  },

  // ───────────────────────────────────────────
  // 12. SentinelCapsule (existing component)
  // ───────────────────────────────────────────
  {
    id: 'sentinel-capsule',
    name: 'System Health Capsule',
    category: 'Status & HUD',
    description: 'Compact always-on health indicator capsule with flow index, friction count, circuit breaker state, and expandable alert drawer.',
    tagline: 'Health beacons, system vitals, and circuit breaker HUDs',
    badge: 'Sentinel',
    componentName: 'SentinelCapsule',
    defaultConfig: {
      flowIndex: 99.8,
      frictionCount: 0,
      isCircuitBreakerActive: false
    },
    props: [
      { name: 'flowIndex', type: 'number', defaultValue: 99.8, description: 'System flow health percentage (0–100)' },
      { name: 'frictionCount', type: 'number', defaultValue: 0, description: 'Active friction or error count' },
      { name: 'isCircuitBreakerActive', type: 'boolean', defaultValue: false, description: 'Whether circuit breaker is tripped' }
    ],
    codeSnippets: {
      sola: `<SentinelCapsule\n  flowIndex={99.8}\n  frictionCount={0}\n  isCircuitBreakerActive={false}\n/>`,
      react: `import { SentinelCapsule } from '@sola-air-ui/ui';\n\nexport function HealthBeacon() {\n  return (\n    <SentinelCapsule\n      flowIndex={99.8}\n      frictionCount={0}\n      isCircuitBreakerActive={false}\n    />\n  );\n}`,
      svelte: `<script>\n  import { SentinelCapsule } from '@sola-air-ui/ui';\n</script>\n\n<SentinelCapsule\n  flowIndex={99.8}\n  frictionCount={0}\n  isCircuitBreakerActive={false}\n/>`,
      html: `<sola-sentinel-capsule\n  flow-index="99.8"\n  friction-count="0"\n></sola-sentinel-capsule>`
    }
  },

  // ───────────────────────────────────────────
  // 13. Sparkline Tile (NEW)
  // ───────────────────────────────────────────
  {
    id: 'sparkline-tile',
    name: 'Sparkline Metric Tile',
    category: 'Metrics & KPIs',
    description: 'Compact metric tile with inline SVG sparkline trend chart, current value, and percentage delta badge.',
    tagline: 'Mini trend charts, inline sparklines, and micro time-series',
    badge: 'New',
    componentName: 'SparklineTile',
    defaultConfig: {
      title: 'Active Sessions',
      value: '12,847',
      trend: '+8.3%',
      trendDirection: 'up',
      sparkData: [22, 28, 35, 31, 42, 38, 52, 48, 61, 55, 64, 72]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Metric', description: 'Tile label' },
      { name: 'value', type: 'string', defaultValue: '12,847', description: 'Primary display value' },
      { name: 'trend', type: 'string', defaultValue: '+8.3%', description: 'Trend percentage' },
      { name: 'trendDirection', type: 'string', defaultValue: 'up', description: 'Trend direction', options: ['up', 'down', 'flat'] },
      { name: 'sparkData', type: 'number[]', defaultValue: [22, 28, 35, 31, 42], description: 'Array of numeric data points for sparkline' }
    ],
    codeSnippets: {
      sola: `<SparklineTile\n  title="Active Sessions"\n  value="12,847"\n  trend="+8.3%"\n  trendDirection="up"\n  sparkData={[22, 28, 35, 31, 42, 38, 52]}\n/>`,
      react: `import { SparklineTile } from '@sola-air-ui/ui';\n\nexport function SessionMetric() {\n  return (\n    <SparklineTile\n      title="Active Sessions"\n      value="12,847"\n      trend="+8.3%"\n      sparkData={[22, 28, 35, 31, 42, 38, 52]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { SparklineTile } from '@sola-air-ui/ui';\n</script>\n\n<SparklineTile config={{\n  title: "Active Sessions",\n  value: "12,847",\n  trend: "+8.3%",\n  sparkData: [22, 28, 35, 31, 42, 38, 52]\n}} />`,
      html: `<sola-sparkline-tile\n  title="Active Sessions"\n  value="12,847"\n  trend="+8.3%"\n></sola-sparkline-tile>`
    }
  },

  // ───────────────────────────────────────────
  // 14. Comparison Card (NEW)
  // ───────────────────────────────────────────
  {
    id: 'comparison-card',
    name: 'Side-by-Side Comparison',
    category: 'Metrics & KPIs',
    description: 'Dual-column metric comparison card showing before/after, plan vs actual, or A/B test results with delta highlighting.',
    tagline: 'A/B comparisons, plan vs actual, and before/after deltas',
    badge: 'New',
    componentName: 'ComparisonCard',
    defaultConfig: {
      title: 'Plan vs Actual',
      labelA: 'Target',
      labelB: 'Actual',
      valueA: '$240,000',
      valueB: '$318,400',
      delta: '+32.7%',
      deltaType: 'positive'
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Comparison', description: 'Card heading' },
      { name: 'labelA', type: 'string', defaultValue: 'Target', description: 'Left column label' },
      { name: 'labelB', type: 'string', defaultValue: 'Actual', description: 'Right column label' },
      { name: 'valueA', type: 'string', defaultValue: '$240,000', description: 'Left column value' },
      { name: 'valueB', type: 'string', defaultValue: '$318,400', description: 'Right column value' },
      { name: 'delta', type: 'string', defaultValue: '+32.7%', description: 'Delta between values' },
      { name: 'deltaType', type: 'string', defaultValue: 'positive', description: 'Delta coloring', options: ['positive', 'negative', 'neutral'] }
    ],
    codeSnippets: {
      sola: `<ComparisonCard\n  title="Plan vs Actual"\n  labelA="Target" valueA="$240,000"\n  labelB="Actual" valueB="$318,400"\n  delta="+32.7%" deltaType="positive"\n/>`,
      react: `import { ComparisonCard } from '@sola-air-ui/ui';\n\nexport function PlanActual() {\n  return (\n    <ComparisonCard\n      title="Plan vs Actual"\n      labelA="Target" valueA="$240,000"\n      labelB="Actual" valueB="$318,400"\n      delta="+32.7%"\n    />\n  );\n}`,
      svelte: `<script>\n  import { ComparisonCard } from '@sola-air-ui/ui';\n</script>\n\n<ComparisonCard config={{\n  title: "Plan vs Actual",\n  labelA: "Target", valueA: "$240,000",\n  labelB: "Actual", valueB: "$318,400",\n  delta: "+32.7%"\n}} />`,
      html: `<sola-comparison-card\n  title="Plan vs Actual"\n  label-a="Target" value-a="$240,000"\n  label-b="Actual" value-b="$318,400"\n></sola-comparison-card>`
    }
  },

  // ───────────────────────────────────────────
  // 15. Progress Steps (NEW)
  // ───────────────────────────────────────────
  {
    id: 'progress-steps',
    name: 'Multi-Step Progress Bar',
    category: 'Status & HUD',
    description: 'Horizontal multi-step progress indicator with labeled stages, completion states, and active step highlighting.',
    tagline: 'Wizards, onboarding flows, and pipeline stage tracking',
    badge: 'New',
    componentName: 'ProgressSteps',
    defaultConfig: {
      title: 'Deployment Pipeline',
      steps: [
        { label: 'Build', status: 'completed' },
        { label: 'Test', status: 'completed' },
        { label: 'Staging', status: 'active' },
        { label: 'Production', status: 'pending' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Pipeline', description: 'Progress bar heading' },
      { name: 'steps', type: 'Array<Step>', defaultValue: [], description: 'Array of steps with label and status (completed/active/pending)' }
    ],
    codeSnippets: {
      sola: `<ProgressSteps\n  title="Deployment Pipeline"\n  steps={[\n    { label: "Build", status: "completed" },\n    { label: "Test", status: "active" },\n    { label: "Deploy", status: "pending" }\n  ]}\n/>`,
      react: `import { ProgressSteps } from '@sola-air-ui/ui';\n\nexport function Pipeline() {\n  return (\n    <ProgressSteps\n      title="Deployment Pipeline"\n      steps={[\n        { label: "Build", status: "completed" },\n        { label: "Test", status: "active" },\n        { label: "Deploy", status: "pending" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { ProgressSteps } from '@sola-air-ui/ui';\n</script>\n\n<ProgressSteps config={{\n  title: "Deployment Pipeline",\n  steps: [\n    { label: "Build", status: "completed" },\n    { label: "Test", status: "active" }\n  ]\n}} />`,
      html: `<sola-progress-steps title="Deployment Pipeline"></sola-progress-steps>`
    }
  },

  // ───────────────────────────────────────────
  // 16. Counter Ticker (NEW)
  // ───────────────────────────────────────────
  {
    id: 'counter-ticker',
    name: 'Animated Counter Ticker',
    category: 'Metrics & KPIs',
    description: 'Spring-animated numerical counter with easing transitions, configurable formatting (currency, percent, integer), and suffix labels.',
    tagline: 'Animated counters, live tickers, and real-time numerics',
    badge: 'New',
    componentName: 'CounterTicker',
    defaultConfig: {
      title: 'Total Revenue',
      value: 1284930,
      prefix: '$',
      suffix: '',
      format: 'currency',
      animationDuration: 1200
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Counter', description: 'Counter label' },
      { name: 'value', type: 'number', defaultValue: 1284930, description: 'Target numeric value to animate to' },
      { name: 'prefix', type: 'string', defaultValue: '$', description: 'Prefix character (e.g. $, €)' },
      { name: 'suffix', type: 'string', defaultValue: '', description: 'Suffix string (e.g. users, ms)' },
      { name: 'format', type: 'string', defaultValue: 'currency', description: 'Number format', options: ['currency', 'percent', 'integer', 'decimal'] }
    ],
    codeSnippets: {
      sola: `<CounterTicker\n  title="Total Revenue"\n  value={1284930}\n  prefix="$"\n  format="currency"\n/>`,
      react: `import { CounterTicker } from '@sola-air-ui/ui';\n\nexport function RevenueTicker() {\n  return (\n    <CounterTicker\n      title="Total Revenue"\n      value={1284930}\n      prefix="$"\n      format="currency"\n    />\n  );\n}`,
      svelte: `<script>\n  import { CounterTicker } from '@sola-air-ui/ui';\n</script>\n\n<CounterTicker config={{\n  title: "Total Revenue",\n  value: 1284930,\n  prefix: "$",\n  format: "currency"\n}} />`,
      html: `<sola-counter-ticker\n  title="Total Revenue"\n  value="1284930"\n  prefix="$"\n></sola-counter-ticker>`
    }
  },

  // ───────────────────────────────────────────
  // 17. Toggle Switch (NEW)
  // ───────────────────────────────────────────
  {
    id: 'toggle-switch',
    name: 'Labeled Toggle Switch',
    category: 'Controllers & Sliders',
    description: 'Accessible on/off toggle with configurable labels, smooth spring transitions, and optional description text.',
    tagline: 'Feature flags, preferences, and boolean state controls',
    badge: 'New',
    componentName: 'ToggleSwitch',
    defaultConfig: {
      label: 'Enable Dark Mode',
      description: 'Switch between light and dark interface themes',
      checked: true,
      size: 'default'
    },
    props: [
      { name: 'label', type: 'string', defaultValue: 'Enable Feature', description: 'Toggle label text' },
      { name: 'description', type: 'string', defaultValue: '', description: 'Optional description below the label' },
      { name: 'checked', type: 'boolean', defaultValue: false, description: 'Toggle state' },
      { name: 'size', type: 'string', defaultValue: 'default', description: 'Toggle size variant', options: ['sm', 'default', 'lg'] }
    ],
    codeSnippets: {
      sola: `<ToggleSwitch\n  label="Enable Dark Mode"\n  description="Switch between themes"\n  checked={true}\n/>`,
      react: `import { ToggleSwitch } from '@sola-air-ui/ui';\nimport { useState } from 'react';\n\nexport function ThemeToggle() {\n  const [on, setOn] = useState(true);\n  return (\n    <ToggleSwitch\n      label="Enable Dark Mode"\n      checked={on}\n      onChange={setOn}\n    />\n  );\n}`,
      svelte: `<script>\n  import { ToggleSwitch } from '@sola-air-ui/ui';\n  let darkMode = $state(true);\n</script>\n\n<ToggleSwitch\n  label="Enable Dark Mode"\n  bind:checked={darkMode}\n/>`,
      html: `<sola-toggle-switch\n  label="Enable Dark Mode"\n  checked\n></sola-toggle-switch>`
    }
  },

  // ───────────────────────────────────────────
  // 18. Range Slider (NEW)
  // ───────────────────────────────────────────
  {
    id: 'range-slider',
    name: 'Dual-Thumb Range Slider',
    category: 'Controllers & Sliders',
    description: 'Range input with two thumbs for min and max, live value labels and a configurable step.',
    tagline: 'Price ranges, date spans, and bounded numeric filters',
    badge: 'New',
    componentName: 'RangeSlider',
    defaultConfig: {
      title: 'Price Range Filter',
      min: 0,
      max: 1000,
      valueLow: 150,
      valueHigh: 750,
      step: 10,
      prefix: '$',
      color: 'emerald'
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Range', description: 'Slider label' },
      { name: 'min', type: 'number', defaultValue: 0, description: 'Minimum bound' },
      { name: 'max', type: 'number', defaultValue: 1000, description: 'Maximum bound' },
      { name: 'valueLow', type: 'number', defaultValue: 150, description: 'Lower thumb value' },
      { name: 'valueHigh', type: 'number', defaultValue: 750, description: 'Upper thumb value' },
      { name: 'step', type: 'number', defaultValue: 10, description: 'Step increment' },
      { name: 'prefix', type: 'string', defaultValue: '$', description: 'Value prefix' }
    ],
    codeSnippets: {
      sola: `<RangeSlider\n  title="Price Range"\n  min={0} max={1000}\n  valueLow={150} valueHigh={750}\n  step={10} prefix="$"\n/>`,
      react: `import { RangeSlider } from '@sola-air-ui/ui';\n\nexport function PriceFilter() {\n  return (\n    <RangeSlider\n      title="Price Range"\n      min={0} max={1000}\n      valueLow={150} valueHigh={750}\n      onChange={([lo, hi]) => console.log(lo, hi)}\n    />\n  );\n}`,
      svelte: `<script>\n  import { RangeSlider } from '@sola-air-ui/ui';\n  let lo = $state(150);\n  let hi = $state(750);\n</script>\n\n<RangeSlider\n  title="Price Range"\n  min={0} max={1000}\n  bind:valueLow={lo}\n  bind:valueHigh={hi}\n/>`,
      html: `<sola-range-slider\n  title="Price Range"\n  min="0" max="1000"\n  value-low="150" value-high="750"\n></sola-range-slider>`
    }
  },

  // ───────────────────────────────────────────
  // 19. Timeline Log (NEW)
  // ───────────────────────────────────────────
  {
    id: 'timeline-log',
    name: 'Vertical Timeline',
    category: 'Lists & Feeds',
    description: 'Chronological vertical timeline with event nodes, timestamps, descriptions, and status-colored connectors.',
    tagline: 'Activity history, changelog, and chronological milestones',
    badge: 'New',
    componentName: 'TimelineLog',
    defaultConfig: {
      title: 'Activity History',
      entries: [
        { time: '2 min ago', label: 'Deployment completed', description: 'v2.4.1 deployed to production', status: 'success' },
        { time: '18 min ago', label: 'Tests passed', description: 'All 342 test suites green', status: 'success' },
        { time: '45 min ago', label: 'Build started', description: 'Triggered by merge to main', status: 'info' },
        { time: '1 hr ago', label: 'PR approved', description: 'Reviewed by 2 maintainers', status: 'info' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Timeline', description: 'Timeline header' },
      { name: 'entries', type: 'Array<Entry>', defaultValue: [], description: 'Array of timeline entries with time, label, description, and status' }
    ],
    codeSnippets: {
      sola: `<TimelineLog\n  title="Activity History"\n  entries={[\n    { time: "2 min ago", label: "Deployed", status: "success" },\n    { time: "18 min ago", label: "Tests passed", status: "success" }\n  ]}\n/>`,
      react: `import { TimelineLog } from '@sola-air-ui/ui';\n\nexport function ActivityFeed() {\n  return (\n    <TimelineLog\n      title="Activity History"\n      entries={[\n        { time: "2 min ago", label: "Deployed", status: "success" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { TimelineLog } from '@sola-air-ui/ui';\n</script>\n\n<TimelineLog config={{\n  title: "Activity History",\n  entries: [{ time: "2 min ago", label: "Deployed", status: "success" }]\n}} />`,
      html: `<sola-timeline-log title="Activity History"></sola-timeline-log>`
    }
  },

  // ───────────────────────────────────────────
  // 20. Key-Value Grid (NEW)
  // ───────────────────────────────────────────
  {
    id: 'key-value-grid',
    name: 'Key-Value Property Grid',
    category: 'Lists & Feeds',
    description: 'Clean two-column property grid for displaying key-value metadata pairs with optional copy buttons and type badges.',
    tagline: 'Metadata viewers, config panels, and property inspectors',
    badge: 'New',
    componentName: 'KeyValueGrid',
    defaultConfig: {
      title: 'Instance Metadata',
      pairs: [
        { key: 'Instance ID', value: 'i-0a1b2c3d4e5f67890' },
        { key: 'Region', value: 'us-east-1' },
        { key: 'Type', value: 'r6g.2xlarge' },
        { key: 'State', value: 'Running', badge: 'success' },
        { key: 'Launch Time', value: '2026-08-29T08:12:00Z' },
        { key: 'Private IP', value: '10.0.4.217' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Properties', description: 'Grid heading' },
      { name: 'pairs', type: 'Array<Pair>', defaultValue: [], description: 'Array of key-value pairs with optional badge' }
    ],
    codeSnippets: {
      sola: `<KeyValueGrid\n  title="Instance Metadata"\n  pairs={[\n    { key: "Instance ID", value: "i-0a1b2c3d4e5f67890" },\n    { key: "State", value: "Running", badge: "success" }\n  ]}\n/>`,
      react: `import { KeyValueGrid } from '@sola-air-ui/ui';\n\nexport function InstanceDetails() {\n  return (\n    <KeyValueGrid\n      title="Instance Metadata"\n      pairs={[\n        { key: "Instance ID", value: "i-0a1b2c3d" },\n        { key: "State", value: "Running", badge: "success" }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { KeyValueGrid } from '@sola-air-ui/ui';\n</script>\n\n<KeyValueGrid config={{\n  title: "Instance Metadata",\n  pairs: [\n    { key: "Instance ID", value: "i-0a1b2c3d" },\n    { key: "State", value: "Running", badge: "success" }\n  ]\n}} />`,
      html: `<sola-key-value-grid title="Instance Metadata"></sola-key-value-grid>`
    }
  },

  // ───────────────────────────────────────────
  // 21. Alert Banner (NEW)
  // ───────────────────────────────────────────
  {
    id: 'alert-banner',
    name: 'Dismissible Alert Banner',
    category: 'Status & HUD',
    description: 'Full-width alert banner with severity variants (info, success, warning, error), icon, message, action button, and dismiss control.',
    tagline: 'System notices, maintenance banners, and inline alerts',
    badge: 'New',
    componentName: 'AlertBanner',
    defaultConfig: {
      title: 'Scheduled Maintenance',
      message: 'A maintenance window is planned for Sunday 02:00–04:00 UTC. Services may be briefly unavailable.',
      severity: 'warning',
      actionLabel: 'View Details',
      dismissible: true
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Notice', description: 'Alert headline' },
      { name: 'message', type: 'string', defaultValue: 'Something happened.', description: 'Alert body text' },
      { name: 'severity', type: 'string', defaultValue: 'info', description: 'Alert severity level', options: ['info', 'success', 'warning', 'error'] },
      { name: 'actionLabel', type: 'string', defaultValue: '', description: 'Optional action button text' },
      { name: 'dismissible', type: 'boolean', defaultValue: true, description: 'Whether the banner can be dismissed' }
    ],
    codeSnippets: {
      sola: `<AlertBanner\n  title="Scheduled Maintenance"\n  message="Services may be briefly unavailable."\n  severity="warning"\n  dismissible={true}\n/>`,
      react: `import { AlertBanner } from '@sola-air-ui/ui';\n\nexport function MaintenanceNotice() {\n  return (\n    <AlertBanner\n      title="Scheduled Maintenance"\n      message="Services may be briefly unavailable."\n      severity="warning"\n      dismissible\n    />\n  );\n}`,
      svelte: `<script>\n  import { AlertBanner } from '@sola-air-ui/ui';\n</script>\n\n<AlertBanner\n  title="Scheduled Maintenance"\n  message="Services may be briefly unavailable."\n  severity="warning"\n  dismissible={true}\n/>`,
      html: `<sola-alert-banner\n  title="Scheduled Maintenance"\n  message="Services may be briefly unavailable."\n  severity="warning"\n  dismissible\n></sola-alert-banner>`
    }
  },

  // ───────────────────────────────────────────
  // 22. Funnel Chart (NEW)
  // ───────────────────────────────────────────
  {
    id: 'funnel-chart',
    name: 'Conversion Funnel',
    category: 'Flows & Cascades',
    description: 'Tapered funnel visualization showing progressive stage-to-stage conversion rates, drop-off percentages, and absolute counts.',
    tagline: 'Sales funnels, signup flows, and conversion rate analysis',
    badge: 'New',
    componentName: 'FunnelChart',
    defaultConfig: {
      title: 'Signup Conversion Funnel',
      stages: [
        { label: 'Page Views', value: 48200, color: 'sky' },
        { label: 'Sign Up Started', value: 12400, color: 'emerald' },
        { label: 'Email Verified', value: 8100, color: 'amber' },
        { label: 'Onboarding Done', value: 4800, color: 'violet' },
        { label: 'First Purchase', value: 2100, color: 'rose' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Funnel', description: 'Chart title' },
      { name: 'stages', type: 'Array<Stage>', defaultValue: [], description: 'Funnel stages with label, value, and optional color' }
    ],
    codeSnippets: {
      sola: `<FunnelChart\n  title="Signup Funnel"\n  stages={[\n    { label: "Page Views", value: 48200 },\n    { label: "Sign Up", value: 12400 },\n    { label: "First Purchase", value: 2100 }\n  ]}\n/>`,
      react: `import { FunnelChart } from '@sola-air-ui/ui';\n\nexport function SignupFunnel() {\n  return (\n    <FunnelChart\n      title="Signup Funnel"\n      stages={[\n        { label: "Page Views", value: 48200 },\n        { label: "Sign Up", value: 12400 },\n        { label: "Purchase", value: 2100 }\n      ]}\n    />\n  );\n}`,
      svelte: `<script>\n  import { FunnelChart } from '@sola-air-ui/ui';\n</script>\n\n<FunnelChart config={{\n  title: "Signup Funnel",\n  stages: [\n    { label: "Page Views", value: 48200 },\n    { label: "Sign Up", value: 12400 }\n  ]\n}} />`,
      html: `<sola-funnel-chart title="Signup Funnel"></sola-funnel-chart>`
    }
  },

  // ───────────────────────────────────────────
  // 23. Toast Stack (NEW)
  // ───────────────────────────────────────────
  {
    id: 'toast-stack',
    name: 'Toast Notification Stack',
    category: 'Status & HUD',
    description: 'Auto-dismissing stacked notification toasts with severity icons, progress countdown bars, and configurable duration and position.',
    tagline: 'Transient feedback, success confirmations, and error alerts',
    badge: 'New',
    componentName: 'ToastStack',
    defaultConfig: {
      position: 'bottom-right',
      toasts: [
        { id: 1, title: 'Changes saved', message: 'Your configuration has been applied.', severity: 'success', duration: 4000 },
        { id: 2, title: 'New deployment', message: 'v2.4.1 is rolling out to production.', severity: 'info', duration: 5000 }
      ]
    },
    props: [
      { name: 'position', type: 'string', defaultValue: 'bottom-right', description: 'Screen anchor position', options: ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'] },
      { name: 'toasts', type: 'Array<Toast>', defaultValue: [], description: 'Array of toast objects with title, message, severity, and duration' },
      { name: 'maxVisible', type: 'number', defaultValue: 5, description: 'Maximum toasts visible at once before stacking' },
      { name: 'defaultDuration', type: 'number', defaultValue: 4000, description: 'Auto-dismiss duration in milliseconds (0 = persistent)' }
    ],
    codeSnippets: {
      sola: `<ToastStack position="bottom-right" />\n\n// Dispatch from anywhere:\ntoast.success("Changes saved");\ntoast.error("Deploy failed", { duration: 8000 });\ntoast.info("New version available");`,
      react: `import { ToastProvider, useToast } from '@sola-air-ui/ui';\n\nexport function App() {\n  return (\n    <ToastProvider position="bottom-right">\n      <Dashboard />\n    </ToastProvider>\n  );\n}\n\nfunction Dashboard() {\n  const toast = useToast();\n  return (\n    <button onClick={() => toast.success("Saved!")}>\n      Save\n    </button>\n  );\n}`,
      svelte: `<script>\n  import { ToastStack, toast } from '@sola-air-ui/ui';\n</script>\n\n<button onclick={() => toast.success("Changes saved")}>\n  Save\n</button>\n\n<ToastStack position="bottom-right" />`,
      html: `<sola-toast-stack position="bottom-right"></sola-toast-stack>\n\n<script>\n  document.querySelector('sola-toast-stack')\n    .dispatch({ title: "Saved!", severity: "success" });\n</script>`
    }
  },

  // ───────────────────────────────────────────
  // 24. Inline Callout (NEW)
  // ───────────────────────────────────────────
  {
    id: 'inline-callout',
    name: 'Inline Callout Block',
    category: 'Status & HUD',
    description: 'Contextual inline callout with left accent border, severity icon, rich text body, and optional action link — similar to GitHub-style alerts.',
    tagline: 'Tips, warnings, notes, and contextual inline notices',
    badge: 'New',
    componentName: 'InlineCallout',
    defaultConfig: {
      variant: 'info',
      title: 'Breaking Change',
      message: 'The `config` prop now accepts a typed schema object instead of a plain record. See the migration guide for details.',
      actionLabel: 'View Migration Guide',
      actionHref: '/docs#migration',
      dismissible: false
    },
    props: [
      { name: 'variant', type: 'string', defaultValue: 'info', description: 'Callout visual style', options: ['note', 'tip', 'info', 'warning', 'caution', 'success'] },
      { name: 'title', type: 'string', defaultValue: '', description: 'Optional bold heading' },
      { name: 'message', type: 'string', defaultValue: 'Callout message.', description: 'Body text content' },
      { name: 'actionLabel', type: 'string', defaultValue: '', description: 'Optional inline action link text' },
      { name: 'actionHref', type: 'string', defaultValue: '', description: 'Action link URL' },
      { name: 'dismissible', type: 'boolean', defaultValue: false, description: 'Whether the callout can be dismissed' }
    ],
    codeSnippets: {
      sola: `<InlineCallout\n  variant="warning"\n  title="Breaking Change"\n  message="The config prop schema has changed."\n  actionLabel="Migration Guide"\n  actionHref="/docs#migration"\n/>`,
      react: `import { InlineCallout } from '@sola-air-ui/ui';\n\nexport function DeprecationNotice() {\n  return (\n    <InlineCallout\n      variant="warning"\n      title="Breaking Change"\n      message="The config prop schema has changed."\n      actionLabel="Migration Guide"\n      actionHref="/docs#migration"\n    />\n  );\n}`,
      svelte: `<script>\n  import { InlineCallout } from '@sola-air-ui/ui';\n</script>\n\n<InlineCallout\n  variant="warning"\n  title="Breaking Change"\n  message="The config prop schema has changed."\n  actionLabel="Migration Guide"\n  actionHref="/docs#migration"\n/>`,
      html: `<sola-inline-callout\n  variant="warning"\n  title="Breaking Change"\n  message="The config prop schema has changed."\n></sola-inline-callout>`
    }
  },

  // ───────────────────────────────────────────
  // 25. Notification Badge (NEW)
  // ───────────────────────────────────────────
  {
    id: 'notification-badge',
    name: 'Counter Badge & Status Dot',
    category: 'Status & HUD',
    description: 'Compact notification counter badge or pulsing status dot that overlays any element — with configurable threshold, color, and animation.',
    tagline: 'Unread counts, status indicators, and attention dots',
    badge: 'New',
    componentName: 'NotificationBadge',
    defaultConfig: {
      count: 12,
      maxCount: 99,
      color: 'rose',
      showZero: false,
      pulse: true,
      variant: 'counter'
    },
    props: [
      { name: 'count', type: 'number', defaultValue: 12, description: 'Notification count to display' },
      { name: 'maxCount', type: 'number', defaultValue: 99, description: 'Threshold before showing "99+"' },
      { name: 'color', type: 'string', defaultValue: 'rose', description: 'Badge accent color', options: ['rose', 'emerald', 'amber', 'sky', 'violet'] },
      { name: 'showZero', type: 'boolean', defaultValue: false, description: 'Whether to show badge when count is 0' },
      { name: 'pulse', type: 'boolean', defaultValue: false, description: 'Enable pulse animation for attention' },
      { name: 'variant', type: 'string', defaultValue: 'counter', description: 'Badge variant', options: ['counter', 'dot', 'ping'] }
    ],
    codeSnippets: {
      sola: `<NotificationBadge count={12} color="rose">\n  <IconButton icon="bell" />\n</NotificationBadge>\n\n<!-- Status dot variant -->\n<NotificationBadge variant="dot" color="emerald" pulse />\n\n<!-- Overflow threshold -->\n<NotificationBadge count={142} maxCount={99} />`,
      react: `import { NotificationBadge } from '@sola-air-ui/ui';\n\nexport function NavBell() {\n  return (\n    <NotificationBadge count={12} color="rose">\n      <button aria-label="Notifications">\n        <BellIcon />\n      </button>\n    </NotificationBadge>\n  );\n}`,
      svelte: `<script>\n  import { NotificationBadge } from '@sola-air-ui/ui';\n  let unread = $state(12);\n</script>\n\n<NotificationBadge count={unread} color="rose">\n  <button aria-label="Notifications">\n    <!-- bell icon -->\n  </button>\n</NotificationBadge>`,
      html: `<sola-notification-badge count="12" color="rose">\n  <button>Notifications</button>\n</sola-notification-badge>`
    }
  },

  // ───────────────────────────────────────────
  // 26. Snackbar (NEW)
  // ───────────────────────────────────────────
  {
    id: 'snackbar',
    name: 'Action Snackbar',
    category: 'Status & HUD',
    description: 'Bottom-anchored snackbar with message text, optional undo/action button, auto-dismiss timer, and swipe-to-dismiss gesture support.',
    tagline: 'Undo confirmations, quick actions, and bottom-sheet notices',
    badge: 'New',
    componentName: 'Snackbar',
    defaultConfig: {
      message: '3 items moved to archive.',
      actionLabel: 'Undo',
      duration: 6000,
      position: 'bottom-center',
      icon: 'archive'
    },
    props: [
      { name: 'message', type: 'string', defaultValue: 'Action completed.', description: 'Snackbar body text' },
      { name: 'actionLabel', type: 'string', defaultValue: '', description: 'Optional action button text (e.g. "Undo")' },
      { name: 'duration', type: 'number', defaultValue: 6000, description: 'Auto-dismiss in ms (0 = persistent)' },
      { name: 'position', type: 'string', defaultValue: 'bottom-center', description: 'Anchor position', options: ['bottom-center', 'bottom-left', 'bottom-right'] },
      { name: 'icon', type: 'string', defaultValue: '', description: 'Optional leading icon identifier' }
    ],
    codeSnippets: {
      sola: `<Snackbar\n  message="3 items moved to archive."\n  actionLabel="Undo"\n  duration={6000}\n  onAction={() => undoArchive()}\n/>`,
      react: `import { useSnackbar } from '@sola-air-ui/ui';\n\nexport function ArchiveButton() {\n  const snackbar = useSnackbar();\n\n  const handleArchive = () => {\n    archiveItems(selected);\n    snackbar.show({\n      message: "3 items archived.",\n      actionLabel: "Undo",\n      onAction: () => undoArchive()\n    });\n  };\n\n  return <button onClick={handleArchive}>Archive</button>;\n}`,
      svelte: `<script>\n  import { Snackbar, snackbar } from '@sola-air-ui/ui';\n\n  function handleArchive() {\n    archiveItems(selected);\n    snackbar.show({\n      message: "3 items archived.",\n      actionLabel: "Undo",\n      onAction: () => undoArchive()\n    });\n  }\n</script>\n\n<button onclick={handleArchive}>Archive</button>\n<Snackbar />`,
      html: `<sola-snackbar\n  message="3 items moved to archive."\n  action-label="Undo"\n  duration="6000"\n></sola-snackbar>`
    }
  },

  // ───────────────────────────────────────────
  // 27. Notification Center (NEW)
  // ───────────────────────────────────────────
  {
    id: 'notification-center',
    name: 'Notification Center Dropdown',
    category: 'Status & HUD',
    description: 'Dropdown panel listing recent notifications grouped by time, with read/unread states, action links, mark-all-read, and scroll pagination.',
    tagline: 'Inbox feeds, notification history, and message centers',
    badge: 'New',
    componentName: 'NotificationCenter',
    defaultConfig: {
      title: 'Notifications',
      unreadCount: 4,
      notifications: [
        { id: '1', title: 'Deployment succeeded', message: 'v2.4.1 is live on production.', time: '2 min ago', read: false, severity: 'success' },
        { id: '2', title: 'PR review requested', message: 'Alex requested your review on #847.', time: '15 min ago', read: false, severity: 'info' },
        { id: '3', title: 'Memory alert resolved', message: 'us-east-1a memory usage back to 62%.', time: '1 hr ago', read: true, severity: 'warning' },
        { id: '4', title: 'Weekly report ready', message: 'Your performance summary is available.', time: '3 hrs ago', read: true, severity: 'info' }
      ]
    },
    props: [
      { name: 'title', type: 'string', defaultValue: 'Notifications', description: 'Panel heading' },
      { name: 'notifications', type: 'Array<Notification>', defaultValue: [], description: 'Array of notification items' },
      { name: 'unreadCount', type: 'number', defaultValue: 0, description: 'Count of unread notifications' },
      { name: 'maxVisible', type: 'number', defaultValue: 10, description: 'Items visible before scroll pagination' },
      { name: 'groupByTime', type: 'boolean', defaultValue: true, description: 'Group notifications by time period (Today, Earlier)' }
    ],
    codeSnippets: {
      sola: `<NotificationCenter\n  title="Notifications"\n  notifications={[\n    { title: "Deploy succeeded", time: "2m ago", severity: "success", read: false },\n    { title: "PR review", time: "15m ago", severity: "info", read: false }\n  ]}\n  onMarkAllRead={() => markAllRead()}\n/>`,
      react: `import { NotificationCenter } from '@sola-air-ui/ui';\n\nexport function NavNotifications() {\n  const [items, setItems] = useState(notifications);\n  return (\n    <NotificationCenter\n      notifications={items}\n      onMarkAllRead={() => setItems(\n        items.map(n => ({ ...n, read: true }))\n      )}\n      onItemClick={(id) => router.push(\`/detail/\${id}\`)}\n    />\n  );\n}`,
      svelte: `<script>\n  import { NotificationCenter } from '@sola-air-ui/ui';\n  let items = $state(notifications);\n</script>\n\n<NotificationCenter\n  notifications={items}\n  onMarkAllRead={() => {\n    items = items.map(n => ({ ...n, read: true }));\n  }}\n/>`,
      html: `<sola-notification-center\n  title="Notifications"\n></sola-notification-center>`
    }
  },

  // ═══════════════════════════════════════════
  // PHASE 1: FOUNDATIONAL PRIMITIVES
  // ═══════════════════════════════════════════

  // 28. Button
  {
    id: 'sola-button',
    name: 'Button & Icon Button',
    category: 'Buttons & Actions',
    description: 'Universal button with 5 variants (primary, secondary, ghost, destructive, outline), 4 sizes, loading spinner, and spring-press tactile scale.',
    tagline: 'Actions, submissions, and interactive controls',
    badge: 'Foundation',
    componentName: 'SolaButton',
    defaultConfig: {
      variant: 'primary',
      size: 'default',
      label: 'Save Changes',
      loading: false,
      disabled: false
    },
    props: [
      { name: 'variant', type: 'string', defaultValue: 'primary', description: 'Visual style', options: ['primary', 'secondary', 'ghost', 'destructive', 'outline'] },
      { name: 'size', type: 'string', defaultValue: 'default', description: 'Button size', options: ['sm', 'default', 'lg', 'icon'] },
      { name: 'label', type: 'string', defaultValue: 'Button', description: 'Button label text' },
      { name: 'loading', type: 'boolean', defaultValue: false, description: 'Show loading spinner' },
      { name: 'disabled', type: 'boolean', defaultValue: false, description: 'Disable interaction' }
    ],
    codeSnippets: {
      sola: `<SolaButton variant="primary" label="Save Changes" />\n<SolaButton variant="destructive" label="Delete" />\n<SolaButton variant="ghost" label="Cancel" />\n<SolaButton variant="primary" label="Saving..." loading={true} />`,
      react: `import { Button } from '@sola-air-ui/ui';\n\nexport function Actions() {\n  return (\n    <>\n      <Button variant="primary">Save Changes</Button>\n      <Button variant="destructive">Delete</Button>\n      <Button variant="ghost">Cancel</Button>\n      <Button loading>Saving...</Button>\n    </>\n  );\n}`,
      svelte: `<script>\n  import { SolaButton } from '@sola-air-ui/ui';\n</script>\n\n<SolaButton variant="primary" label="Save Changes" />\n<SolaButton variant="destructive" label="Delete" />\n<SolaButton variant="ghost" label="Cancel" />`,
      html: `<sola-button variant="primary">Save Changes</sola-button>\n<sola-button variant="destructive">Delete</sola-button>`
    }
  },

  // 29. Dialog
  {
    id: 'sola-dialog',
    name: 'Modal Dialog',
    category: 'Overlays & Dialogs',
    description: 'Focus-trapped modal overlay with backdrop blur, spring-scale entrance animation, Escape key dismissal, and accessible ARIA roles.',
    tagline: 'Confirmations, forms, and focused task workflows',
    badge: 'Foundation',
    componentName: 'SolaDialog',
    defaultConfig: {
      open: true,
      title: 'Confirm Action',
      description: 'Are you sure you want to proceed? This action cannot be undone.'
    },
    props: [
      { name: 'open', type: 'boolean', defaultValue: false, description: 'Whether the dialog is visible' },
      { name: 'title', type: 'string', defaultValue: 'Dialog', description: 'Dialog heading' },
      { name: 'description', type: 'string', defaultValue: '', description: 'Optional description text below heading' }
    ],
    codeSnippets: {
      sola: `<SolaDialog\n  open={showModal}\n  title="Confirm Action"\n  description="This action cannot be undone."\n  onclose={() => showModal = false}\n>\n  <SolaButton variant="destructive" label="Delete" />\n  <SolaButton variant="ghost" label="Cancel" />\n</SolaDialog>`,
      react: `import { Dialog } from '@sola-air-ui/ui';\n\nexport function ConfirmDelete() {\n  const [open, setOpen] = useState(false);\n  return (\n    <Dialog\n      open={open}\n      onClose={() => setOpen(false)}\n      title="Confirm Action"\n      description="This cannot be undone."\n    >\n      <Button variant="destructive">Delete</Button>\n      <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>\n    </Dialog>\n  );\n}`,
      svelte: `<script>\n  import { SolaDialog, SolaButton } from '@sola-air-ui/ui';\n  let open = $state(false);\n</script>\n\n<SolaButton label="Open" onclick={() => open = true} />\n<SolaDialog {open} title="Confirm" onclose={() => open = false}>\n  <SolaButton variant="destructive" label="Delete" />\n</SolaDialog>`,
      html: `<sola-dialog open title="Confirm Action">\n  <p>This action cannot be undone.</p>\n</sola-dialog>`
    }
  },

  // 30. Tabs
  {
    id: 'sola-tabs',
    name: 'Tabs & Segmented Control',
    category: 'Navigation',
    description: 'Horizontal tab navigation with 3 variants (underline, pill, segmented control), optional badge counts, and accessible ARIA tab roles.',
    tagline: 'View switching, section navigation, and content panels',
    badge: 'Foundation',
    componentName: 'SolaTabs',
    defaultConfig: {
      variant: 'underline',
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'analytics', label: 'Analytics', badge: '12' },
        { id: 'settings', label: 'Settings' }
      ],
      activeTab: 'overview'
    },
    props: [
      { name: 'variant', type: 'string', defaultValue: 'underline', description: 'Tab visual style', options: ['underline', 'pill', 'segment'] },
      { name: 'tabs', type: 'Array<Tab>', defaultValue: [], description: 'Array of tab objects with id, label, and optional badge' },
      { name: 'activeTab', type: 'string', defaultValue: '', description: 'ID of the currently active tab' }
    ],
    codeSnippets: {
      sola: `<SolaTabs\n  variant="segment"\n  tabs={[\n    { id: "overview", label: "Overview" },\n    { id: "analytics", label: "Analytics", badge: "12" },\n    { id: "settings", label: "Settings" }\n  ]}\n  activeTab="overview"\n  onchange={(id) => currentTab = id}\n/>`,
      react: `import { Tabs } from '@sola-air-ui/ui';\n\nexport function PageNav() {\n  const [tab, setTab] = useState("overview");\n  return (\n    <Tabs\n      variant="segment"\n      tabs={[\n        { id: "overview", label: "Overview" },\n        { id: "analytics", label: "Analytics", badge: "12" }\n      ]}\n      activeTab={tab}\n      onChange={setTab}\n    />\n  );\n}`,
      svelte: `<script>\n  import { SolaTabs } from '@sola-air-ui/ui';\n  let current = $state('overview');\n</script>\n\n<SolaTabs\n  variant="segment"\n  tabs={[{ id: "overview", label: "Overview" }, { id: "settings", label: "Settings" }]}\n  activeTab={current}\n  onchange={(id) => current = id}\n/>`,
      html: `<sola-tabs variant="segment">\n  <sola-tab id="overview" label="Overview" active />\n  <sola-tab id="settings" label="Settings" />\n</sola-tabs>`
    }
  },

  // 31. Tooltip
  {
    id: 'sola-tooltip',
    name: 'Tooltip',
    category: 'Overlays & Dialogs',
    description: 'Hover/focus floating text label with configurable position, delay, arrow indicator, and smooth fade-in animation.',
    tagline: 'Hover hints, icon labels, and contextual help',
    badge: 'Foundation',
    componentName: 'SolaTooltip',
    defaultConfig: {
      text: 'This is a tooltip',
      position: 'top',
      delay: 300
    },
    props: [
      { name: 'text', type: 'string', defaultValue: 'Tooltip', description: 'Tooltip text content' },
      { name: 'position', type: 'string', defaultValue: 'top', description: 'Anchor position', options: ['top', 'bottom', 'left', 'right'] },
      { name: 'delay', type: 'number', defaultValue: 300, description: 'Show delay in milliseconds' }
    ],
    codeSnippets: {
      sola: `<SolaTooltip text="Edit settings" position="top">\n  <SolaButton variant="icon" label="Settings">\n    <GearIcon />\n  </SolaButton>\n</SolaTooltip>`,
      react: `import { Tooltip, Button } from '@sola-air-ui/ui';\n\nexport function IconAction() {\n  return (\n    <Tooltip text="Edit settings" position="top">\n      <Button variant="icon">\n        <GearIcon />\n      </Button>\n    </Tooltip>\n  );\n}`,
      svelte: `<script>\n  import { SolaTooltip, SolaButton } from '@sola-air-ui/ui';\n</script>\n\n<SolaTooltip text="Edit settings" position="top">\n  <SolaButton variant="icon" label="Settings" />\n</SolaTooltip>`,
      html: `<sola-tooltip text="Edit settings" position="top">\n  <button>Settings</button>\n</sola-tooltip>`
    }
  },

  // 32. Avatar
  {
    id: 'sola-avatar',
    name: 'Avatar & Status Indicator',
    category: 'Data Display',
    description: 'User/entity avatar with image source, auto-colored initials fallback, 5 sizes, online/offline/busy status dot, and circle/rounded shape.',
    tagline: 'User identity, team members, and presence indicators',
    badge: 'Foundation',
    componentName: 'SolaAvatar',
    defaultConfig: {
      initials: 'JD',
      alt: 'John Doe',
      size: 'default',
      status: 'online',
      shape: 'circle'
    },
    props: [
      { name: 'src', type: 'string', defaultValue: '', description: 'Image URL' },
      { name: 'initials', type: 'string', defaultValue: 'JD', description: 'Fallback initials (max 2 chars)' },
      { name: 'size', type: 'string', defaultValue: 'default', description: 'Avatar size', options: ['xs', 'sm', 'default', 'lg', 'xl'] },
      { name: 'status', type: 'string', defaultValue: 'none', description: 'Status dot indicator', options: ['online', 'offline', 'busy', 'away', 'none'] },
      { name: 'shape', type: 'string', defaultValue: 'circle', description: 'Avatar shape', options: ['circle', 'rounded'] }
    ],
    codeSnippets: {
      sola: `<SolaAvatar\n  src="/avatars/jane.jpg"\n  alt="Jane Smith"\n  size="lg"\n  status="online"\n/>\n\n<!-- Initials fallback -->\n<SolaAvatar initials="JD" size="default" status="busy" />`,
      react: `import { Avatar } from '@sola-air-ui/ui';\n\nexport function UserProfile() {\n  return (\n    <Avatar\n      src="/avatars/jane.jpg"\n      alt="Jane Smith"\n      size="lg"\n      status="online"\n    />\n  );\n}`,
      svelte: `<script>\n  import { SolaAvatar } from '@sola-air-ui/ui';\n</script>\n\n<SolaAvatar\n  src="/avatars/jane.jpg"\n  alt="Jane Smith"\n  size="lg"\n  status="online"\n/>`,
      html: `<sola-avatar\n  src="/avatars/jane.jpg"\n  alt="Jane Smith"\n  size="lg"\n  status="online"\n></sola-avatar>`
    }
  },

  // 33. Skeleton Loader
  {
    id: 'sola-skeleton',
    name: 'Skeleton Loader',
    category: 'Data Display',
    description: 'Shimmer loading placeholder with 4 variants (line, circle, card, text block), configurable dimensions, repeat count, and pulse animation.',
    tagline: 'Loading states, async placeholders, and perceived performance',
    badge: 'Foundation',
    componentName: 'SolaSkeleton',
    defaultConfig: {
      variant: 'card',
      count: 1,
      animate: true
    },
    props: [
      { name: 'variant', type: 'string', defaultValue: 'line', description: 'Skeleton shape', options: ['line', 'circle', 'card', 'text'] },
      { name: 'width', type: 'string', defaultValue: 'full', description: 'Width fraction', options: ['full', '3/4', '1/2', '1/4'] },
      { name: 'height', type: 'string', defaultValue: 'default', description: 'Height size', options: ['xs', 'sm', 'default', 'lg', 'xl'] },
      { name: 'count', type: 'number', defaultValue: 1, description: 'Number of skeleton items to render' },
      { name: 'animate', type: 'boolean', defaultValue: true, description: 'Enable pulse animation' }
    ],
    codeSnippets: {
      sola: `<!-- Card skeleton -->\n<SolaSkeleton variant="card" />\n\n<!-- Text block skeleton -->\n<SolaSkeleton variant="text" count={3} />\n\n<!-- Circle + lines -->\n<div class="flex gap-3">\n  <SolaSkeleton variant="circle" />\n  <SolaSkeleton variant="line" width="3/4" count={2} />\n</div>`,
      react: `import { Skeleton } from '@sola-air-ui/ui';\n\nexport function LoadingCard() {\n  return (\n    <div>\n      <Skeleton variant="card" />\n      <Skeleton variant="text" count={3} />\n      <div className="flex gap-3">\n        <Skeleton variant="circle" />\n        <Skeleton variant="line" width="3/4" />\n      </div>\n    </div>\n  );\n}`,
      svelte: `<script>\n  import { SolaSkeleton } from '@sola-air-ui/ui';\n</script>\n\n<SolaSkeleton variant="card" />\n<SolaSkeleton variant="text" count={3} />`,
      html: `<sola-skeleton variant="card"></sola-skeleton>\n<sola-skeleton variant="text" count="3"></sola-skeleton>`
    }
  },

  // 34. Select / Combobox
  {
    id: 'sola-select',
    name: 'Select & Combobox',
    category: 'Forms & Inputs',
    description: 'Searchable dropdown select with keyboard navigation, clear button, emerald focus ring, and animated dropdown panel.',
    tagline: 'Single selection, search filtering, and option lists',
    badge: 'Foundation',
    componentName: 'SolaSelect',
    defaultConfig: {
      options: [
        { value: 'react', label: 'React' },
        { value: 'svelte', label: 'Svelte' },
        { value: 'vue', label: 'Vue' },
        { value: 'solid', label: 'SolidJS' },
        { value: 'angular', label: 'Angular' }
      ],
      value: 'svelte',
      placeholder: 'Select a framework...',
      searchable: true
    },
    props: [
      { name: 'options', type: 'Array<Option>', defaultValue: [], description: 'Array of {value, label} option objects' },
      { name: 'value', type: 'string', defaultValue: '', description: 'Currently selected value' },
      { name: 'placeholder', type: 'string', defaultValue: 'Select...', description: 'Placeholder text' },
      { name: 'searchable', type: 'boolean', defaultValue: true, description: 'Enable type-to-search filtering' }
    ],
    codeSnippets: {
      sola: `<SolaSelect\n  options={[{ value: "react", label: "React" }, { value: "svelte", label: "Svelte" }]}\n  value="svelte"\n  searchable\n  onchange={(v) => selected = v}\n/>`,
      react: `import { Select } from '@sola-air-ui/ui';\n\n<Select\n  options={frameworks}\n  value={selected}\n  onChange={setSelected}\n  searchable\n/>`,
      svelte: `<script>\n  import { SolaSelect } from '@sola-air-ui/ui';\n  let selected = $state('svelte');\n</script>\n\n<SolaSelect options={frameworks} value={selected} onchange={(v) => selected = v} />`,
      html: `<sola-select placeholder="Select..." searchable></sola-select>`
    }
  },

  // 35. Dropdown Menu
  {
    id: 'sola-dropdown',
    name: 'Dropdown Action Menu',
    category: 'Overlays & Dialogs',
    description: 'Click-triggered action menu with dividers, destructive variant, keyboard navigation, and click-outside close.',
    tagline: 'Row actions, context menus, and overflow menus',
    badge: 'Foundation',
    componentName: 'SolaDropdown',
    defaultConfig: {
      items: [
        { label: 'Edit' },
        { label: 'Duplicate' },
        { label: 'Move to...' },
        { divider: true },
        { label: 'Archive' },
        { label: 'Delete', variant: 'destructive' }
      ],
      position: 'bottom-left'
    },
    props: [
      { name: 'items', type: 'Array<MenuItem>', defaultValue: [], description: 'Menu items with label, action, divider, variant' },
      { name: 'position', type: 'string', defaultValue: 'bottom-left', description: 'Dropdown anchor position', options: ['bottom-left', 'bottom-right'] }
    ],
    codeSnippets: {
      sola: `<SolaDropdown items={[\n  { label: "Edit", action: () => edit() },\n  { label: "Delete", variant: "destructive", action: () => del() }\n]} />`,
      react: `import { Dropdown } from '@sola-air-ui/ui';\n\n<Dropdown items={[\n  { label: "Edit", action: edit },\n  { label: "Delete", variant: "destructive", action: del }\n]} />`,
      svelte: `<SolaDropdown items={menuItems} position="bottom-right" />`,
      html: `<sola-dropdown position="bottom-left"></sola-dropdown>`
    }
  },

  // 36. Accordion
  {
    id: 'sola-accordion',
    name: 'Accordion & Collapsible',
    category: 'Navigation',
    description: 'Expand/collapse content sections with 3 variants (default, bordered, separated), multi-expand support, chevron rotation, and smooth animation.',
    tagline: 'FAQs, settings groups, and collapsible panels',
    badge: 'Foundation',
    componentName: 'SolaAccordion',
    defaultConfig: {
      items: [
        { id: '1', title: 'What is Sola?', content: 'Sola is a zero-VDOM, signal-reactive design system with tactile physics and multi-framework code export.', defaultOpen: true },
        { id: '2', title: 'How does signal reactivity work?', content: 'Signals establish direct reactive graph bindings to exact DOM nodes. Updates trigger O(1) mutations bypassing virtual DOM diffing entirely.' },
        { id: '3', title: 'Which frameworks are supported?', content: 'Sola exports to React 19, Svelte 5, Vue 3, SolidJS, and native Web Components from a single component definition.' }
      ],
      variant: 'separated',
      multiple: true
    },
    props: [
      { name: 'items', type: 'Array<AccordionItem>', defaultValue: [], description: 'Items with id, title, content, defaultOpen' },
      { name: 'variant', type: 'string', defaultValue: 'default', description: 'Visual style', options: ['default', 'bordered', 'separated'] },
      { name: 'multiple', type: 'boolean', defaultValue: false, description: 'Allow multiple sections open simultaneously' }
    ],
    codeSnippets: {
      sola: `<SolaAccordion\n  variant="separated"\n  multiple\n  items={[\n    { id: "1", title: "Section 1", content: "Content here", defaultOpen: true },\n    { id: "2", title: "Section 2", content: "More content" }\n  ]}\n/>`,
      react: `import { Accordion } from '@sola-air-ui/ui';\n\n<Accordion variant="separated" multiple items={sections} />`,
      svelte: `<SolaAccordion variant="bordered" items={faqItems} multiple />`,
      html: `<sola-accordion variant="separated" multiple></sola-accordion>`
    }
  },

  // 37. Checkbox
  {
    id: 'sola-checkbox',
    name: 'Checkbox',
    category: 'Forms & Inputs',
    description: 'Custom styled checkbox with emerald checked state, indeterminate dash mode, SVG check animation, and accessible label.',
    tagline: 'Multi-select, filters, and boolean toggles',
    badge: 'Foundation',
    componentName: 'SolaCheckbox',
    defaultConfig: { checked: true, label: 'Accept terms and conditions', indeterminate: false, disabled: false },
    props: [
      { name: 'checked', type: 'boolean', defaultValue: false, description: 'Checked state' },
      { name: 'indeterminate', type: 'boolean', defaultValue: false, description: 'Show indeterminate dash' },
      { name: 'label', type: 'string', defaultValue: '', description: 'Label text' },
      { name: 'disabled', type: 'boolean', defaultValue: false, description: 'Disable interaction' }
    ],
    codeSnippets: {
      sola: `<SolaCheckbox checked={agreed} label="I agree to the terms" onchange={(v) => agreed = v} />`,
      react: `<Checkbox checked={agreed} onChange={setAgreed} label="I agree" />`,
      svelte: `<SolaCheckbox bind:checked={agreed} label="I agree to the terms" />`,
      html: `<sola-checkbox label="I agree to the terms"></sola-checkbox>`
    }
  },

  // 38. Radio Group
  {
    id: 'sola-radio-group',
    name: 'Radio Group',
    category: 'Forms & Inputs',
    description: 'Exclusive option selection with default and card variants, emerald selected state, scale-in dot animation, and optional descriptions.',
    tagline: 'Single selection, plan pickers, and option groups',
    badge: 'Foundation',
    componentName: 'SolaRadioGroup',
    defaultConfig: {
      options: [
        { value: 'free', label: 'Free', description: 'Basic features for personal use' },
        { value: 'pro', label: 'Pro', description: 'Advanced features for teams' },
        { value: 'enterprise', label: 'Enterprise', description: 'Custom solutions for large orgs' }
      ],
      value: 'pro',
      variant: 'card'
    },
    props: [
      { name: 'options', type: 'Array<RadioOption>', defaultValue: [], description: 'Options with value, label, description' },
      { name: 'value', type: 'string', defaultValue: '', description: 'Currently selected value' },
      { name: 'variant', type: 'string', defaultValue: 'default', description: 'Visual style', options: ['default', 'card'] }
    ],
    codeSnippets: {
      sola: `<SolaRadioGroup\n  variant="card"\n  options={plans}\n  value={selected}\n  onchange={(v) => selected = v}\n/>`,
      react: `<RadioGroup variant="card" options={plans} value={plan} onChange={setPlan} />`,
      svelte: `<SolaRadioGroup variant="card" options={plans} value={selected} onchange={(v) => selected = v} />`,
      html: `<sola-radio-group variant="card"></sola-radio-group>`
    }
  },

  // 39. Text Input
  {
    id: 'sola-input',
    name: 'Text Input',
    category: 'Forms & Inputs',
    description: 'Text input with floating label, emerald focus ring, error/hint states, clear button, and multiple input types.',
    tagline: 'Text fields, emails, passwords, and number inputs',
    badge: 'Foundation',
    componentName: 'SolaInput',
    defaultConfig: { value: '', label: 'Email Address', placeholder: 'you@example.com', type: 'email', error: '', hint: 'We will never share your email.' },
    props: [
      { name: 'value', type: 'string', defaultValue: '', description: 'Input value' },
      { name: 'label', type: 'string', defaultValue: '', description: 'Floating label text' },
      { name: 'type', type: 'string', defaultValue: 'text', description: 'Input type', options: ['text', 'email', 'password', 'number', 'url'] },
      { name: 'error', type: 'string', defaultValue: '', description: 'Error message (shows rose border)' },
      { name: 'hint', type: 'string', defaultValue: '', description: 'Help text below input' }
    ],
    codeSnippets: {
      sola: `<SolaInput label="Email" type="email" placeholder="you@example.com" hint="We won't share your email." />`,
      react: `<Input label="Email" type="email" value={email} onChange={setEmail} error={errors.email} />`,
      svelte: `<SolaInput label="Email" type="email" value={email} oninput={(v) => email = v} />`,
      html: `<sola-input label="Email" type="email" placeholder="you@example.com"></sola-input>`
    }
  },

  // 40. Textarea
  {
    id: 'sola-textarea',
    name: 'Textarea',
    category: 'Forms & Inputs',
    description: 'Multi-line text input with character counter, auto-resize, error state, and configurable resize behavior.',
    tagline: 'Comments, descriptions, notes, and long-form text',
    badge: 'Foundation',
    componentName: 'SolaTextarea',
    defaultConfig: { value: '', label: 'Description', placeholder: 'Enter a description...', rows: 4, maxLength: 500 },
    props: [
      { name: 'value', type: 'string', defaultValue: '', description: 'Textarea value' },
      { name: 'label', type: 'string', defaultValue: '', description: 'Label text' },
      { name: 'rows', type: 'number', defaultValue: 4, description: 'Visible row count' },
      { name: 'maxLength', type: 'number', defaultValue: 0, description: 'Character limit (0 = unlimited)' },
      { name: 'resize', type: 'string', defaultValue: 'vertical', description: 'Resize behavior', options: ['none', 'vertical', 'both'] }
    ],
    codeSnippets: {
      sola: `<SolaTextarea label="Description" maxLength={500} placeholder="Enter details..." />`,
      react: `<Textarea label="Description" maxLength={500} value={desc} onChange={setDesc} />`,
      svelte: `<SolaTextarea label="Description" maxLength={500} value={desc} oninput={(v) => desc = v} />`,
      html: `<sola-textarea label="Description" max-length="500"></sola-textarea>`
    }
  },

  // 41. Data Table
  {
    id: 'sola-data-table',
    name: 'Data Table',
    category: 'Data Display',
    description: 'Sortable, filterable data table with column sorting, row selection checkboxes, striped rows, search bar, and responsive horizontal scroll.',
    tagline: 'Lists, records, CRUD interfaces, and tabular data',
    badge: 'Foundation',
    componentName: 'SolaDataTable',
    defaultConfig: {
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'role', label: 'Role', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'email', label: 'Email' }
      ],
      rows: [
        { name: 'Alice Chen', role: 'Engineer', status: 'Active', email: 'alice@sola.dev' },
        { name: 'Bob Park', role: 'Designer', status: 'Active', email: 'bob@sola.dev' },
        { name: 'Carol Wu', role: 'PM', status: 'Away', email: 'carol@sola.dev' },
        { name: 'Dan Kim', role: 'Engineer', status: 'Offline', email: 'dan@sola.dev' }
      ],
      selectable: true,
      striped: true
    },
    props: [
      { name: 'columns', type: 'Array<Column>', defaultValue: [], description: 'Column definitions with key, label, sortable, width, align' },
      { name: 'rows', type: 'Array<Object>', defaultValue: [], description: 'Row data array' },
      { name: 'selectable', type: 'boolean', defaultValue: false, description: 'Enable row selection checkboxes' },
      { name: 'striped', type: 'boolean', defaultValue: false, description: 'Alternate row striping' },
      { name: 'compact', type: 'boolean', defaultValue: false, description: 'Reduce row height' }
    ],
    codeSnippets: {
      sola: `<SolaDataTable\n  columns={columns}\n  rows={data}\n  selectable\n  striped\n/>`,
      react: `<DataTable columns={columns} rows={data} selectable striped onRowClick={handleClick} />`,
      svelte: `<SolaDataTable columns={columns} rows={data} selectable striped />`,
      html: `<sola-data-table selectable striped></sola-data-table>`
    }
  },

  // 42. Pagination
  {
    id: 'sola-pagination',
    name: 'Pagination',
    category: 'Navigation',
    description: 'Page-by-page navigation with previous/next arrows, page number buttons, ellipsis truncation, and active state indicator.',
    tagline: 'Paginated lists, search results, and data navigation',
    badge: 'Foundation',
    componentName: 'SolaPagination',
    defaultConfig: { currentPage: 3, totalPages: 12, siblingCount: 1 },
    props: [
      { name: 'currentPage', type: 'number', defaultValue: 1, description: 'Active page number' },
      { name: 'totalPages', type: 'number', defaultValue: 10, description: 'Total page count' },
      { name: 'siblingCount', type: 'number', defaultValue: 1, description: 'Pages shown around current page' }
    ],
    codeSnippets: {
      sola: `<SolaPagination currentPage={page} totalPages={20} onPageChange={(p) => page = p} />`,
      react: `<Pagination current={page} total={20} onChange={setPage} />`,
      svelte: `<SolaPagination currentPage={page} totalPages={20} onPageChange={(p) => page = p} />`,
      html: `<sola-pagination current-page="3" total-pages="12"></sola-pagination>`
    }
  },

  // 43. Empty State
  {
    id: 'sola-empty-state',
    name: 'Empty State',
    category: 'Data Display',
    description: 'Zero-data placeholder with centered SVG icon, title, description text, and optional action button for first-run or empty search results.',
    tagline: 'No results, first-run experience, and zero-data fallbacks',
    badge: 'Foundation',
    componentName: 'SolaEmptyState',
    defaultConfig: { title: 'No results found', description: 'Try adjusting your search or filter criteria.', icon: 'search', actionLabel: 'Clear Filters' },
    props: [
      { name: 'title', type: 'string', defaultValue: 'No data', description: 'Heading text' },
      { name: 'description', type: 'string', defaultValue: '', description: 'Body text' },
      { name: 'icon', type: 'string', defaultValue: 'inbox', description: 'Icon type', options: ['search', 'inbox', 'folder', 'chart', 'users'] },
      { name: 'actionLabel', type: 'string', defaultValue: '', description: 'Optional action button text' }
    ],
    codeSnippets: {
      sola: `<SolaEmptyState\n  icon="search"\n  title="No results found"\n  description="Try different search terms."\n  actionLabel="Clear Filters"\n  onaction={() => clearFilters()}\n/>`,
      react: `<EmptyState icon="inbox" title="No messages" description="You're all caught up!" />`,
      svelte: `<SolaEmptyState icon="search" title="No results" actionLabel="Reset" onaction={reset} />`,
      html: `<sola-empty-state icon="search" title="No results found"></sola-empty-state>`
    }
  },

  // 44. Popover
  {
    id: 'sola-popover',
    name: 'Popover',
    category: 'Overlays & Dialogs',
    description: 'Click-triggered floating panel with arrow indicator, click-outside close, Escape key dismiss, and scale+fade animation.',
    tagline: 'Inline forms, rich tooltips, and floating content panels',
    badge: 'Foundation',
    componentName: 'SolaPopover',
    defaultConfig: { position: 'bottom', align: 'center' },
    props: [
      { name: 'position', type: 'string', defaultValue: 'bottom', description: 'Panel position', options: ['top', 'bottom', 'left', 'right'] },
      { name: 'align', type: 'string', defaultValue: 'center', description: 'Panel alignment', options: ['start', 'center', 'end'] }
    ],
    codeSnippets: {
      sola: `<SolaPopover position="bottom" align="start">\n  {#snippet trigger()}<SolaButton label="Filter" />{/snippet}\n  <div class="p-4">Popover content here</div>\n</SolaPopover>`,
      react: `<Popover position="bottom" trigger={<Button>Filter</Button>}>\n  <div className="p-4">Content</div>\n</Popover>`,
      svelte: `<SolaPopover position="bottom">\n  {#snippet trigger()}<button>Open</button>{/snippet}\n  <p>Popover content</p>\n</SolaPopover>`,
      html: `<sola-popover position="bottom"></sola-popover>`
    }
  },

  // ═══════════════════════════════════════════
  // PHASE 2: HIGH-VALUE COMPONENTS
  // ═══════════════════════════════════════════

  // 45. Drawer / Sheet
  {
    id: 'sola-drawer',
    name: 'Drawer & Sheet',
    category: 'Overlays & Dialogs',
    description: 'Slide-in panel from screen edge (left, right, bottom) with backdrop overlay, close button, Escape key dismiss, and configurable width.',
    tagline: 'Side panels, mobile nav, detail views, and filter sheets',
    badge: 'Foundation',
    componentName: 'SolaDrawer',
    defaultConfig: { open: true, position: 'right', title: 'Detail View', width: '400px' },
    props: [
      { name: 'open', type: 'boolean', defaultValue: false, description: 'Whether the drawer is visible' },
      { name: 'position', type: 'string', defaultValue: 'right', description: 'Slide-in direction', options: ['left', 'right', 'bottom'] },
      { name: 'title', type: 'string', defaultValue: '', description: 'Drawer heading' },
      { name: 'width', type: 'string', defaultValue: '400px', description: 'Drawer width (or height for bottom)' }
    ],
    codeSnippets: {
      sola: `<SolaDrawer open={showPanel} position="right" title="Details" onclose={() => showPanel = false}>\n  <p>Panel content here</p>\n</SolaDrawer>`,
      react: `<Drawer open={open} position="right" title="Details" onClose={() => setOpen(false)}>\n  <p>Content</p>\n</Drawer>`,
      svelte: `<SolaDrawer open={show} position="right" title="Details" onclose={() => show = false}>\n  Content\n</SolaDrawer>`,
      html: `<sola-drawer open position="right" title="Details"></sola-drawer>`
    }
  },

  // 46. Breadcrumb
  {
    id: 'sola-breadcrumb',
    name: 'Breadcrumb',
    category: 'Navigation',
    description: 'Hierarchical path navigation with chevron separators, current page indicator, and automatic truncation for deep paths.',
    tagline: 'Page hierarchy, file paths, and navigation trails',
    badge: 'Foundation',
    componentName: 'SolaBreadcrumb',
    defaultConfig: {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Components', href: '/components' },
        { label: 'Navigation', href: '/components?cat=navigation' },
        { label: 'Breadcrumb' }
      ]
    },
    props: [
      { name: 'items', type: 'Array<BreadcrumbItem>', defaultValue: [], description: 'Path items with label and optional href/onclick' }
    ],
    codeSnippets: {
      sola: `<SolaBreadcrumb items={[\n  { label: "Home", href: "/" },\n  { label: "Settings", href: "/settings" },\n  { label: "Profile" }\n]} />`,
      react: `<Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />`,
      svelte: `<SolaBreadcrumb items={breadcrumbs} />`,
      html: `<sola-breadcrumb></sola-breadcrumb>`
    }
  },

  // 47. Command Palette
  {
    id: 'sola-command-palette',
    name: 'Command Palette',
    category: 'Navigation',
    description: 'Cmd+K search overlay with grouped commands, keyboard navigation, shortcut badges, match highlighting, and spring-scale entrance.',
    tagline: 'Quick search, keyboard shortcuts, and power-user navigation',
    badge: 'Foundation',
    componentName: 'SolaCommandPalette',
    defaultConfig: {
      open: true,
      placeholder: 'Search commands...',
      commands: [
        { id: '1', label: 'Go to Dashboard', shortcut: 'G D', group: 'Navigation' },
        { id: '2', label: 'Go to Settings', shortcut: 'G S', group: 'Navigation' },
        { id: '3', label: 'Create New Project', shortcut: 'C P', group: 'Actions' },
        { id: '4', label: 'Toggle Dark Mode', shortcut: 'T D', group: 'Actions' },
        { id: '5', label: 'Search Components', shortcut: '/', group: 'Search' }
      ]
    },
    props: [
      { name: 'open', type: 'boolean', defaultValue: false, description: 'Whether the palette is visible' },
      { name: 'commands', type: 'Array<Command>', defaultValue: [], description: 'Command items with id, label, shortcut, group, action' },
      { name: 'placeholder', type: 'string', defaultValue: 'Type a command...', description: 'Search input placeholder' }
    ],
    codeSnippets: {
      sola: `<SolaCommandPalette\n  open={showPalette}\n  commands={commands}\n  onselect={(cmd) => cmd.action?.()}\n  onclose={() => showPalette = false}\n/>`,
      react: `<CommandPalette open={open} commands={cmds} onSelect={exec} onClose={() => setOpen(false)} />`,
      svelte: `<SolaCommandPalette open={show} commands={cmds} onclose={() => show = false} />`,
      html: `<sola-command-palette></sola-command-palette>`
    }
  },

  // 48. Code Block
  {
    id: 'sola-code-block',
    name: 'Code Block',
    category: 'Data Display',
    description: 'Syntax-highlighted code display with line numbers, copy-to-clipboard, language badge, keyword tokenization, and horizontal scroll.',
    tagline: 'Code snippets, API payloads, and developer documentation',
    badge: 'Foundation',
    componentName: 'SolaCodeBlock',
    defaultConfig: {
      language: 'typescript',
      title: 'signal.ts',
      showLineNumbers: true,
      copyable: true,
      code: 'import { signal } from "@sola-air-ui/core";\n\nconst count = signal(0);\nconst doubled = derived(() => count.value * 2);\n\n// Direct DOM binding — zero VDOM overhead\ncount.subscribe((value) => {\n  element.textContent = String(value);\n});'
    },
    props: [
      { name: 'code', type: 'string', defaultValue: '', description: 'Code string to display' },
      { name: 'language', type: 'string', defaultValue: 'javascript', description: 'Language identifier for syntax badge' },
      { name: 'title', type: 'string', defaultValue: '', description: 'Optional file name or title' },
      { name: 'showLineNumbers', type: 'boolean', defaultValue: true, description: 'Show line number gutter' },
      { name: 'copyable', type: 'boolean', defaultValue: true, description: 'Show copy-to-clipboard button' }
    ],
    codeSnippets: {
      sola: `<SolaCodeBlock\n  language="typescript"\n  title="signal.ts"\n  showLineNumbers\n  copyable\n  code={codeString}\n/>`,
      react: `<CodeBlock language="typescript" title="app.ts" code={src} showLineNumbers copyable />`,
      svelte: `<SolaCodeBlock language="typescript" code={src} showLineNumbers />`,
      html: `<sola-code-block language="typescript" show-line-numbers></sola-code-block>`
    }
  },

  // 49. Date & Date-Range Picker
  {
    id: 'sola-date-picker',
    name: 'Date & Range Picker',
    category: 'Forms & Inputs',
    description: 'Calendar date and date-range picker with month navigation, quick preset chips (Today, Last 7d, Last 30d), and emerald highlight selection.',
    tagline: 'Single date picking, date ranges, and range presets',
    badge: 'Foundation',
    componentName: 'SolaDatePicker',
    defaultConfig: { range: true, label: 'Select Range', rangeValue: { start: '2026-08-01', end: '2026-08-30' } },
    props: [
      { name: 'value', type: 'string', defaultValue: '', description: 'Single selected date (YYYY-MM-DD)' },
      { name: 'range', type: 'boolean', defaultValue: false, description: 'Enable start/end date range picking' },
      { name: 'label', type: 'string', defaultValue: 'Select Date', description: 'Label text above input' }
    ],
    codeSnippets: {
      sola: `<SolaDatePicker range rangeValue={{ start: "2026-08-01", end: "2026-08-30" }} onchange={handleRange} />`,
      react: `<DatePicker range value={range} onChange={setRange} />`,
      svelte: `<SolaDatePicker range bind:rangeValue={range} />`,
      html: `<sola-date-picker range></sola-date-picker>`
    }
  },

  // 50. Sidebar Shell & Navigation Rail
  {
    id: 'sola-sidebar',
    name: 'Sidebar Shell & Nav Rail',
    category: 'Navigation',
    description: 'Collapsible application sidebar shell and icon navigation rail with active route states, badge counters, and profile footer.',
    tagline: 'App layout scaffold, multi-tier navigation, and collapsible rail',
    badge: 'Layout',
    componentName: 'SolaSidebar',
    defaultConfig: { collapsed: false, activeId: 'dashboard' },
    props: [
      { name: 'collapsed', type: 'boolean', defaultValue: false, description: 'Collapse sidebar to narrow icon rail' },
      { name: 'activeId', type: 'string', defaultValue: 'dashboard', description: 'Active item identifier' }
    ],
    codeSnippets: {
      sola: `<SolaSidebar collapsed={isCollapsed} activeId="dashboard" onselect={(item) => navigate(item.href)} />`,
      react: `<Sidebar collapsed={collapsed} activeId="dashboard" onSelect={handleNav} />`,
      svelte: `<SolaSidebar bind:collapsed activeId="dashboard" />`,
      html: `<sola-sidebar active-id="dashboard"></sola-sidebar>`
    }
  },

  // 51. Signal Area / Bar / Line Chart
  {
    id: 'sola-chart',
    name: 'Signal Telemetry Chart',
    category: 'Metrics & KPIs',
    description: 'Zero-VDOM pure SVG Area, Line, and Bar charts with interactive hover crosshairs, smooth gradient fills, and direct signal tick handling.',
    tagline: 'Telemetry, performance metrics and financial charts',
    badge: 'Zero-VDOM',
    componentName: 'SolaChart',
    defaultConfig: {
      type: 'area',
      title: 'Signal Telemetry',
      subtitle: 'Real-time throughput metrics',
      color: 'emerald',
      height: 180,
      showGrid: true,
      showPoints: true
    },
    props: [
      { name: 'type', type: 'string', defaultValue: 'area', description: 'Chart visualization type', options: ['area', 'line', 'bar'] },
      { name: 'title', type: 'string', defaultValue: 'Chart', description: 'Heading label' },
      { name: 'color', type: 'string', defaultValue: 'emerald', description: 'Color theme', options: ['emerald', 'sky', 'indigo', 'amber', 'rose'] },
      { name: 'height', type: 'number', defaultValue: 200, description: 'Chart viewport height in pixels' }
    ],
    codeSnippets: {
      sola: `<SolaChart type="area" color="emerald" data={metricsStream} height={200} />`,
      react: `<Chart type="area" color="emerald" data={stream} height={200} />`,
      svelte: `<SolaChart type="area" color="emerald" data={stream} />`,
      html: `<sola-chart type="area" color="emerald"></sola-chart>`
    }
  },

  // 52. Resizable Multi-Pane Splitter
  {
    id: 'sola-splitter',
    name: 'Resizable Pane Splitter',
    category: 'Data Display',
    description: 'Multi-pane tiling layout with tactile draggable divider, horizontal/vertical split orientation, and percentage bounds.',
    tagline: 'IDE tiling, NOC dashboards, and multi-view layouts',
    badge: 'Layout',
    componentName: 'SolaSplitter',
    defaultConfig: { direction: 'horizontal', initialSplit: 50 },
    props: [
      { name: 'direction', type: 'string', defaultValue: 'horizontal', description: 'Split direction', options: ['horizontal', 'vertical'] },
      { name: 'initialSplit', type: 'number', defaultValue: 50, description: 'Starting percentage for first pane' }
    ],
    codeSnippets: {
      sola: `<SolaSplitter direction="horizontal" initialSplit={50} />`,
      react: `<Splitter direction="horizontal" initialSplit={50} />`,
      svelte: `<SolaSplitter direction="horizontal" initialSplit={50} />`,
      html: `<sola-splitter direction="horizontal"></sola-splitter>`
    }
  },

  // 53. Context Menu
  {
    id: 'sola-context-menu',
    name: 'Right-Click Context Menu',
    category: 'Overlays & Dialogs',
    description: 'Custom desktop-grade right-click menu with keyboard shortcut indicators, group dividers, and destructive action styling.',
    tagline: 'Canvas actions, topology node menus, and context triggers',
    badge: 'Foundation',
    componentName: 'SolaContextMenu',
    defaultConfig: {},
    props: [
      { name: 'items', type: 'Array<ContextMenuItem>', defaultValue: [], description: 'Menu items with label, shortcut, action, variant' }
    ],
    codeSnippets: {
      sola: `<SolaContextMenu items={menuItems} />`,
      react: `<ContextMenu items={menuItems} />`,
      svelte: `<SolaContextMenu items={menuItems} />`,
      html: `<sola-context-menu></sola-context-menu>`
    }
  },

  // 54. File Upload Dropzone
  {
    id: 'sola-file-upload',
    name: 'File Upload Dropzone',
    category: 'Forms & Inputs',
    description: 'Drag-and-drop file upload zone with file type filter, size badges, progress indicators, and individual file removal.',
    tagline: 'File attachments, dataset imports, and schema upload',
    badge: 'Foundation',
    componentName: 'SolaFileUpload',
    defaultConfig: { accept: '.json, .csv, .ts, .svg', maxSizeMb: 10 },
    props: [
      { name: 'accept', type: 'string', defaultValue: '*', description: 'Accepted file extensions' },
      { name: 'maxSizeMb', type: 'number', defaultValue: 10, description: 'Maximum file size in megabytes' }
    ],
    codeSnippets: {
      sola: `<SolaFileUpload accept=".json, .csv" maxSizeMb={10} onupload={handleUpload} />`,
      react: `<FileUpload accept=".json,.csv" onUpload={handleUpload} />`,
      svelte: `<SolaFileUpload accept=".json, .csv" onupload={handleUpload} />`,
      html: `<sola-file-upload accept=".json, .csv"></sola-file-upload>`
    }
  },

  // 55. Keyboard Shortcut Badge
  {
    id: 'sola-kbd',
    name: 'Keyboard Shortcut (Kbd)',
    category: 'Data Display',
    description: 'Tactile keyboard key cap indicator with optical bottom shadow, border bevel, and multi-key chord combinations.',
    tagline: 'Command shortcuts, hotkeys, and keyboard cues',
    badge: 'Foundation',
    componentName: 'SolaKbd',
    defaultConfig: { keys: ['⌘', 'K'], size: 'md' },
    props: [
      { name: 'keys', type: 'Array<string>', defaultValue: ['⌘', 'K'], description: 'Key labels or symbols in the chord' },
      { name: 'size', type: 'string', defaultValue: 'md', description: 'Badge size', options: ['sm', 'md', 'lg'] }
    ],
    codeSnippets: {
      sola: `<SolaKbd keys={["⌘", "K"]} size="md" />`,
      react: `<Kbd keys={["⌘", "K"]} size="md" />`,
      svelte: `<SolaKbd keys={['⌘', 'K']} size="md" />`,
      html: `<sola-kbd keys='["⌘","K"]'></sola-kbd>`
    }
  },

  // 56. Hover Card Preview
  {
    id: 'sola-hover-card',
    name: 'Hover Card Preview',
    category: 'Overlays & Dialogs',
    description: 'Rich preview popover triggered on link or badge hover with grace period delay, avatar badge, and metadata cards.',
    tagline: 'User previews, link summaries, and telemetry inspectors',
    badge: 'Foundation',
    componentName: 'SolaHoverCard',
    defaultConfig: {
      title: 'Sola Architecture',
      description: 'Zero-VDOM, direct reactive graph bindings with no diffing between a signal write and the DOM.',
      handle: '@sola-engine',
      avatarText: 'SO'
    },
    props: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Card title' },
      { name: 'description', type: 'string', defaultValue: '', description: 'Card description' },
      { name: 'handle', type: 'string', defaultValue: '', description: 'Interactive trigger text' }
    ],
    codeSnippets: {
      sola: `<SolaHoverCard handle="@sola-engine" title="Sola Architecture" description="Zero-VDOM signals" />`,
      react: `<HoverCard handle="@sola-engine" title="Sola" description="Zero-VDOM" />`,
      svelte: `<SolaHoverCard handle="@sola-engine" title="Sola" />`,
      html: `<sola-hover-card handle="@sola-engine"></sola-hover-card>`
    }
  },

  // 57. SolaSafeHTML
  {
    id: 'sola-safe-html',
    name: 'Rich Text Renderer',
    category: 'Data Display',
    description: 'Renders external rich-text HTML (a CMS field, a KB article) as real inherited-typography DOM, with defensive stripping of scripts, event handlers, and javascript: URLs — no iframe, no nested scrollbar.',
    tagline: 'CMS fields, knowledge-base excerpts, and curated rich text',
    badge: 'Real DOM',
    componentName: 'SolaSafeHTML',
    defaultConfig: {
      content: '<p>Gifts and meals can be a common part of business relationships, but they can also create <strong>conflicts of interest</strong> or the appearance of impropriety.</p><p>The following policy is designed to ensure employees maintain the highest ethical standards when giving or receiving gifts and meals.</p>',
      maxHeight: '130px',
      title: 'Gift and Meals Policy'
    },
    props: [
      { name: 'content', type: 'string', defaultValue: '', description: 'Raw HTML to sanitize and render' },
      { name: 'maxHeight', type: 'string', defaultValue: '', description: 'Caps height and adds a bottom mask-fade when set (e.g. "130px")' },
      { name: 'title', type: 'string', defaultValue: 'Rich text content', description: 'Accessible region label' }
    ],
    codeSnippets: {
      sola: `<SolaSafeHTML\n  content={kbArticle.html}\n  maxHeight="130px"\n  title={kbArticle.title}\n/>`,
      react: `import { SolaSafeHTML } from '@sola-air-ui/ui';\n\nexport function KbExcerpt({ article }) {\n  return (\n    <SolaSafeHTML content={article.html} maxHeight="130px" title={article.title} />\n  );\n}`,
      svelte: `<script>\n  import { SolaSafeHTML } from '@sola-air-ui/ui';\n</script>\n\n<SolaSafeHTML config={{ content: article.html, maxHeight: "130px", title: article.title }} />`,
      html: `<sola-safe-html max-height="130px"></sola-safe-html>`
    }
  }
];

