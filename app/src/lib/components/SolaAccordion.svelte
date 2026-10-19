<script lang="ts">
  type AccordionItem = { id: string; title: string; content: string; defaultOpen?: boolean };

  let {
    items = [],
    multiple = false,
    variant = 'default'
  } = $props<{
    items?: AccordionItem[];
    multiple?: boolean;
    variant?: 'default' | 'bordered' | 'separated';
  }>();

  let openIds = $state<Set<string>>(new Set(items.filter(i => i.defaultOpen).map(i => i.id)));

  function toggle(id: string) {
    if (openIds.has(id)) {
      openIds.delete(id);
      openIds = new Set(openIds);
    } else {
      if (!multiple) openIds = new Set([id]);
      else { openIds.add(id); openIds = new Set(openIds); }
    }
  }
</script>

<div class="{variant === 'separated' ? 'space-y-2' : ''}">
  {#each items as item}
    <div class="
      {variant === 'bordered' ? 'border border-slate-200 dark:border-white/10 rounded-xl mb-0 first:rounded-t-xl last:rounded-b-xl overflow-hidden' : ''}
      {variant === 'separated' ? 'border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden' : ''}
      {variant === 'default' ? 'border-b border-slate-200 dark:border-white/10 last:border-b-0' : ''}
    ">
      <button
        class="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold transition-colors cursor-pointer
          text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5"
        onclick={() => toggle(item.id)}
        aria-expanded={openIds.has(item.id)}
        aria-controls="accordion-{item.id}"
      >
        <span>{item.title}</span>
        <svg
          class="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 shrink-0
            {openIds.has(item.id) ? 'rotate-180' : ''}"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {#if openIds.has(item.id)}
        <div
          id="accordion-{item.id}"
          class="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed animate-[accordionOpen_200ms_ease-out]"
          role="region"
        >
          {item.content}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  @keyframes accordionOpen {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
