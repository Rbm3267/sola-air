<script lang="ts">
  type SelectOption = { value: string; label: string };

  let {
    options = [],
    value = '',
    placeholder = 'Select an option...',
    searchable = true,
    disabled = false,
    onchange = (_v: string) => {}
  } = $props<{
    options?: SelectOption[];
    value?: string;
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }>();

  let isOpen = $state(false);
  let search = $state('');
  let focusIndex = $state(-1);

  let filtered = $derived(
    search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : options
  );

  let selectedLabel = $derived(options.find(o => o.value === value)?.label || '');

  function toggle() { if (!disabled) isOpen = !isOpen; }
  function select(opt: SelectOption) {
    value = opt.value;
    onchange(opt.value);
    isOpen = false;
    search = '';
    focusIndex = -1;
  }
  function clear(e: MouseEvent) {
    e.stopPropagation();
    value = '';
    onchange('');
    search = '';
  }
  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) { if (e.key === 'Enter' || e.key === ' ') { isOpen = true; e.preventDefault(); } return; }
    if (e.key === 'Escape') { isOpen = false; search = ''; }
    else if (e.key === 'ArrowDown') { focusIndex = Math.min(focusIndex + 1, filtered.length - 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { focusIndex = Math.max(focusIndex - 1, 0); e.preventDefault(); }
    else if (e.key === 'Enter' && focusIndex >= 0 && filtered[focusIndex]) { select(filtered[focusIndex]); }
  }
  function handleClickOutside(e: MouseEvent) {
    if (isOpen) { isOpen = false; search = ''; }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative w-full" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
  <!-- Trigger -->
  <button
    type="button"
    class="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded-xl border transition-all cursor-pointer
      {disabled ? 'opacity-50 pointer-events-none' : ''}
      {isOpen
        ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}
      bg-white dark:bg-white/5 text-slate-900 dark:text-white"
    onclick={toggle}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    {disabled}
  >
    <span class="{value ? '' : 'text-slate-500 dark:text-slate-400'} truncate {value ? 'pr-6' : ''}">
      {selectedLabel || placeholder}
    </span>
    <svg aria-hidden="true" class="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform {isOpen ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
  </button>
  <!-- The clear button sits beside the trigger, not inside it: a button inside a button is invalid. -->
  {#if value && !disabled}
    <button type="button" onclick={clear} class="absolute right-9 top-[0.8rem] p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400" aria-label="Clear selection">
      <svg aria-hidden="true" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  {/if}

  <!-- Dropdown -->
  {#if isOpen}
    <div class="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-black/40 overflow-hidden animate-[fadeSlide_150ms_ease-out]">
      {#if searchable}
        <div class="p-2 border-b border-slate-100 dark:border-white/5">
          <input
            type="text"
            bind:value={search}
            placeholder="Search..."
            class="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      {/if}
      <div class="max-h-48 overflow-y-auto py-1" role="listbox">
        {#each filtered as opt, i}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer
              {opt.value === value ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium' :
               i === focusIndex ? 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white' :
               'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}"
            onclick={() => select(opt)}
            role="option"
            aria-selected={opt.value === value}
          >
            <span class="flex items-center justify-between">
              {opt.label}
              {#if opt.value === value}
                <svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              {/if}
            </span>
          </button>
        {:else}
          <div class="px-3 py-4 text-sm text-slate-500 dark:text-slate-400 text-center">No results found</div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
