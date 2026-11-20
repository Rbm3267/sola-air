<script lang="ts">
  export interface WaterfallStep {
    id: string;
    name: string;
    delta: number; // positive or negative value
    type: 'start' | 'credit' | 'debit' | 'subtotal' | 'total';
    unitLabel?: string;
    formattedValue?: string;
  }

  export interface FlowWaterfallConfig {
    title?: string;
    subtitle?: string;
    unit?: string; // '$', 'ms', 'MB'
    steps?: WaterfallStep[];
  }

  let { 
    config = {},
    title,
    subtitle,
    grossVolume,
    computeExpense,
    supportExpense,
    tierDiscount,
    steps: directSteps
  } = $props<{ 
    config?: FlowWaterfallConfig;
    title?: string;
    subtitle?: string;
    grossVolume?: number;
    computeExpense?: number;
    supportExpense?: number;
    tierDiscount?: number;
    steps?: WaterfallStep[];
  }>();

  let activeStep = $state<WaterfallStep | null>(null);

  const displayTitle = $derived(title || config?.title || 'Revenue Realization & Margin Breakdown');
  const displaySubtitle = $derived(subtitle || config?.subtitle || 'End-to-end reconciliation across billing gateway and cloud infrastructure');

  // Parse dollar strings like "$184,200" or "-$5,340" into numeric values
  function parseDelta(step: any): number {
    if (typeof step.delta === 'number' && !isNaN(step.delta)) return step.delta;
    const raw = step.amount || step.value || step.formattedValue || '0';
    const cleaned = String(raw).replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleaned) || 0;
    if (step.type === 'negative' || step.type === 'debit') return -Math.abs(num);
    return num;
  }

  function normalizeStep(step: any, idx: number): WaterfallStep {
    return {
      id: step.id || `s-${idx}`,
      name: step.name || step.label || step.title || 'Item',
      delta: parseDelta(step),
      type: step.type === 'positive' ? 'credit' : step.type === 'negative' ? 'debit' : step.type || 'credit',
      formattedValue: step.formattedValue || step.amount || step.value || '',
      unitLabel: step.unitLabel || step.note || ''
    };
  }

  const computedSteps = $derived.by(() => {
    if (directSteps && directSteps.length > 0) return directSteps;
    if (config?.steps && config.steps.length > 0) return config.steps;

    if (grossVolume !== undefined) {
      const gv = grossVolume || 168000;
      const ce = computeExpense || Math.round(gv * 0.18);
      const se = supportExpense || Math.round(gv * 0.08);
      const td = tierDiscount || Math.round(gv * 0.04);
      const net = gv - ce - se - td;
      return [
        { id: 's-1', name: 'Gross Payment ARR', delta: gv, type: 'start' as const, formattedValue: `$${gv.toLocaleString()}` },
        { id: 's-2', name: 'Cloud Compute Infrastructure', delta: -ce, type: 'debit' as const, formattedValue: `-$${ce.toLocaleString()}` },
        { id: 's-3', name: 'Dedicated Support Triage', delta: -se, type: 'debit' as const, formattedValue: `-$${se.toLocaleString()}` },
        { id: 's-4', name: 'Enterprise Volume Rebate', delta: -td, type: 'debit' as const, formattedValue: `-$${td.toLocaleString()}` },
        { id: 's-5', name: 'Net Total', delta: net, type: 'total' as const, formattedValue: `$${net.toLocaleString()}` }
      ];
    }

    return [
      { id: 's-1', name: 'Gross Payment Volume', delta: 184200, type: 'start' as const, formattedValue: '$184,200' },
      { id: 's-2', name: 'Stripe Interchange & Processing', delta: -5340, type: 'debit' as const, formattedValue: '-$5,340' },
      { id: 's-3', name: 'AWS Cloud Compute Egress', delta: -1820, type: 'debit' as const, formattedValue: '-$1,820' },
      { id: 's-4', name: 'Enterprise Contract Add-ons', delta: 14800, type: 'credit' as const, formattedValue: '+$14,800' },
      { id: 's-5', name: 'Chargeback Reserve Buffer', delta: -800, type: 'debit' as const, formattedValue: '-$800' },
      { id: 's-6', name: 'Net Settlement Payout', delta: 191040, type: 'total' as const, formattedValue: '$191,040' }
    ];
  });

  const steps = $derived(computedSteps.map((s, i) => normalizeStep(s, i)));
  const maxVal = $derived(Math.max(...steps.map(s => Math.abs(s.delta)), 1));
</script>

<div class="relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
  
  <!-- Header -->
  <div class="flex items-start justify-between gap-4 mb-6">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        <h3 class="text-base font-bold text-slate-950 dark:text-slate-50 tracking-tight font-mono">{displayTitle}</h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">{displaySubtitle}</p>
    </div>

    <!-- Final Value Highlight -->
    <div class="text-right">
      <span class="text-xs font-mono text-slate-500 dark:text-slate-400 block uppercase">Total</span>
      <span class="text-lg font-bold text-slate-950 dark:text-slate-50 font-mono tracking-tight text-blue-600 dark:text-blue-400">
        {steps[steps.length - 1]?.formattedValue || '$191,040'}
      </span>
    </div>
  </div>

  <!-- Waterfall Bar Visualization -->
  <div class="space-y-3 mb-6">
    {#each steps as step, idx}
      {@const pct = Math.min(Math.max((Math.abs(step.delta) / maxVal) * 100, 12), 100)}
      <button 
        type="button"
        onmouseenter={() => activeStep = step}
        onmouseleave={() => activeStep = null}
        class="w-full text-left p-2.5 rounded-2xl transition-all cursor-pointer group flex items-center justify-between gap-4 border {activeStep?.id === step.id ? 'bg-slate-100/90 dark:bg-white/[0.08] border-slate-300' : 'bg-slate-50/70 dark:bg-white/[0.04] border-slate-100 dark:border-white/[0.04] hover:bg-slate-100/60 dark:bg-white/[0.08]'}">
        
        <div class="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
          <span class="w-2 h-2 rounded-full {step.type === 'total' || step.type === 'subtotal' ? 'bg-indigo-600' : (step.delta >= 0 || step.type === 'positive') ? 'bg-blue-500' : 'bg-rose-500'}"></span>
          <span class="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">{step.name || step.label || step.title || 'Deduction Item'}</span>
        </div>

        <!-- Relative Bar -->
        <div class="flex-1 max-w-xs h-3.5 bg-slate-200/80 rounded-full overflow-hidden flex items-center p-0.5">
          <div 
            class="h-full rounded-full transition-all duration-500 {step.type === 'total' || step.type === 'subtotal' ? 'bg-indigo-600' : (step.delta >= 0 || step.type === 'positive') ? 'bg-blue-500' : 'bg-rose-500'}"
            style="width: {pct}%;">
          </div>
        </div>

        <!-- Value Metric -->
        <div class="text-right min-w-[80px] sm:min-w-[90px]">
          <span class="text-xs font-mono font-semibold {step.type === 'total' || step.type === 'subtotal' ? 'text-indigo-600 dark:text-indigo-400' : (step.delta >= 0 || step.type === 'positive') ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}">
            {step.formattedValue || step.amount || step.value || (step.delta ? (step.delta >= 0 ? `+$${step.delta.toLocaleString()}` : `-$${Math.abs(step.delta).toLocaleString()}`) : '$0')}
          </span>
        </div>
      </button>
    {/each}
  </div>

  <div class="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
    <span>Step Breakdown</span>
    <span>Compiled from reactive props</span>
  </div>

</div>
