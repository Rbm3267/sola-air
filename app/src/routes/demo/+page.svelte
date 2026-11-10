<script lang="ts">
  import SolaIcons from '$lib/components/SolaIcons.svelte';
  import IntentBar from '$lib/components/IntentBar.svelte';
  import SheetDemo from '$lib/components/SheetDemo.svelte';
  import GenerateDemo from '$lib/components/GenerateDemo.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import SignalMeshConsole from '$lib/components/SignalMeshConsole.svelte';
  import BehavioralIntentConsole from '$lib/components/BehavioralIntentConsole.svelte';
  import SolaMount from '$lib/components/SolaMount.svelte';
  import NativeDashboard from '@sola-air-ui/ui/Dashboard.sola';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let viewMode = $state<'native' | 'behavior' | 'mesh' | 'sheet' | 'generate'>('native');
  let intentQuery = $state('');
  let isLoading = $state(false);
  let errorMsg = $state('');

  const sampleIntents = [
    "Add a CPU temperature gauge with 72% load",
    "Show Q3 revenue and churn rate for enterprise tier",
    "List all active deployments with their status",
    "Show cash runway and MRR for a SaaS company"
  ];

  onMount(() => {
    if (typeof window !== 'undefined') {
      // The Custom Grid kept its layout here. It is gone, so drop what it left.
      try { localStorage.removeItem('sola_dashboard_layout'); } catch { /* storage blocked */ }
    }
  });

  function pickSample(prompt: string) {
    intentQuery = prompt;
    submitIntent();
  }

  // Studio builds layouts from the real @sola-air-ui/ui components and exports code
  // that works, so the intent box hands the request to it. The text goes through
  // sessionStorage, not the address: a typed request can hold anything, and the
  // address ends up in logs, history and referrers. Studio reads it once and
  // removes it. A link cannot set it, so a link cannot make Studio run a request.
  const ASK_KEY = 'sola:studio-ask';

  async function submitIntent() {
    const text = intentQuery.trim();
    if (!text || isLoading) return;
    isLoading = true;
    errorMsg = '';
    try {
      sessionStorage.setItem(ASK_KEY, text.slice(0, 1000));
    } catch {
      errorMsg = 'This browser blocks storage, so the request cannot be passed on. Open Studio and type it there.';
      isLoading = false;
      return;
    }
    try {
      await goto('/studio');
    } catch (e: any) {
      try { sessionStorage.removeItem(ASK_KEY); } catch { /* nothing to clean up */ }
      errorMsg = e?.message || 'Could not open Studio. Try again.';
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Ambient Intent Playground — Sola AIR</title>
  <meta name="description" content="Describe an interface in words and watch Sola compile the components live." />
</svelte:head>

<div class="flex flex-col w-full">
  <Navbar />
  <main id="main-content" class="contents">
  
  <!-- Precision Monochromatic Grid Texture -->
  <div class="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-30 dark:opacity-20 pointer-events-none"></div>

  <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 z-10 relative">
    
    <!-- Title Area -->
    <div class="text-center max-w-2xl mx-auto">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.04] text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold mb-3">
        <span>Sola Playground</span>
      </div>
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
        Ambient Intent Playground
      </h1>
      <p class="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed font-normal max-w-[68ch]">
        Speak or type what you want and <strong>Studio</strong> builds it from the real components, on a grid you can edit and export. The tabs below show what else Sola does.
      </p>
    </div>

    <IntentBar
      bind:value={intentQuery}
      busy={isLoading}
      placeholder="Speak or type intent (e.g. 'Add CPU gauge at 84%')"
      inputLabel="What do you want to build?"
      submitLabel="Build it in Studio"
      onsubmit={() => submitIntent()}
    />

    <!-- Errors were set but never shown, so a failed request looked like nothing happened. -->
    {#if errorMsg}
      <p role="alert" class="max-w-3xl mx-auto text-center text-xs sm:text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-2.5">{errorMsg}</p>
    {/if}

    <!-- Suggestions Row -->
    <div class="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Suggestions:</span>
      {#each sampleIntents as sample}
        <button 
          onclick={() => pickSample(sample)}
          class="text-xs bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-2xl hover:border-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all cursor-pointer shadow-xs">
          {sample}
        </button>
      {/each}
    </div>

    <!-- Production Dashboard Studio Controls Bar -->
    <!-- Production Dashboard Studio Controls Bar -->
    <div class="bg-white dark:bg-white/[0.02] backdrop-blur-2xl border border-slate-200 dark:border-white/[0.04] rounded-3xl p-4 shadow-sm flex flex-col gap-4 mt-4">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Studio View Mode Switcher -->
        <div class="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.08] p-1 rounded-full border border-slate-200 dark:border-white/[0.04] select-none overflow-x-auto no-scrollbar">
          <button 
            onclick={() => viewMode = 'native'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'native' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <SolaIcons name="code" size={16} gradient={viewMode !== 'native'} />
            <span>Native .sola</span>
          </button>
          <button 
            onclick={() => viewMode = 'behavior'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'behavior' ? 'bg-white dark:bg-white/[0.02] text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.04]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <SolaIcons name="sentinel" size={16} />
            <span>Behavioral Intent</span>
          </button>
          <button 
            onclick={() => viewMode = 'mesh'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'mesh' ? 'bg-white dark:bg-white/[0.02] text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.04]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <SolaIcons name="bus" size={16} />
            <span>Signal Mesh</span>
          </button>
          <button 
            onclick={() => viewMode = 'sheet'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'sheet' ? 'bg-white dark:bg-white/[0.02] text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.04]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <SolaIcons name="sheet" size={16} />
            <span>Mock Sheet</span>
          </button>
          <button 
            onclick={() => viewMode = 'generate'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'generate' ? 'bg-white dark:bg-white/[0.02] text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.04]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <SolaIcons name="spark" size={16} />
            <span>Generate</span>
          </button>
        </div>

      </div>

    </div>

    {#if viewMode === 'native'}
      <!-- LIVE NATIVE ZERO-VDOM .SOLA COMPILED ENGINE -->
      <div class="w-full bg-white/70 dark:bg-white/[0.02] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-sm">
        <SolaMount component={NativeDashboard} />
      </div>
    {:else if viewMode === 'behavior'}
      <!-- LIVE BEHAVIORAL INTENT & ADAPTIVE PERSONA CONSOLE -->
      <BehavioralIntentConsole />
    {:else if viewMode === 'generate'}
      <GenerateDemo />
    {:else if viewMode === 'sheet'}
      <!-- A sheet the visitor can edit, with cards computed from it -->
      <SheetDemo />
    {:else if viewMode === 'mesh'}
      <!-- LIVE INTER-WIDGET SIGNAL TELEMETRY MESH -->
      <SignalMeshConsole />
    {/if}

  </div>
  </main>
</div>
