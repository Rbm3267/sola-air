<script lang="ts">
  export interface ClusterNode {
    id: string;
    label: string;
    status: 'nominal' | 'warning' | 'critical' | 'draining' | 'idle';
    load?: number; // 0-100
    latency?: string;
    region?: string;
  }

  export interface ClusterMatrixConfig {
    title: string;
    subtitle?: string;
    nodes?: ClusterNode[];
    aggregateStatus?: string;
  }

  let { config } = $props<{ config: ClusterMatrixConfig }>();

  let hoveredNode = $state<ClusterNode | null>(null);

  const defaultNodes: ClusterNode[] = [
    { id: 'node-01', label: 'us-east-1a • rds-primary', status: 'nominal', load: 24, latency: '1.2ms', region: 'us-east-1' },
    { id: 'node-02', label: 'us-east-1b • rds-replica-1', status: 'nominal', load: 38, latency: '1.8ms', region: 'us-east-1' },
    { id: 'node-03', label: 'us-east-1c • rds-replica-2', status: 'nominal', load: 41, latency: '2.1ms', region: 'us-east-1' },
    { id: 'node-04', label: 'us-west-2a • edge-cache-01', status: 'warning', load: 78, latency: '18.4ms', region: 'us-west-2' },
    { id: 'node-05', label: 'us-west-2b • edge-cache-02', status: 'nominal', load: 29, latency: '2.4ms', region: 'us-west-2' },
    { id: 'node-06', label: 'eu-west-1a • auth-ingress-01', status: 'nominal', load: 33, latency: '12.1ms', region: 'eu-west-1' },
    { id: 'node-07', label: 'eu-west-1b • auth-ingress-02', status: 'critical', load: 94, latency: '142.8ms', region: 'eu-west-1' },
    { id: 'node-08', label: 'ap-northeast-1 • api-relay', status: 'nominal', load: 19, latency: '4.6ms', region: 'ap-northeast-1' },
    { id: 'node-09', label: 'ap-southeast-1 • cdn-edge', status: 'nominal', load: 36, latency: '5.2ms', region: 'ap-southeast-1' },
    { id: 'node-10', label: 'sa-east-1 • storage-sync', status: 'draining', load: 12, latency: '24.0ms', region: 'sa-east-1' },
    { id: 'node-11', label: 'ca-central-1 • worker-01', status: 'nominal', load: 45, latency: '3.1ms', region: 'ca-central-1' },
    { id: 'node-12', label: 'af-south-1 • telemetry-sink', status: 'idle', load: 5, latency: '32.4ms', region: 'af-south-1' }
  ];

  const nodes = $derived(config.nodes && config.nodes.length > 0 ? config.nodes : defaultNodes);

  const nominalCount = $derived(nodes.filter(n => n.status === 'nominal').length);
  const warningCount = $derived(nodes.filter(n => n.status === 'warning').length);
  const criticalCount = $derived(nodes.filter(n => n.status === 'critical').length);

  function getStatusColor(status: ClusterNode['status']) {
    switch (status) {
      case 'nominal': return 'bg-blue-500 shadow-blue-500/30';
      case 'warning': return 'bg-amber-500 shadow-amber-500/30 animate-pulse';
      case 'critical': return 'bg-rose-500 shadow-rose-500/40 animate-ping';
      case 'draining': return 'bg-indigo-500 shadow-indigo-500/20';
      case 'idle': return 'bg-slate-300';
    }
  }

  function getBorderColor(status: ClusterNode['status']) {
    switch (status) {
      case 'nominal': return 'border-blue-500/30 hover:border-blue-500';
      case 'warning': return 'border-amber-500/40 hover:border-amber-500';
      case 'critical': return 'border-rose-500/50 hover:border-rose-500';
      case 'draining': return 'border-indigo-500/30 hover:border-indigo-500';
      case 'idle': return 'border-slate-200 dark:border-white/[0.04]';
    }
  }
</script>

<div class="relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
  
  <!-- Header -->
  <div class="flex items-start justify-between gap-4 mb-6">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <h3 class="text-base font-bold text-slate-950 dark:text-slate-50 tracking-tight font-mono">{config.title || 'Cluster Topology Matrix'}</h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">{config.subtitle || `${nodes.length} Nodes Distributed Across 6 Global Regions`}</p>
    </div>

    <!-- Aggregate Status Pills -->
    <div class="flex items-center gap-1.5 flex-wrap justify-end">
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20/80 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        {nominalCount} Nominal
      </span>
      {#if warningCount > 0}
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-mono font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {warningCount} Degraded
        </span>
      {/if}
      {#if criticalCount > 0}
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-900 dark:text-rose-300 text-xs font-mono font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          {criticalCount} Critical
        </span>
      {/if}
    </div>
  </div>

  <!-- Interactive Node Matrix Grid -->
  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
    {#each nodes as node}
      <button 
        type="button"
        onmouseenter={() => hoveredNode = node}
        onmouseleave={() => hoveredNode = null}
        class="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border transition-all cursor-pointer group hover:bg-slate-100/90 dark:bg-white/[0.08] hover:scale-[1.03] {getBorderColor(node.status)}">
        
        <!-- Status Node Pip -->
        <div class="relative flex items-center justify-center mb-2">
          <span class="w-3.5 h-3.5 rounded-lg shadow-sm {getStatusColor(node.status)}"></span>
        </div>

        <span class="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate max-w-full text-center">
          {node.id}
        </span>
        
        <span class="text-xs font-mono text-slate-600 dark:text-slate-400 truncate max-w-full">
          {node.load !== undefined ? `${node.load}% load` : (node.latency || node.status)}
        </span>
      </button>
    {/each}
  </div>

  <!-- Hover Micro-Telemetry Drawer -->
  {#if hoveredNode}
    <div class="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4 animate-in">
      <div class="flex items-center gap-2.5">
        <span class="w-2.5 h-2.5 rounded-full {getStatusColor(hoveredNode.status)}"></span>
        <div>
          <span class="text-xs font-mono font-semibold text-slate-200">{hoveredNode.label}</span>
          <span class="text-xs font-mono text-slate-500 dark:text-slate-400 block">Region: {hoveredNode.region || 'global'} • Status: {hoveredNode.status.toUpperCase()}</span>
        </div>
      </div>
      <div class="flex items-center gap-4 text-right">
        {#if hoveredNode.load !== undefined}
          <div>
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400 block uppercase">CPU Load</span>
            <span class="text-xs font-mono font-semibold {hoveredNode.load > 80 ? 'text-rose-400' : 'text-blue-400'}">{hoveredNode.load}%</span>
          </div>
        {/if}
        {#if hoveredNode.latency}
          <div>
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400 block uppercase">Latency</span>
            <span class="text-xs font-mono font-semibold text-sky-400">{hoveredNode.latency}</span>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
      <span>Zero-VDOM Cluster Canvas</span>
      <span>Hover a node for live APM telemetry</span>
    </div>
  {/if}

</div>
