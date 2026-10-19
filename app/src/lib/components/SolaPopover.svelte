<script lang="ts">
  import type { Snippet } from 'svelte';
  import { scale } from 'svelte/transition';

  type Position = 'top' | 'bottom' | 'left' | 'right';
  type Align = 'start' | 'center' | 'end';

  let {
    position = 'bottom',
    align = 'center',
    open = $bindable(false),
    closeOnClickOutside = true,
    closeOnEscape = true,
    showArrow = true,
    trigger,
    children
  }: {
    position?: Position;
    align?: Align;
    open?: boolean;
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    showArrow?: boolean;
    trigger?: Snippet;
    children?: Snippet;
  } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    open = !open;
  }

  function handleTriggerKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open = !open;
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (!closeOnClickOutside || !open) return;
    const target = e.target as Node | null;
    if (containerRef && !containerRef.contains(target)) {
      open = false;
    }
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if (closeOnEscape && open && e.key === 'Escape') {
      open = false;
    }
  }

  // Positioning classes
  const placementClassMap: Record<Position, Record<Align, string>> = {
    top: {
      start: 'bottom-full left-0 mb-2',
      center: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      end: 'bottom-full right-0 mb-2'
    },
    bottom: {
      start: 'top-full left-0 mt-2',
      center: 'top-full left-1/2 -translate-x-1/2 mt-2',
      end: 'top-full right-0 mt-2'
    },
    left: {
      start: 'right-full top-0 mr-2',
      center: 'right-full top-1/2 -translate-y-1/2 mr-2',
      end: 'right-full bottom-0 mr-2'
    },
    right: {
      start: 'left-full top-0 ml-2',
      center: 'left-full top-1/2 -translate-y-1/2 ml-2',
      end: 'left-full bottom-0 ml-2'
    }
  };

  const arrowClassMap: Record<Position, Record<Align, string>> = {
    top: {
      start: '-bottom-1.5 left-4 border-b border-r',
      center: '-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r',
      end: '-bottom-1.5 right-4 border-b border-r'
    },
    bottom: {
      start: '-top-1.5 left-4 border-t border-l',
      center: '-top-1.5 left-1/2 -translate-x-1/2 border-t border-l',
      end: '-top-1.5 right-4 border-t border-l'
    },
    left: {
      start: '-right-1.5 top-4 border-t border-r',
      center: '-right-1.5 top-1/2 -translate-y-1/2 border-t border-r',
      end: '-right-1.5 bottom-4 border-t border-r'
    },
    right: {
      start: '-left-1.5 top-4 border-b border-l',
      center: '-left-1.5 top-1/2 -translate-y-1/2 border-b border-l',
      end: '-left-1.5 bottom-4 border-b border-l'
    }
  };
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div class="relative inline-block" bind:this={containerRef}>
  <!-- Trigger: the snippet (or the default button) is the focusable control; this
       wrapper only catches its click and Enter/Space, so it has no role of its own. -->
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div
    onclick={toggle}
    onkeydown={handleTriggerKeydown}
    class="inline-flex cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-xl"
  >
    {#if trigger}
      {@render trigger()}
    {:else}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-all"
      >
        Open Popover
      </button>
    {/if}
  </div>

  <!-- Floating Panel -->
  {#if open}
    <div
      role="dialog"
      tabindex="-1"
      aria-modal="false"
      class="absolute z-50 {placementClassMap[position][align]} min-w-[12rem] max-w-sm rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl dark:shadow-black/50 p-4 text-slate-800 dark:text-slate-200 font-sans outline-none"
      transition:scale={{ duration: 150, start: 0.95, opacity: 0 }}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <!-- Arrow pointer -->
      {#if showArrow}
        <div
          class="absolute w-2.5 h-2.5 rotate-45 bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/10 pointer-events-none {arrowClassMap[position][align]}"
        ></div>
      {/if}

      <!-- Popover Content -->
      {@render children?.()}
    </div>
  {/if}
</div>
