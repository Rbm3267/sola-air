<script lang="ts">
  // The pitch, as one interaction: a real form, watched by the real Sentinel
  // from @sola-air-ui/sentinel. Focus a field, type, then pause — Sentinel's
  // significance gate fires and a suggestion resolves. Nothing here is faked;
  // the observer buffer shown alongside reads the same fieldHistory driving
  // the gate. observe() wires every field by delegation — nothing below calls
  // recordFieldFocus/Input/Blur by hand, which is the whole point of the package.
  import { observe, type SolaSentinel, type FieldEvent } from '@sola-air-ui/sentinel';
  import { onMount } from 'svelte';

  type Suggestion = { label: string; action: string; confidence: number } | null;

  const SENTINEL_OPTIONS = {
    // Tightened from the defaults so the demo responds at the pace of someone
    // trying it out, rather than making them wait to see anything happen.
    idleThresholdMs: 900,
    minSuggestIntervalMs: 3000,
    minEventsForSuggestion: 2
  };

  let root = $state<HTMLDivElement>();
  let handle: ReturnType<typeof observe> | null = null;

  let fields = $state({ destination: '', dates: '', travelers: '' });
  let suggestion = $state<Suggestion>(null);
  let resolving = $state(false);
  let events = $state<string[]>([]);
  let flowIndex = $state(99.8);
  let hasInteracted = $state(false);

  function describe(e: FieldEvent): string {
    if (e.type === 'focus') return e.revisit ? `returned to "${e.fieldId}"` : `focused "${e.fieldId}"`;
    if (e.type === 'input') return e.valueLength ? `typing in "${e.fieldId}": ${e.valueLength} chars` : `cleared "${e.fieldId}"`;
    return e.valueLength ? `left "${e.fieldId}" with ${e.valueLength} chars` : `left "${e.fieldId}" empty`;
  }

  // observe()'s own listener runs in the capture phase, so by the time this
  // (bubble-phase) handler fires, Sentinel's fieldHistory already reflects the
  // event — this only mirrors the buffer that is actually driving the gate.
  function syncBuffer(sentinel: SolaSentinel) {
    flowIndex = sentinel.flowIndex;
    hasInteracted = sentinel.fieldHistory.length > 0;

    const last = sentinel.fieldHistory[sentinel.fieldHistory.length - 1];
    if (!last) return;
    const line = describe(last);
    if (last.type === 'input') {
      // One line per field, updated in place — the buffer should read like the
      // observer's own state, not an append-only log of keystrokes.
      const withoutSameField = events.filter(
        (e) => !e.startsWith(`typing in "${last.fieldId}"`) && !e.startsWith(`cleared "${last.fieldId}"`)
      );
      events = [...withoutSameField.slice(-3), line];
    } else {
      events = [...events.slice(-4), line];
    }
  }

  // Resolution is local so the page has no server dependency and no API key;
  // what is real is the observation, the gate, and the prompt Sentinel builds.
  function resolveLocally(prompt: string): Suggestion {
    const { destination, dates, travelers } = fields;
    if (destination && !dates) {
      return {
        label: `Add dates for ${destination.trim()}`,
        action: 'Most trips to this destination are booked 3–6 weeks ahead. Want the cheapest week?',
        confidence: 0.82
      };
    }
    if (destination && dates && !travelers) {
      return {
        label: 'How many traveling?',
        action: `Pricing for ${destination.trim()} changes sharply above four people.`,
        confidence: 0.74
      };
    }
    if (destination && dates && travelers) {
      return {
        label: 'Ready to compare fares',
        action: `Search ${destination.trim()} for ${travelers.trim()} on ${dates.trim()}.`,
        confidence: 0.91
      };
    }
    return {
      label: 'Start with where',
      action: 'Enter a destination and the rest can be suggested for you.',
      confidence: 0.55
    };
  }

  function onSuggest(prompt: string) {
    resolving = true;
    // A short delay stands in for the model round-trip $intent would make.
    setTimeout(() => {
      suggestion = resolveLocally(prompt);
      resolving = false;
    }, 420);
  }

  // observe()'s own poll replaces the hand-rolled setInterval; this handler
  // piggybacks on the same field events observe() is already listening for
  // (added on the same root, so it runs after observe()'s capture-phase
  // listener has already recorded them), purely to mirror them into the
  // demo's display. It reads handle.sentinel fresh each call, so it keeps
  // working across a reset() without being re-attached itself.
  function onFieldEvent() {
    if (handle) syncBuffer(handle.sentinel);
  }

  function attach() {
    if (!root) return;
    handle = observe(root, { name: 'hero-demo', ...SENTINEL_OPTIONS, onSuggest });
  }

  onMount(() => {
    attach();
    root?.addEventListener('focusin', onFieldEvent);
    root?.addEventListener('input', onFieldEvent);
    root?.addEventListener('focusout', onFieldEvent);
    return () => {
      handle?.disconnect();
      root?.removeEventListener('focusin', onFieldEvent);
      root?.removeEventListener('input', onFieldEvent);
      root?.removeEventListener('focusout', onFieldEvent);
    };
  });

  function reset() {
    fields = { destination: '', dates: '', travelers: '' };
    suggestion = null;
    events = [];
    hasInteracted = false;
    flowIndex = 99.8;
    handle?.disconnect();
    attach();
  }
