<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    currentPage = $bindable(1),
    totalPages = 1,
    siblingCount = 1,
    onPageChange = (_page: number) => {},
    children
  }: {
    currentPage?: number;
    totalPages?: number;
    siblingCount?: number;
    onPageChange?: (page: number) => void;
    children?: Snippet;
  } = $props();

  function range(start: number, end: number): number[] {
    const length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  }

  type PageItem = { type: 'page'; value: number } | { type: 'ellipsis'; id: string };

  let paginationItems = $derived.by<PageItem[]>(() => {
    const total = Math.max(1, totalPages);
    const current = Math.min(Math.max(1, currentPage), total);

    // Total page numbers to show: 1 (first) + 1 (last) + 1 (current) + 2*siblings + 2*dots
    const totalNumbers = siblingCount * 2 + 5;

    if (total <= totalNumbers) {
      return range(1, total).map((num) => ({ type: 'page', value: num }));
    }

    const leftSiblingIndex = Math.max(current - siblingCount, 1);
    const rightSiblingIndex = Math.min(current + siblingCount, total);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < total - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = range(1, leftItemCount);
      return [
        ...leftRange.map((num) => ({ type: 'page' as const, value: num })),
        { type: 'ellipsis' as const, id: 'dots-right' },
        { type: 'page' as const, value: total }
      ];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = range(total - rightItemCount + 1, total);
      return [
        { type: 'page' as const, value: 1 },
        { type: 'ellipsis' as const, id: 'dots-left' },
        ...rightRange.map((num) => ({ type: 'page' as const, value: num }))
      ];
    }

    const middleRange = range(leftSiblingIndex, rightSiblingIndex);
    return [
      { type: 'page' as const, value: 1 },
      { type: 'ellipsis' as const, id: 'dots-left' },
      ...middleRange.map((num) => ({ type: 'page' as const, value: num })),
      { type: 'ellipsis' as const, id: 'dots-right' },
      { type: 'page' as const, value: total }
    ];
  });

  function setPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    onPageChange(page);
  }
</script>

<nav
  class="inline-flex items-center gap-1 font-sans select-none"
  aria-label="Pagination"
>
  <!-- Previous button -->
  <button
    type="button"
    onclick={() => setPage(currentPage - 1)}
    disabled={currentPage <= 1}
    aria-label="Go to previous page"
    class="h-8 px-2.5 inline-flex items-center gap-1 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-150 active:scale-95 cursor-pointer"
  >
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
    <span>Prev</span>
  </button>

  <!-- Page number buttons -->
  <div class="flex items-center gap-1">
    {#each paginationItems as item}
      {#if item.type === 'page'}
        {@const isActive = item.value === currentPage}
        <button
          type="button"
          onclick={() => setPage(item.value)}
          aria-current={isActive ? 'page' : undefined}
          aria-label="Page {item.value}"
          class="h-8 min-w-[2rem] px-2 text-xs font-semibold rounded-xl inline-flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer
            {isActive
              ? 'bg-slate-900 dark:bg-blue-500 text-white dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}"
        >
          {item.value}
        </button>
      {:else}
        <span aria-hidden="true" class="h-8 w-6 inline-flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs tracking-wider">
          ···
        </span>
      {/if}
    {/each}
  </div>

  <!-- Next button -->
  <button
    type="button"
    onclick={() => setPage(currentPage + 1)}
    disabled={currentPage >= totalPages}
    aria-label="Go to next page"
    class="h-8 px-2.5 inline-flex items-center gap-1 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-150 active:scale-95 cursor-pointer"
  >
    <span>Next</span>
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </button>

  {@render children?.()}
</nav>
