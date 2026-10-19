<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import DataCard from './DataCard.svelte';
  import GaugeCard from './GaugeCard.svelte';
  import SentinelCapsule from './SentinelCapsule.svelte';

  let flowIndex = $state(99.8);
  let frictionCount = $state(0);
  let isCircuitBreakerActive = $state(false);
  let activeAlert = $state<{ type: string; message: string; timestamp?: number } | null>(null);

  // Simulated telemetry stream
  let events = $state<Array<{ id: string; type: string; target: string; latency: string; status: 'nominal' | 'warning' | 'critical' | 'healed'; message: string; timestamp: string }>>([
    { id: 'EV-104', type: 'STATE_TRANSITION', target: 'rate_limiter/dial', latency: '0.12ms', status: 'nominal', message: 'Signal mesh updated to 32 k req/s', timestamp: 'Just now' },
    { id: 'EV-103', type: 'INTENT_RESOLVED', target: 'mrr/waterfall', latency: '0.45ms', status: 'nominal', message: 'Calculated gross-to-net payout delta', timestamp: '12s ago' },
    { id: 'EV-102', type: 'SENTINEL_PROBE', target: 'cluster/nodes', latency: '0.08ms', status: 'nominal', message: 'Zero DOM reconciliation overhead confirmed', timestamp: '45s ago' }
  ]);

  let clickStreak = $state(0);
  let lastClickTime = $state(0);

  function handleTestClick() {
    const now = Date.now();
    if (now - lastClickTime < 450) {
      clickStreak++;
    } else {
      clickStreak = 1;
    }
    lastClickTime = now;

    if (clickStreak >= 3) {
      triggerRageClickAlert();
    } else {
      events = [
        {
          id: `EV-${Math.floor(100 + Math.random() * 900)}`,
          type: 'USER_INTERACTION',
          target: 'primary_action_btn',
          latency: '0.18ms',
          status: 'nominal',
          message: 'Clean user tap registered on native signal boundary',
          timestamp: 'Just now'
        },
        ...events.slice(0, 5)
      ];
    }
  }

  function triggerRageClickAlert() {
    frictionCount++;
    flowIndex = Math.max(74.2, Number((flowIndex - 4.2).toFixed(1)));
    isCircuitBreakerActive = true;
    activeAlert = {
      type: 'RAGE_CLICK_BURST',
      message: `${clickStreak} rapid clicks detected in ${Math.min(600, Date.now() - lastClickTime)}ms. Circuit breaker isolated button event loop. Fallback cached state activated.`,
      timestamp: Date.now()
    };

    events = [
      {
        id: `EV-${Math.floor(100 + Math.random() * 900)}`,
        type: 'RAGE_CLICK_DETECTED',
        target: 'primary_action_btn',
        latency: '0.22ms',
        status: 'warning',
        message: '3+ rapid unhandled clicks detected. Sentinel engaged circuit-breaker fallback.',
        timestamp: 'Just now'
      },
      ...events.slice(0, 5)
    ];
  }

  function simulateTimeout() {
    frictionCount++;
    flowIndex = Math.max(68.0, Number((flowIndex - 6.5).toFixed(1)));
    isCircuitBreakerActive = true;
    activeAlert = {
      type: 'UPSTREAM_GATEWAY_504',
      message: 'Upstream API gateway breached 1,200ms latency ceiling. Sola self-healed by serving zero-VDOM cached snapshot and dispatching telemetry to Sola Relay.',
      timestamp: Date.now()
    };

    events = [
      {
        id: `EV-${Math.floor(100 + Math.random() * 900)}`,
        type: '504_GATEWAY_TIMEOUT',
        target: 'gateway/checkout_api',
        latency: '1,240ms',
        status: 'critical',
        message: 'Breached SLA threshold. Sola self-healing fallback mounted without page crash.',
        timestamp: 'Just now'
      },
      ...events.slice(0, 5)
    ];
  }

  function resetTelemetry() {
    flowIndex = 99.8;
    frictionCount = 0;
    clickStreak = 0;
    isCircuitBreakerActive = false;
    activeAlert = null;
    events = [
      {
        id: `EV-${Math.floor(100 + Math.random() * 900)}`,
        type: 'BUS_RESET',
        target: 'sentinel_core',
        latency: '0.05ms',
        status: 'nominal',
        message: 'Telemetry bus reset to 100% nominal state.',
        timestamp: 'Just now'
      },
      ...events.slice(0, 4)
    ];
  }
</script>

