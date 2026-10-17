<script lang="ts">
  import { configureData } from '@sola-air-ui/core';
  import SolaMount from './SolaMount.svelte';
  import mountSheet from '$lib/pages/DataSheetDemo.sola';
  import mountNodes from '$lib/pages/DataNodesDemo.sola';
  import sheetSource from '$lib/pages/DataSheetDemo.sola?raw';
  import nodesSource from '$lib/pages/DataNodesDemo.sola?raw';

  // The demo files below call `$data` exactly as an app would. Here the request
  // goes to a small endpoint on this site, not to a Sola Relay on someone's
  // machine, so it works without a database. Nothing else on the site uses $data.
  configureData({ relayEndpoint: '/api/demo-relay' });

  let activeMode = $state<'sheet' | 'postgres'>('sheet');
  const source = $derived(activeMode === 'sheet' ? sheetSource : nodesSource);
  const component = $derived(activeMode === 'sheet' ? mountSheet : mountNodes);
</script>

<section class="w-full py-16 border-t border-slate-200/80 dark:border-white/[0.04] relative" aria-labelledby="data-demo-heading">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.04] text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold mb-3">
          <span>$data • Live data</span>
        </div>
        <h2 id="data-demo-heading" class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-[-0.03em]">
          Read live data as a signal.
        </h2>
        <p class="text-slate-600 dark:text-slate-400 text-base max-w-xl mt-2 leading-relaxed">
          <code class="font-mono text-[0.9em]">$data</code> asks the Sola Relay for rows from PostgreSQL, MySQL or a Google Sheet and gives your markup a signal with <code class="font-mono text-[0.9em]">loading</code>, <code class="font-mono text-[0.9em]">data</code> and <code class="font-mono text-[0.9em]">error</code>. The relay runs on your machine or network, so database credentials stay out of the browser.
        </p>
      </div>

      <div class="flex items-center gap-1.5 bg-slate-100/90 dark:bg-white/[0.08] p-1.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.04] self-start md:self-auto shadow-xs" role="group" aria-label="Data source">
        <button
          type="button"
          aria-pressed={activeMode === 'sheet'}
          onclick={() => activeMode = 'sheet'}
          class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap {activeMode === 'sheet' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/15 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
          Google Sheet
        </button>
        <button
          type="button"
          aria-pressed={activeMode === 'postgres'}
          onclick={() => activeMode = 'postgres'}
          class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap {activeMode === 'postgres' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/15 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
          PostgreSQL
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      <div class="lg:col-span-7 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl min-w-0">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <span class="text-xs font-mono font-semibold text-slate-300">
            {activeMode === 'sheet' ? 'DataSheetDemo.sola' : 'DataNodesDemo.sola'}
          </span>
          <span class="text-xs font-mono text-slate-400">the file running on the right</span>
        </div>
        <!-- A scroll region must take keyboard focus (axe scrollable-region-focusable). -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <pre class="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre" role="region" aria-label="DataDemo.sola source" tabindex="0" data-testid="data-demo-source"><code>{source}</code></pre>
      </div>

      <div class="lg:col-span-5 bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between gap-8">
        <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 p-5 min-h-[200px]" data-testid="data-demo-live">
          {#key activeMode}
            <SolaMount {component} />
          {/key}
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-[60ch]">
          Sample rows from a demo endpoint on this site, fetched with the real <code class="font-mono">$data</code> and refreshed every 15 seconds. In your app the same line reaches your own Sola Relay.
        </p>
      </div>
    </div>

  </div>
</section>
