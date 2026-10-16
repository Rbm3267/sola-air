<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import InteractiveHero from '$lib/components/InteractiveHero.svelte';
  import DataDemo from '$lib/components/DataDemo.svelte';
  import ShellBusDemo from '$lib/components/ShellBusDemo.svelte';
  import DesignEngineStudio from '$lib/components/DesignEngineStudio.svelte';
  import DataCard from '$lib/components/DataCard.svelte';
  import DynamicForm from '$lib/components/DynamicForm.svelte';
  import ListBlock from '$lib/components/ListBlock.svelte';
  import { CATALOG_COUNT } from '$lib/data/site';
</script>

<svelte:head>
  <title>Sola AIR — UI that suggests before it is asked</title>
  <meta name="description" content="A zero-VDOM reactive runtime whose UI observes behaviour and resolves suggestions before the user asks." />
</svelte:head>


<div class="flex flex-col w-full bg-white dark:bg-[#090d19] text-slate-900 dark:text-white transition-colors duration-300 min-h-screen">
  <Navbar />
  
  <!-- Subtle Luminous Mesh Background -->
  <div class="absolute top-0 inset-x-0 h-[600px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.07),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.13),rgba(9,13,25,0))] pointer-events-none"></div>
  
  <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col pt-4 w-full">

<main id="main-content" class="contents">
    <!-- 1. Universal Interactive Hero -->
    <InteractiveHero />

    <!-- 2. THE 3 CORE PILLARS SECTION -->
    <section class="w-full py-16 sm:py-20 border-t border-slate-100 dark:border-white/[0.04] relative">
      <div class="text-center max-w-3xl mx-auto mb-14">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold mb-3">
          <span>What's here</span>
        </div>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          From idea to a live preview
        </h2>
        <p class="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
          Three tools for designing, previewing and reading Sola components.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Pillar 1: Sola Design Studio -->
        <div class="p-8 rounded-3xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] shadow-xs hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between gap-6 group">
          <div class="flex flex-col gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Sola Design Studio
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              A drag-and-drop canvas with {CATALOG_COUNT} components and live signal simulators.
            </p>
          </div>
          <a href="/studio" class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all">
            <span>Launch Studio</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>

        <!-- Pillar 2: Chrome Browser Extension -->
        <div class="p-8 rounded-3xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] shadow-xs hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between gap-6 group">
          <div class="flex flex-col gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Sola AIR Chrome extension
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              A Chrome extension that drops a Sola component into any page you have open, inside a closed Shadow DOM so its styles don't touch the page.
            </p>
          </div>
          <a href="/preview" class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all">
            <span>Try in Simulator</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>

        <!-- Pillar 3: the framework's own output. Replaces a "Community" card
             that promoted an open component registry which does not exist. -->
        <div class="p-8 rounded-3xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] shadow-xs hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between gap-6 group">
          <div class="flex flex-col gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Written in Sola
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              One page of this site is compiled from a single <code class="font-mono text-xs">.sola</code> file, with a live signal and its source linked. Read the source and compare it with what your browser is running.
            </p>
          </div>
          <a href="/overview" class="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-all">
            <span>See the output</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
      </div>

      </div>
    </section>

    <!-- 3. Google Sheets & Data Relay Interactive Section -->
    <ShellBusDemo />

    <DataDemo />

    <!-- 4. Foundational 56-Primitive Design Studio Inspector -->
    <DesignEngineStudio />

    <!-- 5. Component showcase -->
    <section class="w-full pb-32 pt-8 relative z-10 border-t border-slate-100 dark:border-white/[0.04]">
      <div id="architecture" class="flex flex-col justify-center px-2 md:px-4 mt-8">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.04] text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold mb-3">
            <span>@sola-air-ui/ui • Components</span>
          </div>
          <h2 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Components, compiled</h2>
          <p class="text-base text-slate-600 dark:text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed">
            Sola components compile directly into reactive vanilla DOM nodes with scoped styles and zero virtual DOM diffing. The cards below are Svelte previews of the layouts; browse the shipped .sola components on the Components page.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          <!-- Data Card Demo -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-2">
              <span class="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">DataCard</span>
              <span class="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded font-semibold border border-blue-100 dark:border-blue-500/20">Svelte preview</span>
            </div>
            <div class="flex flex-col gap-3">
              <DataCard config={{ title: "Realized MRR", value: "$184,200", trend: "+14.2%", icon: "activity" }} />
              <DataCard config={{ title: "Net Retention", value: "138%", trend: "+6.2%", icon: "trending-up" }} />
            </div>
          </div>

          <!-- Dynamic Form Demo -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-2">
              <span class="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">DynamicForm</span>
              <span class="text-xs font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded font-semibold border border-violet-100 dark:border-violet-500/20">Svelte preview</span>
            </div>
            <div>
              <DynamicForm config={{ 
                title: "Scale Connection Pool", 
                endpoint: "/api/provision", 
                fields: [
                  { name: "cluster", label: "Cluster Name", type: "text", required: true },
                  { name: "capacity", label: "Max Capacity (Nodes)", type: "number", required: true }
                ] 
              }} />
            </div>
          </div>

          <!-- List Block Demo -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-2">
              <span class="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">ListBlock</span>
              <span class="text-xs font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded font-semibold border border-sky-100 dark:border-sky-500/20">Svelte preview</span>
            </div>
            <div>
              <ListBlock config={{ 
                title: "Active Clusters", 
                items: [
                  { label: "cluster-us-east-1", description: "32 Nodes • Optimal", status: "Active" },
                  { label: "postgres-primary", description: "Lag: 0ms • Synchronized", status: "Active" },
                  { label: "edge-cdn-pop", description: "p99 Latency: 4.2ms", status: "Completed" }
                ] 
              }} />
            </div>
          </div>

        </div>
      </div>
    </section>
</main>
  </div>
</div>
