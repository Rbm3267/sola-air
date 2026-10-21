<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import InteractiveHero from '$lib/components/InteractiveHero.svelte';
  import CompanionShellStage from '$lib/components/CompanionShellStage.svelte';
  import CompilerWorkbench from '$lib/components/CompilerWorkbench.svelte';
  import DataDemo from '$lib/components/DataDemo.svelte';
  import ShellBusDemo from '$lib/components/ShellBusDemo.svelte';
  import DesignEngineStudio from '$lib/components/DesignEngineStudio.svelte';
  import SolaMount from '$lib/components/SolaMount.svelte';
  import SolaIcons from '$lib/components/SolaIcons.svelte';
  import TactileDialCard from '@sola-air-ui/ui/TactileDialCard.sola';
  import FlowWaterfall from '@sola-air-ui/ui/FlowWaterfall.sola';
  import IncidentTriageMatrix from '@sola-air-ui/ui/IncidentTriageMatrix.sola';
  import { PUBLISHED_COUNT } from '$lib/data/site';
  import { STUDIO_COMPONENTS } from '$lib/data/studioComponents';
</script>

<svelte:head>
  <title>Sola AIR — UI that suggests before it is asked</title>
  <meta name="description" content="A zero-VDOM reactive runtime whose UI observes behaviour and resolves suggestions before the user asks." />
</svelte:head>

