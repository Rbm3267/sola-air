<script lang="ts">
  import DynamicRenderer from '$lib/components/DynamicRenderer.svelte';
  import LivingSolaCore from '$lib/components/LivingSolaCore.svelte';
  import SolaLogo from '$lib/components/SolaLogo.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import SignalMeshConsole from '$lib/components/SignalMeshConsole.svelte';
  import BehavioralIntentConsole from '$lib/components/BehavioralIntentConsole.svelte';
  import SolaHost from '$lib/components/SolaHost.svelte';
  import NativeDashboard from '@sola-air-ui/ui/Dashboard.sola';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';

  interface DashboardWidget {
    id: string;
    component: 'DataCard' | 'GaugeCard' | 'DynamicForm' | 'ListBlock';
    colSpan: 1 | 2 | 3;
    config: any;
  }
  
  let viewMode = $state<'native' | 'behavior' | 'mesh' | 'custom'>('native');
  let intentQuery = $state('');
  let isLoading = $state(false);
  let errorMsg = $state('');
  let isListening = $state(false);
  let speechSupported = $state(false);
  let recognition: any = null;

  // Active Production Widgets Grid
  let widgets = $state<DashboardWidget[]>([
    {
      id: 'w-1',
      component: 'DataCard',
      colSpan: 1,
      config: { title: 'Global Edge Requests', value: '42.8M / hr', trend: '+12.4% vs baseline', icon: 'activity' }
    },
    {
      id: 'w-2',
      component: 'GaugeCard',
      colSpan: 1,
      config: { title: 'p99 Latency SLA', value: '18.4 ms', percentage: 94, subtext: 'Optimal Edge Routing', color: 'indigo' }
    },
    {
      id: 'w-3',
      component: 'DataCard',
      colSpan: 1,
      config: { title: 'Monthly SaaS MRR', value: '$184,200', trend: '+$14,800 this month', icon: 'trending-up' }
    },
    {
      id: 'w-4',
      component: 'ListBlock',
      colSpan: 2,
      config: {
        title: 'Active Edge Clusters',
        items: [
          { label: 'sola-edge-iad1', description: 'Washington DC • 99.99% Uptime', status: 'Active' },
          { label: 'sola-edge-fra1', description: 'Frankfurt • 99.98% Uptime', status: 'Active' },
          { label: 'sola-edge-syd1', description: 'Sydney • Performing Cache Sync', status: 'Syncing' }
        ]
      }
    },
    {
      id: 'w-5',
      component: 'GaugeCard',
      colSpan: 1,
      config: { title: 'Memory Load', value: '14.2 / 16 GB', percentage: 88, subtext: 'High Density Telemetry', color: 'amber' }
    }
  ]);

  // Quick edit modal state
  let editingWidget = $state<DashboardWidget | null>(null);
  let isExportOpen = $state(false);
  let copiedExport = $state(false);

  const sampleIntents = [
    "Add a CPU temperature gauge with 72% load",
    "Show Q3 revenue and churn rate for enterprise tier",
    "List all active deployments with their status",
    "Connect live Google Sheets relay for cash runway & MRR"
  ];

  onMount(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sola_dashboard_layout');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            widgets = parsed;
          }
        } catch (e) {
          console.warn('Failed to restore saved layout', e);
        }
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        speechSupported = true;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => { isListening = true; };
        recognition.onresult = (event: any) => {
          intentQuery = Array.from(event.results).map((result: any) => result[0].transcript).join('');
        };
        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          isListening = false;
        };
        recognition.onend = () => {
          isListening = false;
          if (intentQuery.trim()) submitIntent();
        };
      }
    }
  });

  function saveLayout() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sola_dashboard_layout', JSON.stringify(widgets));
      } catch (e) {
        console.warn('Could not save layout', e);
      }
    }
  }

  function toggleSpeech() {
    if (!speechSupported || !recognition) {
      errorMsg = "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.";
      return;
    }
    if (isListening) {
      recognition.stop();
      isListening = false;
    } else {
      errorMsg = '';
      intentQuery = '';
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  }

  function pickSample(prompt: string) {
    intentQuery = prompt;
    submitIntent();
  }

  async function submitIntent() {
    if (!intentQuery.trim() || isLoading) return;
    
    isLoading = true;
    errorMsg = '';

    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: intentQuery })
      });

      const rawText = await res.text();
      if (!res.ok) throw new Error('Intent generation failed');

      let cleanText = rawText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const generated = JSON.parse(cleanText);
      const newItems = Array.isArray(generated) ? generated : [generated];

      // Append new generated widgets to the top of the canvas
      const converted: DashboardWidget[] = newItems.map((item: any, idx: number) => ({
        id: `gen-${Date.now()}-${idx}`,
        component: item.component || 'DataCard',
        colSpan: item.component === 'ListBlock' || item.component === 'DynamicForm' ? 2 : 1,
        config: item.config || {}
      }));

      widgets = [...converted, ...widgets];
      saveLayout();
      intentQuery = '';
    } catch (e: any) {
      console.error(e);
      errorMsg = e.message || 'Failed to generate components.';
    } finally {
      isLoading = false;
    }
  }

  // Widget Actions
  function removeWidget(id: string) {
    widgets = widgets.filter(w => w.id !== id);
    saveLayout();
  }

  function moveWidget(index: number, direction: 'left' | 'right') {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;
    const temp = widgets[index];
    widgets[index] = widgets[targetIndex];
    widgets[targetIndex] = temp;
    saveLayout();
  }

  function cycleColSpan(widget: DashboardWidget) {
    widget.colSpan = widget.colSpan === 1 ? 2 : widget.colSpan === 2 ? 3 : 1;
    saveLayout();
  }

  function loadPreset(type: 'finance' | 'cloud' | 'enterprise-ops' | 'reset') {
    if (type === 'finance') {
      widgets = [
        { id: 'fn-1', component: 'DataCard', colSpan: 1, config: { title: 'Monthly Recurring Revenue', value: '$184,200', trend: '+$14,800 this month', icon: 'trending-up' } },
        { id: 'fn-2', component: 'GaugeCard', colSpan: 1, config: { title: 'Gross Margin Rate', value: '88%', percentage: 88, subtext: 'LTV/CAC Ratio: 4.8x', color: 'indigo' } },
        { id: 'fn-3', component: 'DataCard', colSpan: 1, config: { title: 'Cash Runway', value: '24 Months', trend: 'Net Burn: $18.5k/mo', icon: 'activity' } },
        { id: 'fn-4', component: 'ListBlock', colSpan: 3, config: { title: 'Google Sheet Live Transactions (sheet://finance-ops)', items: [
          { label: 'Enterprise Contract Renewal • Acme Corp', description: '+$48,000 ARR • Net-30 Invoiced', status: 'Completed' },
          { label: 'AWS Cloud Infrastructure Tier 2', description: '-$3,420 • Monthly Auto-settle', status: 'Completed' },
          { label: 'Stripe Merchant Payout Batch #904', description: '+$12,840 • Clearing to SVB Treasury', status: 'Active' }
        ]} }
      ];
    } else if (type === 'enterprise-ops') {
      widgets = [
        { id: 'sn-1', component: 'IncidentTriageMatrix', colSpan: 3, config: {
          incidentId: 'INC009481',
          title: 'API Gateway High-Frequency Latency Spike (EU-West)',
          severity: 'P1 - Critical',
          slaRemainingMin: 11,
          blastRadius: '42,000 Active Checkout Sessions',
          playbooks: [
            { id: 'pb-1', title: 'Reroute Edge DNS to eu-central-1', action: 'Route53 Failover', automated: true },
            { id: 'pb-2', title: 'Scale Redis Cluster Read Replicas (x4)', action: 'Auto-Provision', automated: true },
            { id: 'pb-3', title: 'Page Tier 3 Database SRE On-Call', action: 'PagerDuty Incident', automated: false }
          ]
        } },
        { id: 'sn-2', component: 'DiffAudit', colSpan: 3, config: {
          title: 'Scale Redis Cluster Max Connections (x10)',
          entityId: 'CHG009842',
          entityType: 'Enterprise Platform CAB Release',
          riskLevel: 'Moderate',
          riskScore: 42,
          requester: 'Tier 3 Platform SRE',
          window: 'Tonight 02:00 – 04:00 UTC'
        } },
        { id: 'sn-3', component: 'DataCard', colSpan: 1, config: { title: 'P1 Critical Incidents', value: '1 Active', trend: '-4 resolved today', icon: 'activity' } },
        { id: 'sn-4', component: 'GaugeCard', colSpan: 1, config: { title: 'SLA Compliance Rate', value: '98.4%', percentage: 98, subtext: 'MTTR: 14.2 mins (Target: <30m)', color: 'indigo' } },
        { id: 'sn-5', component: 'DataCard', colSpan: 1, config: { title: 'Pending CAB Changes', value: '3 Awaiting', trend: 'Release Window 02:00 UTC', icon: 'check' } }
      ];
    } else if (type === 'cloud') {
      widgets = [
        { id: 'c-1', component: 'ClusterMatrix', colSpan: 3, config: {
          title: 'AWS us-east-1 RDS Read Replica Cluster Mesh',
          subtitle: '12 Regional Shards Distributed Across 6 Global Regions'
        } },
        { id: 'c-2', component: 'FlowWaterfall', colSpan: 3, config: {
          title: 'SaaS Gross Revenue Realization & Cloud Costs',
          subtitle: 'End-to-end deduction breakdown across billing gateway and AWS egress'
        } },
        { id: 'c-3', component: 'DataCard', colSpan: 1, config: { title: 'Enterprise ARR', value: '$1,840,000', trend: '+34.2%', icon: 'trending-up' } },
        { id: 'c-4', component: 'GaugeCard', colSpan: 1, config: { title: 'Cluster CPU', value: '68.4%', percentage: 68, subtext: 'Auto-scaled across 3 zones', color: 'sky' } },
        { id: 'c-5', component: 'DataCard', colSpan: 1, config: { title: 'Edge Requests', value: '42.8M / hr', trend: '99.99% Uptime', icon: 'check' } }
      ];
    } else {
      widgets = [];
    }
    saveLayout();
  }

  function exportSolaCode() {
    const code = `<` + `script>
  // Sola Production Dashboard Schema
  const dashboard = $data("sheet://production-telemetry");
</` + `script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
` + widgets.map(w => `  <${w.component} class="col-span-${w.colSpan}" config={${JSON.stringify(w.config)}} />`).join('\n') + `
</div>`;
    navigator.clipboard.writeText(code);
    copiedExport = true;
    setTimeout(() => copiedExport = false, 2000);
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
        <span>Sola Ambient Studio • Live Production Canvas</span>
      </div>
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
        Ambient Intent Playground
      </h1>
      <p class="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed font-normal max-w-[68ch]">
        Speak or type any intent. Generated cards live in a <strong>fully configurable production grid</strong> with real-time resizing, reordering, and live parameter editing.
      </p>
    </div>

    <!-- Luxury Command & Voice Input Bar -->
    <div class="max-w-2xl mx-auto w-full bg-white dark:bg-white/[0.02] backdrop-blur-3xl border {isListening ? 'border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.25)]' : 'border-slate-200 dark:border-white/[0.04] shadow-[0_12px_40px_rgba(15,23,42,0.06)]'} rounded-2xl p-2 transition-all duration-300 relative">
      <form class="flex items-center gap-2 sm:gap-3 w-full relative z-10" onsubmit={(e) => { e.preventDefault(); submitIntent(); }}>
        
        <!-- Left Status / Command Prompt -->
        <div class="pl-3 sm:pl-4 shrink-0 text-slate-500 dark:text-slate-400">
          {#if isLoading}
            <svg class="w-5 h-5 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>
          {:else if isListening}
            <div class="flex items-center gap-1">
              <span class="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce"></span>
              <span class="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span class="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
            </div>
          {:else}
            <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
          {/if}
        </div>
        
        <!-- Clean Input Box with Zero Default Focus Border/Outline -->
        <input 
          type="text" 
          bind:value={intentQuery}
          placeholder={isListening ? "Listening... speak now" : "Speak or type intent (e.g. 'Add CPU gauge at 84%')"} 
          style="outline: none !important; box-shadow: none !important; border: none !important;"
          class="flex-1 bg-transparent py-4 px-2 text-slate-900 dark:text-white text-sm sm:text-base font-medium placeholder-slate-400 border-0 outline-none focus:outline-none focus:ring-0 appearance-none"
        />
        
        <!-- Voice Input Microphone Button -->
        <button 
          type="button"
          onclick={toggleSpeech}
          aria-label="Voice intent recognition"
          class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl transition-all flex items-center justify-center cursor-pointer {isListening ? 'bg-rose-500 text-white shadow-md animate-pulse' : 'bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200'}"
          title={isListening ? "Stop listening" : "Speak intent via microphone"}
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        </button>

        <!-- Submit Button (High Contrast & Always Visible) -->
        <!-- Submit Button (Fluid Luminous Amber Gradient) -->
        <button 
          type="submit" 
          disabled={isLoading || !intentQuery.trim()}
          aria-label="Submit intent"
          style={!isLoading && intentQuery.trim() ? "background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff !important;" : ""}
          class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl font-bold transition-all active:scale-[0.97] disabled:bg-slate-100 dark:bg-white/[0.08] disabled:text-slate-500 dark:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md shrink-0 cursor-pointer"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </form>
    </div>

    <!-- Suggestions Row -->
    <div class="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Suggestions:</span>
      {#each sampleIntents as sample}
        <button 
          onclick={() => pickSample(sample)}
          class="text-xs bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-2xl hover:border-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-50 dark:bg-amber-500/10/50 transition-all cursor-pointer shadow-xs">
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
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'native' ? 'bg-blue-500 text-white font-semibold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}">
            <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Native .sola Zero-VDOM</span>
          </button>
          <button 
            onclick={() => viewMode = 'behavior'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'behavior' ? 'bg-white dark:bg-white/[0.02] text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.04]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}">
            <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Behavioral Intent</span>
          </button>
          <button 
            onclick={() => viewMode = 'mesh'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'mesh' ? 'bg-white dark:bg-white/[0.02] text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.04]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}">
            <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>Signal Mesh</span>
          </button>
          <button 
            onclick={() => viewMode = 'custom'}
            class="px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 whitespace-nowrap {viewMode === 'custom' ? 'bg-white dark:bg-white/[0.02] text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.04]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}">
            <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Custom Grid ({widgets.length})</span>
          </button>
        </div>

        <!-- Right Side Main Actions -->
        {#if viewMode === 'custom'}
          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button 
              onclick={exportSolaCode}
              style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff !important;"
              class="text-xs font-mono font-medium px-4 py-1.5 rounded-full text-white shadow-sm hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1.5">
              {#if copiedExport}
                <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="text-white">Copied .sola!</span>
              {:else}
                <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                <span class="text-white">Export Code</span>
              {/if}
            </button>
          </div>
        {/if}
      </div>

      <!-- Presets bar in sub-row with clean border -->
      {#if viewMode === 'custom'}
        <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
          <span class="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 uppercase mr-1">Presets:</span>
          <button 
            onclick={() => loadPreset('enterprise-ops')}
            class="text-xs font-mono font-medium px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/[0.08] transition-all active:scale-[0.97] cursor-pointer flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            <span>Enterprise Operations Platform</span>
          </button>
          <button 
            onclick={() => loadPreset('finance')}
            class="text-xs font-mono font-medium px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/[0.08] transition-all active:scale-[0.97] cursor-pointer flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>Finance</span>
          </button>
          <button 
            onclick={() => loadPreset('cloud')}
            class="text-xs font-mono font-medium px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/[0.08] transition-all active:scale-[0.97] cursor-pointer flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>SaaS Cloud</span>
          </button>
        </div>
      {/if}
    </div>

    {#if viewMode === 'native'}
      <!-- LIVE NATIVE ZERO-VDOM .SOLA COMPILED ENGINE -->
      <div class="w-full bg-white/70 dark:bg-white/[0.02] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-sm">
        <SolaHost component={NativeDashboard} class="w-full" />
      </div>
    {:else if viewMode === 'behavior'}
      <!-- LIVE BEHAVIORAL INTENT & ADAPTIVE PERSONA CONSOLE -->
      <BehavioralIntentConsole />
    {:else if viewMode === 'mesh'}
      <!-- LIVE INTER-WIDGET SIGNAL TELEMETRY MESH -->
      <SignalMeshConsole />
    {:else}
      <!-- Active Generating Elegant Light Banner -->
      {#if isLoading}
        <div 
          transition:fly={{ y: 20, duration: 300 }}
          class="bg-white dark:bg-white/[0.02] backdrop-blur-2xl rounded-3xl p-8 border border-amber-200 dark:border-amber-500/20/90 shadow-sm flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Building Reactive DOM Tree...</span>
          </div>
          <span class="text-xs font-mono text-slate-500 dark:text-slate-400 mt-2">Zero-VDOM AST compilation via Gemini 3.6 Flash</span>
        </div>
      {/if}

      <!-- Active Interactive Production Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {#each widgets as widget, index (widget.id)}
        <div 
          class="group/widget relative flex flex-col transition-all duration-300 {widget.colSpan === 3 ? 'md:col-span-3' : widget.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}"
          transition:fly={{ y: 20, duration: 250 }}
        >
          <!-- Floating Card Action Toolbar (Reorder, Span, Edit, Delete) -->
          <div class="absolute -top-3.5 right-4 z-20 opacity-0 group-hover/widget:opacity-100 transition-all duration-150 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-2xl shadow-xl border border-slate-700/80 text-xs font-mono">
            
            <!-- Move Left / Up -->
            <button 
              onclick={() => moveWidget(index, 'left')}
              disabled={index === 0}
              title="Move left"
              class="p-1 hover:text-amber-300 disabled:opacity-30 cursor-pointer">
              ←
            </button>

            <!-- Move Right / Down -->
            <button 
              onclick={() => moveWidget(index, 'right')}
              disabled={index === widgets.length - 1}
              title="Move right"
              class="p-1 hover:text-amber-300 disabled:opacity-30 cursor-pointer">
              →
            </button>

            <span class="text-slate-600 dark:text-slate-400">|</span>

            <!-- Column Span Toggle -->
            <button 
              onclick={() => cycleColSpan(widget)}
              title="Toggle width (1x / 2x / 3x)"
              class="px-1.5 py-0.5 hover:text-amber-300 font-bold cursor-pointer">
              {widget.colSpan}x
            </button>

            <span class="text-slate-600 dark:text-slate-400">|</span>

            <!-- Quick Edit Config -->
            <button 
              onclick={() => editingWidget = widget}
              title="Configure widget data"
              aria-label="Configure widget"
              class="p-1 hover:text-amber-300 cursor-pointer flex items-center justify-center">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>

            <!-- Delete -->
            <button 
              onclick={() => removeWidget(widget.id)}
              title="Remove widget"
              aria-label="Remove widget"
              class="p-1 hover:text-rose-400 cursor-pointer flex items-center justify-center">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Component Render Surface -->
          <div class="w-full">
            <DynamicRenderer data={{ component: widget.component, config: widget.config }} />
          </div>
        </div>
      {/each}
    </div>

    <!-- Empty State -->
    {#if widgets.length === 0}
      <div class="bg-white dark:bg-white/[0.02] backdrop-blur-2xl border border-slate-200 dark:border-white/[0.04] rounded-3xl p-16 text-center max-w-lg mx-auto shadow-sm">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white font-mono mb-1">Canvas is Clean</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-[68ch]">Speak your intent or load a starter preset to begin constructing your dashboard.</p>
        <button 
          onclick={() => loadPreset('finance')}
          style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff !important;"
          class="font-semibold text-xs text-white px-6 py-3 rounded-2xl transition-all cursor-pointer shadow-md">
          Load Starter Preset
        </button>
      </div>
    {/if}
  {/if}

  </div>
  </main>
</div>

<!-- Live Widget Config Modal -->
{#if editingWidget}
  <div 
    transition:fade={{ duration: 150 }}
    onclick={() => editingWidget = null}
    onkeydown={(e) => { if (e.key === 'Escape') editingWidget = null; }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    class="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      transition:fly={{ y: 20, duration: 200 }}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="document"
      class="bg-white dark:bg-white/[0.02] backdrop-blur-2xl border border-slate-200 dark:border-white/[0.04] rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
      <div class="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-3">
        <h3 class="font-bold text-slate-900 dark:text-white font-mono text-base flex items-center gap-2">
          <span>Configure {editingWidget.component}</span>
        </h3>
        <button onclick={() => editingWidget = null} aria-label="Close configuration dialog" class="text-slate-400 hover:text-slate-700 dark:text-slate-300 cursor-pointer p-1">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <div>
          <label for="widget-title-input" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Title</label>
          <input 
            id="widget-title-input"
            type="text" 
            bind:value={editingWidget.config.title}
            class="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none font-medium"
          />
        </div>

        {#if editingWidget.config.value !== undefined}
          <div>
            <label for="widget-val-input" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Primary Value</label>
            <input 
              id="widget-val-input"
              type="text" 
              bind:value={editingWidget.config.value}
              class="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none font-medium"
            />
          </div>
        {/if}

        {#if editingWidget.config.trend !== undefined}
          <div>
            <label for="widget-trend-input" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Trend Badge</label>
            <input 
              id="widget-trend-input"
              type="text" 
              bind:value={editingWidget.config.trend}
              class="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.04] rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none font-medium"
            />
          </div>
        {/if}

        {#if editingWidget.config.percentage !== undefined}
          <div>
            <div class="flex justify-between text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
              <span>Gauge Progress</span>
              <span>{editingWidget.config.percentage}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              bind:value={editingWidget.config.percentage}
              class="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        {/if}
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
        <button 
          onclick={() => editingWidget = null}
          style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff !important;"
          class="font-semibold text-xs text-white px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm">
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
