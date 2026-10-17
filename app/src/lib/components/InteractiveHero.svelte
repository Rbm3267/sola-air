<script lang="ts">
  import SentinelHeroDemo from './SentinelHeroDemo.svelte';
  import SolaLogo from './SolaLogo.svelte';
  import { VERSIONS, PUBLISHED_COUNT, FACTS } from '$lib/data/site';

  const version = VERSIONS.solaAir;

  let copied = $state(false);

  function copyCliCommand() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('npm create sola@latest');
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

  <!-- Floating Luminous Announcement Badge with Real Sola Sun Logo -->
  <div class="sola-beat-enter inline-flex items-center justify-center gap-2.5 px-4 py-1.5 rounded-full bg-white/90 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-medium mb-6 shadow-2xs whitespace-nowrap leading-none">
    <SolaLogo size={16} />
    <span>Sola AIR v{version} • Ambient Intent Runtime</span>
    <span class="text-blue-400/80">/</span>
    <span class="text-slate-600 dark:text-slate-300 font-normal">{PUBLISHED_COUNT} Primitives</span>
  </div>

  <!-- Main Headline -->
  <h1 class="sola-beat-enter sola-beat-delay-1 text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.06] mb-6 max-w-4xl">
    Your UI shouldn't wait to be <span class="bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">asked</span>.
  </h1>

  <!-- Subheadline -->
  <p class="sola-beat-enter sola-beat-delay-2 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-8 sm:mb-10 leading-relaxed font-normal">
    Sola Sentinel watches what people do on the page and <code class="font-mono text-[0.85em] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md">$intent</code> can offer a suggestion before they ask. Compile <code class="font-mono text-[0.85em] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md">.sola</code> components to plain DOM calls, or mount a persistent Shadow DOM shell across any existing app or multi-page portal.
  </p>

  <!-- Clean Action Bar (CTAs + CLI) with Strict Single-Line Matched Height Alignment -->
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

    <!-- Inline CLI Pill -->
    <div class="h-11 px-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 backdrop-blur-md text-slate-800 dark:text-slate-200 font-mono text-xs inline-flex items-center justify-between gap-3 shadow-2xs whitespace-nowrap shrink-0 leading-none">
      <div class="inline-flex items-center gap-2 select-all">
        <span class="text-blue-600 dark:text-blue-400 font-semibold select-none">$</span>
        <span>npm create sola@latest</span>
      </div>
      <button
        onclick={copyCliCommand}
        aria-label="Copy CLI command"
        class="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer inline-flex items-center justify-center shrink-0">
        {#if copied}
          <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        {:else}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        {/if}
      </button>
    </div>
  </div>

  <!-- Micro Technical Attributes Line -->
  <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 mb-12">
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {FACTS.coreSizeKb} core runtime</span>
    <span>•</span>
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span> Compiles to plain DOM calls</span>
    <span>•</span>
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span> Drops into any page via Shadow DOM</span>
  </div>

  <!-- Sentinel Hero Stage -->
  <SentinelHeroDemo />
</div>
