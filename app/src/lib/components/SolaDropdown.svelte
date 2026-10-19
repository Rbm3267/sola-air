<script lang="ts">
  type DropdownItem = { label: string; icon?: string; action?: () => void; divider?: boolean; disabled?: boolean; variant?: 'default' | 'destructive' };

  let {
    items = [],
    position = 'bottom-left'
  } = $props<{
    items?: DropdownItem[];
    position?: 'bottom-left' | 'bottom-right';
    trigger?: any;
    children?: any;
  }>();

  let isOpen = $state(false);
  let focusIndex = $state(-1);

  function toggle() { isOpen = !isOpen; focusIndex = -1; }
  function close() { isOpen = false; focusIndex = -1; }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) return;
    const actionItems = items.filter(i => !i.divider);
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') { focusIndex = Math.min(focusIndex + 1, actionItems.length - 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { focusIndex = Math.max(focusIndex - 1, 0); e.preventDefault(); }
    else if (e.key === 'Enter' && focusIndex >= 0) { actionItems[focusIndex]?.action?.(); close(); }
  }

  function handleClickOutside() { if (isOpen) close(); }
</script>

<svelte:window onclick={handleClickOutside} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative inline-flex" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
  <button type="button" onclick={toggle} class="cursor-pointer" aria-label="More actions" aria-haspopup="menu" aria-expanded={isOpen}>
    <svg aria-hidden="true" class="w-5 h-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
    </svg>
  </button>

  {#if isOpen}
    <div
      class="absolute z-50 mt-1 min-w-[180px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-black/40 py-1 overflow-hidden animate-[fadeSlide_120ms_ease-out]
        {position === 'bottom-right' ? 'right-0 top-full' : 'left-0 top-full'}"
      role="menu"
    >
      {#each items as item, i}
        {#if item.divider}
          <div class="my-1 border-t border-slate-100 dark:border-white/5"></div>
        {:else}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors cursor-pointer
              {item.disabled ? 'opacity-40 pointer-events-none' : ''}
              {item.variant === 'destructive'
                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}
              {focusIndex === i ? 'bg-slate-50 dark:bg-white/5' : ''}"
            onclick={() => { item.action?.(); close(); }}
            role="menuitem"
            disabled={item.disabled}
          >
            {item.label}
          </button>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
