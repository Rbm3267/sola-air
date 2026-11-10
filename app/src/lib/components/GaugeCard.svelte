<script lang="ts">
  let { config } = $props<{
    config: {
      title: string;
      value: string;
      percentage?: number;
      subtext?: string;
      color?: 'emerald' | 'sky' | 'violet' | 'amber' | 'indigo';
    }
  }>();

  const pct = $derived(
    config.percentage !== undefined 
      ? config.percentage 
      : parseInt(config.value) || 75
  );

  // Circumference for r=36 is 2 * PI * 36 ≈ 226.2
  const circumference = 226.2;
  const strokeDashoffset = $derived(circumference - (pct / 100) * circumference);

  const colorMap = {
    emerald: { stroke: '#10b981', glow: 'rgba(16,185,129,0.15)', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' },
    sky: { stroke: '#0ea5e9', glow: 'rgba(14,165,233,0.15)', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500' },
    violet: { stroke: '#8b5cf6', glow: 'rgba(139,92,246,0.15)', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500' },
    amber: { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.15)', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
    indigo: { stroke: '#6366f1', glow: 'rgba(99,102,241,0.15)', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500' }
  };

  // An unknown color (a model can return any word) falls back to emerald
  // instead of throwing, which used to blank the whole Custom Grid view.
  const activeColor = $derived(colorMap[(config.color ?? 'emerald') as keyof typeof colorMap] ?? colorMap.emerald);
</script>

<div class="group relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_-6px_rgba(14,165,233,0.14)] hover:border-sky-300 dark:border-sky-500/30 transition-all duration-300 overflow-hidden">
  
  <!-- Specular highlight -->
  <div class="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-transparent to-transparent pointer-events-none"></div>

  <!-- Header -->
  <div class="flex justify-between items-center mb-5 relative z-10">
    <div class="flex items-center gap-2.5">
      <span class="w-2 h-2 rounded-full {activeColor.bg} animate-pulse"></span>
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">{config.title}</span>
    </div>
    <span class="text-xs font-mono font-semibold bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.04] text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
      Live Gauge
    </span>
  </div>

  <!-- Center Content: Circular Arc + Monospace Readout -->
  <div class="flex items-center justify-between gap-6 relative z-10">
    <div>
      <div class="text-3xl sm:text-4xl font-black text-slate-950 dark:text-slate-50 tracking-tight font-mono mb-1">
        {config.value}
      </div>
      <div class="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
        {config.subtext || `${pct}% Allocated Capacity`}
      </div>
    </div>

    <!-- Circular SVG Progress Ring -->
    <div class="relative w-20 h-20 aspect-square flex items-center justify-center shrink-0">
      <svg class="w-full h-full aspect-square -rotate-90" viewBox="0 0 88 88" preserveAspectRatio="xMidYMid meet">
        <!-- Track circle -->
        <circle 
          cx="44" cy="44" r="36" 
          stroke="#f1f5f9" 
          stroke-width="7" 
          fill="none"
        />
        <!-- Active progress arc -->
        <circle 
          cx="44" cy="44" r="36" 
          stroke={activeColor.stroke} 
          stroke-width="7" 
          stroke-linecap="round"
          fill="none"
          stroke-dasharray={circumference}
          stroke-dashoffset={strokeDashoffset}
          style="transition: stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1);"
        />
      </svg>
      <div class="absolute text-xs font-semibold font-mono {activeColor.text}">
        {pct}%
      </div>
    </div>
  </div>

  <!-- Bottom Telemetry Bar -->
  <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 relative z-10">
    <span class="flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
      <span>Telemetry Synchronized</span>
    </span>
    <span class="text-slate-500 dark:text-slate-400 font-bold">zero-vdom</span>
  </div>
</div>
