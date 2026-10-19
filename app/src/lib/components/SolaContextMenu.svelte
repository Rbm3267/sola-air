<script lang="ts">
  import { tick } from 'svelte';
  import { portal } from '$lib/actions/portal';

  type ContextMenuItem = {
    label?: string;
    icon?: string;
    shortcut?: string;
    action?: () => void;
    divider?: boolean;
    disabled?: boolean;
    variant?: 'default' | 'destructive';
  };

  let {
    items = [
      { label: 'Inspect Signal', shortcut: '⌥⌘I' },
      { label: 'Duplicate Node', shortcut: '⌘D' },
      { label: 'Copy Target Path', shortcut: '⇧⌘C' },
      { divider: true },
      { label: 'Mute Telemetry', shortcut: '⌘M' },
      { label: 'Detach from Mesh', variant: 'destructive', shortcut: '⌫' }
    ]
  } = $props<{
    items?: ContextMenuItem[];
  }>();

  // Gap kept between the menu and the edge of the window.
  const EDGE = 8;

  let isOpen = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);
  let menuEl = $state<HTMLDivElement>();
  let triggerEl = $state<HTMLDivElement>();

  async function openAt(x: number, y: number) {
    menuX = x;
    menuY = y;
    isOpen = true;
    await tick();
    if (!menuEl) return;
    // Open at the pointer, but flip or shift so the whole menu stays on screen.
    const { width, height } = menuEl.getBoundingClientRect();
    if (x + width + EDGE > window.innerWidth) menuX = Math.max(EDGE, x - width);
    if (y + height + EDGE > window.innerHeight) menuY = Math.max(EDGE, y - height);
    menuEl.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    openAt(e.clientX, e.clientY);
  }

  // Shift+F10 and the Menu key open it from the keyboard, at the trigger's corner.
  function handleTriggerKey(e: KeyboardEvent) {
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      e.preventDefault();
      const r = triggerEl!.getBoundingClientRect();
      openAt(r.left + 16, r.top + 16);
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    triggerEl?.focus();
  }

  function handleMenuKey(e: KeyboardEvent) {
    const buttons = [...menuEl!.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length]?.focus(); }
    else if (e.key === 'Tab') close();
  }
</script>

<svelte:window onclick={close} onresize={close} onscroll={close} onkeydown={(e) => e.key === 'Escape' && close()} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={triggerEl}
  oncontextmenu={handleContextMenu}
  onkeydown={handleTriggerKey}
  tabindex="0"
  role="region"
  aria-label="Context menu area: right-click, or press Shift+F10"
  class="w-full h-44 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-6 text-center cursor-context-menu hover:border-blue-500/50 focus-visible:outline-2 focus-visible:outline-blue-500 transition-colors select-none bg-slate-50/50 dark:bg-white/[0.02]"
>
  <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M15 3h6v6"/>
      <path d="M10 14 21 3"/>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>
  </div>
  <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[68ch]">Right-Click Anywhere Inside</p>
  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[68ch]">Triggers Sola Context Menu with keyboard shortcuts</p>
</div>

{#if isOpen}
  <div
    use:portal
    bind:this={menuEl}
    role="menu"
    tabindex="-1"
    onkeydown={handleMenuKey}
    onclick={(e) => e.stopPropagation()}
    style="left: {menuX}px; top: {menuY}px;"
    class="fixed z-50 min-w-56 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 animate-[fadeSlide_120ms_ease-out]"
  >
    {#each items as item}
      {#if item.divider}
        <div role="separator" class="my-1 border-t border-slate-100 dark:border-white/5"></div>
      {:else}
        <button
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onclick={() => { item.action?.(); close(); }}
          class="w-full flex items-center justify-between gap-6 px-3 py-2 text-xs rounded-xl transition-colors cursor-pointer outline-none disabled:opacity-40 disabled:pointer-events-none {item.variant === 'destructive' ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 focus:bg-rose-50 dark:hover:bg-rose-500/10 dark:focus:bg-rose-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-white/5 dark:focus:bg-white/5 hover:text-slate-950 dark:hover:text-white'}"
        >
          <span class="font-medium">{item.label}</span>
          {#if item.shortcut}
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400">{item.shortcut}</span>
          {/if}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  @keyframes fadeSlide {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
