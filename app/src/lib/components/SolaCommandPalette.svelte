<script lang="ts">
  import { portal } from '$lib/actions/portal';
  import { fade, scale } from 'svelte/transition';

  type Command = {
    id: string;
    label: string;
    shortcut?: string;
    icon?: string | any;
    group?: string;
    action?: () => void;
  };

  let {
    open = false,
    commands = [],
    placeholder = 'Type a command or search...',
    onclose = () => {},
    onselect = (_cmd: Command) => {}
  } = $props<{
    open?: boolean;
    commands?: Command[];
    placeholder?: string;
    onclose?: () => void;
    onselect?: (cmd: Command) => void;
  }>();

  let query = $state('');
  let activeIndex = $state(0);
  let inputEl: HTMLInputElement | null = $state(null);

  const filteredCommands = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(q);
      const matchGroup = cmd.group ? cmd.group.toLowerCase().includes(q) : false;
      const matchShortcut = cmd.shortcut ? cmd.shortcut.toLowerCase().includes(q) : false;
      return matchLabel || matchGroup || matchShortcut;
    });
  });

  const groupedCommands = $derived.by(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filteredCommands) {
      const g = cmd.group || 'Actions';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(cmd);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  });

  // Reset active index when query or open state changes
  $effect(() => {
    if (query !== undefined) {
      activeIndex = 0;
    }
  });

  $effect(() => {
    if (open) {
      query = '';
      activeIndex = 0;
      setTimeout(() => inputEl?.focus(), 50);
    }
  });

  function handleSelect(cmd: Command) {
    cmd.action?.();
    onselect(cmd);
    onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        activeIndex = (activeIndex + 1) % filteredCommands.length;
        scrollActiveIntoView();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        activeIndex = (activeIndex - 1 + filteredCommands.length) % filteredCommands.length;
        scrollActiveIntoView();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0 && filteredCommands[activeIndex]) {
        handleSelect(filteredCommands[activeIndex]);
      }
    }
  }

  function scrollActiveIntoView() {
    const activeItem = filteredCommands[activeIndex];
    if (!activeItem) return;
    const el = document.getElementById(`sola-cmd-${activeItem.id}`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  function getHighlightedParts(text: string, q: string): { text: string; match: boolean }[] {
    const trimmed = q.trim();
    if (!trimmed) return [{ text, match: false }];
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.filter(Boolean).map((part) => ({
      text: part,
      match: part.toLowerCase() === trimmed.toLowerCase()
    }));
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    use:portal
    class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24"
    role="dialog"
    aria-modal="true"
    aria-label="Command Palette"
  >
    <!-- Backdrop overlay with click-to-close -->
    <div
      class="fixed inset-0 bg-black/50 dark:bg-[#0f172a]/80 backdrop-blur-md transition-opacity"
      onclick={onclose}
      transition:fade={{ duration: 150 }}
      aria-hidden="true"
    ></div>

    <!-- Command Palette Dialog Panel -->
    <div
      class="relative z-10 w-full max-w-xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col"
      transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
    >
      <!-- Search Input Bar -->
      <div class="flex items-center px-4 border-b border-slate-200/80 dark:border-white/10">
        <!-- Magnifying glass SVG icon -->
        <svg
          class="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <input
          bind:this={inputEl}
          bind:value={query}
          type="text"
          aria-label="Search commands"
          {placeholder}
          class="w-full bg-transparent py-3.5 pl-3 pr-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 border-0"
          autocomplete="off"
          spellcheck="false"
        />

        {#if query}
          <button
            type="button"
            onclick={() => {
              query = '';
              inputEl?.focus();
            }}
            class="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Clear search query"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        {/if}
      </div>

      <!-- Commands List Area -->
      <div class="overflow-y-auto max-h-80 p-2 space-y-3" role="listbox">
        {#if filteredCommands.length === 0}
          <div class="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            No commands matching "<span class="font-medium text-slate-700 dark:text-slate-300">{query}</span>"
          </div>
        {:else}
          {#each groupedCommands as group}
            <div>
              <div class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.name}
              </div>
              <div class="space-y-0.5">
                {#each group.items as cmd}
                  {@const index = filteredCommands.indexOf(cmd)}
                  {@const isActive = index === activeIndex}
                  <button
                    id="sola-cmd-{cmd.id}"
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onclick={() => handleSelect(cmd)}
                    onmouseenter={() => (activeIndex = index)}
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm transition-all duration-150 cursor-pointer
                      {isActive
                        ? 'bg-slate-100 dark:bg-blue-500/10 text-slate-900 dark:text-blue-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}"
                  >
                    <!-- Left: Icon + Highlighted Label -->
                    <div class="flex items-center gap-2.5 min-w-0 pr-2">
                      <div class="w-4 h-4 flex-shrink-0 {isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'}">
                        {#if cmd.icon}
                          {#if typeof cmd.icon === 'string'}
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                          {:else}
                            {@render cmd.icon()}
                          {/if}
                        {:else}
                          <!-- Default Command SVG Icon -->
                          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        {/if}
                      </div>

                      <span class="truncate">
                        {#each getHighlightedParts(cmd.label, query) as part}
                          {#if part.match}
                            <span class="text-blue-600 dark:text-blue-400 font-semibold underline decoration-blue-500/40 underline-offset-2">
                              {part.text}
                            </span>
                          {:else}
                            <span>{part.text}</span>
                          {/if}
                        {/each}
                      </span>
                    </div>

                    <!-- Right: Shortcut Badge (Kbd style) -->
                    {#if cmd.shortcut}
                      <kbd
                        class="flex-shrink-0 px-2 py-0.5 text-xs font-mono font-medium rounded-md
                          {isActive
                            ? 'bg-white dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'} shadow-xs"
                      >
                        {cmd.shortcut}
                      </kbd>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer navigation tips -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/10 text-xs text-slate-400 dark:text-slate-500 select-none">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">↑↓</kbd>
            <span>navigate</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">↵</kbd>
            <span>select</span>
          </span>
        </div>
        <span class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">esc</kbd>
          <span>close</span>
        </span>
      </div>
    </div>
  </div>
{/if}