<div class="flex flex-col w-full bg-white dark:bg-[#090d19] text-slate-900 dark:text-white transition-colors duration-300 min-h-screen">
  <Navbar />

  <!-- Luminous Solar + Air Radial Bloom Background -->
  <div class="absolute top-0 inset-x-0 h-[680px] bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(56,189,248,0.12),rgba(37,99,235,0.06)_45%,rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(56,189,248,0.14),rgba(9,13,25,0))] pointer-events-none"></div>

  <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col pt-4 w-full">

    <main id="main-content" class="contents">
      <!-- Beat 1: Ambient Hero + Live Sentinel Observer -->
      <InteractiveHero />

      <!-- Beat 2: Companion Shell & Closed Shadow DOM Stage -->
      <CompanionShellStage />

      <!-- Beat 3: Live 3-Pane Compiler X-Ray Workbench -->
      <CompilerWorkbench />

      <!-- Beat 4: The 3 Core Ecosystem Tools -->
      <section class="w-full py-16 sm:py-20 border-t border-slate-200/80 dark:border-white/[0.04] relative">
        <div class="text-center max-w-3xl mx-auto mb-14">
          <div class="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold mb-3 whitespace-nowrap leading-none">
            <SolaIcons name="spark" size={14} />
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
          <div class="sola-spring-card p-8 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-xs hover:shadow-xl hover:border-blue-500/40 flex flex-col justify-between gap-6 group">
            <div class="flex flex-col gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-white dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center shadow-2xs">
                <SolaIcons name="spark" size={22} />
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Sola Design Studio
              </h3>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
                Arrange {STUDIO_COMPONENTS.length} real <code class="font-mono text-xs">@sola-air-ui/ui</code> components on a grid, edit their props, and export the result as a <code class="font-mono text-xs">.sola</code> file. Arc can draft a layout from one sentence.
              </p>
            </div>
            <a href="/studio" class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all whitespace-nowrap leading-none">
              <span>Launch Studio</span>
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>

          <!-- Pillar 2: Chrome Browser Extension -->
          <div class="sola-spring-card p-8 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-xs hover:shadow-xl hover:border-blue-500/40 flex flex-col justify-between gap-6 group">
            <div class="flex flex-col gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-white dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center shadow-2xs">
                <SolaIcons name="shell" size={22} />
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Sola AIR Chrome extension
              </h3>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
                A Chrome extension that drops a Sola component into any page you have open, inside a closed Shadow DOM so its styles don't touch the page.
              </p>
            </div>
            <a href="/preview" class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all whitespace-nowrap leading-none">
              <span>Try in Simulator</span>
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>

          <!-- Pillar 3: Written in Sola -->
          <div class="sola-spring-card p-8 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-xs hover:shadow-xl hover:border-blue-500/40 flex flex-col justify-between gap-6 group">
            <div class="flex flex-col gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-white dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center shadow-2xs">
                <SolaIcons name="code" size={22} />
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Written in Sola
              </h3>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
                A three-step tour: a counter, a task list and an incident feed, each shown as its <code class="font-mono text-xs">.sola</code> source, the code the compiler writes, and the running result.
              </p>
            </div>
            <a href="/overview" class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all whitespace-nowrap leading-none">
              <span>Take the tour</span>
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>

        </div>
      </section>

      <!-- Beat 5: Persistent State & Event Bus ($persist, $on, $lastEvent) -->
      <ShellBusDemo />

      <!-- Beat 6: Live Data Relay ($data) -->
      <DataDemo />

      <!-- Beat 7: Interactive Design System Inspector -->
      <DesignEngineStudio />

      <!-- Beat 8: Real Compiled @sola-air-ui/ui Telemetry & Operations Primitives -->
      <section class="w-full pb-32 pt-8 relative z-10 border-t border-slate-200/80 dark:border-white/[0.04]">
        <div id="architecture" class="flex flex-col justify-center px-2 md:px-4 mt-8">
          <div class="text-center mb-12">
            <div class="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-white/[0.08] border border-sky-200/80 dark:border-white/[0.08] text-sky-800 dark:text-slate-300 text-xs font-mono font-semibold mb-3 whitespace-nowrap leading-none">
              <SolaIcons name="dial" size={14} />
              <span>@sola-air-ui/ui • {PUBLISHED_COUNT} Shipped .sola Primitives</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
              Compiled .sola primitives, running live
            </h2>
            <p class="text-base text-slate-600 dark:text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed">
              Every card below is compiled directly from <code class="font-mono text-[0.9em] text-blue-700 dark:text-blue-400">@sola-air-ui/ui/*.sola</code> into reactive vanilla DOM nodes with scoped styles and zero virtual DOM diffing. Drag the rotary ring, hover the waterfall bars, or trigger a mitigation playbook.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            <!-- 1. Real TactileDialCard.sola -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between px-2 gap-2">
                <span class="font-mono text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">TactileDialCard.sola</span>
                <span class="inline-flex items-center text-xs font-mono text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 rounded-full font-medium border border-sky-200/80 dark:border-sky-500/20 whitespace-nowrap leading-none">Compiled .sola</span>
              </div>
              <SolaMount
                component={TactileDialCard}
                props={{
                  title: 'Inference Concurrency',
                  unit: 'Drag ring or use arrows',
                  min: 0,
                  max: 120,
                  currentValue: 64,
                  color: 'sky'
                }}
              />
            </div>

            <!-- 2. Real FlowWaterfall.sola -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between px-2 gap-2">
                <span class="font-mono text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">FlowWaterfall.sola</span>
                <span class="inline-flex items-center text-xs font-mono text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full font-medium border border-blue-200/80 dark:border-blue-500/20 whitespace-nowrap leading-none">Compiled .sola</span>
              </div>
              <SolaMount
                component={FlowWaterfall}
                props={{
                  title: 'Latency Budget Split (ms)',
                  steps: [
                    { name: 'Sentinel DOM Observe', value: 1, type: 'positive' },
                    { name: 'Intent Debounce Window', value: 18, type: 'positive' },
                    { name: 'VDOM Diffing Overhead', value: 0, type: 'negative' },
                    { name: 'Total Frame Budget', value: 19, type: 'total' }
                  ]
                }}
              />
            </div>

            <!-- 3. Real IncidentTriageMatrix.sola -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between px-2 gap-2">
                <span class="font-mono text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">IncidentTriageMatrix.sola</span>
                <span class="inline-flex items-center text-xs font-mono text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-full font-medium border border-violet-200/80 dark:border-violet-500/20 whitespace-nowrap leading-none">Compiled .sola</span>
              </div>
              <SolaMount
                component={IncidentTriageMatrix}
                props={{
                  title: 'Live Priority Radar',
                  description: 'Active triage items staged for automated mitigation'
                }}
              />
            </div>

          </div>
        </div>
      </section>
    </main>
  </div>
</div>
