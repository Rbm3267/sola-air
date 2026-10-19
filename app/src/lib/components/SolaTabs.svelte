<script lang="ts">
  type TabItem = { id: string; label: string; badge?: string };

  let {
    tabs = [],
    activeTab = '',
    onchange = (_id: string) => {},
    variant = 'underline'
  } = $props<{
    tabs?: TabItem[];
    activeTab?: string;
    onchange?: (id: string) => void;
    variant?: 'underline' | 'pill' | 'segment';
  }>();

  let current = $state(activeTab || tabs[0]?.id || '');

  function select(id: string) {
    current = id;
    onchange(id);
  }
</script>

{#if variant === 'segment'}
  <!-- Segmented control -->
  <div role="tablist" class="inline-flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl">
    {#each tabs as tab}
      <button
        class="relative px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer
          {current === tab.id
            ? 'bg-white dark:bg-blue-500 text-slate-900 dark:text-slate-950 shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white'}"
        onclick={() => select(tab.id)}
        aria-selected={current === tab.id}
        role="tab"
      >
        {tab.label}
        {#if tab.badge}
          <span class="ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400">
            {tab.badge}
          </span>
        {/if}
      </button>
    {/each}
  </div>
{:else if variant === 'pill'}
  <!-- Pill tabs -->
  <div class="inline-flex items-center gap-1" role="tablist">
    {#each tabs as tab}
      <button
        class="px-4 py-2 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer
          {current === tab.id
            ? 'bg-slate-900 dark:bg-blue-500 text-white dark:text-slate-950 shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}"
        onclick={() => select(tab.id)}
        aria-selected={current === tab.id}
        role="tab"
      >
        {tab.label}
        {#if tab.badge}
          <span class="ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full
            {current === tab.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'} text-current">
            {tab.badge}
          </span>
        {/if}
      </button>
    {/each}
  </div>
{:else}
  <!-- Underline tabs (default) -->
  <div class="flex items-center gap-0 border-b border-slate-200 dark:border-white/10" role="tablist">
    {#each tabs as tab}
      <button
        class="relative px-4 py-3 text-xs font-semibold transition-all duration-200 cursor-pointer
          {current === tab.id
            ? 'text-slate-900 dark:text-white'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}"
        onclick={() => select(tab.id)}
        aria-selected={current === tab.id}
        role="tab"
      >
        <span class="flex items-center gap-1.5">
          {tab.label}
          {#if tab.badge}
            <span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
              {tab.badge}
            </span>
          {/if}
        </span>
        {#if current === tab.id}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-blue-500 rounded-full"></span>
        {/if}
      </button>
    {/each}
  </div>
{/if}
