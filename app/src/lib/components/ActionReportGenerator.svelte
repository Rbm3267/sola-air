<script lang="ts">
  import ReportDocViewer from './ReportDocViewer.svelte';

  export interface ReportGeneratorConfig {
    title?: string;
    defaultType?: string;
  }

  let { config } = $props<{ config?: ReportGeneratorConfig }>();

  let reportType = $state('sre_postmortem');
  let environment = $state('production_us_east');
  let isGenerating = $state(false);
  let progress = $state(0);
  let generatedReport = $state<any | null>(null);

  const reportPresets: Record<string, { title: string; classification: any; author: string; sections: any[] }> = {
    sre_postmortem: {
      title: 'SRE Postmortem: Database Connection Exhaustion (P1)',
      classification: 'Internal Only',
      author: 'Senior Systems Reliability Engineer',
      sections: [
        {
          id: 'incident-overview',
          heading: '1. Incident Timeline & Summary',
          content: 'At 08:42:15 UTC, the primary Aurora cluster connection pool reached 100% capacity. Automated Sola ActionContracts escalated the incident to Moveworks within 4.2 seconds.',
          alertType: 'note'
        },
        {
          id: 'blast-radius-table',
          heading: '2. Customer Impact & Telemetry',
          content: 'The blast radius was restricted to the US-East checkout cluster. Latency peaked at 1,420ms before automated Route53 failover stabilized egress.',
          table: {
            headers: ['Time (UTC)', 'Metric / Subsystem', 'Observed Value', 'Mitigation Action'],
            rows: [
              ['08:42:15', 'Aurora Connection Pool', '100% (250/250)', 'Trigger Moveworks Alert'],
              ['08:42:19', 'Ingress Checkout RPS', '4,890 req/s', 'Route53 Automated Failover'],
              ['08:42:45', 'Worker Containers', 'Scaled 4x -> 16x', 'Connection Pool Normalized']
            ]
          }
        },
        {
          id: 'root-cause',
          heading: '3. Root Cause Analysis (RCA)',
          content: 'A missing query index on active cart tokens led to long-running lock contention during the high-traffic marketing campaign.',
          codeBlock: {
            language: 'sql',
            code: 'CREATE INDEX CONCURRENTLY idx_cart_tokens_user_status ON cart_tokens (user_id, status) WHERE status = "active";'
          }
        }
      ]
    },
    finops_audit: {
      title: 'Cloud FinOps Realization: Monthly Infrastructure & SaaS Allocation',
      classification: 'Executive Brief',
      author: 'FinOps Principal Architect',
      sections: [
        {
          id: 'finops-summary',
          heading: '1. Executive Spend Summary',
          content: 'Total monthly cloud compute expenditure was reduced by $18,400 (-24.8%) following the rollout of Sola ambient zero-VDOM components across internal employee workflows.',
          alertType: 'tip'
        },
        {
          id: 'spend-table',
          heading: '2. Cost Center Breakdown',
          content: 'Serverless compute and automated workflow handling accounted for most of the margin improvement.',
          table: {
            headers: ['Cost Center', 'Previous Run-Rate', 'Optimized Run-Rate', 'Net Savings'],
            rows: [
              ['Kubernetes Worker Nodes', '$42,000 / mo', '$31,500 / mo', '$10,500 (25%)'],
              ['Enterprise Workflow Tier 1', '$28,000 / mo', '$22,400 / mo', '$5,600 (20%)'],
              ['Global Edge Workers', '$8,500 / mo', '$6,200 / mo', '$2,300 (27%)']
            ]
          }
        }
      ]
    },
    security_audit: {
      title: 'Zero-Trust Architecture & Compliance Review',
      classification: 'Confidential',
      author: 'Chief Information Security Officer',
      sections: [
        {
          id: 'security-scope',
          heading: '1. Relay credentials',
          content: 'Database queries go through the Sola Relay. Database credentials stay in the relay and are never sent to the browser.',
          alertType: 'note'
        },
        {
          id: 'rbac-table',
          heading: '2. RBAC & Access Matrix',
          content: 'Each role is limited to the access it needs on the API endpoints.',
          table: {
            headers: ['Entity / Role', 'Access Scope', 'Write Privilege', 'Audit Logging'],
            rows: [
              ['ITSM Tier 1 Operator', 'Work Items (Read/Update)', 'Soft Mutation Only', 'Enforced (SysLog)'],
              ['AI assistant', 'ActionContract Dispatch', 'Playbook Execution', 'Signed'],
              ['Sola Client Runtime', 'DOM Node Operations', '0 kB Token Exposure', 'Enforced (No Storage)']
            ]
          }
        }
      ]
    }
  };

  function handleGenerate() {
    isGenerating = true;
    progress = 10;
    generatedReport = null;

    const interval = setInterval(() => {
      progress += 25;
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          generatedReport = reportPresets[reportType] || reportPresets['sre_postmortem'];
          isGenerating = false;
        }, 300);
      }
    }, 150);
  }
