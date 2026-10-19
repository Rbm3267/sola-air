<script lang="ts">
  export interface SchemaColumn {
    name: string;
    type: string;
    isPrimary?: boolean;
    isNullable?: boolean;
    foreignKey?: string;
  }

  export interface SchemaInspectorConfig {
    table: string;
    rowCount?: string;
    sizeBytes?: string;
    bloatPct?: number;
    columns?: SchemaColumn[];
  }

  let { config } = $props<{ config: SchemaInspectorConfig }>();

  const defaultColumns: SchemaColumn[] = [
    { name: 'sys_id', type: 'UUID / CHAR(32)', isPrimary: true, isNullable: false },
    { name: 'number', type: 'VARCHAR(40)', isNullable: false },
    { name: 'short_description', type: 'VARCHAR(255)', isNullable: false },
    { name: 'priority', type: 'INTEGER (1-5)', isNullable: false },
    { name: 'assigned_to', type: 'REFERENCE(sys_user)', isNullable: true, foreignKey: 'sys_user.sys_id' },
    { name: 'state', type: 'INTEGER (Enum)', isNullable: false },
    { name: 'sys_created_on', type: 'TIMESTAMPTZ', isNullable: false }
  ];

  const columns = $derived(config.columns || defaultColumns);
</script>

<div class="relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
  
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.04] mb-5">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="px-2.5 py-0.5 rounded-md bg-slate-900 text-sky-400 font-mono font-semibold text-xs">
          TABLE
        </span>
        <h3 class="text-base font-bold text-slate-950 dark:text-slate-50 tracking-tight font-mono">
          {config.table || 'public.incident'}
        </h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">Relational Schema Definition & Foreign Key Constraints</p>
    </div>

    <!-- Stats Pill -->
    <div class="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
      <span class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.04]">
        <strong>{config.rowCount || '2,419,042'}</strong> Rows
      </span>
      <span class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.04]">
        <strong>{config.sizeBytes || '842 MB'}</strong> Size
      </span>
    </div>
  </div>

  <!-- Columns Table -->
  <div class="overflow-x-auto">
    <table class="w-full text-left font-mono text-xs">
      <thead>
        <tr class="border-b border-slate-100 dark:border-white/[0.04] text-xs text-slate-500 dark:text-slate-400 uppercase">
          <th class="pb-2.5 font-bold">Column Name</th>
          <th class="pb-2.5 font-bold">Data Type</th>
          <th class="pb-2.5 font-bold text-center">Attributes</th>
          <th class="pb-2.5 font-bold text-right">Foreign Key Target</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        {#each columns as col}
          <tr class="hover:bg-slate-50/80 dark:bg-white/[0.04] transition-colors">
            <td class="py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              {#if col.isPrimary}
                <svg class="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
              {/if}
              <span>{col.name}</span>
            </td>
            <td class="py-2.5 text-slate-600 dark:text-slate-400">
              <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold">
                {col.type}
              </span>
            </td>
            <td class="py-2.5 text-center">
              {#if col.isPrimary}
                <span class="px-1.5 py-0.5 rounded text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 font-semibold">PK</span>
              {:else if !col.isNullable}
                <span class="px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 font-semibold">NOT NULL</span>
              {:else}
                <span class="text-xs text-slate-500 dark:text-slate-400">NULL</span>
              {/if}
            </td>
            <td class="py-2.5 text-right text-slate-500 dark:text-slate-400">
              {#if col.foreignKey}
                <span class="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 cursor-pointer">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <span>{col.foreignKey}</span>
                </span>
              {:else}
                <span class="text-slate-300">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-4 mt-4 border-t border-slate-100 dark:border-white/[0.04]">
    <span>Zero-VDOM Relational Explorer</span>
    <span>Auto-Inferred Schema</span>
  </div>

</div>
