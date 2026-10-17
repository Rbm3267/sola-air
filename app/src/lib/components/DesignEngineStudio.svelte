<script lang="ts">
  import { PUBLISHED_COUNT, CATALOG_COUNT } from '$lib/data/site';
  import SolaMount from './SolaMount.svelte';
  import SolaIcons from './SolaIcons.svelte';
  import SolaKbd from './SolaKbd.svelte';
  import Button from '@sola-air-ui/ui/Button.sola';
  import DatePicker from '@sola-air-ui/ui/DatePicker.sola';
  import Toggle from '@sola-air-ui/ui/Toggle.sola';
  import GaugeCard from '@sola-air-ui/ui/GaugeCard.sola';

  let activeTab = $state<'components' | 'telemetry' | 'tokens'>('components');
  let selectedFramework = $state<'sola' | 'shell' | 'vite' | 'tokens'>('sola');

  // Interactive Live State
  let buttonCount = $state(12);
  let sliderVal = $state(74);

  const frameworkSnippets = {
    sola: `<script>\n  import DataCard from '@sola-air-ui/ui/data-card';\n  import GaugeCard from '@sola-air-ui/ui/gauge-card';\n  import Button from '@sola-air-ui/ui/button';\n\n  let count = $state(12);\n  let load = $derived(Math.min(100, count * 6));\n<\/script>\n\n<DataCard title="Signals Emitted" value={String(count)} trend="+8.4%" />\n<GaugeCard title="Cluster Load" value={load + '%'} percentage={load} color="sky" />\n<Button label="Trigger Signal" variant="primary" onClick={() => count++} />`,
    shell: `import TelemetryHud from './TelemetryHud.sola';\nimport tokensCss from '@sola-air-ui/tokens/css?raw';\nimport { mountShell } from '@sola-air-ui/core';\n\nconst shell = mountShell(TelemetryHud, {}, {\n  id: 'sola-telemetry-hud',\n  shadow: 'closed',\n  css: tokensCss\n});`,
    vite: `import { defineConfig } from 'vite';\nimport sola from '@sola-air-ui/vite-plugin-sola';\n\nexport default defineConfig({\n  plugins: [sola()]\n});`,
    tokens: `@import '@sola-air-ui/tokens/css';\n\n.hud-surface {\n  background: var(--sola-surface-elevated);\n  color: var(--sola-text-primary);\n  border: 1px solid var(--sola-border-subtle);\n  border-radius: var(--sola-radius-lg);\n}`
  };
</script>

