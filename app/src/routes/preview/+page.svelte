<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { onMount } from 'svelte';
  import SolaButton from '$lib/components/SolaButton.svelte';
  import { GITHUB_URL, VERSIONS } from '$lib/data/site';

  // Animation Step State
  let activeAnimationStep = $state<1 | 2 | 3 | 4>(1);
  let isAutoPlaying = $state(true);
  let isSidePanelOpen = $state(true);
  let isCardInjected = $state(false);
  let placementMode = $state<'floating' | 'target'>('floating');
  let selectedComponent = $state('Telemetry Stream');
  let isTargetHovered = $state(false);

  let copied = $state(false);

  // Auto-play animation cycle
  onMount(() => {
    let interval = setInterval(() => {
      if (isAutoPlaying) {
        activeAnimationStep = activeAnimationStep === 4 ? 1 : ((activeAnimationStep + 1) as 1 | 2 | 3 | 4);
        syncAnimationState(activeAnimationStep);
      }
    }, 3200);

    return () => {
      clearInterval(interval);
    };
  });

  function syncAnimationState(step: 1 | 2 | 3 | 4) {
    if (step === 1) {
      isSidePanelOpen = false;
      isCardInjected = false;
      isTargetHovered = false;
    } else if (step === 2) {
      isSidePanelOpen = true;
      isCardInjected = false;
      isTargetHovered = false;
    } else if (step === 3) {
      isSidePanelOpen = true;
      isTargetHovered = true;
      isCardInjected = true;
    } else if (step === 4) {
      isSidePanelOpen = true;
      isTargetHovered = false;
      isCardInjected = true;
    }
  }

  function setStep(step: 1 | 2 | 3 | 4) {
    isAutoPlaying = false;
    activeAnimationStep = step;
    syncAnimationState(step);
  }
</script>

