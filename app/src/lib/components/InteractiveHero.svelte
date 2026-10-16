<script lang="ts">
  import SentinelHeroDemo from './SentinelHeroDemo.svelte';

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
  
  <!-- Floating Luminous Announcement Badge -->
  <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold mb-6 shadow-2xs">
    <span class="flex h-2 w-2 relative">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
    </span>
    <span>Sola AIR v{version} • Ambient Intent Runtime</span>
    <span class="text-blue-400/80">/</span>
    <span class="text-slate-500 dark:text-slate-400 font-normal">{PUBLISHED_COUNT} Primitives</span>
  </div>

  <!-- Main Headline -->
  <h1 class="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.06] mb-6 max-w-4xl">
    Your UI shouldn't wait to be <span class="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">asked</span>.
  </h1>

  <!-- Subheadline -->
  <p class="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-8 sm:mb-10 leading-relaxed font-normal">
    Sola Sentinel watches what people do on the page and <code class="font-mono text-[0.85em] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">$intent</code> can offer a suggestion before they ask. Compile <code class="font-mono text-[0.85em] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">.sola</code> components to plain DOM calls, or mount a persistent Shadow DOM shell across any existing app or multi-page portal.
  </p>

  <!-- Clean Action Bar (CTAs + CLI) -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 w-full sm:w-auto justify-center">
    <!-- Primary CTA: a developer evaluating the framework wants the quickstart,
         not a drag-and-drop canvas. -->
    <a
      href="/docs"
      class="px-6 py-3 rounded-2xl font-semibold transition-all duration-200 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-500 dark:hover:bg-blue-400 dark:text-white shadow-md shadow-slate-900/10 dark:shadow-blue-500/20 hover:-translate-y-0.5 text-center text-sm flex items-center justify-center gap-2 cursor-pointer">
      <span>Get started</span>
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </a>

    <!-- Secondary CTA -->
    <a
      href="/components"
      class="px-6 py-3 rounded-2xl font-semibold transition-all duration-200 bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 shadow-xs hover:-translate-y-0.5 text-center text-sm flex items-center justify-center gap-2 cursor-pointer">
      <span>Browse components</span>
    </a>
    
    <!-- Inline CLI Pill -->
    <div class="px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 backdrop-blur-md text-slate-800 dark:text-slate-200 font-mono text-xs flex items-center justify-between gap-3 shadow-2xs">
      <div class="flex items-center gap-2 select-all">
        <span class="text-blue-500 font-bold select-none">$</span>
        <span>npm create sola@latest</span>
      </div>
      <button 
        onclick={copyCliCommand}
        aria-label="Copy CLI command" 
        class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer">
        {#if copied}
          <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        {:else}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        {/if}
      </button>
    </div>
  </div>

  <!-- Micro Technical Attributes Line -->
  <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-12">
    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {FACTS.coreSizeKb} core runtime</span>
    <span>•</span>
    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span> Compiles to plain DOM calls</span>
    <span>•</span>
    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span> Drops into any page via Shadow DOM</span>
  </div>

  <!-- The thesis, demonstrated: Sentinel watching a real form and resolving a
       suggestion. The old stage showed three tabs of generic telemetry widgets,
       none of which were what the headline is about. -->
  <SentinelHeroDemo />
</div>