</script>

<div class="w-full max-w-4xl mx-auto text-left">
  <div class="bg-white/95 dark:bg-[#0c1222] border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">

    <div class="px-5 py-3.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 tracking-wider uppercase">
          Sentinel · observing
        </span>
      </div>
      <button
        type="button"
        onclick={reset}
        class="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer">
        Reset
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-5" bind:this={root}>
      <!-- The form a person actually fills in -->
      <div class="md:col-span-3 p-6 sm:p-7 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5">
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
          Type into a field, then stop for a moment. The observation and the
          gate are the real Sentinel from
          <code class="font-mono text-xs bg-slate-100 dark:bg-white/5 px-1 py-0.5 rounded">@sola-air-ui/sentinel</code>,
          watching this form the same way <code class="font-mono text-xs bg-slate-100 dark:bg-white/5 px-1 py-0.5 rounded">observe()</code>
          would watch any of yours — no per-field wiring below. The suggestion
          itself is resolved locally so this page needs no API key.
        </p>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Destination</span>
          <input
            bind:value={fields.destination}
            placeholder="Lisbon"
            class="px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Dates</span>
          <input
            bind:value={fields.dates}
            placeholder="12–19 October"
            class="px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Travelers</span>
          <input
            bind:value={fields.travelers}
            placeholder="2 adults"
            class="px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
        </label>
      </div>

      <!-- What Sentinel saw, and what it resolved -->
      <div class="md:col-span-2 p-6 sm:p-7 flex flex-col gap-4 bg-slate-50/50 dark:bg-white/[0.015]">
        <div class="flex flex-col gap-2">
          <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Suggestion
          </span>

          {#if resolving}
            <div class="rounded-2xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/5 p-4 flex items-center gap-2.5" role="status" aria-live="polite">
              <span class="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></span>
              <span class="text-sm text-emerald-800 dark:text-emerald-300">Resolving…</span>
            </div>
          {:else if suggestion}
            <div class="rounded-2xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/5 p-4 flex flex-col gap-1.5" role="status" aria-live="polite">
              <span class="text-sm font-semibold text-emerald-900 dark:text-emerald-300">{suggestion.label}</span>
              <span class="text-sm text-emerald-800/90 dark:text-emerald-200/80 leading-relaxed">{suggestion.action}</span>
              <span class="text-xs font-mono text-emerald-700/70 dark:text-emerald-400/60 mt-0.5">
                confidence {Math.round(suggestion.confidence * 100)}%
              </span>
            </div>
          {:else}
            <div class="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-4">
              <span class="text-sm text-slate-500 dark:text-slate-400">
                {hasInteracted ? 'Waiting for a pause…' : 'Nothing yet — the form has not been touched.'}
              </span>
            </div>
          {/if}
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-baseline justify-between">
            <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Observer buffer
            </span>
            <span class="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              flow {flowIndex.toFixed(1)}
            </span>
          </div>
          <ul class="flex flex-col gap-1 font-mono text-xs text-slate-500 dark:text-slate-400 min-h-[5.5rem]">
            {#each events as event, i (i + event)}
              <li class="truncate">· {event}</li>
            {:else}
              <li class="text-slate-600 dark:text-slate-400">· idle</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
