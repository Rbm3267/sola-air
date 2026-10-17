<script lang="ts">
  import { bus } from '@sola-air-ui/core';
  import SolaMount from './SolaMount.svelte';
  import SolaLogo from './SolaLogo.svelte';
  import SolaIcons from './SolaIcons.svelte';
  import mountClusterCard from '$lib/pages/ClusterCardDemo.sola';
  import { VERSIONS, FACTS } from '$lib/data/site';

  let rps = $state(1420);
  let writes = $state(0);
  let activeFlash = $state(false);
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  let util = $derived(Math.min(100, Math.round(rps / 20)));

  function updateRps(next: number) {
    rps = next;
    writes += 1;
    bus.emit('sola:compiler-rps', { rps: next });
    activeFlash = true;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      activeFlash = false;
    }, 260);
  }

  function triggerBurst() {
    const next = rps >= 1900 ? 840 : Math.min(2000, rps + 160);
    updateRps(next);
  }
</script>

<section class="w-full py-12 sm:py-16" aria-labelledby="compiler-xray-heading">
  <div class="rounded-3xl bg-white/95 dark:bg-[#0c1222] border border-sky-200/80 dark:border-white/10 shadow-[0_24px_60px_-15px_rgba(37,99,235,0.12)] dark:shadow-none overflow-hidden">
    <!-- Workbench Top Bar -->
    <div class="px-5 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-violet-50/80 dark:from-white/[0.03] dark:via-white/[0.02] dark:to-white/[0.03] flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <SolaLogo size="xs" showGlow={false} interactive={false} />
        <h2 id="compiler-xray-heading" class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight">
          Live Compiler X-Ray — Drag the slider or trigger a burst to inspect the exact DOM write
        </h2>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <span class="inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-500/20">
          <SolaIcons name="code" size={14} />
          <span>Mounted via &lt;SolaMount&gt;</span>
        </span>
        <span class="inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-white/10">
          0 VDOM Diffs · {writes} Direct TextNode {writes === 1 ? 'Write' : 'Writes'}
        </span>
      </div>
    </div>

    <!-- 3-Pane Split -->
    <div class="grid grid-cols-1 lg:grid-cols-12 items-stretch">
      <!-- Pane 1: .sola Source -->
      <div class="lg:col-span-4 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#0c1222] flex flex-col justify-between gap-4">
        <div>
          <div class="flex items-center justify-between gap-2 min-h-[28px] mb-3">
            <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap leading-none">
              1. .sola Single-File Source
            </span>
            <span class="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-500/20">
              ClusterCardDemo.sola
            </span>
          </div>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 overflow-x-auto" role="region" aria-label="ClusterCardDemo.sola source" tabindex="0">
            <div class="px-2 py-0.5 rounded"><span class="text-violet-700 dark:text-violet-400">&lt;script&gt;</span></div>
            <div class="px-2 py-0.5 rounded">  <span class="text-violet-700 dark:text-violet-400">import</span> DataCard <span class="text-violet-700 dark:text-violet-400">from</span> <span class="text-emerald-700 dark:text-emerald-400">'@sola-air-ui/ui/DataCard.sola'</span>;</div>
            <div class="px-2 py-0.5 rounded transition-colors duration-200 {activeFlash ? 'bg-sky-100/90 dark:bg-sky-500/20' : ''}">  <span class="text-violet-700 dark:text-violet-400">let</span> rps = <span class="text-sky-800 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-500/20 px-1 rounded">$state</span>({rps});</div>
            <div class="px-2 py-0.5 rounded">  <span class="text-violet-700 dark:text-violet-400">let</span> util = <span class="text-sky-800 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-500/20 px-1 rounded">$derived</span>(Math.round(rps / 20));</div>
            <div class="px-2 py-0.5 rounded"><span class="text-violet-700 dark:text-violet-400">&lt;/script&gt;</span></div>
            <div class="px-2 py-0.5 rounded mt-1">&lt;<span class="text-blue-700 dark:text-blue-400">DataCard</span> title=<span class="text-emerald-700 dark:text-emerald-400">"Cluster Throughput"</span></div>
            <div class="px-2 py-0.5 rounded">  value={`{`}<span class="text-emerald-700 dark:text-emerald-400">`${'{'}rps{'}'} req/s`</span>{`}`}</div>
            <div class="px-2 py-0.5 rounded">  trend={`{`}<span class="text-emerald-700 dark:text-emerald-400">`${'{'}util{'}'}% capacity`</span>{`}`} /&gt;</div>
          </div>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Author state with <code class="font-mono">$state</code> and derived values with <code class="font-mono">$derived</code> inside a single <code class="font-mono">.sola</code> file.
        </p>
      </div>

      <!-- Pane 2: Compiled Vanilla JS -->
      <div class="lg:col-span-4 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-200/70 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.01] flex flex-col justify-between gap-4">
        <div>
          <div class="flex items-center justify-between gap-2 min-h-[28px] mb-3">
            <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap leading-none">
              2. Compiled Vanilla DOM JS
            </span>
            <span class="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-300 border border-violet-200/80 dark:border-violet-500/20">
              {FACTS.coreSizeKb} core
            </span>
          </div>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 overflow-x-auto" role="region" aria-label="Compiled JavaScript output" tabindex="0">
            <div class="px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">// @sola-air-ui/compiler v{VERSIONS.compiler}</div>
            <div class="px-2 py-0.5 rounded"><span class="text-violet-700 dark:text-violet-400">const</span> [rps, set_rps] = <span class="text-blue-700 dark:text-blue-400">createSignal</span>({rps});</div>
            <div class="px-2 py-0.5 rounded"><span class="text-violet-700 dark:text-violet-400">const</span> util = <span class="text-blue-700 dark:text-blue-400">createDerived</span>(() =&gt; Math.round(rps() / 20));</div>
            <div class="px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 mt-1">// Direct surgical DOM mutation</div>
            <div class="px-2 py-0.5 rounded"><span class="text-blue-700 dark:text-blue-400">createEffect</span>(() =&gt; {`{`}</div>
            <div class="px-2 py-0.5 rounded transition-all duration-200 {activeFlash ? 'bg-sky-100 dark:bg-sky-500/25 translate-x-1 border-l-2 border-sky-600' : ''}">  _txt0.data = <span class="text-emerald-700 dark:text-emerald-400">`${'{'}rps(){'}'} req/s`</span>;</div>
            <div class="px-2 py-0.5 rounded transition-all duration-200 {activeFlash ? 'bg-sky-100 dark:bg-sky-500/25 translate-x-1 border-l-2 border-sky-600' : ''}">  _bar0.style.width = <span class="text-emerald-700 dark:text-emerald-400">`${'{'}util(){'}'}%`</span>;</div>
            <div class="px-2 py-0.5 rounded">{`}`});</div>
          </div>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Each <code class="font-mono">createEffect</code> updates only the exact text or style node bound to that signal—no tree diffing.
        </p>
      </div>

      <!-- Pane 3: Real Mounted .sola Output -->
      <div class="lg:col-span-4 p-5 sm:p-6 bg-gradient-to-br from-sky-50/50 via-white to-violet-50/40 dark:from-white/[0.02] dark:via-[#0c1222] dark:to-white/[0.02] flex flex-col justify-between gap-4">
        <div>
          <div class="flex items-center justify-between gap-2 min-h-[28px] mb-3">
            <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap leading-none">
              3. Live Mounted .sola Output
            </span>
            <span class="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/20">
              DataCard.sola
            </span>
          </div>

          <!-- Mounted .sola Component -->
          <div class="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 p-4 shadow-sm">
            <SolaMount component={mountClusterCard} />

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex flex-col gap-3">
              <label class="flex flex-col gap-1.5">
                <span class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Adjust signal (`rps`)</span>
                  <span class="font-mono">{rps} req/s ({util}%)</span>
                </span>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  value={rps}
                  aria-label="Adjust cluster throughput signal"
                  oninput={(e) => updateRps(Number((e.currentTarget as HTMLInputElement).value))}
                  class="w-full accent-blue-600 cursor-pointer"
                />
              </label>

              <button
                onclick={triggerBurst}
                class="w-full h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Trigger +160 req/s Write (`rps += 160`)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
