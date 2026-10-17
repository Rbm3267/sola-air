<script lang="ts">
  import { bus } from '@sola-air-ui/core';
  import SolaMount from './SolaMount.svelte';
  import mount from '$lib/pages/BusDemo.sola';
  import source from '$lib/pages/BusDemo.sola?raw';

  const QUESTION = 'How do I deploy?';

  // Bumping this key unmounts the component and mounts a fresh copy.
  let instance = $state(0);
  let sent = $state(0);

  function ask() {
    sent += 1;
    bus.emit('sola:ask', { text: QUESTION });
  }
</script>

<section class="w-full py-16 border-t border-slate-200/80 dark:border-white/[0.04]" aria-labelledby="bus-demo-heading">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-10 max-w-2xl">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.04] text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold mb-3">
        <span>$persist • $on • $lastEvent</span>
      </div>
      <h2 id="bus-demo-heading" class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-[-0.03em]">
        State that outlives the page. Events that never get dropped.
      </h2>
      <p class="text-slate-600 dark:text-slate-400 text-base mt-2 leading-relaxed max-w-[68ch]">
        A drawer or chat panel on a multi-page site loses its state on every full page load. <code class="font-mono text-[0.9em]">$persist</code> keeps a value in storage and syncs it across tabs. Events go through a separate bus, because a signal ignores a write that equals its current value and an event must not.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      <div class="lg:col-span-7 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl min-w-0">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <span class="text-xs font-mono font-semibold text-slate-300">BusDemo.sola</span>
          <span class="text-xs font-mono text-slate-400">the file running on the right</span>
        </div>
        <!-- A scroll region must take keyboard focus (axe scrollable-region-focusable). -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <pre class="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre" role="region" aria-label="BusDemo.sola source" tabindex="0" data-testid="bus-demo-source"><code>{source}</code></pre>
      </div>

      <div class="lg:col-span-5 bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between gap-8">
        <div class="flex flex-col gap-6">
          <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 p-5" data-testid="bus-demo-live">
            {#key instance}
              <SolaMount component={mount} />
            {/key}
          </div>

          <div class="flex flex-wrap gap-3">
            <button type="button" onclick={ask}
              class="text-xs font-mono font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer">
              Emit sola:ask
            </button>
            <button type="button" onclick={() => instance += 1}
              class="text-xs font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/15 px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer">
              Remount component
            </button>
          </div>
        </div>

        <ul class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 max-w-[60ch]">
          <li>Emit the same question twice and the count goes up twice. Nothing is deduplicated.</li>
          <li>Remount the component: the count survives, because it is a <code class="font-mono">$persist</code>, but "latest question" resets, because events are not stored unless you make them sticky.</li>
          <li>Reload the page, or open it in a second tab: the count is kept for this tab and mirrored to the other.</li>
          <li class="font-mono text-xs text-slate-600 dark:text-slate-400">Emitted from this page: <span data-testid="bus-demo-sent">{sent}</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>
