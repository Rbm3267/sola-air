<script lang="ts">
  export interface DiffAuditConfig {
    title: string;
    entityId: string;
    entityType?: string;
    riskLevel?: 'Low' | 'Moderate' | 'High' | 'Destructive';
    riskScore?: number; // 0-100
    requester?: string;
    window?: string;
    diffLines?: Array<{
      type: 'add' | 'remove' | 'context';
      content: string;
    }>;
  }

  let { config } = $props<{ config: DiffAuditConfig }>();

  let approvalState = $state<'idle' | 'approving' | 'approved' | 'rejected'>('idle');

  const defaultDiff = [
    { type: 'context' as const, content: '  // Production Redis Cache TTL Policy' },
    { type: 'remove' as const, content: '- const MAX_CLUSTER_CONNECTIONS = 250;' },
    { type: 'add' as const, content: '+ const MAX_CLUSTER_CONNECTIONS = 2500; // Scaled for Black Friday' },
    { type: 'remove' as const, content: '- const EVICTION_POLICY = "volatile-lru";' },
    { type: 'add' as const, content: '+ const EVICTION_POLICY = "allkeys-lru";' }
  ];

  const diff = $derived(config.diffLines && config.diffLines.length > 0 ? config.diffLines : defaultDiff);

  function getRiskBadge(risk: string = 'Moderate') {
    switch (risk.toLowerCase()) {
      case 'low': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/20';
      case 'moderate': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-500/20';
      case 'high': return 'bg-orange-50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-500/20';
      case 'destructive': return 'bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-500/20';
      default: return 'bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/[0.04]';
    }
  }

  function handleApprove() {
    approvalState = 'approving';
    setTimeout(() => {
      approvalState = 'approved';
    }, 600);
  }

  function handleReject() {
    approvalState = 'rejected';
  }
</script>

<div class="relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all overflow-hidden">
  
  <!-- Header with Risk Index -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.04] mb-5">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="px-2.5 py-0.5 rounded-md bg-slate-900 text-amber-400 font-mono font-semibold text-xs">
          {config.entityId || 'CHG009842'}
        </span>
        <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">
          {config.entityType || 'Enterprise Change Request'}
        </span>
      </div>
      <h3 class="text-base font-bold text-slate-950 dark:text-slate-50 tracking-tight font-mono">
        {config.title || 'Upgrade Production Redis Cluster Capacity'}
      </h3>
    </div>

    <!-- Risk Level Pill -->
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border {getRiskBadge(config.riskLevel)}">
        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
        <span>Risk: {config.riskLevel || 'Moderate'} ({config.riskScore || 42}/100)</span>
      </span>
    </div>
  </div>

  <!-- Metadata Sub-bar -->
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.04] p-3 rounded-2xl border border-slate-100 dark:border-white/[0.04]">
    <div>
      <span class="text-xs text-slate-500 dark:text-slate-400 block uppercase">Requester</span>
      <span class="font-bold text-slate-800 dark:text-slate-200">{config.requester || 'Platform SRE Team'}</span>
    </div>
    <div>
      <span class="text-xs text-slate-500 dark:text-slate-400 block uppercase">Release Window</span>
      <span class="font-bold text-slate-800 dark:text-slate-200">{config.window || 'Tonight 02:00 UTC'}</span>
    </div>
    <div class="col-span-2 sm:col-span-1">
      <span class="text-xs text-slate-500 dark:text-slate-400 block uppercase">CAB Status</span>
      <span class="font-bold {approvalState === 'approved' ? 'text-blue-600 dark:text-blue-400' : approvalState === 'rejected' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}">
        {approvalState === 'approved' ? 'Approved for Release' : approvalState === 'rejected' ? 'Changes Rejected' : 'Pending 1 Signoff'}
      </span>
    </div>
  </div>

  <!-- Syntax Diff Canvas -->
  <div class="bg-slate-950 dark:bg-black/40 text-white rounded-2xl p-4 font-mono text-xs overflow-x-auto mb-6 border border-slate-800">
    <div class="text-xs text-slate-400 pb-2 mb-3 border-b border-slate-800 flex items-center justify-between">
      <span>config/production/cluster.hcl</span>
      <span class="text-amber-400 font-bold">+2 / -2 Lines Changed</span>
    </div>
    <div class="space-y-1">
      {#each diff as line}
        <div class="flex items-center gap-2 {line.type === 'add' ? 'text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded' : line.type === 'remove' ? 'text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded' : 'text-slate-400'}">
          <span class="select-none font-bold w-3">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
          <span class="whitespace-pre">{line.content}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Interactive Action Bar -->
  <div class="flex items-center justify-between gap-3 pt-2">
    <span class="text-xs font-mono text-slate-500 dark:text-slate-400">
      Zero-VDOM Two-Way Intent Mutator
    </span>

    <div class="flex items-center gap-2">
      {#if approvalState === 'idle'}
        <button 
          onclick={handleReject}
          class="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all cursor-pointer">
          Reject
        </button>
        <button 
          onclick={handleApprove}
          style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff !important;"
          class="px-5 py-2 rounded-xl text-xs font-mono font-semibold text-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Approve Change</span>
        </button>
      {:else if approvalState === 'approving'}
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold border border-blue-200 dark:border-blue-500/20">
          <div class="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Dispatching Enterprise ACL Mutator...</span>
        </div>
      {:else if approvalState === 'approved'}
        <div class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold border border-blue-200 dark:border-blue-500/20">
          <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Change Request Approved</span>
        </div>
      {:else}
        <div class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs font-mono font-semibold border border-rose-200 dark:border-rose-500/20">
          <span>Change Request Rejected</span>
        </div>
      {/if}
    </div>
  </div>

</div>