<svelte:head>
  <title>Sola AIR Chrome Extension • Live Browser Overlay</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-[#090d19] text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
  <Navbar />

  <!-- Soft Ambient Glow -->
  <div class="absolute top-0 inset-x-0 h-[450px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.06),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.1),rgba(9,13,25,0))] pointer-events-none"></div>

  <main id="main-content" class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-16">
    
    <!-- Hero Header -->
    <div class="text-center max-w-3xl mx-auto space-y-4">
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold shadow-2xs">
        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span>Sola AIR Chrome Extension v{VERSIONS.extension}</span>
      </div>
      
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Preview components on <span class="bg-gradient-to-r from-blue-600 via-cyan-600 to-sky-600 bg-clip-text text-transparent">any web page</span>
      </h1>
      
      <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-[68ch]">
        Show a preview card on top of any page (production, staging or localhost). Drag it anywhere, or anchor it to an element on the page.
      </p>

      <!-- Action CTAs -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <a
          href="https://chromewebstore.google.com/detail/sola-air/cahdakefpjocaapggijdbbgidcjdaehc"
          target="_blank"
          rel="noopener noreferrer"
          class="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>
          <span>Add to Chrome (Web Store)</span>
        </a>

        <a
          href="{GITHUB_URL}/raw/main/packages/sola-extension/sola-extension.zip"
          class="px-6 py-3 rounded-2xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 font-semibold text-xs sm:text-sm shadow-xs hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Download Zip (Unpacked)</span>
        </a>
      </div>
    </div>

    <!-- PLACEMENT MODES EXPLANATION -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Placement Mode 1: Draggable HUD -->
      <div class="p-6 sm:p-7 rounded-3xl bg-slate-50/70 dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xs">
        <div class="flex items-center justify-between">
          <div class="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs">
            A
          </div>
          <span class="text-xs font-mono uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">Mode 1</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Free-Floating Draggable HUD</h3>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
          The preview card docks automatically in the viewport corner. Grab the header bar to drag the component freely anywhere on your screen, or use the 1-tap snap toggle to cycle corner positions.
        </p>
      </div>

      <!-- Placement Mode 2: DOM Target Picker -->
      <div class="p-6 sm:p-7 rounded-3xl bg-slate-50/70 dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xs">
        <div class="flex items-center justify-between">
          <div class="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-semibold text-xs">
            B
          </div>
          <span class="text-xs font-mono uppercase tracking-wider font-semibold text-sky-700 dark:text-sky-400">Mode 2</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Pull numbers off the page (Drag to Select)</h3>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
          Press <strong>🎯 Target</strong>, then drag a box over a widget on the page. The extension reads the labels and numbers inside it, including inside Shadow DOM, and puts them in a card next to the box, with the <code class="font-mono">DataCard</code> code to copy. A box over one number gives one card; over several gives a <code class="font-mono">StatGrid</code> of cards.
        </p>
      </div>

    </div>

    <!-- LIVE INTERACTIVE ANIMATION SHOWCASE -->
    <section class="space-y-6">
      
      <!-- Interactive Step Controls & Animation Tracker -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Interactive Live Workflow Demo</h2>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-[68ch]">Watch the Chrome Side Panel inject and anchor a component onto an active website</p>
        </div>

        <!-- 4 Step Tabs -->
        <!-- Wraps rather than scrolls: the strip was 616px of tabs in a 581px box, so the fourth step was cut mid-word with no affordance suggesting it existed. -->
        <div class="flex flex-wrap items-center justify-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
          <button
            onclick={() => setStep(1)}
            class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer {activeAnimationStep === 1 ? 'bg-white dark:bg-blue-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
            1. Open Side Panel
          </button>
          <button
            onclick={() => setStep(2)}
            class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer {activeAnimationStep === 2 ? 'bg-white dark:bg-blue-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
            2. Choose Component
          </button>
          <button
            onclick={() => setStep(3)}
            class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer {activeAnimationStep === 3 ? 'bg-white dark:bg-blue-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
            3. Drag to Select
          </button>
          <button
            onclick={() => setStep(4)}
            class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer {activeAnimationStep === 4 ? 'bg-white dark:bg-blue-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
            4. 1-Click Code Export
          </button>
        </div>
      </div>

      <!-- Simulated Browser Desktop Frame -->
      <div class="relative bg-slate-100 dark:bg-[#070b14] border border-slate-300/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden min-h-[580px] flex flex-col">
        
        <!-- Browser Top Bar (URL & Toolbar) -->
        <div class="h-12 border-b border-slate-200 dark:border-white/10 bg-slate-200/80 dark:bg-[#0c1222] flex items-center justify-between px-4 gap-4">
          <!-- Window Controls -->
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-rose-400"></div>
            <div class="w-3 h-3 rounded-full bg-amber-400"></div>
            <div class="w-3 h-3 rounded-full bg-blue-400"></div>
          </div>

          <!-- URL Bar -->
          <div class="flex-1 max-w-lg bg-white dark:bg-white/5 border border-slate-300/60 dark:border-white/10 rounded-xl px-4 py-1.5 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-300 shadow-2xs">
            <div class="flex items-center gap-2 truncate">
              <svg class="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span class="text-slate-500 dark:text-slate-400">https://</span>
              <span class="font-bold text-slate-900 dark:text-white">your-cloud-app.internal/analytics</span>
            </div>
            <span class="text-xs text-slate-500 dark:text-slate-400">Host Webpage</span>
          </div>

          <!-- Chrome Toolbar with Sola Extension Icon -->
          <div class="flex items-center gap-2">
            <button
              onclick={() => (isSidePanelOpen = !isSidePanelOpen)}
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg {isSidePanelOpen ? 'bg-blue-500 text-slate-950 font-semibold shadow-xs' : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300'} text-xs font-medium cursor-pointer transition-all">
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
              <span class="text-xs font-semibold">Sola AIR</span>
            </button>
          </div>
        </div>

        <!-- Simulated Split Stage (Host Page on Left, Sola Side Panel on Right) -->
        <div class="flex-1 flex flex-col md:flex-row relative">
          
          <!-- LEFT: Host Webpage View (Simulating an actual app) -->
          <div class="flex-1 p-6 sm:p-8 bg-white dark:bg-[#090d19] relative flex flex-col justify-between overflow-hidden">
            
            <!-- Host Webpage Elements -->
            <div class="space-y-6">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h3 class="text-lg font-bold text-slate-900 dark:text-white">Active Cloud Console</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">Live host page DOM (e.g. internal dashboard, cloud admin, or local server)</p>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                  Host DOM
                </span>
              </div>

              <!-- Host Base Grid with Target Element Anchor Indicator -->
              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border {isTargetHovered ? 'border-2 border-dashed border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10' : 'border-slate-200/80 dark:border-white/5'} transition-all relative">
                  {#if isTargetHovered}
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded bg-blue-500 text-slate-950 font-mono text-xs font-semibold shadow-xs">
                      Target Anchor Container
                    </div>
                  {/if}
                  <span class="text-xs text-slate-500 dark:text-slate-400">Primary Ingress Volume</span>
                  <div class="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">142,400 req/s</div>
                </div>

                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <span class="text-xs text-slate-500 dark:text-slate-400">Global Median Latency</span>
                  <div class="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">3.4 ms</div>
                </div>
              </div>
            </div>

            <!-- INJECTED SHADOW DOM FLOATING OVERLAY -->
            {#if isCardInjected}
              <div class="my-6 p-6 rounded-3xl bg-slate-950/95 text-white border-2 border-blue-500 shadow-2xl shadow-blue-500/20 animate-[slideUp_250ms_cubic-bezier(0.16,1,0.3,1)] relative z-20">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping motion-reduce:animate-none"></span>
                    <span class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-400">
                      Sola Shadow DOM • Injected Overlay
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-white/10 text-slate-300">
                      <svg class="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                      <span>Anchored to Ingress Container</span>
                    </span>
                    <button
                      onclick={() => (isCardInjected = false)}
                      aria-label="Dismiss"
                      class="text-slate-500 dark:text-slate-400 hover:text-white text-xs p-1 rounded-md hover:bg-white/10 flex items-center justify-center cursor-pointer">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <h4 class="text-base font-bold text-white">{selectedComponent}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[68ch]">An SVG telemetry card rendered inside a closed Shadow DOM.</p>
                  </div>
                  <div class="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between font-mono">
                    <span class="text-xs text-slate-300">Throughput:</span>
                    <span class="text-base font-bold text-blue-400">1,420 req/s</span>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">0 CSS leakage • Zero host re-renders</span>
                  <button
                    onclick={() => (activeAnimationStep = 4)}
                    class="px-3 py-1.5 rounded-xl bg-blue-500 text-slate-950 font-semibold text-xs hover:bg-blue-400 transition-colors">
                    Copy Code Snippet
                  </button>
                </div>
              </div>
            {:else}
              <div class="my-6 p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl text-center space-y-2 bg-slate-50/50 dark:bg-white/[0.01]">
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-[68ch]">Pick a component in the Side Panel on the right to place a preview card right here.</p>
                <button
                  onclick={() => { isSidePanelOpen = true; isCardInjected = true; activeAnimationStep = 3; isTargetHovered = true; }}
                  class="px-4 py-2 rounded-xl bg-blue-500 text-slate-950 font-semibold text-xs hover:bg-blue-400 cursor-pointer shadow-xs">
                  + Trigger Live Overlay Preview
                </button>
              </div>
            {/if}

            <!-- Bottom Host Webpage Status -->
            <div class="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Host runtime active</span>
              <span class="font-mono text-xs">Shadow DOM Sandbox: #sola-preview-root</span>
            </div>
          </div>

          <!-- RIGHT: Simulated Chrome Extension Side Panel -->
          {#if isSidePanelOpen}
            <div class="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0c1222] p-4 flex flex-col justify-between space-y-4 shadow-xl">
              
              <!-- Side Panel Header -->
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/5">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs">
                      S
                    </div>
                    <span class="font-semibold text-xs text-slate-900 dark:text-white">Sola AIR Side Panel</span>
                  </div>
                  <span class="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold">12 Cards</span>
                </div>

                <!-- Side Panel Component Cards List -->
                <div class="mt-3 space-y-2">
                  <div class="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Click to Preview in Host Page:</div>

                  <!-- Item 1 -->
                  <button
                    onclick={() => { selectedComponent = 'Telemetry Stream Chart'; isCardInjected = true; isTargetHovered = true; activeAnimationStep = 3; }}
                    class="w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer {selectedComponent === 'Telemetry Stream Chart' && isCardInjected ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-950 dark:text-white font-bold' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-blue-50/50'}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs">Telemetry Stream</span>
                      <span class="text-xs font-mono text-blue-700 dark:text-blue-400 font-semibold">Anchor →</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 max-w-[68ch]">SVG live chart</p>
                  </button>

                  <!-- Item 2 -->
                  <button
                    onclick={() => { selectedComponent = 'Haptic Rotary Dial'; isCardInjected = true; isTargetHovered = true; activeAnimationStep = 3; }}
                    class="w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer {selectedComponent === 'Haptic Rotary Dial' && isCardInjected ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-950 dark:text-white font-bold' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-blue-50/50'}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs">Haptic Rotary Dial</span>
                      <span class="text-xs font-mono text-blue-700 dark:text-blue-400 font-semibold">Anchor →</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 max-w-[68ch]">Tactile rate-limiting throttle</p>
                  </button>

                  <!-- Item 3 -->
                  <button
                    onclick={() => { selectedComponent = 'Date Range Picker'; isCardInjected = true; isTargetHovered = true; activeAnimationStep = 3; }}
                    class="w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer {selectedComponent === 'Date Range Picker' && isCardInjected ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-950 dark:text-white font-bold' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-blue-50/50'}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs">Date Range Picker</span>
                      <span class="text-xs font-mono text-blue-700 dark:text-blue-400 font-semibold">Anchor →</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 max-w-[68ch]">Calendar matrix range filter</p>
                  </button>
                </div>
              </div>

              <!-- Side Panel Footer -->
              <div class="pt-3 border-t border-slate-200/80 dark:border-white/5">
                <a
                  href="/studio"
                  class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold text-center block transition-colors">
                  Open in Full Studio →
                </a>
              </div>

            </div>
          {/if}

        </div>
      </div>
    </section>

    <!-- 3-STEP REAL WORLD INSTALLATION & USAGE GUIDE -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
      
      <div class="p-8 rounded-3xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-sm">
          1
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Install Chrome Extension</h3>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
          Install from the Chrome Web Store or load the unpacked <code>sola-extension.zip</code> in Developer Mode.
        </p>
      </div>

      <div class="p-8 rounded-3xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-semibold text-sm">
          2
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Open on Any Web App</h3>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
          Navigate to your target app (e.g. <code>localhost:3000</code> or your cloud dashboard) and click the Sola icon in your browser toolbar.
        </p>
      </div>

      <div class="p-8 rounded-3xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-semibold text-sm">
          3
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Drag, or Select a Region</h3>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
          Drag the card with your mouse, or press Target and drag a box over the numbers you want to pull into a card.
        </p>
      </div>

    </section>

  </main>
</div>
