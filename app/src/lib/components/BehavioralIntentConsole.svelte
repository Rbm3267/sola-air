<script lang="ts">
  import { behavioralObserver, type BehavioralMetrics } from '../../../../packages/behavior/src/index';
  import { 
    MajorIncidentContract, 
    AwsDrainNodeContract, 
    StripeDunningNoticeContract, 
    PostgresKillLocksContract 
  } from '../../../../packages/behavior/src/playbooks';
  import AdaptiveActionTrigger from './AdaptiveActionTrigger.svelte';
  import IncidentTriageMatrix from './IncidentTriageMatrix.svelte';
  import FlowWaterfall from './FlowWaterfall.svelte';
  import DataCard from './DataCard.svelte';
  import GaugeCard from './GaugeCard.svelte';
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  let metrics = $state<BehavioralMetrics>({
    typingVelocityCps: 0,
    activeDwellTarget: null,
    dwellDurationMs: 0,
    rageClickCount: 0,
    persona: 'visual_explorer',
    densityMode: 'comfortable'
  });

  let testInput = $state('');
  let actionLog = $state<string[]>([]);

  onMount(() => {
    return behavioralObserver.subscribe((m) => {
      metrics = m;
    });
  });

  function handleTyping() {
    behavioralObserver.registerKeyStroke();
  }

  // Mouse events (desktop)
  function handleHoverStart(target: string) {
    behavioralObserver.registerHoverStart(target, undefined, 800);
  }

  function handleHoverEnd(target: string) {
    behavioralObserver.registerHoverEnd(target);
  }

  // Touch events (mobile long-press = hover dwell)
  function handleTouchStart(target: string) {
    behavioralObserver.registerTouchStart(target, undefined, 800);
  }

  function handleTouchMove() {
    behavioralObserver.registerTouchMove();
  }

  function handleTouchEnd(target: string) {
    behavioralObserver.registerTouchEnd(target);
  }

  function handleNodeClick(target: string) {
    behavioralObserver.registerClick(target);
  }

  function handleActionExecuted(res: any) {
    const timeStr = new Date().toTimeString().split(' ')[0];
    actionLog = [`[${timeStr}] ✅ ${res.message || 'Action executed'}`, ...actionLog.slice(0, 4)];
  }

  function resetState() {
    behavioralObserver.resetUrgency();
    testInput = '';
  }
</script>

