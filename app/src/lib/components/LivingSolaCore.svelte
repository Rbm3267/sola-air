<script lang="ts">
  import { FACTS } from '$lib/data/site';

  let { 
    state = 'idle', // 'idle' | 'generating' | 'listening' | 'mounted'
    size = 200,
    showTelemetry = true
  } = $props<{
    state?: 'idle' | 'generating' | 'listening' | 'mounted';
    size?: number;
    showTelemetry?: boolean;
  }>();

  const isGenerating = $derived(state === 'generating');
  const isListening = $derived(state === 'listening');
</script>

<div class="flex flex-col items-center justify-center relative select-none">
  <!-- Precision Solar Orb Vector Engine -->
  <div class="relative flex items-center justify-center" style="width: {size}px; height: {size}px;">
    
    <!-- Outer Ambient Solar Halo -->
    <div 
      class="absolute inset-0 rounded-full transition-all duration-700 pointer-events-none"
      style="background: radial-gradient(circle, rgba(245,158,11,{isGenerating ? '0.22' : '0.12'}) 0%, rgba(245,158,11,0) 70%); transform: scale({isGenerating ? '1.3' : '1.1'});"
    ></div>

    <!-- Geometric SVG Precision Rings -->
    <svg class="w-full h-full" viewBox="0 0 100 100" fill="none">
      <!-- Outer Harmonic Orbital Ring -->
      <circle 
        cx="50" 
        cy="50" 
        r="44" 
        stroke="currentColor" 
        class="text-amber-500/20"
        stroke-width="0.75" 
        stroke-dasharray="3 6"
      />

      <!-- Rotating Mid Orbital Track -->
      <circle 
        cx="50" 
        cy="50" 
        r="36" 
        stroke="url(#solar-gradient)" 
        stroke-width="1.5" 
        stroke-dasharray="14 10"
        class="origin-center {isGenerating ? 'animate-spin-fast' : 'animate-spin-slow'}"
      />

      <!-- Counter-Rotating Inner Iris Ring -->
      <circle 
        cx="50" 
        cy="50" 
        r="28" 
        stroke="currentColor" 
        class="text-amber-600 dark:text-amber-400/40 origin-center animate-spin-reverse"
        stroke-width="1" 
        stroke-dasharray="8 6"
      />

      <!-- Core Solar Nucleus Arc -->
      <circle 
        cx="50" 
        cy="50" 
        r="18" 
        fill="url(#core-glow)"
        class="transition-transform duration-500 {isGenerating ? 'scale-110' : 'scale-100'}"
      />

      <circle 
        cx="50" 
        cy="50" 
        r="18" 
        stroke="#f59e0b" 
        stroke-width="1.5"
      />

      <!-- Central Quantum Node -->
      <circle 
        cx="50" 
        cy="50" 
        r="6" 
        fill="#ffffff" 
        class="filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]"
      />

      <defs>
        <linearGradient id="solar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#d97706" stop-opacity="0.6" />
        </radialGradient>
      </defs>
    </svg>
  </div>

  <!-- Telemetry HUD Badge -->
  {#if showTelemetry}
    <div class="mt-4 flex flex-col items-center gap-1.5 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-white/[0.02] backdrop-blur-md border border-amber-200 dark:border-amber-500/20/80 shadow-xs">
        <span class="w-2 h-2 rounded-full bg-amber-500 {isGenerating ? 'animate-ping' : ''}"></span>
        <span class="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          {isGenerating ? 'Building Reactive DOM Tree...' : isListening ? 'Listening on Intent Stream...' : 'Ambient Intent Engine Active'}
        </span>
      </div>
      <span class="text-xs font-mono text-slate-500 dark:text-slate-400">
        {FACTS.coreSizeKb} core • Zero-VDOM Native Signals
      </span>
    </div>
  {/if}
</div>

<style>
  @keyframes spinSlow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes spinFast {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes spinReverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  .animate-spin-slow {
    animation: spinSlow 20s linear infinite;
  }
  .animate-spin-fast {
    animation: spinFast 4s linear infinite;
  }
  .animate-spin-reverse {
    animation: spinReverse 14s linear infinite;
  }
</style>
