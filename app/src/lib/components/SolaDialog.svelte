<script lang="ts">
  import { portal } from '$lib/actions/portal';
  import { fade, scale } from 'svelte/transition';

  let {
    open = false,
    title = '',
    description = '',
    onclose = () => {},
    children
  } = $props<{
    open?: boolean;
    title?: string;
    description?: string;
    onclose?: () => void;
    children?: any;
  }>();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    use:portal
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'dialog-title' : undefined}
    transition:fade={{ duration: 150 }}
  >
    <!-- Backdrop overlay -->
    <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>

    <!-- Dialog panel -->
    <div
      class="relative w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
      transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
    >
      <!-- Header -->
      {#if title}
        <div class="flex items-start justify-between p-6 pb-0">
          <div>
            <h2 id="dialog-title" class="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            {#if description}
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[68ch]">{description}</p>
            {/if}
          </div>
          <button
            onclick={onclose}
            class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      {/if}

      <!-- Content -->
      <div class="p-6">
        {#if children}
          {@render children()}
        {:else}
          <div class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Dialog content goes here. Use the <code class="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-xs font-mono">children</code> slot to customize.
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
