// ─── Sola Multi-Domain Action Contracts ───
// Universal playbooks parameterized across any SaaS, Cloud, Database, or Spreadsheet

// In-memory simulation database for staged intents
const stagedIntents = new Map();

function createMockIntent(actionId, recordId, data, payload, tier) {
  const intentId = `${actionId}_intent_${Math.random().toString(36).substring(2, 9)}`;
  const record = {
    id: intentId,
    actionId,
    recordId,
    data,
    payload,
    status: 'pending',
    tier,
    timestamp: Date.now(),
    expiresAt: Date.now() + 5000 // 5 seconds undo window
  };
  stagedIntents.set(intentId, record);
  return record;
}

export const MajorIncidentContract = {
  id: 'major_incident_bridge',
  title: 'Open Major Incident War Room',
  description: 'Escalate to P1 Major Incident, page Tier 3 SRE via PagerDuty, and trigger Route53 traffic failover.',
  category: 'mitigation',
  severity: 'critical',
  tier: 2,
  capability: 'fire_and_forget',
  blastRadiusMessage: 'This will page the on-call SRE lead, spin up a Zoom war room link, and re-route 100% of global web traffic to the secondary cloud region.',

  isSurfaced: (data, behavior) => {
    const isP1 = data?.severity === 'P1 - Critical' || data?.priority === '1 - Critical';
    return isP1 || behavior.activeDwellTarget === 'incident' || behavior.rageClickCount >= 2;
  },

  computeUrgency: (data, behavior) => {
    let score = 0.5;
    if (behavior.rageClickCount >= 2) score += 0.4;
    if (behavior.dwellDurationMs > 1000) score += 0.2;
    return Math.min(score, 1.0);
  },

  resolveAffordance: (data, behavior) => {
    if (behavior.rageClickCount >= 2) return 'urgent_override';
    if (behavior.dwellDurationMs > 800) return 'expanded_preview';
    return 'calm';
  },

  stage: async (payload, ctx) => {
    return createMockIntent('major_incident_bridge', ctx.recordId, ctx.data, payload, 2);
  },

  commit: async (intentId) => {
    const intent = stagedIntents.get(intentId);
    if (intent) intent.status = 'committed';
    return {
      success: true,
      actionId: 'major_incident_bridge',
      transactionId: intentId,
      timestamp: Date.now(),
      message: `Major Incident bridge opened for ${intent?.recordId || 'INC009481'}. Secondary SRE paged.`
    };
  }
};

export const AwsDrainNodeContract = {
  id: 'aws_drain_node',
  title: 'Drain & Evict Degraded Cluster Node',
  description: 'Safely evicts container pods and schedules replacements across healthy availability zones.',
  category: 'mitigation',
  severity: 'high',
  tier: 2,
  capability: 'transactional',
  blastRadiusMessage: 'Affects 42 pod resources on this node. Safe rescheduling might take up to 90 seconds. Transactional rollback will resume pods on failure.',

  isSurfaced: (data, behavior) => {
    return data?.percentage > 80 || behavior.activeDwellTarget === 'degraded-node' || behavior.rageClickCount >= 1;
  },

  computeUrgency: (data, behavior) => {
    return behavior.rageClickCount >= 1 ? 0.95 : 0.6;
  },

  resolveAffordance: (data, behavior) => {
    if (behavior.rageClickCount >= 1) return 'urgent_override';
    if (behavior.dwellDurationMs > 800) return 'expanded_preview';
    return 'calm';
  },

  stage: async (payload, ctx) => {
    return createMockIntent('aws_drain_node', ctx.recordId, ctx.data, payload, 2);
  },

  commit: async (intentId) => {
    const intent = stagedIntents.get(intentId);
    if (intent) intent.status = 'committed';
    return {
      success: true,
      actionId: 'aws_drain_node',
      transactionId: intentId,
      timestamp: Date.now(),
      message: 'Node drain initiated: 42 pods rescheduled to healthy zones.'
    };
  },

  rollback: async (intentId) => {
    const intent = stagedIntents.get(intentId);
    if (intent) intent.status = 'rolled_back';
    return {
      success: true,
      actionId: 'aws_drain_node',
      transactionId: intentId,
      timestamp: Date.now(),
      message: 'Eviction cancelled. Target node un-cordoned and traffic resumed.'
    };
  }
};

export const StripeDunningNoticeContract = {
  id: 'stripe_send_dunning',
  title: 'Trigger Smart Dunning Retry',
  description: 'Retries merchant card payment with optimal bank routing and dispatches automated invoice reminder.',
  category: 'mutation',
  severity: 'medium',
  tier: 1, // Soft mutation with 5s undo window
  capability: 'idempotent',

  isSurfaced: (data, behavior) => {
    return behavior.activeDwellTarget === 'finops' || behavior.persona === 'finops_auditor';
  },

  computeUrgency: (data, behavior) => {
    return behavior.dwellDurationMs > 1000 ? 0.8 : 0.4;
  },

  resolveAffordance: (data, behavior) => {
    if (behavior.dwellDurationMs > 800) return 'expanded_preview';
    return 'calm';
  },

  stage: async (payload, ctx) => {
    return createMockIntent('stripe_send_dunning', ctx.recordId, ctx.data, payload, 1);
  },

  commit: async (intentId) => {
    const intent = stagedIntents.get(intentId);
    if (intent) intent.status = 'committed';
    return {
      success: true,
      actionId: 'stripe_send_dunning',
      transactionId: intentId,
      timestamp: Date.now(),
      message: 'Smart Dunning sequence dispatched to billing contact.'
    };
  },

  rollback: async (intentId) => {
    const intent = stagedIntents.get(intentId);
    if (intent) intent.status = 'rolled_back';
    return {
      success: true,
      actionId: 'stripe_send_dunning',
      transactionId: intentId,
      timestamp: Date.now(),
      message: 'Payment retry aborted. Smart dunning sequence canceled.'
    };
  }
};

export const PostgresKillLocksContract = {
  id: 'pg_kill_locks',
  title: 'Terminate Lock-Holding Backend PIDs',
  description: 'Executes pg_terminate_backend on transactions holding exclusive locks longer than 5 seconds.',
  category: 'mitigation',
  severity: 'critical',
  tier: 2,
  capability: 'fire_and_forget',
  blastRadiusMessage: 'Will abruptly disconnect 3 client connection backends. In-progress transactions will instantly roll back.',

  isSurfaced: (data, behavior) => {
    return (data?.activePool && data.activePool > 80) || behavior.persona === 'sre_commander';
  },

  computeUrgency: (data, behavior) => 0.9,

  resolveAffordance: (data, behavior) => {
    if (behavior.rageClickCount >= 1 || behavior.persona === 'sre_commander') return 'urgent_override';
    return 'calm';
  },

  stage: async (payload, ctx) => {
    return createMockIntent('pg_kill_locks', ctx.recordId, ctx.data, payload, 2);
  },

  commit: async (intentId) => {
    const intent = stagedIntents.get(intentId);
    if (intent) intent.status = 'committed';
    return {
      success: true,
      actionId: 'pg_kill_locks',
      transactionId: intentId,
      timestamp: Date.now(),
      message: 'Terminated 3 lock-holding queries on primary replica.'
    };
  }
};
