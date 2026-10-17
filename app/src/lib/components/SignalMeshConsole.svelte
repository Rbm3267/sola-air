<script lang="ts">
  import TactileDialCard from './TactileDialCard.svelte';
  import GaugeCard from './GaugeCard.svelte';
  import FlowWaterfall from './FlowWaterfall.svelte';
  import StreamView from './StreamView.svelte';
  import DataCard from './DataCard.svelte';
  import { onMount } from 'svelte';

  // Shared Reactive Signal Mesh State
  let nodeCount = $state(36);
  let signalPackets = $state<Array<{ id: string; topic: string; value: string | number; delta: string; latencyMs: number; time: string }>>([
    { id: 'sig-1', topic: 'aws/cluster/worker_nodes', value: 36, delta: 'INITIAL', latencyMs: 0.18, time: '00:00:01' }
  ]);
  let isEmitting = $state(false);

  // Derived Values calculated instantaneously via fine-grained signals
  const cpuUtilization = $derived(Math.min(98, Math.max(14, Math.round(2400 / nodeCount))));
  const p99Latency = $derived((140 / nodeCount + 3.8).toFixed(1));
  const grossMonthlyCost = $derived(nodeCount * 148);
  const reservedSavings = $derived(Math.round(grossMonthlyCost * 0.28));
  const netMonthlyCost = $derived(grossMonthlyCost - reservedSavings);

  function handleNodeChange(newCount: number) {
    if (newCount === nodeCount) return;
    const prev = nodeCount;
    nodeCount = newCount;
    isEmitting = true;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    signalPackets = [
      {
        id: `sig-${Date.now()}`,
        topic: 'aws/cluster/worker_nodes',
        value: newCount,
        delta: `${newCount > prev ? '+' : ''}${newCount - prev} nodes`,
        latencyMs: Number((Math.random() * 0.15 + 0.12).toFixed(2)),
        time: timeStr
      },
      ...signalPackets.slice(0, 19)
    ];

    setTimeout(() => { isEmitting = false; }, 200);
  }

  // Pre-configured waterfall steps based on dynamic signals
  const waterfallSteps = $derived([
    { label: "Gross EC2 Compute", amount: `$${grossMonthlyCost.toLocaleString()}`, type: "positive" as const, note: `${nodeCount} c6i.2xlarge instances` },
    { label: "3-Year Reserved Savings", amount: `-$${reservedSavings.toLocaleString()}`, type: "negative" as const, note: "Enterprise FinOps tier (28% off)" },
    { label: "Edge Egress Bandwidth", amount: "$3,420", type: "negative" as const, note: "142 TB / mo global routing" },
    { label: "Net Cloud Realization", amount: `$${(netMonthlyCost + 3420).toLocaleString()}`, type: "subtotal" as const, note: "Live monthly ledger run-rate" }
  ]);
</script>