<div class="flex flex-col gap-5 text-slate-100 font-sans">
  
  <!-- Top Sentinel HUD Capsule -->
  <SentinelCapsule 
    {flowIndex}
    {frictionCount}
    {activeAlert}
    {isCircuitBreakerActive}
    onReset={resetTelemetry} />

  <!-- Interactive Telemetry Dashboard Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <DataCard config={{ title: "UX Flow Index", value: `${flowIndex}%`, trend: isCircuitBreakerActive ? "-4.2% (Alert)" : "Optimal", icon: "activity" }} />
    <GaugeCard config={{ title: "Signal Resilience", value: flowIndex, max: 100, unit: "%", icon: "check-circle" }} />
    <DataCard config={{ title: "DOM Paint Lag", value: "0.01 ms", trend: "Zero-VDOM", icon: "trending-up" }} />
  </div>

  <!-- Interactive Simulator Card -->
  <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h3 class="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <span class="w-2 h-2 rounded-full {isCircuitBreakerActive ? 'bg-amber-400' : 'bg-blue-400'}"></span>
          <span>Sentinel Friction &amp; Self-Healing Simulator</span>
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[68ch]">
          Simulate rapid repeated clicks or a stalled backend to see how the fallback behaves.
        </p>
      </div>

      <span class="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
        Live Interactive Testbed
      </span>
    </div>

    <!-- Simulator Buttons Row -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      
      <!-- Button 1: Normal Click Test -->
      <button 
        type="button"
        onclick={handleTestClick}
        class="p-4 rounded-2xl bg-slate-950 dark:bg-black/40 border border-slate-800 hover:border-blue-500/50 text-left transition-all active:scale-[0.98] cursor-pointer group flex flex-col justify-between gap-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white group-hover:text-blue-400 font-mono">1. User Action Tap</span>
          <span class="w-2 h-2 rounded-full bg-blue-400"></span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
          Click 1x for normal flow. Click 3x rapidly to simulate a <strong>Rage-Click Burst</strong>.
        </p>
      </button>

      <!-- Button 2: Simulate Backend 504 Timeout -->
      <button 
        type="button"
        onclick={simulateTimeout}
        class="p-4 rounded-2xl bg-slate-950 dark:bg-black/40 border border-slate-800 hover:border-amber-500/50 text-left transition-all active:scale-[0.98] cursor-pointer group flex flex-col justify-between gap-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white group-hover:text-amber-400 font-mono">2. Simulate 504 Timeout</span>
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
          Simulates a dead upstream API endpoint to test graceful cache fallback.
        </p>
      </button>

      <!-- Button 3: Reset Bus -->
      <button 
        type="button"
        onclick={resetTelemetry}
        class="p-4 rounded-2xl bg-slate-950 dark:bg-black/40 border border-slate-800 hover:border-sky-500/50 text-left transition-all active:scale-[0.98] cursor-pointer group flex flex-col justify-between gap-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white group-hover:text-sky-400 font-mono">3. Restore Nominal State</span>
          <span class="w-2 h-2 rounded-full bg-sky-400"></span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
          Clears circuit-breaker alerts and restores Flow Index to 99.8%.
        </p>
      </button>

    </div>

    <!-- Active Component State Box -->
    <div class="p-4 rounded-2xl bg-slate-950 dark:bg-black/40 border {isCircuitBreakerActive ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800/80'} flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl flex items-center justify-center {isCircuitBreakerActive ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}">
          {#if isCircuitBreakerActive}
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
          {:else}
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {/if}
        </div>
        <div>
          <div class="text-xs font-semibold text-white font-mono">
            {isCircuitBreakerActive ? 'Self-Healing Circuit Breaker Engaged' : 'Component Surface Operating Nominally'}
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {isCircuitBreakerActive ? 'Serving cached signal snapshot with isolated event boundary' : 'Direct event propagation • 0% drop rate'}
          </div>
        </div>
      </div>

      <div class="text-right font-mono text-xs">
        <span class="text-slate-500 dark:text-slate-400">Latency:</span>
        <span class="font-bold {isCircuitBreakerActive ? 'text-amber-400' : 'text-blue-400'} ml-1">
          {isCircuitBreakerActive ? '1,240ms (Healed)' : '0.14ms'}
        </span>
      </div>
    </div>

  </div>

  <!-- Real-Time Telemetry Stream Log -->
  <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold font-mono text-slate-300 uppercase tracking-wider">
        Live Telemetry &amp; Intent Dispatch Feed
      </span>
      <span class="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
        Streaming (&lt; 0.05ms)
      </span>
    </div>

    <div class="flex flex-col gap-2">
      {#each events as ev (ev.id)}
        <div transition:slide={{ duration: 150 }} class="p-3 rounded-xl bg-slate-950 dark:bg-black/40 border border-slate-850 flex items-center justify-between text-xs font-mono">
          <div class="flex items-center gap-3">
            <span class="px-2 py-0.5 rounded text-xs font-semibold uppercase {ev.status === 'nominal' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : (ev.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')}">
              {ev.type}
            </span>
            <span class="text-slate-300">{ev.message}</span>
          </div>
          <div class="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs shrink-0">
            <span>{ev.target}</span>
            <span class="text-slate-500 dark:text-slate-400 font-bold">{ev.latency}</span>
            <span>{ev.timestamp}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>

</div>