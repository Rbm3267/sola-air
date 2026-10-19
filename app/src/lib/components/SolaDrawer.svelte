<script lang="ts">
  import { portal } from '$lib/actions/portal';
  import { fade, fly } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  let {
    open = false,
    position = 'right',
    title = '',
    width = '400px',
    onclose = () => {},
    children
  } = $props<{
    open?: boolean;
    position?: 'left' | 'right' | 'bottom';
    title?: string;
    width?: string;
    onclose?: () => void;
    children?: Snippet | any;
  }>();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onclose();
    }
  }

  const flyParams = $derived(
    position === 'left'
      ? { x: -400, duration: 250 }
      : position === 'bottom'
        ? { y: 400, duration: 250 }
        : { x: 400, duration: 250 }
  );
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    use:portal
    class="fixed inset-0 z-50 flex {position === 'left' ? 'justify-start' : position === 'bottom' ? 'items-end justify-center' : 'justify-end'}"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'drawer-title' : undefined}
  >
    <!-- Backdrop overlay with click-to-close -->
    <div
      class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity"
      onclick={onclose}
      transition:fade={{ duration: 200 }}
      aria-hidden="true"
    ></div>

    <!-- Drawer panel -->
    {#if position === 'left'}
      <div
        class="relative z-10 flex flex-col h-full bg-white dark:bg-[#0f172a] border-r border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden max-w-full"
        style="width: {width};"
        transition:fly={flyParams}
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex-shrink-0">
          <h2 id="drawer-title" class="text-base font-semibold text-slate-900 dark:text-white truncate">
            {title}
          </h2>
          <button
            type="button"
            onclick={onclose}
            class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close drawer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6">
          {@render children?.()}
        </div>
      </div>
    {:else if position === 'bottom'}
      <div
        class="relative z-10 flex flex-col w-full bg-white dark:bg-[#0f172a] border-t border-slate-200/80 dark:border-white/10 rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh]"
        style="height: {width};"
        transition:fly={flyParams}
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex-shrink-0">
          <div class="flex items-center gap-3">
            <h2 id="drawer-title" class="text-base font-semibold text-slate-900 dark:text-white truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onclick={onclose}
            class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close drawer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6">
          {@render children?.()}
        </div>
      </div>
    {:else}
      <!-- Right (default) -->
      <div
        class="relative z-10 flex flex-col h-full bg-white dark:bg-[#0f172a] border-l border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden max-w-full"
        style="width: {width};"
        transition:fly={flyParams}
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex-shrink-0">
          <h2 id="drawer-title" class="text-base font-semibold text-slate-900 dark:text-white truncate">
            {title}
          </h2>
          <button
            type="button"
            onclick={onclose}
            class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close drawer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6">
          {@render children?.()}
        </div>
      </div>
    {/if}
  </div>
{/if}
