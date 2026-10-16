<script lang="ts">
  import DataCard from './DataCard.svelte';
  import GaugeCard from './GaugeCard.svelte';

  let activeMode = $state<'sheets' | 'postgres'>('sheets');
  let isSimulatingUpdate = $state(false);

  // Financial Operations Sheet State
  let financeData = $state({
    mrr: '$184,200',
    mrrDelta: '+$14,800 this month',
    cashRunway: '24 Months',
    burnRate: '$18,500 / mo',
    ltvCac: 4.8,
    grossMargin: 88
  });

  // Enterprise Cluster PostgreSQL Data
  let clusterData = $state({
    activePods: '128 / 128',
    podDelta: '100% healthy',
    clusterUptime: '99.99%',
    cpuLoad: 42,
    p99Latency: '14.2 ms'
  });

  function simulateNewEntry() {
    isSimulatingUpdate = true;
    setTimeout(() => {
      financeData = {
        ...financeData,
        mrr: '$198,400',
        mrrDelta: '+$29,000 this month',
        grossMargin: 91
      };
      isSimulatingUpdate = false;
    }, 500);
  }
</script>

<section class="w-full py-16 border-t border-slate-200/80 dark:border-white/[0.04] relative">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Section Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.04] text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold mb-3">
          <span>$data • Live data</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-[-0.03em]">
          Bind a Google Sheet or a database in one line.
        </h2>
        <p class="text-slate-600 dark:text-slate-400 text-base max-w-xl mt-2 leading-relaxed">
          Whether you're building a <strong>financial operations dashboard from Google Sheets</strong> or an <strong>infrastructure monitor from PostgreSQL</strong>, the data arrives as a signal your markup can read. Sources go through the Sola Relay, which also supports MySQL.
        </p>
      </div>

      <!-- Segmented Mode Switcher -->
      <div class="flex items-center gap-1.5 bg-slate-100/90 dark:bg-white/[0.08] p-1.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.04] self-start md:self-auto shadow-xs">
        <button
          onclick={() => activeMode = 'sheets'}
          class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 {activeMode === 'sheets' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/15 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
          <svg class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <span>Google Sheets Relay</span>
        </button>
        <button
          onclick={() => activeMode = 'postgres'}
          class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 {activeMode === 'postgres' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/15 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
          <svg class="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
          <span>PostgreSQL Cluster</span>
        </button>
      </div>
    </div>

    <!-- Interactive Live Surface Display -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      
      <!-- Code View Column -->
      <div class="lg:col-span-5 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span class="text-xs font-mono font-semibold text-slate-300">
                {activeMode === 'sheets' ? 'App.sola (Financial Ops Sheet)' : 'App.sola (PostgreSQL Cluster)'}
              </span>
            </div>
            <span class="text-xs font-mono bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-amber-300">
              zero-vdom
            </span>
          </div>

          <pre class="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre"><code>{#if activeMode === 'sheets'}&lt;script&gt;
  // 1 line Google Sheets reactive binding
  const finance = $data("sheet://1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
&lt;/script&gt;

&lt;!-- Sola auto-mounts reactive UI --&gt;
&lt;DataCard 
  title="Monthly Recurring Revenue" 
  value="&#123;finance.mrr&#125;" 
  trend="&#123;finance.delta&#125;" 
/&gt;
&lt;GaugeCard 
  title="Gross Margin" 
  value="&#123;finance.margin&#125;%" 
  percentage=&#123;finance.margin&#125; 
/&gt;{:else}&lt;script&gt;
  // Database connector (credentials stay in your local relay)
  const cluster = $data("postgres://internal/nodes");
&lt;/script&gt;

&lt;DataCard title="Active Pods" value="&#123;cluster.pods&#125;" trend="&#123;cluster.health&#125;" /&gt;
&lt;GaugeCard title="Cluster CPU" value="&#123;cluster.cpu&#125;%" /&gt;{/if}</code></pre>
        </div>

        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>Polling interval: 15s</span>
          <span class="text-blue-400 font-bold">Auto-Synchronized</span>
        </div>
      </div>

      <!-- Live Rendered UI Column -->
      <div class="lg:col-span-7 bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
        
        <div>
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {activeMode === 'sheets' ? 'Google Sheet Stream: Finance Operations' : 'PostgreSQL Stream: Cloud Nodes'}
              </span>
            </div>
            {#if activeMode === 'sheets'}
              <button 
                onclick={simulateNewEntry}
                disabled={isSimulatingUpdate}
                class="text-xs font-mono font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 px-3.5 py-2 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5">
                {#if isSimulatingUpdate}
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Syncing...</span>
                {:else}
                  <svg class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Simulate Sheet Row Insert</span>
                {/if}
              </button>
            {/if}
          </div>

          <!-- Live Rendered Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#if activeMode === 'sheets'}
              <DataCard config={{
                title: "Monthly Recurring Revenue",
                value: financeData.mrr,
                trend: financeData.mrrDelta,
                icon: "trending-up"
              }} />
              <DataCard config={{
                title: "Cash Runway",
                value: financeData.cashRunway,
                trend: `Burn: ${financeData.burnRate}`,
                icon: "activity"
              }} />
              <div class="sm:col-span-2">
                <GaugeCard config={{
                  title: "Gross Margin Rate",
                  value: `${financeData.grossMargin}%`,
                  percentage: financeData.grossMargin,
                  subtext: `LTV/CAC Ratio: ${financeData.ltvCac}x (Healthy SaaS Unit Economics)`,
                  color: "amber"
                }} />
              </div>
            {:else}
              <DataCard config={{
                title: "Active Pods",
                value: clusterData.activePods,
                trend: clusterData.podDelta,
                icon: "check"
              }} />
              <DataCard config={{
                title: "Cluster Uptime",
                value: clusterData.clusterUptime,
                trend: `p99: ${clusterData.p99Latency}`,
                icon: "activity"
              }} />
              <div class="sm:col-span-2">
                <GaugeCard config={{
                  title: "Global CPU Utilization",
                  value: `${clusterData.cpuLoad}%`,
                  percentage: clusterData.cpuLoad,
                  subtext: "Distributed across 3 AWS Availability Zones",
                  color: "sky"
                }} />
              </div>
            {/if}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>Zero VDOM • Direct DOM Mutator</span>
          <span class="text-slate-600 dark:text-slate-400 font-bold">Latency: 0.2ms</span>
        </div>

      </div>

    </div>

  </div>
</section>
