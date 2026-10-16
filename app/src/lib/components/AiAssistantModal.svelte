<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';

  let { isOpen = $bindable(false) } = $props<{ isOpen?: boolean }>();

  let prompt = $state('');
  let messages = $state<Array<{ role: 'user' | 'assistant'; text: string; timestamp?: string }>>([
    {
      role: 'assistant',
      text: "I'm the **Sola AIR** assistant.\n\nAsk me how to mount a compiled Sola component inside your app (**React, Vue, Svelte or plain JS**), bind data through the Sola Relay (**PostgreSQL, MySQL or Google Sheets**), or how the compiler works.",
      timestamp: 'Just now'
    }
  ]);
  let isLoading = $state(false);
  let copiedIndex = $state<number | null>(null);
  let messageContainer = $state<HTMLDivElement | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);

  const quickPrompts = [
    "How do I embed Sola in React 19?",
    "Zero-VDOM vs React State",
    "Show a .sola component",
    "Connect a WebSocket signal",
    "How does signal tracking work?",
    "Sola in an existing codebase"
  ];

  function formatTimestamp(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function parseFormattedText(text: string): string {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-white/10 font-mono text-xs text-blue-700 dark:text-blue-300">$1</code>');
    html = html.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
    return html;
  }

  async function sendMessage() {
    if (!prompt.trim() || isLoading) return;

    const userText = prompt.trim();
    messages = [...messages, { role: 'user', text: userText, timestamp: formatTimestamp() }];
    prompt = '';
    isLoading = true;

    setTimeout(() => {
      if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 50);

    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'architect', query: userText })
      });
      const data = await res.json();
      let reply = '';
      if (data.reply) reply = data.reply;
      else if (typeof data === 'string') reply = data;
      else if (data.components) reply = "```typescript\n// Generated Sola Architecture Specification\n" + JSON.stringify(data.components, null, 2) + "\n```";
      else reply = JSON.stringify(data, null, 2);
      messages = [...messages, { role: 'assistant', text: reply, timestamp: formatTimestamp() }];
    } catch {
      messages = [...messages, {
        role: 'assistant',
        text: "Sola primitives compile directly into native DOM nodes via `@sola-air-ui/compiler`. Use `createSignal()` for local state and import from `@sola-air-ui/ui` for zero-VDOM mounting inside any host framework.",
        timestamp: formatTimestamp()
      }];
    } finally {
      isLoading = false;
      setTimeout(() => {
        if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;
      }, 50);
    }
  }

  function pickPrompt(text: string) {
    prompt = text;
    sendMessage();
  }

  function copyMessage(index: number, text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      copiedIndex = index;
      setTimeout(() => { copiedIndex = null; }, 2000);
    }
  }

  let dialogEl = $state<HTMLElement | null>(null);
  let returnFocusTo: HTMLElement | null = null;

  const FOCUSABLE =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  onMount(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only Escape is handled here. The shortcut itself lives in the navbar:
      // both listened for it, one setting open and one toggling, so the two
      // cancelled out and the palette advertised on every page never opened.
      if (e.key === 'Escape' && isOpen) {
        isOpen = false;
        return;
      }

      // Keep Tab inside the dialog. It escaped on the first press.
      if (e.key !== 'Tab' || !isOpen || !dialogEl) return;
      const items = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      // Focus is moved into the dialog asynchronously after it opens, so a
      // Tab pressed in that window would otherwise walk the page behind it.
      if (!dialogEl.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  });

  $effect(() => {
    if (isOpen) {
      returnFocusTo = document.activeElement as HTMLElement | null;
      setTimeout(() => inputEl?.focus(), 80);
    } else if (returnFocusTo) {
      // Send focus back where it came from rather than to the top of the page.
      returnFocusTo.focus?.();
      returnFocusTo = null;
    }
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    transition:fade={{ duration: 150 }}
    onclick={() => (isOpen = false)}
    class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      transition:fly={{ y: 20, duration: 220, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}
      bind:this={dialogEl}
      role="dialog"
      aria-modal="true"
      aria-labelledby="arc-title"
      class="w-full sm:max-w-xl bg-white dark:bg-[#0b0f1e] border-t sm:border border-slate-200 dark:border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[80vh]">

      <!-- Header -->
      <div class="px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between bg-white dark:bg-[#0b0f1e] shrink-0">
        <div class="flex items-center gap-3">
          <!-- Logo mark -->
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <svg class="w-4.5 h-4.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="3" fill="white" stroke="none"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.64 5.64l2.83 2.83M15.54 15.54l2.83 2.83M5.64 18.36l2.83-2.83M15.54 8.46l2.83-2.83"/>
            </svg>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h2 id="arc-title" class="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                Sola <span class="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">AIR</span>
              </h2>
              <span class="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold tracking-wide">
                Assistant
              </span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono max-w-[68ch]">Active · Ambient Intent Runtime</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <kbd class="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-500 dark:text-slate-400">ESC</kbd>
          <button
            type="button"
            onclick={() => (isOpen = false)}
            aria-label="Close"
            class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Message Stream -->
      <div
        bind:this={messageContainer}
        class="flex-1 px-4 py-5 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-[#080c1a] min-h-[200px]">

        {#each messages as msg, idx}
          <div class="flex flex-col gap-1 {msg.role === 'user' ? 'items-end' : 'items-start'}">
            <span class="text-xs font-mono font-semibold uppercase text-slate-500 dark:text-slate-400 px-1">
              {msg.role === 'user' ? 'You' : 'Sola AIR'}
              {#if msg.timestamp}<span class="font-normal text-slate-300 dark:text-slate-600 ml-1">· {msg.timestamp}</span>{/if}
            </span>

            <div class="max-w-[88%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed {msg.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-sm font-medium shadow-sm shadow-blue-600/20'
              : 'bg-white dark:bg-[#0f1628] border border-slate-200/80 dark:border-white/[0.07] text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-2xs'}">
              {@html parseFormattedText(msg.text)}
            </div>

            {#if msg.role === 'assistant'}
              <button
                onclick={() => copyMessage(idx, msg.text)}
                class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer ml-1">
                {#if copiedIndex === idx}
                  <svg class="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span class="text-blue-500 font-bold">Copied</span>
                {:else}
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                {/if}
              </button>
            {/if}
          </div>
        {/each}

        {#if isLoading}
          <div class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#0f1628] border border-slate-200/80 dark:border-white/[0.07] rounded-2xl max-w-xs text-xs font-mono text-slate-500 dark:text-slate-400 shadow-2xs">
            <div class="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
            Synthesizing response…
          </div>
        {/if}
      </div>

      <!-- Quick Prompts — wrapped, never overflows -->
      <div class="px-4 pt-3 pb-2 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#0b0f1e] shrink-0">
        <p class="text-xs font-mono font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2 max-w-[68ch]">Suggestions</p>
        <div class="flex flex-wrap gap-1.5">
          {#each quickPrompts as qp}
            <button
              type="button"
              onclick={() => pickPrompt(qp)}
              class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/10 border border-slate-200/80 dark:border-white/[0.08] hover:border-blue-300 dark:hover:border-blue-500/30 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-xs whitespace-nowrap transition-all cursor-pointer">
              {qp}
            </button>
          {/each}
        </div>
      </div>

      <!-- Input Bar -->
      <form
        onsubmit={(e) => { e.preventDefault(); sendMessage(); }}
        class="p-3 bg-white dark:bg-[#0b0f1e] border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2 shrink-0">
        <input
          bind:this={inputEl}
          type="text"
          bind:value={prompt}
          placeholder="Ask Sola AIR anything…"
          class="flex-1 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 dark:focus:border-blue-500 transition-all font-sans" />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          aria-label="Send"
          class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all shadow-sm shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer shrink-0">
          Send
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </form>

    </div>
  </div>
{/if}

<style>
  :global(.dark) { color-scheme: dark; }
</style>