<section id="design-system" class="w-full py-20 border-t border-slate-200/80 dark:border-white/[0.04] relative">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

    <!-- Section Header -->
    <div class="text-center max-w-3xl mx-auto mb-12">
      <div class="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold mb-3 whitespace-nowrap leading-none">
        <SolaIcons name="spark" size={14} />
        <span>@sola-air-ui/ui • Component library</span>
      </div>
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight mb-4">
        {PUBLISHED_COUNT} components you can install today.
      </h2>
      <p class="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed font-normal max-w-[68ch] mx-auto">
        Buttons, date pickers, tables, gauges and more. Every widget below is a real compiled <code class="font-mono text-[0.9em] text-blue-700 dark:text-blue-400">.sola</code> component mounted directly into the page.
      </p>
    </div>

    <!-- Main Interactive Design Studio Surface -->
    <div class="bg-white dark:bg-[#0c1222] border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">

      <!-- Studio Header / Mode Tabs -->
      <div class="min-h-14 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 bg-slate-50/70 dark:bg-white/[0.02] gap-3 py-3 sm:py-0">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 mr-2">
            <div class="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-violet-500"></div>
          </div>
          <span class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
            Sola Design System Inspector
          </span>
        </div>

        <!-- Mode Switcher -->
        <div class="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl shrink-0">
          <button
            onclick={() => (activeTab = 'components')}
            class="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap leading-none {activeTab === 'components' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'}">
            Interactive Primitives
          </button>
          <button
            onclick={() => (activeTab = 'telemetry')}
            class="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap leading-none {activeTab === 'telemetry' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'}">
            Telemetry &amp; Gauges
          </button>
          <button
            onclick={() => (activeTab = 'tokens')}
            class="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap leading-none {activeTab === 'tokens' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'}">
            Tokens &amp; Signals
          </button>
        </div>
      </div>

      <!-- Main Stage Split -->
      <div class="grid grid-cols-1 lg:grid-cols-12">

        <!-- Left: Live Interactive Components Sandbox (7 Cols) -->
        <div class="lg:col-span-7 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-white/5 space-y-6">
          {#if activeTab === 'components'}
            <!-- Real Compiled .sola Primitives Showcase -->
            <div class="space-y-5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Compiled @sola-air-ui/ui Primitives</span>
                <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-mono font-medium whitespace-nowrap leading-none">Live .sola DOM</span>
              </div>

              <!-- Real Button.sola Instances -->
              <div class="flex flex-wrap items-center gap-3">
                {#key buttonCount}
                  <SolaMount
                    component={Button}
                    props={{
                      variant: 'primary',
                      label: `Primary Action (${buttonCount})`,
                      onClick: () => (buttonCount += 1)
                    }}
                  />
                {/key}
                <SolaMount component={Button} props={{ variant: 'secondary', label: 'Secondary' }} />
                <SolaMount component={Button} props={{ variant: 'ghost', label: 'Ghost' }} />
              </div>

              <!-- Real DatePicker.sola & Toggle.sola + Keyboard Shortcuts -->
              <div class="pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <SolaMount
                    component={DatePicker}
                    props={{ label: 'Release Window (DatePicker.sola)', initialValue: '2026-08-15' }}
                  />
                </div>
                <div class="space-y-3">
                  <SolaMount
                    component={Toggle}
                    props={{ label: 'Ambient Sentinel Observer', initialChecked: true }}
                  />
                  <div class="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10">
                    <div class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <span>Palette:</span>
                      <SolaKbd keys={['⌘', 'K']} size="sm" />
                    </div>
                    <div class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <span>Save:</span>
                      <SolaKbd keys={['⌘', 'S']} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Slider -->
              <div class="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-700 dark:text-slate-300">Signal Resistance Slider</span>
                  <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{sliderVal}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  aria-label="Signal resistance"
                  bind:value={sliderVal}
                  class="w-full accent-blue-600 h-2 bg-slate-100 dark:bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

          {:else if activeTab === 'telemetry'}
            <!-- Real Compiled GaugeCard.sola Instances -->
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {#key sliderVal}
                  <SolaMount
                    component={GaugeCard}
                    props={{
                      title: 'Cluster Capacity',
                      value: `${sliderVal}%`,
                      percentage: sliderVal,
                      subtext: 'Direct DOM arc binding',
                      color: 'sky'
                    }}
                  />
                {/key}
                <SolaMount
                  component={GaugeCard}
                  props={{
                    title: 'Intent Confidence',
                    value: '94%',
                    percentage: 94,
                    subtext: 'Sentinel observer score',
                    color: 'emerald'
                  }}
                />
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs font-mono">
                <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10">
                  <span class="text-slate-500 dark:text-slate-400 text-xs block">Frame Time</span>
                  <span class="text-base font-bold text-blue-600 dark:text-blue-400">0.32ms</span>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10">
                  <span class="text-slate-500 dark:text-slate-400 text-xs block">VDOM Diffing Overhead</span>
                  <span class="text-base font-bold text-slate-900 dark:text-white">0.00ms</span>
                </div>
              </div>
            </div>

          {:else}
            <!-- Tokens & Theme Systems (Luminous Daylight + Sola Spectrum) -->
            <div class="space-y-4">
              <div class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Sola Luminous Spectrum Tokens</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-3 bg-white text-slate-900 rounded-2xl border border-slate-200 space-y-1 shadow-2xs">
                  <span class="text-xs font-mono text-slate-500 block">Daylight Surface</span>
                  <span class="text-xs font-semibold font-mono text-slate-900">#FFFFFF</span>
                </div>
                <div class="p-3 bg-sky-50 text-sky-950 rounded-2xl border border-sky-200 space-y-1">
                  <span class="text-xs font-mono text-sky-800 block">Sola Sky</span>
                  <span class="text-xs font-semibold font-mono text-sky-900">#38BDF8</span>
                </div>
                <div class="p-3 bg-blue-600 text-white rounded-2xl space-y-1">
                  <span class="text-xs font-mono text-blue-100 block">Sola Blue</span>
                  <span class="text-xs font-semibold font-mono text-white">#2563EB</span>
                </div>
                <div class="p-3 bg-violet-600 text-white rounded-2xl space-y-1">
                  <span class="text-xs font-mono text-violet-100 block">Sola Violet</span>
                  <span class="text-xs font-semibold font-mono text-white">#9333EA</span>
                </div>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
                Semantic design tokens from <code class="font-mono text-blue-700 dark:text-blue-400">@sola-air-ui/tokens</code> adapt automatically between daylight surfaces and dark environments.
              </p>
            </div>
          {/if}
        </div>

        <!-- Right: Code Exporter (5 Cols — Daylight Surface in Light Mode) -->
        <div class="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-slate-50/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 font-mono text-xs">
          <div>
            <!-- Framework Selector Header -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/10 mb-4">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Sola AIR Output</span>
              <div class="inline-flex items-center gap-1">
                <button
                  onclick={() => (selectedFramework = 'sola')}
                  class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap leading-none {selectedFramework === 'sola' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                  .sola
                </button>
                <button
                  onclick={() => (selectedFramework = 'shell')}
                  class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap leading-none {selectedFramework === 'shell' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                  mountShell
                </button>
                <button
                  onclick={() => (selectedFramework = 'vite')}
                  class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap leading-none {selectedFramework === 'vite' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                  Vite Config
                </button>
                <button
                  onclick={() => (selectedFramework = 'tokens')}
                  class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap leading-none {selectedFramework === 'tokens' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                  Tokens CSS
                </button>
              </div>
            </div>

            <!-- Code Snippet -->
            <!-- A scroll region must take keyboard focus (axe scrollable-region-focusable). -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div class="overflow-x-auto text-xs leading-relaxed text-slate-800 dark:text-slate-200" role="region" aria-label="Framework output" tabindex="0">
              <pre><code>{frameworkSnippets[selectedFramework]}</code></pre>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="pt-6 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
            <span class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Zero virtual DOM overhead</span>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="/components"
                class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs whitespace-nowrap leading-none">
                <span>View all {CATALOG_COUNT} components</span>
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</section>
