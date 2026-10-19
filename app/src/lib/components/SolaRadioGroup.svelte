<script lang="ts">
  type RadioOption = { value: string; label: string; description?: string };

  let {
    options = [],
    value = '',
    name = 'radio',
    disabled = false,
    variant = 'default',
    onchange = (_v: string) => {}
  } = $props<{
    options?: RadioOption[];
    value?: string;
    name?: string;
    disabled?: boolean;
    variant?: 'default' | 'card';
    onchange?: (value: string) => void;
  }>();

  function select(v: string) {
    if (disabled) return;
    value = v;
    onchange(v);
  }
</script>

<div class="{variant === 'card' ? 'grid gap-2' : 'flex flex-col gap-2.5'}" role="radiogroup">
  {#each options as opt}
    {#if variant === 'card'}
      <button
        type="button"
        class="w-full text-left p-3.5 rounded-xl border-2 transition-all duration-150 cursor-pointer
          {disabled ? 'opacity-50 pointer-events-none' : ''}
          {value === opt.value
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/5'}"
        onclick={() => select(opt.value)}
        role="radio"
        aria-checked={value === opt.value}
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
            {value === opt.value ? 'border-blue-500' : 'border-slate-300 dark:border-white/20'}">
            {#if value === opt.value}
              <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            {/if}
          </div>
          <div>
            <span class="text-sm font-medium text-slate-900 dark:text-white">{opt.label}</span>
            {#if opt.description}
              <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-[68ch]">{opt.description}</p>
            {/if}
          </div>
        </div>
      </button>
    {:else}
      <label class="inline-flex items-center gap-2.5 cursor-pointer select-none {disabled ? 'opacity-50 pointer-events-none' : ''}">
        <button
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          class="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 outline-none
            focus-visible:ring-2 focus-visible:ring-blue-500/30
            {value === opt.value ? 'border-blue-500' : 'border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/30'}"
          onclick={() => select(opt.value)}
          {disabled}
        >
          {#if value === opt.value}
            <div class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-[scaleIn_100ms_ease-out]"></div>
          {/if}
        </button>
        <div>
          <span class="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
          {#if opt.description}
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">{opt.description}</p>
          {/if}
        </div>
      </label>
    {/if}
  {/each}
</div>

<style>
  @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
</style>
