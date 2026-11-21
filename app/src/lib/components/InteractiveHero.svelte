<script lang="ts">
  import SentinelHeroDemo from './SentinelHeroDemo.svelte';
  import SolaLogo from './SolaLogo.svelte';
  import SolaCodeBlock from './SolaCodeBlock.svelte';
  import { VERSIONS, PUBLISHED_COUNT, HUGGINGFACE_URL } from '$lib/data/site';
  import { overlayExample } from '$lib/data/docsSnippets';

  const version = VERSIONS.solaAir;

  // Two ways in: add Sola to an app that already exists, or start a new one.
  const COMMANDS = {
    add: 'npm i @sola-air-ui/core @sola-air-ui/sentinel',
    create: 'npm create sola@latest',
    model: 'ollama run hf.co/bennett-xdlabs/sola-air-1.5b'
  } as const;

  let mode = $state<keyof typeof COMMANDS>('add');
  let copied = $state(false);

  function copyCliCommand() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(COMMANDS[mode]);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    }
  }
</script>

<!-- Ambient Luminous Hero Section -->
<div class="flex flex-col items-center text-center max-w-5xl mx-auto pt-6 md:pt-12 pb-16 relative w-full">
  <!-- Subtle SVG Signal Conduits (Visual Embodiment of Sola + AIR) -->
  <svg
    class="pointer-events-none absolute -top-8 inset-x-0 w-full h-72 opacity-50 dark:opacity-35 -z-10"
    viewBox="0 0 1100 280"
    fill="none"
    aria-hidden="true">
    <defs>
      <linearGradient id="sola-hero-conduit" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0" />
        <stop offset="28%" stop-color="#38bdf8" stop-opacity="0.45" />
        <stop offset="52%" stop-color="#2563eb" stop-opacity="0.55" />
        <stop offset="76%" stop-color="#9333ea" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#9333ea" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M40 210 C 280 90, 420 240, 550 130 C 690 30, 830 190, 1060 70"
      stroke="url(#sola-hero-conduit)"
      stroke-width="1.5"
      class="sola-signal-path" />
    <path
      d="M90 60 C 310 180, 460 40, 580 150 C 710 250, 860 80, 1020 190"
      stroke="url(#sola-hero-conduit)"
      stroke-width="1.25"
      class="sola-signal-path" />
  </svg>

  <!-- Eyebrow -->
  <p class="sola-beat-enter inline-flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 mb-5 leading-none">
    <SolaLogo size={14} />
    <span class="text-slate-800 dark:text-slate-200 font-medium">Sola AIR v{version}</span>
    <span aria-hidden="true">·</span>
    <span>Ambient Intent Runtime</span>
    <span aria-hidden="true">·</span>
    <span>{PUBLISHED_COUNT} Components</span>
  </p>

  <!-- Main Headline -->
  <h1 class="sola-beat-enter sola-beat-delay-1 text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.06] mb-6 max-w-4xl">
    Your UI shouldn't wait to be <span class="text-[#1d4ed8] dark:text-[#38bdf8]">asked</span>.
  </h1>

  <!-- Subheadline -->
  <p class="sola-beat-enter sola-beat-delay-2 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-8 sm:mb-10 leading-relaxed font-normal">
    Add a companion panel to an app you already have. Sola Sentinel notices when someone hesitates on a form, and the companion mounts in its own closed Shadow DOM, so your styles and ours stay apart. No rewrite of the host page.
  </p>

  <!-- Action Bar (CTAs) -->
  <div class="sola-beat-enter sola-beat-delay-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 w-full sm:w-auto justify-center">
    <!-- Primary CTA -->
    <a
      href="/docs"
      class="h-11 px-6 rounded-2xl font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/15 hover:-translate-y-0.5 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 leading-none cursor-pointer">
      <span>Get started</span>
      <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </a>

    <!-- Secondary CTA -->
    <a
      href="/components"
      class="h-11 px-6 rounded-2xl font-semibold transition-all duration-200 bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-xs hover:-translate-y-0.5 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 leading-none cursor-pointer">
      <span>Browse components</span>
    </a>
  </div>

  <!-- 2. Live Sentinel Form Demo -->
  <SentinelHeroDemo />

  <!-- 3. Install command: add to an existing app, start a new one, or run the 1.5B model -->
  <div class="sola-beat-enter sola-beat-delay-3 flex flex-col items-center gap-2 mt-12 mb-4 w-full">
    <div class="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-semibold" role="group" aria-label="Install command">
      <button
        type="button"
        aria-pressed={mode === 'add'}
        onclick={() => (mode = 'add')}
        class="px-3 py-1.5 rounded-lg leading-none cursor-pointer transition-colors {mode === 'add' ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
        Add to an existing app
      </button>
      <button
        type="button"
        aria-pressed={mode === 'create'}
        onclick={() => (mode = 'create')}
        class="px-3 py-1.5 rounded-lg leading-none cursor-pointer transition-colors {mode === 'create' ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
        Start a new app
      </button>
      <button
        type="button"
        aria-pressed={mode === 'model'}
        onclick={() => (mode = 'model')}
        class="px-3 py-1.5 rounded-lg leading-none cursor-pointer transition-colors {mode === 'model' ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
        Run 1.5B model
      </button>
    </div>
    <div class="h-11 w-full max-w-md px-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 backdrop-blur-md text-slate-800 dark:text-slate-200 font-mono text-xs inline-flex items-center justify-between gap-3 shadow-2xs whitespace-nowrap leading-none">
      <!-- Focusable so keyboard users can scroll the command on narrow screens. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="inline-flex items-center gap-2 select-all overflow-x-auto" role="region" aria-label="Install command text" tabindex="0">
        <span class="text-blue-600 dark:text-blue-400 font-semibold select-none">$</span>
        <span>{COMMANDS[mode]}</span>
      </div>
      <button
        onclick={copyCliCommand}
        aria-label="Copy install command"
        class="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer inline-flex items-center justify-center shrink-0">
        {#if copied}
          <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        {:else}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        {/if}
      </button>
    </div>
    <p class="text-xs text-slate-600 dark:text-slate-400 max-w-md leading-relaxed min-h-[4rem]">
      {#if mode === 'add'}
        Companions are written in <code class="font-mono">.sola</code> and compiled once, with the Vite plugin or the <code class="font-mono">sola compile</code> command. The host page then needs only a bundler import or two script tags.
        <a href="/docs#host-embedding" class="font-semibold text-blue-700 dark:text-blue-400 underline decoration-blue-300 underline-offset-2">Details</a>
      {:else if mode === 'create'}
        Scaffolds a project with the compiler, the component library and a dev server.
      {:else}
        Runs sola-air-1.5b locally through Ollama (986 MB, ~13 s per component on a 2 GB GPU, 17 of 20 (85%) mount and render on the 20-prompt Sola AIR component eval suite).
        <a href={HUGGINGFACE_URL} target="_blank" rel="noreferrer" class="font-semibold text-blue-700 dark:text-blue-400 underline decoration-blue-300 underline-offset-2">Hugging Face Hub ↗</a>
      {/if}
    </p>
  </div>

  <!-- Add it to a page you already have -->
  <div class="sola-beat-enter sola-beat-delay-3 w-full max-w-2xl text-left mt-6">
    <p class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Add it to a page you already have</p>
    <SolaCodeBlock code={overlayExample} language="typescript" title="companion.js" showLineNumbers={false} />
  </div>
</div>
