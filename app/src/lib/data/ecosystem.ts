export interface SaasIntegration {
  id: string;
  name: string;
  category: 'Operations & Triage' | 'Cloud & DevOps' | 'Telemetry & Systems' | 'Databases & Relay' | 'FinOps & Billing' | 'AI & Intent' | 'CRM & Workflows' | 'Personal & Creator';
  badge: string;
  description: string;
  protocolUri: string;
  primaryComponent: string;
  sampleIntent: string;
  config: any;
}

export const SAAS_ECOSYSTEM: SaasIntegration[] = [
  // ── 1. Operations & Triage ──
  {
    id: 'ops-incidents',
    name: 'Enterprise Incident Command',
    category: 'Operations & Triage',
    badge: 'Operations',
    description: 'P1 Incident triage capsule with live SLA breach dial, blast radius, and 1-click playbooks.',
    protocolUri: 'ops://incidents/active?priority=1',
    primaryComponent: 'IncidentTriageMatrix',
    sampleIntent: 'Surface active P1 incidents breaching SLA in 30 minutes',
    config: {
      incidentId: 'INC009481',
      title: 'API Gateway High-Frequency Latency Spike (EU-West)',
      severity: 'P1 - Critical',
      slaRemainingMin: 11,
      blastRadius: '42,000 Active Checkout Sessions',
      playbooks: [
        { id: 'pb-1', title: 'Reroute Edge DNS to secondary region', action: 'DNS Failover', automated: true },
        { id: 'pb-2', title: 'Scale Redis Cluster Read Replicas (x4)', action: 'Auto-Provision', automated: true },
        { id: 'pb-3', title: 'Page Tier 3 Database SRE On-Call', action: 'On-Call Incident', automated: false }
      ]
    }
  },
  {
    id: 'enterprise-cab',
    name: 'Change Advisory Board (CAB) Review',
    category: 'Operations & Triage',
    badge: 'Governance',
    description: 'Cryptographic state change review with risk level score and 1-click ACL approvals.',
    protocolUri: 'ops://changes/scheduled',
    primaryComponent: 'DiffAudit',
    sampleIntent: 'Review pending CAB changes for tonight 02:00 UTC window',
    config: {
      title: 'Upgrade Production Redis Cluster Capacity (x10)',
      entityId: 'CHG009842',
      entityType: 'Enterprise CAB Release',
      riskLevel: 'Moderate',
      riskScore: 42,
      requester: 'Tier 3 Platform SRE',
      window: 'Tonight 02:00 – 04:00 UTC'
    }
  },
  {
    id: 'oncall-escalations',
    name: 'On-Call Escalation Bus',
    category: 'Operations & Triage',
    badge: 'On-Call',
    description: 'Live responder schedule, active pages, and automated escalation policy matrix.',
    protocolUri: 'oncall://roster/active',
    primaryComponent: 'ListBlock',
    sampleIntent: 'List all open escalations for SRE Platform team',
    config: {
      title: 'Live Incidents & On-Call Rotation',
      items: [
        { label: 'Egress Latency Threshold Exceeded', description: 'Triggered 4m ago • Primary: Alex Chen (Tier 3)', status: 'Active' },
        { label: 'Auth Token Cache Replication Delay', description: 'Triggered 18m ago • Acked by Security Ops', status: 'Active' },
        { label: 'Synthetics Heartbeat Fail', description: 'Auto-resolved after DNS route flip', status: 'Completed' }
      ]
    }
  },

  // ── 2. Cloud Infrastructure & DevOps ──
  {
    id: 'cloud-cluster-mesh',
    name: 'Multi-Region Database Cluster Mesh',
    category: 'Cloud & DevOps',
    badge: 'Cloud Infra',
    description: '12 primary and read-replica database shards across 6 global availability zones.',
    protocolUri: 'cloud://db/cluster-topology',
    primaryComponent: 'ClusterMatrix',
    sampleIntent: 'Display multi-region database cluster topology with replication lag',
    config: {
      regions: [
        { name: 'us-east-1 (Primary)', status: 'Optimal', lagMs: 0, tps: 14200 },
        { name: 'us-west-2 (Replica)', status: 'Optimal', lagMs: 4, tps: 8900 },
        { name: 'eu-central-1 (Replica)', status: 'Optimal', lagMs: 12, tps: 6400 }
      ]
    }
  },
  {
    id: 'serverless-edge',
    name: 'Global Edge Function Routing & Cache',
    category: 'Cloud & DevOps',
    badge: 'Edge CDN',
    description: 'Real-time p99 latency heatmaps across 285 edge Points of Presence (PoPs).',
    protocolUri: 'edge://routing/telemetry',
    primaryComponent: 'GaugeCard',
    sampleIntent: 'Show global edge CDN cache hit ratio and p99 response time',
    config: {
      title: 'Global Edge Cache Hit Ratio',
      value: '98.4%',
      percentage: 98,
      subtext: 'p99 Ingress Latency: 4.8ms worldwide',
      color: 'emerald'
    }
  },

  // ── 3. Telemetry & Systems ──
  {
    id: 'telemetry-stream',
    name: 'Real-Time Telemetry & Log Stream',
    category: 'Telemetry & Systems',
    badge: 'Telemetry',
    description: 'Direct signal telemetry log with live microsecond event dispatching.',
    protocolUri: 'telemetry://stream/live',
    primaryComponent: 'StreamView',
    sampleIntent: 'Stream live error logs and trace anomalies in real-time',
    config: {
      title: 'Live Telemetry & Signal Stream',
      rate: '14.8k events/sec'
    }
  },
  {
    id: 'cluster-throttle',
    name: 'Worker Node Capacity & Auto-Scale',
    category: 'Telemetry & Systems',
    badge: 'Capacity',
    description: 'Interactive rotary throttle dial to dynamically auto-scale container nodes.',
    protocolUri: 'capacity://autoscale/nodes',
    primaryComponent: 'TactileDialCard',
    sampleIntent: 'Set cluster auto-scaler to 16 worker nodes',
    config: {
      title: 'Worker Node Auto-Scaler',
      value: 12,
      min: 1,
      max: 32,
      unit: 'nodes'
    }
  },

  // ── 4. Databases & Relay ──
  {
    id: 'postgres-relay',
    name: 'PostgreSQL via Sola Relay',
    category: 'Databases & Relay',
    badge: 'PostgreSQL',
    description: 'Query your own PostgreSQL database through the Sola Relay, which runs on your machine or network.',
    protocolUri: 'postgres://production-db:5432/core',
    primaryComponent: 'SchemaInspector',
    sampleIntent: 'Inspect schema and connection pool for public.orders',
    config: {
      table: 'public.orders',
      rowCount: '4,892,100',
      sizeBytes: '1.2 GB'
    }
  },
  {
    id: 'sheets-finance-relay',
    name: 'Google Sheets Financial Ops Relay',
    category: 'Databases & Relay',
    badge: 'Google Sheets',
    description: 'Two-way synchronized spreadsheet data binding without building custom backend APIs.',
    protocolUri: 'sheet://finance/operations',
    primaryComponent: 'DataCard',
    sampleIntent: 'Read monthly MRR from financial operations Google Sheet',
    config: {
      title: 'Realized MRR',
      value: '$184,200',
      trend: '+14.8% vs last month',
      icon: 'trending-up'
    }
  },

  // ── 5. FinOps & Billing ──
  {
    id: 'finops-waterfall',
    name: 'Subscription ARR Waterfall & Dunning',
    category: 'FinOps & Billing',
    badge: 'FinOps',
    description: 'Visual flow deduction waterfall calculating gross ARR, platform fees, and net realization.',
    protocolUri: 'billing://revenue/waterfall',
    primaryComponent: 'FlowWaterfall',
    sampleIntent: 'Show monthly ARR realization waterfall with dunning deductions',
    config: {
      title: 'Monthly ARR Realization',
      grossVolume: 168000,
      computeExpense: 32000,
      supportExpense: 14000,
      tierDiscount: 6000
    }
  },

  // ── 6. Personal & Creator ──
  {
    id: 'api-rate-limiter',
    name: 'API Gateway Rate Limiter & Token Bucket',
    category: 'Cloud & DevOps',
    badge: 'Rate Limiter',
    description: 'Tactile rotary dial and token bucket rate limiter for dynamic endpoint throttling.',
    protocolUri: 'gateway://ratelimit/throttle',
    primaryComponent: 'TactileDialCard',
    sampleIntent: 'Set API rate limit throttle to 24k req/sec',
    config: {
      title: 'API Rate Limit Throttle',
      value: 24,
      min: 5,
      max: 100,
      unit: 'k req/s'
    }
  },
  {
    id: 'indie-mrr-tracker',
    name: 'Indie Hacker SaaS Revenue Log',
    category: 'Personal & Creator',
    badge: 'Indie SaaS',
    description: 'Minimalist dashboard tracking monthly subscription metrics with 0 kB framework bloat.',
    protocolUri: 'local://saas/mrr',
    primaryComponent: 'DataCard',
    sampleIntent: 'Display Indie SaaS MRR growth and subscriber count',
    config: {
      title: 'Indie SaaS MRR',
      value: '$12,450',
      trend: '+18.2% this month',
      icon: 'zap'
    }
  }
];
