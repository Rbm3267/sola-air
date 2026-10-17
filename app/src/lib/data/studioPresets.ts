export interface StudioPreset {
  id: string;
  name: string;
  category: 'AI & Agents' | 'Edge Systems' | 'Robotics & Spatial' | 'SaaS & Analytics' | 'Commerce & Retail' | 'Productivity & Tasks' | 'Operations & Health';
  tagline: string;
  description: string;
  badge: string;
  signals: string[];
  cards: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    cols: 1 | 2 | 3;
    value: string | number;
    delta?: string;
    accentColor: string;
    config?: Record<string, any>;
  }>;
}

export const STUDIO_PRESETS: StudioPreset[] = [
  // ==========================================
  // --- Category: AI & Agents ---
  // ==========================================
  {
    id: 'ai-agent-swarm-mesh',
    name: 'Multi-Agent Task Board',
    category: 'AI & Agents',
    tagline: 'Task handoffs between agents, reasoning traces and tool calls',
    description: 'Tracks which agent has which task, tool calls, context window use and whether the agents agree.',
    badge: 'Agents',
    signals: ['agent/swarm_active_nodes', 'agent/reasoning_depth', 'agent/tool_execution_ms'],
    cards: [
      { id: 'as1', type: 'node_graph', title: 'Agent Topology Mesh', subtitle: 'Dynamic task delegation graph', cols: 2, value: '8 Subagents', accentColor: 'emerald' },
      { id: 'as2', type: 'stat', title: 'Agent Agreement Rate', subtitle: 'Multi-model agreement index', cols: 1, value: '99.4%', delta: '+0.8%', accentColor: 'emerald' },
      { id: 'as3', type: 'feed', title: 'Live Reasoning & Thought Stream', subtitle: 'What each subagent is doing', cols: 2, value: 'Executing', accentColor: 'slate' },
      { id: 'as4', type: 'slider', title: 'Autonomy & Permission Dial', subtitle: 'Max allowable tool risk threshold', cols: 1, value: 85, accentColor: 'emerald' }
    ]
  },
  {
    id: 'llm-streaming-token-hud',
    name: 'LLM Token Streaming Monitor',
    category: 'AI & Agents',
    tagline: 'LLM streaming monitor that patches text nodes directly as tokens arrive',
    description: 'Tracks time to first token, tokens per second, context buffer size and inference cost.',
    badge: 'LLM',
    signals: ['neural/token_rate', 'neural/ttft_latency', 'neural/context_fill'],
    cards: [
      { id: 'nt1', type: 'stat', title: 'Token Throughput', subtitle: 'Streaming generation velocity', cols: 1, value: '4,280 tok/s', delta: '+340 tok/s', accentColor: 'violet' },
      { id: 'nt2', type: 'progress', title: 'Context Window Saturation', subtitle: '128k token allocation', cols: 1, value: 68, delta: '68%', accentColor: 'violet' },
      { id: 'nt3', type: 'chart', title: 'Token Egress Velocity Stream', subtitle: 'Text node mutation rate', cols: 2, value: '4.2k tok/s', accentColor: 'violet' },
      { id: 'nt4', type: 'code', title: 'Zero-VDOM Streaming Buffer', subtitle: 'Direct reactive DOM binding', cols: 2, value: 'Prompt Engine', accentColor: 'slate' }
    ]
  },

  // ==========================================
  // --- Category: Edge Systems ---
  // ==========================================
  {
    id: 'edge-wasm-sandbox',
    name: 'Edge WASM Isolate Monitor',
    category: 'Edge Systems',
    tagline: 'WebAssembly isolate start times and memory use',
    description: 'Watches edge isolates: memory high-water marks, cold-start latency percentiles and failover.',
    badge: 'Edge',
    signals: ['wasm/isolate_boot_ms', 'wasm/memory_watermark', 'edge/global_pops'],
    cards: [
      { id: 'ew1', type: 'stat', title: 'Cold-Start Latency', subtitle: 'Isolate spawn time', cols: 1, value: '0.08ms', delta: '-0.02ms', accentColor: 'emerald' },
      { id: 'ew2', type: 'progress', title: 'Linear Memory Allocation', subtitle: '4MB per isolate cap', cols: 1, value: 42, delta: '42%', accentColor: 'emerald' },
      { id: 'ew3', type: 'chart', title: 'Global Edge Ingress Map', subtitle: '32 Edge PoPs real-time load', cols: 2, value: '98k req/s', accentColor: 'emerald' },
      { id: 'ew4', type: 'radial_dial', title: 'Concurrency Limiter', subtitle: 'Dynamic worker scaling cap', cols: 1, value: 75, accentColor: 'emerald' }
    ]
  },
  {
    id: 'zkp-verification-pipeline',
    name: 'ZK Proof Pipeline',
    category: 'Edge Systems',
    tagline: 'Proof generation stages with constraint counts',
    description: 'Tracks SNARK/STARK proof generation time, circuit constraints, verification fees and state roots.',
    badge: 'Crypto',
    signals: ['zkp/proof_gen_ms', 'zkp/circuit_constraints', 'zkp/verified_state'],
    cards: [
      { id: 'zk1', type: 'stat', title: 'Proof Synthesis Time', subtitle: 'PlonKish arithmetization speed', cols: 1, value: '380ms', delta: '-45ms', accentColor: 'sky' },
      { id: 'zk2', type: 'stat', title: 'Verified State Root', subtitle: 'Cryptographic state anchor', cols: 1, value: '0x7F...9A4', delta: 'Confirmed', accentColor: 'sky' },
      { id: 'zk3', type: 'waterfall', title: 'Proof Generation Stages', subtitle: 'Witness generation to commitment', cols: 2, value: '380ms', accentColor: 'sky', config: { bars: [{ name: 'Witness Gen', val: 120, d: '120ms' }, { name: 'FFT Polynomial', val: 180, d: '180ms' }, { name: 'MSM Commitment', val: 80, d: '80ms' }] } }
    ]
  },

  // ==========================================
  // --- Category: Robotics & Spatial ---
  // ==========================================
  {
    id: 'robotics-actuator-telemetry',
    name: 'Robotics Actuator Kinematics',
    category: 'Robotics & Spatial',
    tagline: '6-axis joint angles, torque readings and an emergency stop indicator',
    description: 'Robot telemetry dashboard. Readings update the DOM directly, with no virtual DOM.',
    badge: 'Hardware',
    signals: ['robot/joint_angles', 'robot/torque_nm', 'robot/estop_state'],
    cards: [
      { id: 'rb1', type: 'radial_dial', title: 'End-Effector Joint Angle', subtitle: 'Joint angle control', cols: 1, value: 45, accentColor: 'amber' },
      { id: 'rb2', type: 'stat', title: 'Actuator Torque Peak', subtitle: 'Load sensor feedback', cols: 1, value: '28.4 Nm', delta: 'Nominal', accentColor: 'amber' },
      { id: 'rb3', type: 'chart', title: 'Sensor Fusion Curve', subtitle: 'IMU & Torque continuous telemetry', cols: 2, value: '1.0 kHz', accentColor: 'amber' },
      { id: 'rb4', type: 'status', title: 'Hardware Sentinel Condition', subtitle: 'E-Stop closed-loop watchdog', cols: 1, value: 'Armed & Nominal', accentColor: 'emerald' }
    ]
  },
  {
    id: 'spatial-audio-haptics',
    name: 'Spatial Coordinates & Soundfield Stage',
    category: 'Robotics & Spatial',
    tagline: '360° stage for placing audio sources, with drag and momentum',
    description: 'Drag audio sources and anchor points around a 3D coordinate space.',
    badge: 'Spatial',
    signals: ['spatial/pan_azimuth', 'spatial/elevation', 'spatial/haptic_intensity'],
    cards: [
      { id: 'sa1', type: 'slider', title: 'Azimuth Soundfield Orientation', subtitle: '360 degree spatial panning', cols: 1, value: 180, accentColor: 'emerald' },
      { id: 'sa2', type: 'slider', title: 'Haptic Vibration Damping', subtitle: 'Tactile spring resistance', cols: 1, value: 65, accentColor: 'emerald' },
      { id: 'sa3', type: 'node_graph', title: 'Acoustic Anchor Nodes', subtitle: 'Virtual spatial emitters', cols: 2, value: '6 Emitters', accentColor: 'emerald' }
    ]
  },

  // ==========================================
  // --- Category: SaaS & Analytics ---
  // ==========================================
  {
    id: 'saas-revenue-waterfall',
    name: 'Subscription ARR & Realization Waterfall',
    category: 'SaaS & Analytics',
    tagline: 'Multi-stage revenue cascade with fee deductions and net payout batches',
    description: 'Tracks recurring revenue growth, churn adjustments, processing fees, and realized merchant settlement.',
    badge: 'Popular',
    signals: ['revenue/gross_volume', 'billing/processing_fees', 'payout/net_settlement'],
    cards: [
      { id: 'c1', type: 'stat', title: 'Monthly Recurring Revenue', subtitle: 'Live subscriber ARR', cols: 1, value: '$184,200', delta: '+14.8%', accentColor: 'emerald' },
      { id: 'c2', type: 'progress', title: 'Net Revenue Retention', subtitle: 'Annualized benchmark', cols: 1, value: 138, delta: '138%', accentColor: 'emerald' },
      { id: 'c3', type: 'waterfall', title: 'Revenue Realization Flow', subtitle: 'Gross billing to net settlement', cols: 2, value: '$184k', accentColor: 'emerald', config: { bars: [{ name: 'Gross Billing', val: 240, d: '+240' }, { name: 'Expansions', val: 40, d: '+40' }, { name: 'Fees & Refunds', val: -30, d: '-30' }, { name: 'Net Realized', val: 250, d: '250' }] } },
      { id: 'c4', type: 'chart', title: 'Subscription Growth Stream', subtitle: 'Signal ingestion rate', cols: 2, value: '94 subs/day', accentColor: 'emerald' }
    ]
  },
  {
    id: 'conversion-funnel-matrix',
    name: 'Customer Conversion & Funnel Velocity',
    category: 'SaaS & Analytics',
    tagline: 'Multi-step acquisition funnel tracking visitor-to-paid lifecycle',
    description: 'Surfaces stage conversion rates, drop-off friction points, and customer lifetime value metrics.',
    badge: 'Analytics',
    signals: ['analytics/visitors', 'funnel/signups', 'funnel/paid_activations'],
    cards: [
      { id: 'cf1', type: 'stat', title: 'Conversion Rate', subtitle: 'Visitor to paid subscription', cols: 1, value: '4.82%', delta: '+0.6%', accentColor: 'sky' },
      { id: 'cf2', type: 'progress', title: 'Onboarding Completion', subtitle: 'Activation milestone rate', cols: 1, value: 84, delta: '84%', accentColor: 'sky' },
      { id: 'cf3', type: 'waterfall', title: 'Full-Funnel Drop-Off', subtitle: 'Acquisition to retention stages', cols: 2, value: '100k', accentColor: 'sky', config: { bars: [{ name: 'Impressions', val: 100, d: '100k' }, { name: 'Signups', val: 32, d: '32k' }, { name: 'Active Trial', val: 18, d: '18k' }, { name: 'Paid', val: 4.8, d: '4.8k' }] } }
    ]
  },
  {
    id: 'global-payout-velocity',
    name: 'Global Payout & Treasury Velocity',
    category: 'SaaS & Analytics',
    tagline: 'Multi-currency settlement monitor with liquidity indicators',
    description: 'Tracks daily disbursement volumes, currency conversion spreads, and settlement reserve margins.',
    badge: 'Treasury',
    signals: ['treasury/balance', 'settlement/volume', 'fx/spread'],
    cards: [
      { id: 'gp1', type: 'stat', title: 'Settlement Balance', subtitle: 'Available liquidity pool', cols: 1, value: '$1.42M', delta: '+$240k', accentColor: 'emerald' },
      { id: 'gp2', type: 'slider', title: 'Liquidity Reserve Threshold', subtitle: 'Auto-sweep trigger margin', cols: 1, value: 75, accentColor: 'emerald' },
      { id: 'gp3', type: 'chart', title: 'Daily Disbursement Velocity', subtitle: 'Settlement run rate', cols: 2, value: '$340k/day', accentColor: 'emerald' }
    ]
  },

  // ==========================================
  // --- Category: Commerce & Retail ---
  // ==========================================
  {
    id: 'ecommerce-order-flow',
    name: 'Storefront Order Fulfillment Pipeline',
    category: 'Commerce & Retail',
    tagline: 'Real-time order intake, inventory reservation, and dispatch pipeline',
    description: 'End-to-end commerce operations console tracking active checkout sessions, payment settlement, and shipping queues.',
    badge: 'Commerce',
    signals: ['store/gross_orders', 'store/fulfillment_rate', 'store/active_carts'],
    cards: [
      { id: 'ec1', type: 'stat', title: 'Today Gross Merchandise Value', subtitle: 'Real-time checkout volume', cols: 1, value: '$42,850', delta: '+22.4%', accentColor: 'amber' },
      { id: 'ec2', type: 'progress', title: 'Fulfillment Target SLA', subtitle: 'Same-day dispatch speed', cols: 1, value: 92, delta: '92%', accentColor: 'amber' },
      { id: 'ec3', type: 'table', title: 'Live Order Intake Stream', subtitle: 'Recent buyer transactions', cols: 2, value: 'Orders', accentColor: 'slate' },
      { id: 'ec4', type: 'feed', title: 'Warehouse Dispatch Stream', subtitle: 'Real-time packing events', cols: 1, value: 'Active', accentColor: 'slate' }
    ]
  },
  {
    id: 'inventory-stock-matrix',
    name: 'Multi-Warehouse Inventory & Reorder Matrix',
    category: 'Commerce & Retail',
    tagline: 'Dynamic stock levels with automated reorder thresholds and depletion gauges',
    description: 'Monitors regional warehouse SKUs, low-stock threshold triggers, and incoming supplier lead times.',
    badge: 'Logistics',
    signals: ['inventory/sku_count', 'inventory/reorder_alerts', 'logistics/lead_time'],
    cards: [
      { id: 'iv1', type: 'stat', title: 'Total Managed SKUs', subtitle: 'Across 4 global hubs', cols: 1, value: '12,480', delta: '+140 new', accentColor: 'slate' },
      { id: 'iv2', type: 'progress', title: 'Warehouse Capacity Utilization', subtitle: 'Main distribution center', cols: 1, value: 78, delta: '78%', accentColor: 'amber' },
      { id: 'iv3', type: 'table', title: 'Depletion Watchlist Table', subtitle: 'Low-stock reorder triggers', cols: 2, value: 'Stock Records', accentColor: 'slate' }
    ]
  },

  // ==========================================
  // --- Category: Productivity & Tasks ---
  // ==========================================
  {
    id: 'sprint-velocity-tracker',
    name: 'Engineering Sprint Velocity & Task Tracker',
    category: 'Productivity & Tasks',
    tagline: 'Tactile sprint tracking board with calendar date filters and burndown charts',
    description: 'Sprint planning and velocity workspace tracking story points, pull request turnaround time, and release milestones.',
    badge: 'Productivity',
    signals: ['sprint/velocity', 'sprint/completed_points', 'pr/review_latency'],
    cards: [
      { id: 'sp1', type: 'stat', title: 'Sprint Velocity', subtitle: 'Completed story points', cols: 1, value: '64 pts', delta: '+12 pts', accentColor: 'emerald' },
      { id: 'sp2', type: 'datepicker', title: 'Sprint Milestone', subtitle: 'Target ship deadline', cols: 1, value: '2026-09-15', accentColor: 'emerald' },
      { id: 'sp3', type: 'table', title: 'Active Pull Requests', subtitle: 'Pending code review queue', cols: 2, value: 'PR Queue', accentColor: 'slate' },
      { id: 'sp4', type: 'chart', title: 'Burndown Progression', subtitle: 'Points remaining vs ideal trajectory', cols: 2, value: 'Burndown', accentColor: 'emerald' }
    ]
  },
  {
    id: 'habit-streak-matrix',
    name: 'Habit Consistency & Momentum Rings',
    category: 'Productivity & Tasks',
    tagline: 'Zero-friction daily activity logger with spring-loaded progress rings',
    description: 'Personal habit and discipline tracker with visual completion rings, streak counters, and weekly consistency grids.',
    badge: 'Habits',
    signals: ['habits/daily_completed', 'habits/streak_days', 'habits/consistency_rate'],
    cards: [
      { id: 'hb1', type: 'progress', title: 'Daily Goal Completion', subtitle: '4 of 5 habits checked', cols: 1, value: 80, delta: '80%', accentColor: 'emerald' },
      { id: 'hb2', type: 'stat', title: 'Current Streak', subtitle: 'Unbroken daily execution', cols: 1, value: '28 Days', delta: '+1 day', accentColor: 'emerald' },
      { id: 'hb3', type: 'feed', title: 'Recent Logged Activities', subtitle: 'Real-time habit completions', cols: 1, value: 'Active', accentColor: 'slate' }
    ]
  },

  // ==========================================
  // --- Category: Operations & Health ---
  // ==========================================
  {
    id: 'multi-region-cluster-mesh',
    name: 'Multi-Region Infrastructure & NOC Sentinel',
    category: 'Operations & Health',
    tagline: 'High-density operations console with node shard matrix and incident escalations',
    description: 'Central operations center tracking global data center clusters, p99 ingress latency, and failover status.',
    badge: 'NOC Ops',
    signals: ['cluster/global_uptime', 'cluster/shards_active', 'noc/active_incidents'],
    cards: [
      { id: 'noc1', type: 'stat', title: 'Global System Availability', subtitle: '30-day trailing uptime', cols: 1, value: '99.994%', delta: 'Zero Incidents', accentColor: 'emerald' },
      { id: 'noc2', type: 'stat', title: 'p99 Ingress Latency', subtitle: 'Edge CDN routing', cols: 1, value: '4.2ms', delta: '-0.4ms', accentColor: 'emerald' },
      { id: 'noc3', type: 'node_graph', title: 'Global Regional Nodes', subtitle: 'Auto-clustering edge nodes', cols: 2, value: 'Clusters', accentColor: 'emerald' },
      { id: 'noc4', type: 'feed', title: 'System Event Stream', subtitle: 'Live failover audit logs', cols: 1, value: 'Optimal', accentColor: 'slate' }
    ]
  }
];