<div class="w-full flex flex-col gap-6">
  
  <!-- Signal Bus Status Banner -->
  <div class="bg-white/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div class="flex items-center gap-3.5">
      <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0 shadow-2xs">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-base sm:text-lg font-bold text-slate-950 dark:text-slate-50 font-sans tracking-tight">
            Ambient Signal Telemetry Mesh
          </h3>
          <span class="text-xs font-mono font-semibold uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span>4 Linked Widgets</span>
          </span>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5 max-w-[68ch]">
          Zero-VDOM bus: modifying one widget triggers instant microtask signal mutations across all subscribers (sub-0.2ms).
        </p>
      </div>
    </div>

    <!-- Quick Presets -->
    <div class="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto no-scrollbar">
      <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mr-1">Throttle:</span>
      <button 
        onclick={() => handleNodeChange(16)}
        class="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold cursor-pointer transition-all {nodeCount === 16 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200'}">
        Low (16)
      </button>
      <button 
        onclick={() => handleNodeChange(36)}
        class="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold cursor-pointer transition-all {nodeCount === 36 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200'}">
        Optimal (36)
      </button>
      <button 
        onclick={() => handleNodeChange(84)}
        class="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold cursor-pointer transition-all {nodeCount === 84 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200'}">
        High Scale (84)
      </button>
    </div>
  </div>

  <!-- Synchronized 4-Widget Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    
    <!-- Widget 1: Rotary Touch Controller -->
    <div class="lg:col-span-4 flex flex-col gap-4">
      <div class="relative group">
        <div class="absolute -top-3 left-4 z-20 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold shadow-sm flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          <span>Source Signal Publisher</span>
        </div>
        
        <div class="bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 shadow-xs flex flex-col items-center gap-4">
          <div class="text-center">
            <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Topic: aws/cluster/worker_nodes</span>
            <div class="text-2xl font-black text-slate-950 dark:text-slate-50 font-mono mt-0.5">{nodeCount} Nodes Active</div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[68ch]">Use slider to adjust cluster replica quota</p>
          </div>

          <!-- Interactive Slider -->
          <div class="w-full flex flex-col gap-2 mt-2">
            <input 
              type="range" 
              aria-label="Cluster replica quota"
              min="8" 
              max="128" 
              step="2"
              value={nodeCount}
              oninput={(e) => handleNodeChange(Number((e.target as HTMLInputElement).value))}
              class="w-full h-2 bg-slate-100 dark:bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div class="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>8 Min</span>
              <span class="font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">{nodeCount} Workers</span>
              <span>128 Max</span>
            </div>
          </div>

          <div class="w-full pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>Cluster Sharding:</span>
            <span class="font-bold text-slate-900 dark:text-white">{Math.ceil(nodeCount / 4)} AZ Partitions</span>
          </div>
        </div>
      </div>

      <!-- Quick KPI Card -->
      <div class="relative group">
        <DataCard config={{
          title: "p99 Ingress Latency",
          value: `${p99Latency} ms`,
          trend: nodeCount > 40 ? "Optimal Low Latency" : "Elevated Queue Time",
          icon: "activity"
        }} />
      </div>
    </div>

    <!-- Widget 2 & 3: Reactive Subscribers -->
    <div class="lg:col-span-8 flex flex-col gap-6">
      
      <!-- Top Row: Subscriber Gauge & Live Signal Log -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        
        <!-- Subscriber Gauge -->
        <div class="relative group">
          <div class="absolute -top-3 left-4 z-20 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold shadow-sm flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>Signal Subscriber 1</span>
          </div>

          <GaugeCard config={{
            title: "Cluster CPU Load",
            value: `${cpuUtilization}%`,
            percentage: cpuUtilization,
            subtext: `Inversely derived from ${nodeCount} active worker nodes`,
            color: cpuUtilization > 75 ? 'amber' : 'emerald'
          }} />
        </div>

        <!-- Live Telemetry Log -->
        <div class="relative group">
          <div class="absolute -top-3 left-4 z-20 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold shadow-sm flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>Live Signal Bus Stream</span>
          </div>

          <div class="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl h-full flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <span class="text-xs font-mono font-semibold text-slate-300">telemetry://signal-bus</span>
                <span class="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">0.2ms Subtask</span>
              </div>
              
              <div class="flex flex-col gap-2 max-h-[140px] overflow-y-auto no-scrollbar font-mono text-xs">
                {#each signalPackets as sig (sig.id)}
                  <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                    <span class="text-sky-400 truncate max-w-[140px]">{sig.topic}</span>
                    <span class="text-slate-200 font-bold">{sig.value}</span>
                    <span class="text-blue-400 text-xs">{sig.latencyMs}ms</span>
                  </div>
                {/each}
              </div>
            </div>

            <div class="text-xs font-mono text-slate-500 dark:text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between mt-3">
              <span>Bus Throughput: 4,200 msg/s</span>
              <span class="text-blue-400 font-bold">100% Synced</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Subscriber 2: Dynamic FinOps Waterfall -->
      <div class="relative group">
        <div class="absolute -top-3 left-4 z-20 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold shadow-sm flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
          <span>Signal Subscriber 2 • FinOps Ledger</span>
        </div>

        <FlowWaterfall config={{
          title: "Cloud Infrastructure Cost Realization",
          subtitle: `Dynamically cascading monthly run-rate for ${nodeCount} active nodes`,
          steps: waterfallSteps
        }} />
      </div>

    </div>

  </div>

</div>
