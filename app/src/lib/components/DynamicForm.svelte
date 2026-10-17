<script lang="ts">
  type Field = { name: string; type: string; label: string; required?: boolean };
  let { config, onSubmit } = $props<{ 
    config: { title: string; endpoint: string; fields: Field[] }, 
    onSubmit?: (data: any) => void 
  }>();

  let formData = $state<Record<string, any>>({});
  let submitted = $state(false);

  function handleSubmit(e: Event) {
    e.preventDefault();
    submitted = true;
    onSubmit?.(formData);
    setTimeout(() => { submitted = false; }, 2500);
  }
</script>

<div class="group relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04] rounded-3xl p-6 sm:p-7 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_-8px_rgba(245,158,11,0.12)] hover:border-amber-300 dark:border-amber-500/30/80 transition-all duration-300 overflow-hidden w-full">
  
  <!-- Soft Solar Ambient Glow -->
  <div class="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-amber-200/20 via-orange-100/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

  <!-- Header -->
  <div class="flex items-center justify-between mb-5 relative z-10">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono">{config.title}</span>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
        <span class="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-500/20/80">POST</span>
        <span class="text-slate-600 dark:text-slate-400 font-semibold">{config.endpoint}</span>
      </div>
    </div>

    <div class="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-500/10/60 border border-amber-200 dark:border-amber-500/20/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    </div>
  </div>

  <!-- Form Fields -->
  <form onsubmit={handleSubmit} class="flex flex-col gap-4 relative z-10">
    {#each config.fields as field}
      <div class="flex flex-col gap-1.5">
        <label for={field.name} class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
          {field.label} {#if field.required}<span class="text-amber-600 dark:text-amber-400">*</span>{/if}
        </label>
        <div class="relative">
          <input 
            id={field.name}
            type={field.type} 
            required={field.required}
            bind:value={formData[field.name]}
            class="w-full bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.04] rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:bg-white dark:bg-white/[0.02] focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all font-medium"
            placeholder="Enter {field.label.toLowerCase()}..."
          />
        </div>
      </div>
    {/each}
    
    <!-- Fluid Glowing Action Button -->
    <button 
      type="submit" 
      style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff !important;"
      class="mt-3 w-full font-semibold text-sm text-white tracking-wide py-3.5 px-6 rounded-2xl shadow-[0_6px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_26px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2">
      {#if submitted}
        <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="text-white font-bold">Request Dispatched</span>
      {:else}
        <span class="text-white font-bold">Execute Request</span>
        <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      {/if}
    </button>
  </form>
</div>
