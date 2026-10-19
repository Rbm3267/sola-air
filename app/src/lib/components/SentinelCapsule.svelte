<script lang="ts">
  import { fade, slide } from 'svelte/transition';

  let { 
    flowIndex = 99.8,
    frictionCount = 0,
    activeAlert = null,
    isCircuitBreakerActive = false,
    onReset = () => {}
  } = $props<{
    flowIndex?: number;
    frictionCount?: number;
    activeAlert?: { type: string; message: string; timestamp?: number } | null;
    isCircuitBreakerActive?: boolean;
    onReset?: () => void;
  }>();

  let isExpanded = $state(false);
</script>

<div class="rounded-2xl bg-slate-950 dark:bg-black/40 border {isCircuitBreakerActive ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]' : 'border-slate-800 shadow-lg'} p-3 sm:p-4 text-white font-sans backdrop-blur-xl transition-all">
  <div class="flex items-center justify-between gap-3">
    
    <!-- Left: Status & Flow Index -->
    <div class="flex items-center gap-3">
      <div class="relative flex items-center justify-center">
        {#if isCircuitBreakerActive}
          <span class="w-3 h-3 rounded-full bg-amber-400 animate-ping absolute opacity-75"></span>
          <span class="w-3 h-3 rounded-full bg-amber-500 relative shadow-xs"></span>
        {:else}
          <span class="w-3 h-3 rounded-full bg-blue-400 animate-ping absolute opacity-75"></span>
          <span class="w-3 h-3 rounded-full bg-blue-500 relative shadow-xs"></span>
        {/if}
      </div>

      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-semibold tracking-tight text-slate-200">
            {isCircuitBreakerActive ? 'Sentinel Friction Triggered' : 'Sola Intent Sentinel'}
          </span>
          <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded-full {isCircuitBreakerActive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'}">
            {flowIndex}% Flow Index
          </span>
        </div>
        <div class="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
          <span>Telemetry Bus: Active</span>
          <span>•</span>
          <span>{frictionCount} Friction Events</span>
        </div>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center gap-2">
      {#if isCircuitBreakerActive}
        <button 
          type="button"
          onclick={onReset}
          class="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-semibold transition-all cursor-pointer">
          Reset Bus
        </button>
      {/if}
      
      <button 
        type="button"
        onclick={() => isExpanded = !isExpanded}
        class="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
        aria-label="Toggle details">
        <svg class="w-4 h-4 transition-transform {isExpanded ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>

  </div>

  {#if isExpanded}
    <div transition:slide={{ duration: 180 }} class="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
      <div class="grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div class="text-xs text-slate-500 dark:text-slate-400 uppercase">Paint Overhead</div>
          <div class="font-bold text-blue-400 mt-0.5">&lt; 0.02ms</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div class="text-xs text-slate-500 dark:text-slate-400 uppercase">Rage Clicks</div>
          <div class="font-bold {frictionCount > 0 ? 'text-amber-400' : 'text-slate-300'} mt-0.5">{frictionCount} Detected</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div class="text-xs text-slate-500 dark:text-slate-400 uppercase">Self-Heal Mode</div>
          <div class="font-bold text-sky-400 mt-0.5">Cache &amp; Queue</div>
        </div>
      </div>

      {#if activeAlert}
        <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs font-mono text-amber-200">
          <svg class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div class="flex-1">
            <span class="font-bold text-amber-300 block">[{activeAlert.type}]</span>
            <span class="text-xs leading-relaxed text-amber-200/90">{activeAlert.message}</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>