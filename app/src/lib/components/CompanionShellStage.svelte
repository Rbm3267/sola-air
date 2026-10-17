<script lang="ts">
  import SolaLogo from './SolaLogo.svelte';
  import SolaIcons from './SolaIcons.svelte';
  import SolaMount from './SolaMount.svelte';
  import Table from '@sola-air-ui/ui/Table.sola';
  import IntentCard from '@sola-air-ui/ui/IntentCard.sola';
  import { mountShell } from '@sola-air-ui/core';
  import { onDestroy } from 'svelte';

  // The companion really is mounted by mountShell() into a closed shadow root
  // inside this stage, and the inspector reports what the live DOM says about
  // it. Design tokens are CSS custom properties, which inherit into the shadow
  // tree, so the shell matches the page theme without extra CSS.
  let inspectShadow = $state(true);
  let shellParent = $state<HTMLDivElement | null>(null);
  let shell: ReturnType<typeof mountShell> | null = null;
  let facts = $state<{ mode: string; hostShadowRoot: string; pageQuery: string; nodes: number } | null>(null);
  let appliedRunbook = $state(false);
  let activeTicket = $state('INC-0049218');

  const hostRows = [
    { ticket: 'INC-0049218', service: 'Auth Token Gateway', status: 'Investigating', latency: '320ms' },
    { ticket: 'INC-0049224', service: 'Postgres Read Replica', status: 'Mitigating', latency: '48ms' },
    { ticket: 'INC-0049231', service: 'Edge TLS Router', status: 'Nominal', latency: '11ms' }
  ];

  const hostColumns = [
    { key: 'ticket', label: 'Ticket' },
    { key: 'service', label: 'Service' },
    { key: 'status', label: 'Status' },
    { key: 'latency', label: 'p99' }
  ];

  const intentPayload = $derived({
    title: `Context • ${activeTicket}`,
    value: appliedRunbook ? 'Pool Scaled (64)' : 'Pool Exhaustion',
    trend: appliedRunbook
      ? '✓ Runbook RB-402 applied across 4 regions'
      : '94% match • 3 similar incidents resolved via RB-402'
  });

  $effect(() => {
    const props = { data: intentPayload };
    if (!shellParent) return;
    shell?.teardown();
    shell = mountShell(IntentCard, props, { id: 'sola-home-companion', shadow: 'closed', parent: shellParent });
    const root = shell.root as ShadowRoot;
    facts = {
      mode: root.mode,
      // A closed root is invisible to page scripts: host.shadowRoot is null...
      hostShadowRoot: shell.host.shadowRoot === null ? 'null' : 'exposed',
      // ...and a page-level query cannot reach the card inside it.
      pageQuery: shellParent.querySelector('[data-sola-root] *') ? 'reaches inside' : 'finds nothing',
      nodes: root.querySelectorAll('*').length
    };
  });

  onDestroy(() => shell?.teardown());
</script>

