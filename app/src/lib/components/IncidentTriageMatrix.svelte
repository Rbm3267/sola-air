<script lang="ts">
  export interface IncidentTriageConfig {
    incidentId: string;
    title: string;
    severity?: 'P1 - Critical' | 'P2 - High' | 'P3 - Moderate';
    status?: 'Investigating' | 'Identified' | 'Monitoring' | 'Resolved';
    slaRemainingMin?: number;
    blastRadius?: string;
    responders?: Array<{ name: string; role: string }>;
    playbooks?: Array<{ id: string; title: string; action: string; automated?: boolean }>;
  }

  let { config } = $props<{ config: IncidentTriageConfig }>();

  let executedPlaybook = $state<string | null>(null);

  const defaultPlaybooks = [
    { id: 'pb-1', title: 'Switch webhook queue to standby worker', action: 'Queue Failover', automated: true },
    { id: 'pb-2', title: 'Flush stale checkout session cache', action: 'Cache Reset', automated: true },
    { id: 'pb-3', title: 'Notify billing on-call engineer', action: 'Escalation Alert', automated: false }
  ];

  const playbooks = $derived(config.playbooks || defaultPlaybooks);

  function executeMitigation(id: string) {
    executedPlaybook = id;
    setTimeout(() => {
      executedPlaybook = null;
    }, 2500);
  }
</script>

<div class="relative bg-white/95 dark:bg-white/[0.02] border border-rose-200 dark:border-rose-500/20/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
  
  <!-- Outer Glow Accent -->
  <div class="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.04] mb-5">
    <div>
      <div class="flex items-center gap-2 mb-1.5">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-900 font-mono font-semibold text-xs">
          <span class="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          {config.severity || 'P1 - Critical'}
        </span>
        <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">{config.incidentId || 'INC009481'}</span>
      </div>
      <h3 class="text-base font-bold text-slate-950 dark:text-slate-50 tracking-tight font-mono">
        {config.title || 'API Gateway High-Frequency Latency Spike (EU-West)'}
      </h3>
    </div>

    <!-- Live SLA Countdown Pill -->
    <div class="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-2xl border border-slate-200 dark:border-white/[0.04]">
      <div class="text-right">
        <span class="text-xs font-mono text-slate-500 dark:text-slate-400 block uppercase">SLA Target Breach</span>
        <span class="text-sm font-mono font-semibold text-rose-600 dark:text-rose-400">
          {config.slaRemainingMin !== undefined ? `${config.slaRemainingMin}m 00s` : '11m 42s'}
        </span>
      </div>
      <div class="w-8 h-8 aspect-square shrink-0 rounded-full border-2 border-rose-500/30 border-t-rose-600 animate-spin"></div>
    </div>
  </div>

  <!-- Blast Radius & Responders -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-xs font-mono">
    <div class="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.04]">
      <span class="text-xs text-slate-500 dark:text-slate-400 block uppercase mb-1">Blast Radius Impact</span>
      <span class="font-bold text-slate-800 dark:text-slate-200">{config.blastRadius || '42,000 Active Sessions • Checkout Ingress'}</span>
    </div>
    <div class="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.04]">
      <span class="text-xs text-slate-500 dark:text-slate-400 block uppercase mb-1">Incident Commander</span>
      <span class="font-bold text-slate-800 dark:text-slate-200">Tier 3 Platform SRE (Beth Anglin)</span>
    </div>
  </div>

  <!-- 1-Click Mitigation Playbooks -->
  <div>
    <span class="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 block uppercase mb-2.5">
      1-Click Incident Mitigation Playbooks:
    </span>
    
    <div class="space-y-2">
      {#each playbooks as pb}
        <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] hover:border-slate-300 transition-all">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <div>
              <span class="text-xs font-mono font-semibold text-slate-900 dark:text-white block">{pb.title}</span>
              <span class="text-xs font-mono text-slate-500 dark:text-slate-400">{pb.action} {pb.automated ? '• Automated Execution' : ''}</span>
            </div>
          </div>

          <button 
            onclick={() => executeMitigation(pb.id)}
            disabled={executedPlaybook === pb.id}
            style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff !important;"
            class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-white shadow-xs hover:shadow-md transition-all cursor-pointer">
            {#if executedPlaybook === pb.id}
              <span>Executing...</span>
            {:else}
              <span>Run Playbook</span>
            {/if}
          </button>
        </div>
      {/each}
    </div>
  </div>

  <div class="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-4 mt-5 border-t border-slate-100 dark:border-white/[0.04]">
    <span>Enterprise MIM Direct Command Capsule</span>
    <span>Auto-Dispatching ACLs</span>
  </div>

</div>
