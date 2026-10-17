<script lang="ts">
  // Compiler X-Ray. Pane 1 is the real ClusterCardDemo.sola, pane 2 is what the
  // compiler really emits for it (both captured at build time in vite.config.ts),
  // and pane 3 mounts that same file. Nothing here is hand-written to look like
  // compiler output.
  import { bus } from '@sola-air-ui/core';
  import SolaMount from './SolaMount.svelte';
  import SolaLogo from './SolaLogo.svelte';
  import SolaIcons from './SolaIcons.svelte';
  import mountClusterCard from '$lib/pages/ClusterCardDemo.sola';
  import { VERSIONS, FACTS } from '$lib/data/site';

  const XRAY = __SOLA_XRAY__;
  const sourceLines = XRAY.source.trimEnd().split('\n');
  const compiledLines = XRAY.compiled.trimEnd().split('\n');

  // The lines that do the reactive work: the signals, the derived value, and the
  // effects that write to the DOM when they change.
  const isReactive = (l: string) => /createSignal|createDerived|createEffect\(/.test(l);
  const isWrite = (l: string) => /createEffect\(/.test(l);
  const excerpt = compiledLines
    .map((text, i) => ({ text, n: i + 1 }))
    .filter((l) => isReactive(l.text));

  let showAll = $state(false);
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
    updateRps(rps >= 1900 ? 840 : Math.min(2000, rps + 160));
  }
</script>

<section class="w-full py-12 sm:py-16" aria-labelledby="compiler-xray-heading">
  <div class="rounded-3xl bg-white/95 dark:bg-[#0c1222] border border-sky-200/80 dark:border-white/10 shadow-[0_24px_60px_-15px_rgba(37,99,235,0.12)] dark:shadow-none overflow-hidden">
    <!-- Top bar -->
    <div class="px-5 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-violet-50/80 dark:from-white/[0.03] dark:via-white/[0.02] dark:to-white/[0.03] flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <SolaLogo size="xs" showGlow={false} interactive={false} />
        <h2 id="compiler-xray-heading" class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight">
          Compiler X-Ray: the source, what the compiler emits, and the result
        </h2>
      </div>
      <span class="inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-white/10">
        {writes} signal {writes === 1 ? 'write' : 'writes'}
      </span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 items-stretch">
      <!-- Pane 1: the real .sola file -->
      <div class="lg:col-span-4 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#0c1222] flex flex-col gap-4 min-w-0">
        <div class="flex items-center justify-between gap-2 min-h-[28px]">
          <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap leading-none">1. Source</span>
          <span class="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-500/20">ClusterCardDemo.sola</span>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <pre class="rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 overflow-auto max-h-[420px]" role="region" aria-label="ClusterCardDemo.sola source" tabindex="0" data-testid="xray-source">{#each sourceLines as line, i (i)}<span class="block px-1 rounded transition-colors duration-200 {activeFlash && /\$state|\$derived/.test(line) ? 'bg-sky-100/90 dark:bg-sky-500/20' : ''}">{line || ' '}</span>{/each}</pre>
      </div>

      <!-- Pane 2: the compiler's real output -->
      <div class="lg:col-span-4 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-200/70 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.01] flex flex-col gap-4 min-w-0">
        <div class="flex items-center justify-between gap-2 min-h-[28px]">
          <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap leading-none">2. Compiler output</span>
          <span class="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-300 border border-violet-200/80 dark:border-violet-500/20">compiler v{VERSIONS.compiler}</span>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <pre class="rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 overflow-auto max-h-[420px]" role="region" aria-label="Compiled JavaScript for ClusterCardDemo.sola" tabindex="0" data-testid="xray-compiled">{#if showAll}{#each compiledLines as line, i (i)}<span class="block px-1 rounded {isReactive(line) ? 'bg-blue-50 dark:bg-blue-500/10' : ''}">{line || ' '}</span>{/each}{:else}{#each excerpt as line (line.n)}<span class="block px-1 rounded transition-all duration-200 {activeFlash && isWrite(line.text) ? 'bg-sky-100 dark:bg-sky-500/25' : ''}"><span class="select-none text-slate-500 dark:text-slate-400">{String(line.n).padStart(3, ' ')}  </span>{line.text.trim()}</span>{/each}{/if}</pre>
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {showAll ? `All ${compiledLines.length} lines.` : `The ${excerpt.length} reactive lines of ${compiledLines.length}.`} Each <code class="font-mono">createEffect</code> rewrites one text node or attribute when the signals it reads change.
          </p>
          <button
            onclick={() => (showAll = !showAll)}
            aria-pressed={showAll}
            class="shrink-0 h-8 px-3 rounded-lg text-xs font-mono font-medium bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer whitespace-nowrap">
            {showAll ? 'Reactive lines' : 'Show all'}
          </button>
        </div>
      </div>

      <!-- Pane 3: the same file, mounted -->
      <div class="lg:col-span-4 p-5 sm:p-6 bg-gradient-to-br from-sky-50/50 via-white to-violet-50/40 dark:from-white/[0.02] dark:via-[#0c1222] dark:to-white/[0.02] flex flex-col gap-4 min-w-0">
        <div class="flex items-center justify-between gap-2 min-h-[28px]">
          <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap leading-none">3. Mounted</span>
          <span class="inline-flex items-center justify-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-mono font-medium leading-none whitespace-nowrap shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-500/20">
            <SolaIcons name="code" size={14} />
            <span>{FACTS.coreSizeKb} core</span>
          </span>
        </div>
        <div class="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 p-4 shadow-sm" data-testid="xray-live">
          <SolaMount component={mountClusterCard} />
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex flex-col gap-3">
            <label class="flex flex-col gap-1.5">
              <span class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Set <code class="font-mono">rps</code></span>
                <span class="font-mono">{rps} req/s ({util}%)</span>
              </span>
              <input
                type="range"
                min="200"
                max="2000"
                value={rps}
                aria-label="Cluster throughput (rps)"
                oninput={(e) => updateRps(Number((e.currentTarget as HTMLInputElement).value))}
                class="w-full accent-blue-600 cursor-pointer"
              />
            </label>
            <button
              onclick={triggerBurst}
              class="w-full h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none shadow-sm cursor-pointer">
              <span>Burst: rps += 160</span>
            </button>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The slider sends <code class="font-mono">sola:compiler-rps</code> on the event bus; the component's <code class="font-mono">$on</code> handler sets <code class="font-mono">rps</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