<section class="w-full py-16 sm:py-20 border-t border-slate-200/80 dark:border-white/[0.06] relative" aria-labelledby="shell-stage-heading">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Header Row -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div>
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200/80 dark:border-violet-500/20 text-violet-800 dark:text-violet-300 text-xs font-mono font-semibold mb-3 whitespace-nowrap leading-none">
          <SolaIcons name="shell" size={14} />
          <span>mountShell() • Closed Shadow DOM Overlay</span>
        </div>
        <h2 id="shell-stage-heading" class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Drop an ambient companion into any existing web app.
        </h2>
        <p class="text-slate-600 dark:text-slate-400 text-base max-w-2xl mt-2 leading-relaxed">
          You don't have to rewrite your portal to adopt Sola AIR. <code class="font-mono text-[0.9em] text-blue-700 dark:text-blue-400">mountShell()</code> mounts any compiled component inside a closed shadow root, so host CSS can't reach it. On the right, it is mounting a real <code class="font-mono text-[0.9em] text-violet-700 dark:text-violet-400">IntentCard</code> next to this page's own markup.
        </p>
      </div>

      <button
        aria-pressed={inspectShadow}
        onclick={() => (inspectShadow = !inspectShadow)}
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none self-start md:self-auto {inspectShadow
          ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
          : 'bg-white dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/15'}">
        <span class="w-2 h-2 rounded-full {inspectShadow ? 'bg-white' : 'bg-blue-500'} shrink-0"></span>
        <span>Shadow DOM inspector</span>
      </button>
    </div>

    <!-- Browser Window Stage -->
    <div class="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-xl overflow-hidden">
      <!-- Browser Chrome Bar -->
      <div class="px-4 sm:px-6 py-3 bg-slate-50/90 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-400/80"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
          <span class="ml-2 px-3 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 inline-flex items-center gap-2 whitespace-nowrap leading-none">
            <span class="text-slate-500 dark:text-slate-400">https://</span>ops-portal.internal/incidents/{activeTicket}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-xs font-mono font-medium text-blue-800 dark:text-blue-300 whitespace-nowrap leading-none">
            <span>Host page + #sola-home-companion</span>
          </span>
        </div>
      </div>

      <!-- Split Stage: Legacy Host Workspace (Left) + Sola Companion Shell (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 relative">
        <!-- Left: Host Enterprise Portal (7 Cols) -->
        <div class="lg:col-span-7 p-6 sm:p-8 bg-slate-50/60 dark:bg-white/[0.01] border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-6">
          <div class="space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <SolaIcons name="layers" size={16} gradient={false} />
                </div>
                <div>
                  <span class="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Existing Host Document</span>
                  <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Operations Queue • Active Incidents</h3>
                </div>
              </div>
            </div>

            <!-- Real Compiled @sola-air-ui/ui/Table.sola -->
            <div class="bg-white dark:bg-slate-900/90 rounded-2xl shadow-2xs">
              <SolaMount
                component={Table}
                props={{
                  columns: hostColumns,
                  rows: hostRows,
                  striped: true,
                  onRowClick: (row: { ticket: string }) => {
                    activeTicket = row.ticket;
                    appliedRunbook = false;
                  }
                }}
              />
            </div>

            <!-- Simulated Ticket Selection Pills -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Inspect ticket:</span>
              {#each hostRows as row}
                <button
                  onclick={() => {
                    activeTicket = row.ticket;
                    appliedRunbook = false;
                  }}
                  class="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap leading-none {activeTicket === row.ticket
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'}">
                  {row.ticket}
                </button>
              {/each}
            </div>
          </div>

          <p class="pt-4 border-t border-slate-200/70 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            In a multi-page portal, keep the shell's state in <code class="text-blue-700 dark:text-blue-400">$persist</code> and run the same <code class="text-blue-700 dark:text-blue-400">mountShell()</code> bootstrap on every page.
          </p>
        </div>

        <!-- Right: Closed Shadow DOM Companion Drawer (5 Cols) -->
        <div class="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-b from-sky-50/50 via-white to-violet-50/30 dark:from-blue-950/20 dark:via-[#0c1222] dark:to-violet-950/20 relative flex flex-col justify-between gap-6 {inspectShadow ? 'ring-2 ring-inset ring-blue-500/60 dark:ring-sky-400/50' : ''}">
          {#if inspectShadow && facts}
            <dl class="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-mono shadow-xs" data-testid="shadow-facts" aria-label="Read from the live DOM">
              <dt class="text-blue-100">shadow root</dt><dd>#shadow-root ({facts.mode})</dd>
              <dt class="text-blue-100">host.shadowRoot</dt><dd>{facts.hostShadowRoot}</dd>
              <dt class="text-blue-100">page querySelector</dt><dd>{facts.pageQuery}</dd>
              <dt class="text-blue-100">nodes inside</dt><dd>{facts.nodes}</dd>
            </dl>
          {/if}

          <div class="space-y-4">
            <!-- Companion Header with Real Sola Sun Logo -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <SolaLogo size={24} />
                <div>
                  <h3 class="text-sm font-semibold text-slate-900 dark:text-white leading-tight">Sola Companion Shell</h3>
                  <span class="text-xs font-mono text-blue-700 dark:text-blue-400">Ambient Intent Resolution</span>
                </div>
              </div>
            </div>

            <!-- Real Compiled @sola-air-ui/ui/IntentCard.sola -->
            <div bind:this={shellParent} data-testid="shell-parent"></div>

            <!-- Action Bar -->
            <div class="p-4 rounded-2xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3 shadow-2xs">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-slate-600 dark:text-slate-300 font-medium">Suggested Runbook: RB-402</span>
                <span class="text-blue-700 dark:text-blue-400">Drain &amp; scale pool</span>
              </div>
              <div class="flex items-center gap-2.5">
                <button
                  onclick={() => (appliedRunbook = true)}
                  class="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap leading-none">
                  <span>{appliedRunbook ? '✓ Runbook Applied' : 'Apply Runbook'}</span>
                </button>
                <button
                  onclick={() => (appliedRunbook = false)}
                  class="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap leading-none">
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          <div class="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/10">
            <span>Real <code class="text-blue-700 dark:text-blue-400">Table</code> (page DOM) and <code class="text-blue-700 dark:text-blue-400">IntentCard</code> (shadow root)</span>
            <a href="/preview" class="text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap">Open Simulator →</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
