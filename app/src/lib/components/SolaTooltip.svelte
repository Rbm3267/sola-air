<script lang="ts">
  let {
    text = '',
    children,
    position = 'top',
    delay = 300
  } = $props<{
    text?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    children?: any;
  }>();

  let visible = $state(false);
  let timeout: ReturnType<typeof setTimeout>;

  function show() {
    timeout = setTimeout(() => { visible = true; }, delay);
  }

  function hide() {
    clearTimeout(timeout);
    visible = false;
  }

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };
</script>

<div
  class="relative inline-flex"
  onmouseenter={show}
  onmouseleave={hide}
  onfocusin={show}
  onfocusout={hide}
  role="group"
>
  {@render children?.()}
  {#if visible && text}
    <div
      class="absolute z-50 pointer-events-none {positionClasses[position]}
        px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-700
        rounded-lg shadow-lg dark:shadow-black/40 whitespace-nowrap
        animate-[fadeIn_100ms_ease-out]"
      role="tooltip"
    >
      {text}
      <!-- Arrow -->
      {#if position === 'top'}
        <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
      {:else if position === 'bottom'}
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900 dark:border-b-slate-700"></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(2px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
</style>