</script>

<div class="relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col gap-6">
  
  <!-- Generator Control Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/[0.04]">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">On-Demand Technical Report Generator</span>
      </div>
      <h3 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {config?.title || 'System Architecture & Incident Report Engine'}
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 max-w-[68ch]">
        Generate standalone HTML/Markdown executive summaries, RCA postmortems, and compliance briefs on demand.
      </p>
    </div>

    <!-- Generate Action Trigger -->
    <button 
      onclick={handleGenerate}
      disabled={isGenerating}
      class="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all active:scale-[0.97] cursor-pointer shadow-md disabled:opacity-60 shrink-0">
      {#if isGenerating}
        <svg class="w-4 h-4 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
        <span>Generating ({progress}%)...</span>
      {:else}
        <svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <span>Generate Technical Report</span>
      {/if}
    </button>
  </div>

  <!-- Parameter Config Ribbon -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 dark:bg-white/[0.04] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.04] text-xs font-mono">
    <div class="flex flex-col gap-1.5">
      <label for="report-template-select" class="text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">Report Template:</label>
      <select 
        id="report-template-select"
        bind:value={reportType}
        class="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
        <option value="sre_postmortem">SRE Postmortem (Database Connection Pool Saturation)</option>
        <option value="finops_audit">Cloud FinOps Audit (Monthly Compute & SaaS Allocation)</option>
        <option value="security_audit">Zero-Trust & Data Enclave Compliance Architecture Brief</option>
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="target-env-select" class="text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">Target Infrastructure / Environment:</label>
      <select 
        id="target-env-select"
        bind:value={environment}
        class="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
        <option value="production_us_east">Production Cluster (us-east-1 / High-Availability)</option>
        <option value="staging_eu_central">Staging Verification (eu-central-1)</option>
        <option value="edge_cloudflare">Global Edge Workers (Edge CDN)</option>
      </select>
    </div>
  </div>

  <!-- Progress Bar when generating -->
  {#if isGenerating}
    <div class="w-full bg-slate-100 dark:bg-white/[0.08] rounded-full h-2 overflow-hidden">
      <div class="bg-blue-500 h-2 transition-all duration-200" style="width: {progress}%"></div>
    </div>
  {/if}

  <!-- Rendered Report Output View -->
  {#if generatedReport}
    <div class="mt-2">
      <ReportDocViewer config={generatedReport} />
    </div>
  {:else if !isGenerating}
    <div class="p-8 border-2 border-dashed border-slate-200 dark:border-white/[0.04] rounded-2xl text-center flex flex-col items-center gap-2">
      <svg class="w-8 h-8 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <p class="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold max-w-[68ch]">Select a template above and click "Generate Technical Report"</p>
      <p class="text-xs font-mono text-slate-500 dark:text-slate-400 max-w-[68ch]">Produces rich, self-contained HTML/Markdown documents with export buttons.</p>
    </div>
  {/if}

</div>