<div class="w-full flex flex-col gap-6">
  
  <!-- Top Behavioral Vector Telemetry HUD -->
  <div class="bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-5 sm:p-6 shadow-sm text-slate-900 dark:text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
    
    <!-- Ambient Persona Subtle Glow -->
    <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none {metrics.persona === 'sre_commander' ? 'bg-rose-500' : metrics.persona === 'finops_auditor' ? 'bg-violet-500' : 'bg-blue-500'}"></div>

    <div class="flex items-center gap-4 relative z-10">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm {metrics.persona === 'sre_commander' ? 'bg-gradient-to-br from-rose-500 to-amber-600' : metrics.persona === 'finops_auditor' ? 'bg-gradient-to-br from-violet-600 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}">
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Dual-Driver Persona:</span>
          <span class="text-xs font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border {metrics.persona === 'sre_commander' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' : metrics.persona === 'finops_auditor' ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'}">
            {metrics.persona === 'sre_commander' ? 'SRE Incident Commander' : metrics.persona === 'finops_auditor' ? 'FinOps Cloud Auditor' : 'Visual Explorer'}
          </span>
        </div>
        <h3 class="text-lg font-bold font-sans mt-0.5 text-slate-950 dark:text-slate-50">
          Dual-Driver ActionContract Protocol (Data + Behavior)
        </h3>
      </div>
    </div>

    <!-- Live Telemetry Readout Chips -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto relative z-10 font-mono text-xs">
      <div class="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.04] flex flex-col gap-0.5">
        <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Typing Cadence</span>
        <span class="text-amber-600 dark:text-amber-400 font-bold">{metrics.typingVelocityCps} chars/sec</span>
      </div>
      <div class="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.04] flex flex-col gap-0.5">
        <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Hover Dwell</span>
        <span class="text-sky-600 dark:text-sky-400 font-bold">{metrics.activeDwellTarget ? `${metrics.activeDwellTarget}` : 'None'}</span>
      </div>
      <div class="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.04] flex flex-col gap-0.5 col-span-2 sm:col-span-1">
        <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Rage Click Vector</span>
        <span class="{metrics.rageClickCount >= 2 ? 'text-rose-600 dark:text-rose-400 font-bold animate-pulse' : 'text-slate-700 dark:text-slate-300 font-bold'}">{metrics.rageClickCount} Clicks / 600ms</span>
      </div>
    </div>

  </div>

  <!-- Interactive Test Playground Bar -->
  <div class="bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
    <div class="flex-1 w-full flex items-center gap-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] rounded-2xl px-4 py-2.5 focus-within:border-blue-500 focus-within:bg-white dark:bg-white/[0.02] transition-all">
      <svg class="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      <input 
        type="text"
        bind:value={testInput}
        oninput={handleTyping}
        placeholder="Type fast here: 'kubectl drain node-iad1 --ignore-daemonsets' to trigger SRE Mode..."
        class="w-full bg-transparent text-xs sm:text-sm font-mono text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
      />
    </div>
    
    <div class="flex items-center gap-2 shrink-0">
      <button 
        onclick={resetState}
        class="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all cursor-pointer">
        Reset Vectors
      </button>
    </div>
  </div>

  <!-- Action Log Banner (if actions executed) -->
  {#if actionLog.length > 0}
    <div 
      transition:fly={{ y: -8, duration: 200 }}
      class="p-4 rounded-2xl bg-blue-950/80 border border-blue-800/80 text-blue-300 font-mono text-xs flex flex-col gap-1 shadow-sm">
      <span class="text-xs font-semibold uppercase tracking-wider text-blue-400">Playbook Execution Audit Log:</span>
      {#each actionLog as log}
        <div>{log}</div>
      {/each}
    </div>
  {/if}

  <!-- Adaptive Surface Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    
    <!-- Column 1: Major Incident Card with Adaptive Trigger -->
    <div class="lg:col-span-6 flex flex-col gap-4">
      
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        onmouseenter={() => handleHoverStart('incident')}
        onmouseleave={() => handleHoverEnd('incident')}
        ontouchstart={() => handleTouchStart('incident')}
        ontouchmove={handleTouchMove}
        ontouchend={() => handleTouchEnd('incident')}
        class="relative group cursor-pointer transition-all">
        
        <div class="absolute -top-3 left-4 z-20 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold shadow-sm flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>Enterprise Incident (Hold to inspect)</span>
        </div>

        <IncidentTriageMatrix config={{
          incidentId: "INC009481",
          title: "API Gateway Ingress Spike (EU-West)",
          severity: "P1 - Critical",
          slaRemainingMin: 8,
          blastRadius: "42,000 Active Checkout Sessions",
          playbooks: []
        }} />

        <!-- DUAL-DRIVER ACTION CONTRACT TRIGGER -->
        <div class="mt-2 flex justify-end">
          <AdaptiveActionTrigger 
            action={MajorIncidentContract} 
            data={{ severity: "P1 - Critical", incidentId: "INC009481" }}
            recordId="INC009481"
            onExecute={handleActionExecuted}
          />
        </div>

      </div>

    </div>

    <!-- Column 2: AWS / Kubernetes Degraded Node with Rage Click Trigger -->
    <div class="lg:col-span-6 flex flex-col gap-6">
      
      <!-- Rage Click Target -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        onclick={() => handleNodeClick('degraded-node')}
        ontouchend={() => handleNodeClick('degraded-node')}
        class="relative group cursor-pointer transition-all">
        
        <div class="absolute -top-3 left-4 z-20 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold shadow-sm flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          <span>AWS Worker (Tap 3x rapidly)</span>
        </div>

        <GaugeCard config={{
          title: "AWS Worker CPU Saturation",
          value: "94.2%",
          percentage: 94,
          subtext: "High load on cluster shard 3",
          color: "amber"
        }} />

        <!-- DUAL-DRIVER KINETIC ACTION TRIGGER -->
        <div class="mt-2 flex justify-end">
          <AdaptiveActionTrigger 
            action={AwsDrainNodeContract} 
            data={{ percentage: 94, nodeId: "i-09f4812a" }}
            recordId="i-09f4812a"
            onExecute={handleActionExecuted}
          />
        </div>

      </div>

      <!-- Stripe / FinOps Hover Target -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        onmouseenter={() => handleHoverStart('finops')}
        onmouseleave={() => handleHoverEnd('finops')}
        ontouchstart={() => handleTouchStart('finops')}
        ontouchmove={handleTouchMove}
        ontouchend={() => handleTouchEnd('finops')}
        class="relative group cursor-pointer transition-all">
        
        <div class="absolute -top-3 left-4 z-20 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold shadow-sm flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
          <span>FinOps Revenue (Hold to inspect)</span>
        </div>

        <FlowWaterfall config={{
          title: "SaaS Gross Revenue Realization",
          subtitle: "Stripe Billing & Cloud Cost Ledger",
          steps: [
            { label: "Gross ARR Billing", amount: "$184,200", type: "positive", note: "Tier 1 Enterprise Subscriptions" },
            { label: "Payment Gateway Fees", amount: "-$5,340", type: "negative", note: "2.9% Stripe processing" },
            { label: "Net Bank Realization", amount: "$178,860", type: "subtotal", note: "Clearing to corporate treasury" }
          ]
        }} />

        <!-- DUAL-DRIVER STRIPE DUNNING TRIGGER -->
        <div class="mt-2 flex justify-end">
          <AdaptiveActionTrigger 
            action={StripeDunningNoticeContract} 
            data={{ invoiceId: "in_1N8f92a", amount: "$184,200" }}
            recordId="in_1N8f92a"
            onExecute={handleActionExecuted}
          />
        </div>

      </div>

    </div>

  </div>

</div>
