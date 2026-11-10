<script lang="ts">
  import DataCard from './DataCard.svelte';
  import GaugeCard from './GaugeCard.svelte';

  // A stand-in for a Google Sheet. The cards below are computed from these
  // cells, so editing one changes them at once. With the Sola Relay the rows
  // come from a real sheet instead, and the cards update when it refreshes.
  type Row = { month: string; mrr: number; cash: number; burn: number };

  const SAMPLE: Row[] = [
    { month: 'Jun', mrr: 142000, cash: 586000, burn: 21200 },
    { month: 'Jul', mrr: 151200, cash: 563000, burn: 20800 },
    { month: 'Aug', mrr: 158900, cash: 540000, burn: 20100 },
    { month: 'Sep', mrr: 166400, cash: 504000, burn: 19400 },
    { month: 'Oct', mrr: 175000, cash: 474000, burn: 18900 },
    { month: 'Nov', mrr: 184200, cash: 444000, burn: 18500 }
  ];

  let rows = $state<Row[]>(SAMPLE.map((r) => ({ ...r })));

  const money = (n: number) =>
    Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : '—';

  const last = $derived(rows[rows.length - 1]);
  const prev = $derived(rows.length > 1 ? rows[rows.length - 2] : undefined);

  const mrrTrend = $derived.by(() => {
    if (!last || !prev || !(prev.mrr > 0)) return 'No earlier month to compare';
    const pct = ((last.mrr - prev.mrr) / prev.mrr) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs ${prev.month}`;
  });

  const runway = $derived(last && last.burn > 0 ? last.cash / last.burn : NaN);
  const runwayText = $derived(Number.isFinite(runway) ? `${runway.toFixed(1)} months` : '—');
  const runwayPct = $derived(
    Number.isFinite(runway) ? Math.max(0, Math.min(100, Math.round((runway / 24) * 100))) : 0
  );
  const runwayColor = $derived(runway >= 12 ? 'emerald' : 'amber');

  function addRow() {
    const l = rows[rows.length - 1];
    rows.push({ month: `Month ${rows.length + 1}`, mrr: l?.mrr ?? 0, cash: l ? Math.max(0, l.cash - l.burn) : 0, burn: l?.burn ?? 0 });
  }
  function removeRow(i: number) {
    if (rows.length > 1) rows.splice(i, 1);
  }
  function reset() {
    rows = SAMPLE.map((r) => ({ ...r }));
  }
  function num(e: Event): number {
    const v = (e.currentTarget as HTMLInputElement).value;
    return v === '' ? NaN : Number(v);
  }

  const CONFIG = `// sola-relay.json
{ "connections": { "finance": { "type": "sheet", "sheetId": "<your sheet id>" } } }

// in a .sola file
let sheet = $data('finance', { refresh: '30s' });`;
</script>

<div class="flex flex-col gap-6">
  <div class="bg-white/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-base sm:text-lg font-bold text-slate-950 dark:text-slate-50 tracking-tight">Finance sheet</h3>
      <span class="text-xs font-mono font-semibold uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">Mock sheet</span>
    </div>
    <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-[68ch] leading-relaxed">
      Change any cell and the cards below recalculate. This is sample data standing in for a Google Sheet.
      With the Relay, the rows come from a sheet that anyone with the link can view, and the Relay only reads it.
    </p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
    <DataCard config={{ title: 'MRR', value: money(last?.mrr ?? NaN), trend: mrrTrend, icon: 'trending-up' }} />
    <DataCard config={{ title: 'Net burn per month', value: money(last?.burn ?? NaN), trend: last ? `Cash on hand ${money(last.cash)}` : '', icon: 'activity' }} />
    <div class="sm:col-span-2 lg:col-span-1"><GaugeCard config={{ title: 'Cash runway', value: runwayText, percentage: runwayPct, subtext: 'Gauge is full at 24 months', color: runwayColor }} /></div>
  </div>

  <div class="bg-white/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col gap-4">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[34rem] text-sm font-mono border-separate border-spacing-y-1.5">
        <thead>
          <tr class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">
            <th class="font-semibold px-2 py-1">Month</th>
            <th class="font-semibold px-2 py-1">MRR ($)</th>
            <th class="font-semibold px-2 py-1">Cash ($)</th>
            <th class="font-semibold px-2 py-1">Burn ($/mo)</th>
            <th class="px-2 py-1"><span class="sr-only">Remove row</span></th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, i (i)}
            <tr>
              <td class="px-1">
                <input class="cell" aria-label="Month, row {i + 1}" bind:value={row.month} />
              </td>
              <td class="px-1">
                <input class="cell" type="number" inputmode="numeric" min="0" aria-label="MRR for {row.month}" value={row.mrr} oninput={(e) => (row.mrr = num(e))} />
              </td>
              <td class="px-1">
                <input class="cell" type="number" inputmode="numeric" min="0" aria-label="Cash for {row.month}" value={row.cash} oninput={(e) => (row.cash = num(e))} />
              </td>
              <td class="px-1">
                <input class="cell" type="number" inputmode="numeric" min="0" aria-label="Burn for {row.month}" value={row.burn} oninput={(e) => (row.burn = num(e))} />
              </td>
              <td class="px-1 text-right">
                <button type="button" onclick={() => removeRow(i)} disabled={rows.length === 1} aria-label="Remove {row.month}" class="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer">Remove</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="flex flex-wrap gap-2">
      <button type="button" onclick={addRow} class="btn">Add month</button>
      <button type="button" onclick={reset} class="btn">Reset sample data</button>
    </div>
  </div>

  <div class="bg-slate-950 text-slate-200 rounded-3xl p-5 sm:p-6 overflow-x-auto">
    <p class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2">Connecting a real sheet</p>
    <pre class="text-xs sm:text-sm font-mono leading-relaxed whitespace-pre">{CONFIG}</pre>
  </div>
</div>

<style>
  .cell {
    width: 100%;
    min-width: 5.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.75rem;
    border: 1px solid rgb(226 232 240);
    background: white;
    color: rgb(15 23 42);
    font: inherit;
  }
  .cell:focus {
    outline: 2px solid rgb(59 130 246);
    outline-offset: 1px;
  }
  :global(.dark) .cell {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgb(241 245 249);
  }
  .btn {
    padding: 0.5rem 0.875rem;
    border-radius: 0.75rem;
    border: 1px solid rgb(226 232 240);
    background: white;
    color: rgb(51 65 85);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn:hover {
    border-color: rgb(96 165 250);
  }
  :global(.dark) .btn {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgb(226 232 240);
  }
</style>
