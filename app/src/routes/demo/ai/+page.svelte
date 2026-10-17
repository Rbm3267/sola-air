<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { onMount } from 'svelte';

  // ── ConversationThread state ───────────────────────────────────────────────
  interface Message {
    role: 'user' | 'assistant';
    content: string;
    streaming?: boolean;
  }
  let messages = $state<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm a demo of Sola AIR's ConversationThread component. Ask me anything — I'll simulate a streaming response.",
    },
  ]);
  let chatInput = $state('');
  let chatStreaming = $state(false);
  let chatEndRef: HTMLDivElement | undefined;

  const demoResponses = [
    "Sola AIR is a zero-VDOM, compiler-first framework where reactivity is ambient — signals propagate changes directly to the DOM without diffing. Components are `.sola` single-file units with typed props, `$state()`, and `$derived()` primitives.",
    "The `$intent()` primitive posts a prompt to any LLM endpoint you configure. It returns a reactive signal with `.loading` and `.error` accessors, plus optional streaming via SSE. Your server controls the model — Anthropic, OpenAI, Gemini, Ollama, or any custom endpoint.",
    "Provider adapters in `@sola-air-ui/providers` expose a Web Fetch API-compatible `.handler` that works in Next.js App Router, SvelteKit, Cloudflare Workers, and Deno — and a `.express` wrapper for Node.js. No SDK dependencies; pure `fetch` throughout.",
    "The design token system ships spacing (2–40px, 8 steps), type scale (12–32px, 5 steps), and a semantic alert palette (low→positive→info→moderate→warning→high→critical). Tokens ship as CSS custom properties and a JS object for tooling.",
  ];
  let responseIdx = 0;

  async function sendMessage() {
    const text = chatInput.trim();
    if (!text || chatStreaming) return;
    chatInput = '';
    messages = [...messages, { role: 'user', content: text }];
    chatStreaming = true;
    const response = demoResponses[responseIdx % demoResponses.length];
    responseIdx++;
    messages = [...messages, { role: 'assistant', content: '', streaming: true }];
    scrollChat();
    let accumulated = '';
    for (let i = 0; i < response.length; i++) {
      await delay(18 + Math.random() * 12);
      accumulated += response[i];
      messages = messages.map((m, idx) =>
        idx === messages.length - 1 ? { ...m, content: accumulated } : m
      );
      if (i % 8 === 0) scrollChat();
    }
    messages = messages.map((m, idx) =>
      idx === messages.length - 1 ? { ...m, streaming: false } : m
    );
    chatStreaming = false;
    scrollChat();
  }

  function scrollChat() {
    setTimeout(() => chatEndRef?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  function onChatKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── ConfidenceBadge state ──────────────────────────────────────────────────
  let badgeScore = $state(0.87);

  const badgeTier = $derived(() => {
    if (badgeScore === null) return 'unknown';
    if (badgeScore >= 0.85) return 'high';
    if (badgeScore >= 0.55) return 'medium';
    return 'low';
  });

  const badgeColor = $derived(() => {
    const t = badgeTier();
    if (t === 'high') return { fg: '#047857', bg: '#ecfdf5', label: 'High confidence' };
    if (t === 'medium') return { fg: '#a16207', bg: '#fefce8', label: 'Medium confidence' };
    if (t === 'low') return { fg: '#b91c1c', bg: '#fef2f2', label: 'Low confidence' };
    return { fg: '#475569', bg: '#f8fafc', label: 'Unknown' };
  });

  // ── ActionStrip state ──────────────────────────────────────────────────────
  interface Action {
    label: string;
    variant: 'default' | 'primary' | 'danger';
    icon: string;
    badge?: string;
  }
  const actions: Action[] = [
    { label: 'Apply fix', variant: 'primary', icon: '✓' },
    { label: 'Explain', variant: 'default', icon: '?' },
    { label: 'Regenerate', variant: 'default', icon: '↻' },
    { label: 'Copy', variant: 'default', icon: '⎘', badge: '4' },
    { label: 'Discard', variant: 'danger', icon: '✕' },
  ];
  let lastAction = $state('');

  // ── IntentSheet state ──────────────────────────────────────────────────────
  let sheetOpen = $state(false);
  let sheetLoading = $state(false);
  let sheetContent = $state<{ title: string; body: string; items: string[] } | null>(null);

  async function openSheet() {
    sheetOpen = true;
    sheetLoading = true;
    sheetContent = null;
    await delay(1400);
    sheetLoading = false;
    sheetContent = {
      title: 'Incident INC0042 — Analysis',
      body: 'This incident affects 3 downstream services. Root cause is a misconfigured load-balancer health check introduced in deploy #891.',
      items: [
        'Revert deploy #891 (ETA: 4 min)',
        'Update health check path from /ping to /health',
        'Notify on-call SRE team via PagerDuty',
        'Post status update to #incidents channel',
      ],
    };
  }

  // ── Token showcase state ──────────────────────────────────────────────────
  const alertRoles = [
    { name: 'low',      fg: '#475569', bg: '#f8fafc',  label: 'Low'      },
    { name: 'positive', fg: '#047857', bg: '#ecfdf5',  label: 'Positive' },
    { name: 'info',     fg: '#0369a1', bg: '#f0f9ff',  label: 'Info'     },
    { name: 'moderate', fg: '#a16207', bg: '#fefce8',  label: 'Moderate' },
    { name: 'warning',  fg: '#c2410c', bg: '#fff7ed',  label: 'Warning'  },
    { name: 'high',     fg: '#b91c1c', bg: '#fef2f2',  label: 'High'     },
    { name: 'critical', fg: '#7e22ce', bg: '#faf5ff',  label: 'Critical' },
  ];

  const spaceSteps = [
    { name: 'xxs', px: 2  },
    { name: 'xs',  px: 4  },
    { name: 'sm',  px: 8  },
    { name: 'md',  px: 12 },
    { name: 'lg',  px: 16 },
    { name: 'xl',  px: 24 },
    { name: '2xl', px: 32 },
    { name: '3xl', px: 40 },
  ];

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  onMount(() => {
    // Kick off a greeting stream after mount
    setTimeout(() => {}, 200);
  });
</script>

<svelte:head>
  <title>AI Interaction Primitives — Sola AIR</title>
  <meta name="description" content="Conversation threads, action strips, confidence badges and intent sheets, running live." />
</svelte:head>


<Navbar />

<main id="main-content" class="min-h-screen bg-slate-50 dark:bg-slate-950 pt-16">

  <!-- ── Page header ──────────────────────────────────────────────────────── -->
  <section class="max-w-5xl mx-auto px-6 pt-16 pb-10">
    <div class="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/60 mb-5">
      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
      AI Component Suite · @sola-air-ui/ui
    </div>
    <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
      AI Components
    </h1>
    <p class="text-lg text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
      ConversationThread, ActionStrip, ConfidenceBadge, and IntentSheet —
      components for chat and suggestion UIs. They compile to plain DOM, so you can mount them in any JavaScript app, and they work with whichever LLM provider you configure.
    </p>
  </section>

  <div class="max-w-5xl mx-auto px-6 pb-24 space-y-16">

    <!-- ── ConversationThread ───────────────────────────────────────────── -->
    <section>
      <div class="mb-5">
        <div class="flex items-center gap-3 mb-1">
          <h2 class="text-xl font-semibold text-slate-900 dark:text-white">ConversationThread</h2>
          <code class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono">@sola-air-ui/ui/ai/conversation-thread</code>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-[68ch]">Streaming chat UI with SSE support. Connects directly to any <code class="font-mono">$intent</code> endpoint via <code class="font-mono">configureIntent()</code>.</p>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <!-- Chat header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">AI</div>
            <div>
              <div class="text-sm font-semibold text-slate-900 dark:text-white">Sola Assistant</div>
              <div class="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 {chatStreaming ? 'animate-pulse' : ''}"></span>
                {chatStreaming ? 'Streaming response…' : 'Ready'}
              </div>
            </div>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">streaming · SSE</span>
        </div>

        <!-- Messages -->
        <div class="h-80 overflow-y-auto px-5 py-4 space-y-4 scroll-smooth">
          {#each messages as msg}
            <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5">
              {#if msg.role === 'assistant'}
                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 mt-1 flex items-center justify-center text-white" style="font-size:12px;font-weight:700">AI</div>
              {/if}
              <div class="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                {msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'}">
                {msg.content}{#if msg.streaming}<span class="inline-block w-1.5 h-4 ml-0.5 bg-blue-500 animate-pulse rounded-sm align-middle"></span>{/if}
              </div>
            </div>
          {/each}
          <div bind:this={chatEndRef}></div>
        </div>

        <!-- Input -->
        <div class="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <input
            type="text"
            bind:value={chatInput}
            onkeydown={onChatKey}
            placeholder="Ask about Sola AIR…"
            disabled={chatStreaming}
            class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-50 transition-colors"
          />
          <button
            onclick={sendMessage}
            disabled={chatStreaming || !chatInput.trim()}
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </section>

    <!-- ── ActionStrip ──────────────────────────────────────────────────── -->
    <section>
      <div class="mb-5">
        <div class="flex items-center gap-3 mb-1">
          <h2 class="text-xl font-semibold text-slate-900 dark:text-white">ActionStrip</h2>
          <code class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono">@sola-air-ui/ui/ai/action-strip</code>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-[68ch]">Contextual action chips surfaced after an AI response. Surfaces the most relevant follow-up actions inline.</p>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <!-- Default variant -->
        <div>
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 max-w-[68ch]">Default</p>
          <div class="flex flex-wrap gap-2">
            {#each actions as action}
              <button
                onclick={() => lastAction = action.label}
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all
                  {action.variant === 'primary'
                    ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                    : action.variant === 'danger'
                    ? 'bg-white dark:bg-slate-800 border-red-300 dark:border-red-700/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}"
              >
                <span class="font-mono text-xs">{action.icon}</span>
                {action.label}
                {#if action.badge}
                  <span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-1.5 py-0.5 rounded-full font-semibold">{action.badge}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Compact variant -->
        <div>
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 max-w-[68ch]">Compact</p>
          <div class="flex flex-wrap gap-1.5">
            {#each actions as action}
              <button
                onclick={() => lastAction = action.label}
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                  {action.variant === 'primary'
                    ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                    : action.variant === 'danger'
                    ? 'bg-white dark:bg-slate-800 border-red-300 dark:border-red-700/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}"
              >
                <span class="font-mono">{action.icon}</span>
                {action.label}
              </button>
            {/each}
          </div>
        </div>

        {#if lastAction}
          <p class="text-xs text-slate-500 dark:text-slate-400 font-mono max-w-[68ch]">
            <span class="text-blue-600 dark:text-blue-400">onaction</span> → "{lastAction}"
          </p>
        {/if}
      </div>
    </section>

    <!-- ── ConfidenceBadge ──────────────────────────────────────────────── -->
    <section>
      <div class="mb-5">
        <div class="flex items-center gap-3 mb-1">
          <h2 class="text-xl font-semibold text-slate-900 dark:text-white">ConfidenceBadge</h2>
          <code class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono">@sola-air-ui/ui/ai/confidence-badge</code>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-[68ch]">AI certainty indicator derived from a 0–1 score signal. Tiers: high ≥ 0.85, medium ≥ 0.55, low &lt; 0.55.</p>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <!-- Interactive slider -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">score prop (drag to change)</span>
            <span class="font-mono text-sm font-semibold text-slate-900 dark:text-white">{badgeScore.toFixed(2)}</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.01"
            aria-label="Score"
            bind:value={badgeScore}
            class="w-full accent-blue-500 cursor-pointer"
          />
          <div class="mt-4 flex items-center gap-3">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border"
              style="color: {badgeColor().fg}; background: {badgeColor().bg}; border-color: {badgeColor().fg}22"
            >
              <span class="w-2 h-2 rounded-full" style="background: {badgeColor().fg}"></span>
              {badgeColor().label}
              <span class="text-xs font-mono">{badgeScore.toFixed(0) === '1' ? '100' : (badgeScore * 100).toFixed(0)}%</span>
            </span>
          </div>
        </div>

        <!-- Size variants -->
        <div>
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 max-w-[68ch]">All tiers · sizes sm / md / lg</p>
          <div class="space-y-3">
            {#each [
              { score: 0.94, tier: 'high',    fg: '#047857', bg: '#ecfdf5', label: 'High' },
              { score: 0.71, tier: 'medium',  fg: '#a16207', bg: '#fefce8', label: 'Medium' },
              { score: 0.32, tier: 'low',     fg: '#b91c1c', bg: '#fef2f2', label: 'Low' },
              { score: null, tier: 'unknown', fg: '#475569', bg: '#f8fafc', label: 'Unknown' },
            ] as row}
              <div class="flex items-center gap-3">
                {#each ['sm', 'md', 'lg'] as size}
                  <span
                    class="inline-flex items-center gap-1 font-semibold border rounded-full"
                    style="
                      color: {row.fg};
                      background: {row.bg};
                      border-color: {row.fg}22;
                      font-size: {size === 'sm' ? '12px' : size === 'md' ? '13px' : '15px'};
                      padding: {size === 'sm' ? '2px 8px' : size === 'md' ? '4px 10px' : '6px 14px'};
                      gap: {size === 'sm' ? '4px' : '6px'};
                    "
                  >
                    <span class="rounded-full" style="
                      width: {size === 'sm' ? '6px' : size === 'md' ? '7px' : '8px'};
                      height: {size === 'sm' ? '6px' : size === 'md' ? '7px' : '8px'};
                      background: {row.fg};
                      flex-shrink: 0;
                    "></span>
                    {row.label}
                    {#if row.score !== null}
                      <span style="font-family:monospace;font-size:1em">{(row.score * 100).toFixed(0)}%</span>
                    {/if}
                  </span>
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- ── IntentSheet ──────────────────────────────────────────────────── -->
    <section>
      <div class="mb-5">
        <div class="flex items-center gap-3 mb-1">
          <h2 class="text-xl font-semibold text-slate-900 dark:text-white">IntentSheet</h2>
          <code class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono">@sola-air-ui/ui/ai/intent-sheet</code>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-[68ch]">Slide-in overlay driven by a <code class="font-mono">$intent</code> signal. Shows shimmer during load, structured result when resolved.</p>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <button
          onclick={openSheet}
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          Analyze incident INC0042 →
        </button>
      </div>

      <!-- Sheet overlay -->
      {#if sheetOpen}
        <!-- Backdrop -->
        <button
          class="fixed inset-0 z-40 cursor-default"
          style="background: rgba(15,23,42,0.55); backdrop-filter: blur(2px);"
          onclick={() => { sheetOpen = false; sheetContent = null; }}
          aria-label="Close panel"
        ></button>

        <!-- Panel -->
        <div
          class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
          style="border-left: 1px solid #e2e8f0; animation: slideIn 0.22s ease-out;"
        >
          <!-- Sheet header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <span class="font-semibold text-slate-900 dark:text-white">AI Analysis</span>
            <button
              onclick={() => { sheetOpen = false; sheetContent = null; }}
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-lg"
            >×</button>
          </div>

          <!-- Sheet body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            {#if sheetLoading}
              <!-- Shimmer -->
              <div class="space-y-4 animate-pulse">
                <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4"></div>
                <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6"></div>
                <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/6"></div>
                <div class="mt-6 space-y-2.5">
                  {#each [1,2,3,4] as _}
                    <div class="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                  {/each}
                </div>
              </div>
            {:else if sheetContent}
              <div>
                <div class="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800/60 mb-4">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Intent resolved
                </div>
                <h3 class="text-base font-semibold text-slate-900 dark:text-white mb-2">{sheetContent.title}</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5 max-w-[68ch]">{sheetContent.body}</p>
                <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 max-w-[68ch]">Recommended actions</p>
                <ol class="space-y-2">
                  {#each sheetContent.items as item, i}
                    <li class="flex items-start gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
                      <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span class="text-sm text-slate-700 dark:text-slate-300 leading-snug">{item}</span>
                    </li>
                  {/each}
                </ol>
              </div>
            {/if}
          </div>

          <!-- Sheet footer -->
          {#if sheetContent && !sheetLoading}
            <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                onclick={() => { sheetOpen = false; sheetContent = null; }}
              >
                Apply all actions
              </button>
              <button
                class="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onclick={() => { sheetOpen = false; sheetContent = null; }}
              >
                Dismiss
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </section>

    <!-- ── Token showcase ───────────────────────────────────────────────── -->
    <section>
      <div class="mb-5">
        <div class="flex items-center gap-3 mb-1">
          <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Design Tokens</h2>
          <code class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono">@sola-air-ui/tokens</code>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-[68ch]">
          CSS custom properties covering spacing, type scale, and semantic alert levels —
          open, platform-agnostic, ships as <code class="font-mono">--sola-*</code> variables.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Spacing scale -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 max-w-[68ch]">Spacing — <code class="font-mono normal-case">--sola-space-*</code></p>
          <div class="space-y-2">
            {#each spaceSteps as step}
              <div class="flex items-center gap-3">
                <div class="w-20 text-xs font-mono text-slate-500 dark:text-slate-400 text-right flex-shrink-0">{step.name}</div>
                <div class="bg-blue-500 rounded-sm flex-shrink-0" style="width: {step.px * 2}px; height: 10px;"></div>
                <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">{step.px}px</div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Semantic alert palette -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 max-w-[68ch]">Alert severity — <code class="font-mono normal-case">--sola-alert-*</code></p>
          <div class="space-y-2">
            {#each alertRoles as role}
              <div
                class="flex items-center justify-between px-3 py-2 rounded-lg"
                style="background: {role.bg};"
              >
                <span class="text-sm font-semibold" style="color: {role.fg};">{role.label}</span>
                <span class="text-xs font-mono" style="color: {role.fg};">{role.fg}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Type scale -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 max-w-[68ch]">Type scale — <code class="font-mono normal-case">--sola-font-size-*</code></p>
          <div class="space-y-3">
            {#each [
              { name: 'sm',  px: 12, use: 'Labels, metadata' },
              { name: 'md',  px: 16, use: 'Body copy (default)' },
              { name: 'lg',  px: 20, use: 'Section headers' },
              { name: 'xl',  px: 24, use: 'Page subtitles' },
              { name: '2xl', px: 32, use: 'Page title — once per page' },
            ] as step}
              <div class="flex items-baseline gap-3">
                <span class="text-slate-900 dark:text-white font-semibold leading-tight" style="font-size: {step.px}px;">Aa</span>
                <div>
                  <span class="text-xs font-mono text-slate-500 dark:text-slate-400">{step.name} · {step.px}px</span>
                  <span class="text-xs text-slate-600 dark:text-slate-400 ml-2">— {step.use}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Corner radius -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 max-w-[68ch]">Corner radius — <code class="font-mono normal-case">--sola-radius-*</code></p>
          <div class="flex flex-wrap gap-4 items-end">
            {#each [
              { name: 'sm',   r: 2,    size: 36, use: 'badges' },
              { name: 'md',   r: 6,    size: 40, use: 'buttons' },
              { name: 'lg',   r: 8,    size: 44, use: 'modals' },
              { name: 'xl',   r: 12,   size: 48, use: 'cards' },
              { name: '2xl',  r: 16,   size: 52, use: 'panels' },
              { name: 'full', r: 9999, size: 44, use: 'pills' },
            ] as step}
              <div class="flex flex-col items-center gap-1.5">
                <div
                  class="bg-blue-100 dark:bg-blue-950/40 border-2 border-blue-400 dark:border-blue-600"
                  style="width:{step.size}px;height:{step.size}px;border-radius:{step.r}px;"
                ></div>
                <span class="text-xs font-mono text-slate-500 dark:text-slate-400">{step.name}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{step.use}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- ── What Sola AIR is ─────────────────────────────────────────────── -->
    <section class="bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/20 dark:to-slate-900 rounded-2xl border border-blue-200/60 dark:border-blue-800/30 p-8">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">What Sola AIR gives you</h2>
      <div class="grid md:grid-cols-2 gap-6 text-sm">
        <div>
          <p class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 max-w-[68ch]">The runtime</p>
          <ul class="space-y-1.5 text-slate-600 dark:text-slate-400">
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Zero-VDOM — changes go straight to the DOM</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> <code class="font-mono text-xs">$state</code>, <code class="font-mono text-xs">$derived</code>, <code class="font-mono text-xs">$intent</code> as first-class primitives</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> <code class="font-mono text-xs">.sola</code> single-file components, compiled to plain JS</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Works alongside React, Svelte, or vanilla — no framework swap needed</li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 max-w-[68ch]">The AI layer</p>
          <ul class="space-y-1.5 text-slate-600 dark:text-slate-400">
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Provider-agnostic <code class="font-mono text-xs">$intent</code> — your server, your model</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Anthropic · OpenAI · Gemini · Ollama adapters included</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Streaming SSE built into the core primitive</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> AI component suite ships as npm — use it in any project</li>
          </ul>
        </div>
      </div>
    </section>

  </div>
</main>

<style>
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
</style>
