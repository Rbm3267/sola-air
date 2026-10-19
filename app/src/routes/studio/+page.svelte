<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Navbar from '$lib/components/Navbar.svelte';
  import SolaMount from '$lib/components/SolaMount.svelte';
  import { STUDIO_COMPONENTS, STUDIO_BY_NAME, buildBlock, type StudioComponent } from '$lib/data/studioComponents';
  import { STUDIO_MOUNTS } from '$lib/data/studioMounts';
  import { STUDIO_TEMPLATES } from '$lib/data/studioTemplates';
  import { UI_MANIFEST } from '$lib/data/site';
  import { toSolaFile, mountSnippet } from '$lib/data/solaExport';

  // A block is one real @sola-air-ui/ui component on the canvas, with the props it
  // is mounted with and the columns it spans. Export writes exactly this.
  interface Block {
    id: string;
    component: string;
    props: Record<string, unknown>;
    span: 1 | 2 | 3;
  }

  const STORE_KEY = 'sola-studio-v2';
  const GROUPS = ['Data', 'Inputs', 'Feedback', 'Content', 'AI'] as const;

  // Props whose value is one of a fixed set, so the editor offers a choice.
  const ENUMS: Record<string, string[]> = {
    'Alert.variant': ['info', 'success', 'warning', 'error'],
    'Badge.variant': ['default', 'success', 'warning', 'error'],
    'Button.variant': ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'default'],
    'Button.size': ['sm', 'default', 'lg'],
    'GaugeCard.color': ['emerald', 'sky', 'violet', 'amber', 'rose'],
    'TactileDialCard.color': ['amber', 'emerald', 'sky'],
    'ConfidenceBadge.size': ['sm', 'md', 'lg'],
    'ActionStrip.variant': ['default', 'compact'],
    'TextInput.type': ['text', 'email', 'password', 'number', 'url', 'tel', 'search']
  };

  let blocks = $state<Block[]>([]);
  let selectedId = $state<string | null>(null);
  let search = $state('');
  let paletteOpen = $state(false); // phones: the palette is a sheet
  let templatesOpen = $state(false);
  let exportOpen = $state(false);
  let exportTab = $state<'sola' | 'mount'>('sola');
  let copied = $state(false);

  let arcPrompt = $state('');
  let arcBusy = $state(false);
  let arcError = $state('');

  let selected = $derived(blocks.find((b) => b.id === selectedId) ?? null);
  let filtered = $derived(
    STUDIO_COMPONENTS.filter((c) => {
      const q = search.trim().toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.blurb.toLowerCase().includes(q);
    })
  );
  let exportItems = $derived(blocks.map((b) => ({ component: b.component, props: b.props, span: b.span })));
  let exportCode = $derived(exportTab === 'sola' ? toSolaFile(exportItems, UI_MANIFEST) : mountSnippet('Dashboard.sola'));

  const uid = () => Math.random().toString(36).slice(2, 9);

  function makeBlock(name: string, props: Record<string, unknown> = {}, span?: unknown): Block | null {
    const b = buildBlock(name, props, span, UI_MANIFEST.props[name] ?? []);
    return b ? { id: uid(), ...b } : null;
  }

  function add(def: StudioComponent) {
    const b = makeBlock(def.name);
    if (!b) return;
    blocks = [...blocks, b];
    selectedId = b.id;
    paletteOpen = false;
  }

  function loadTemplate(id: string) {
    const t = STUDIO_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    blocks = t.blocks.map((b) => makeBlock(b.component, b.props, b.span)).filter((b): b is Block => !!b);
    selectedId = null;
    templatesOpen = false;
  }

  function update(id: string, patch: Partial<Block>) {
    blocks = blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
  }

  function setProp(block: Block, key: string, value: unknown) {
    const props = { ...block.props };
    if (value === undefined || value === '') delete props[key];
    else props[key] = value;
    update(block.id, { props });
  }

  function move(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    blocks = next;
  }

  function duplicate(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy = { ...structuredClone($state.snapshot(blocks[i])), id: uid() };
    blocks = [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
    selectedId = copy.id;
  }

  function remove(id: string) {
    blocks = blocks.filter((b) => b.id !== id);
    if (selectedId === id) selectedId = null;
  }

  // --- Prop editing -------------------------------------------------------
  type Kind = 'boolean' | 'number' | 'enum' | 'json' | 'text' | 'longtext';
  function kindOf(component: string, key: string, value: unknown): Kind {
    if (ENUMS[`${component}.${key}`]) return 'enum';
    const sample = STUDIO_BY_NAME[component]?.sample[key];
    const v = value ?? sample;
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'number') return 'number';
    if (v !== null && typeof v === 'object') return 'json';
    if (typeof v === 'string' && (v.includes('\n') || v.length > 60)) return 'longtext';
    return 'text';
  }
  // Callbacks cannot be set from a form; the exported file is where they belong.
  const editable = (component: string) =>
    (UI_MANIFEST.props[component] ?? []).filter((k) => !/^on[A-Za-z]/.test(k));

  let jsonDrafts = $state<Record<string, string>>({});
  let jsonErrors = $state<Record<string, string>>({});
  function jsonText(block: Block, key: string) {
    const draftKey = `${block.id}.${key}`;
    return jsonDrafts[draftKey] ?? JSON.stringify(block.props[key] ?? null, null, 2);
  }
  function onJson(block: Block, key: string, text: string) {
    const draftKey = `${block.id}.${key}`;
    jsonDrafts = { ...jsonDrafts, [draftKey]: text };
    try {
      const parsed = JSON.parse(text);
      jsonErrors = { ...jsonErrors, [draftKey]: '' };
      setProp(block, key, parsed);
    } catch {
      jsonErrors = { ...jsonErrors, [draftKey]: 'Not valid JSON yet. The component keeps its last valid value.' };
    }
  }

  // --- Arc ------------------------------------------------------------------
  async function generate() {
    const prompt = arcPrompt.trim();
    if (!prompt || arcBusy) return;
    arcBusy = true;
    arcError = '';
    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: prompt, mode: 'studio' })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        arcError = body?.error ?? `Generation failed (${res.status}). Try again.`;
        return;
      }
      const data = await res.json();
      const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.blocks) ? data.blocks : Array.isArray(data?.components) ? data.components : [];
      // The model has answered with { component } and with { type }, and with
      // { props } and with { config }; accept either, and keep only real components.
      const made = items
        .map((it) => makeBlock(String(it?.component ?? it?.type ?? ''), it?.props ?? it?.config ?? {}, it?.span ?? it?.colSpan ?? it?.cols))
        .filter((b): b is Block => !!b);
      if (made.length === 0) {
        arcError = 'Arc did not return any components Studio knows. Try naming what you want to see, like "a revenue chart and a table of customers".';
        return;
      }
      blocks = made;
      selectedId = null;
      arcPrompt = '';
    } catch (e) {
      arcError = e instanceof Error ? e.message : 'Could not reach Arc.';
    } finally {
      arcBusy = false;
    }
  }

  // --- Export -------------------------------------------------------------
  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportCode);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* clipboard blocked: the code is still selectable in the panel */
    }
  }

  // --- Persistence and URL --------------------------------------------------
  let ready = false;
  onMount(() => {
    const q = page.url.searchParams;
    const addParam = q.get('add');
    const templateParam = q.get('template');
    let restored = false;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
      if (Array.isArray(saved)) {
        blocks = saved.map((b) => makeBlock(b.component, b.props, b.span)).filter((b): b is Block => !!b);
        restored = blocks.length > 0;
      }
    } catch {
      /* storage blocked or corrupt: start fresh */
    }
    if (templateParam) loadTemplate(templateParam);
    else if (!restored) loadTemplate('revenue');
    if (addParam) {
      const def = STUDIO_COMPONENTS.find((c) => c.id === addParam || c.name === addParam);
      if (def) add(def);
    }
    // Applied once: left in the address, a reload would apply them again over
    // the canvas the visitor has since changed.
    if (templateParam || addParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete('template');
      url.searchParams.delete('add');
      history.replaceState(history.state, '', url);
    }
    ready = true;
  });

  $effect(() => {
    const snapshot = JSON.stringify(blocks.map(({ component, props, span }) => ({ component, props, span })));
    if (!ready) return;
    try {
      localStorage.setItem(STORE_KEY, snapshot);
    } catch {
      /* storage full or blocked */
    }
  });

  const spanClass = (s: number) => (s === 3 ? 'sm:col-span-2 lg:col-span-3' : s === 2 ? 'sm:col-span-2' : '');
</script>

<svelte:head>
  <title>Studio — Sola AIR</title>
  <meta name="description" content="Arrange real @sola-air-ui/ui components, edit their props, and export a .sola file that runs." />
</svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (exportOpen = templatesOpen = paletteOpen = false)} />

<div class="flex flex-col w-full min-h-screen bg-[#fafafa] dark:bg-[#090d19] text-slate-900 dark:text-slate-100">
  <Navbar />

  <!-- Toolbar -->
  <div class="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0b1120]/80">
    <div class="max-w-[1500px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
      <div class="mr-auto min-w-0">
        <h1 class="text-base font-bold">Studio</h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Arrange real <code class="font-mono">@sola-air-ui/ui</code> components, edit their props, and export a <code class="font-mono">.sola</code> file that runs.</p>
      </div>
      <button type="button" class="lg:hidden px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5" onclick={() => (paletteOpen = !paletteOpen)} aria-expanded={paletteOpen}>Add component</button>
      <div class="relative">
        <button type="button" class="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5" aria-expanded={templatesOpen} aria-haspopup="menu" onclick={() => (templatesOpen = !templatesOpen)}>Templates</button>
        {#if templatesOpen}
          <div role="menu" class="absolute right-0 z-30 mt-2 w-72 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-xl">
            {#each STUDIO_TEMPLATES as t}
              <button type="button" role="menuitem" class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5" onclick={() => loadTemplate(t.id)}>
                <span class="block text-sm font-semibold">{t.name}</span>
                <span class="block text-xs text-slate-600 dark:text-slate-400">{t.blurb}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <button type="button" class="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 disabled:opacity-50" disabled={blocks.length === 0} onclick={() => { blocks = []; selectedId = null; }}>Clear</button>
      <button type="button" class="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50" disabled={blocks.length === 0} onclick={() => (exportOpen = true)}>Export .sola</button>
    </div>

    <!-- Arc -->
    <form class="max-w-[1500px] mx-auto px-4 pb-3 flex flex-col sm:flex-row gap-2" onsubmit={(e) => { e.preventDefault(); generate(); }}>
      <label class="sr-only" for="arc-prompt">Describe a layout for Arc</label>
      <input id="arc-prompt" bind:value={arcPrompt} placeholder="Describe a layout, e.g. 'support desk with open tickets, SLA gauge and a ticket table'" class="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
      <button type="submit" disabled={arcBusy || !arcPrompt.trim()} class="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white disabled:opacity-50">{arcBusy ? 'Generating…' : 'Generate with Arc'}</button>
    </form>
    {#if arcError}
      <p role="alert" class="max-w-[1500px] mx-auto px-4 pb-3 text-sm text-rose-700 dark:text-rose-400">{arcError}</p>
    {/if}
  </div>

  <div class="flex-1 w-full max-w-[1500px] mx-auto px-4 py-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
    <!-- Palette -->
    <aside class="{paletteOpen ? 'block' : 'hidden'} lg:block" aria-label="Components">
      <div class="lg:sticky lg:top-4 space-y-3">
        <label class="sr-only" for="palette-search">Search components</label>
        <input id="palette-search" bind:value={search} placeholder="Search {STUDIO_COMPONENTS.length} components" class="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
        {#each GROUPS as group}
          {@const items = filtered.filter((c) => c.group === group)}
          {#if items.length}
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{group}</h2>
              <ul class="space-y-1">
                {#each items as c}
                  <li>
                    <button type="button" class="w-full text-left px-3 py-2 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/5" onclick={() => add(c)}>
                      <span class="flex items-center justify-between gap-2"><span class="text-sm font-semibold">{c.name}</span><span class="text-xs text-blue-700 dark:text-blue-400">Add</span></span>
                      <span class="block text-xs text-slate-600 dark:text-slate-400">{c.blurb}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {/each}
      </div>
    </aside>

    <!-- Canvas -->
    <main id="main-content" aria-label="Canvas" class="min-w-0">
      {#if blocks.length === 0}
        <div class="h-64 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 flex flex-col items-center justify-center text-center p-6 gap-2">
          <p class="text-sm font-semibold">The canvas is empty.</p>
          <p class="text-sm text-slate-600 dark:text-slate-400">Add a component, pick a template, or describe a layout to Arc.</p>
        </div>
      {:else}
        <ol class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
          {#each blocks as block, i (block.id)}
            <li data-block={block.component} class="{spanClass(block.span)} min-w-0">
              <div class="h-full rounded-2xl border bg-white dark:bg-[#0f172a] {selectedId === block.id ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 dark:border-white/10'}">
                <div class="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-white/5">
                  <button type="button" class="mr-auto text-left min-w-0" onclick={() => (selectedId = block.id)} aria-pressed={selectedId === block.id}>
                    <span class="block text-xs font-semibold font-mono truncate">{block.component}</span>
                  </button>
                  <button type="button" class="px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30" aria-label="Move {block.component} earlier" disabled={i === 0} onclick={() => move(block.id, -1)}>↑</button>
                  <button type="button" class="px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30" aria-label="Move {block.component} later" disabled={i === blocks.length - 1} onclick={() => move(block.id, 1)}>↓</button>
                  <button type="button" class="px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Edit {block.component}" onclick={() => (selectedId = block.id)}>Edit</button>
                  <button type="button" class="px-1.5 py-1 rounded text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Remove {block.component}" onclick={() => remove(block.id)}>✕</button>
                </div>
                <div class="p-4 studio-block overflow-x-auto">
                  {#key JSON.stringify(block.props)}
                    <SolaMount component={STUDIO_MOUNTS[block.component]} props={block.props} />
                  {/key}
                </div>
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </main>

    <!-- Properties -->
    <aside aria-label="Properties" class="min-w-0">
      <div class="lg:sticky lg:top-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] p-4">
        {#if selected}
          <div class="flex items-center justify-between gap-2 mb-1">
            <h2 class="text-sm font-bold font-mono">{selected.component}</h2>
            <button type="button" class="text-xs text-slate-600 dark:text-slate-400 hover:underline" onclick={() => (selectedId = null)}>Close</button>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-3 font-mono">{UI_MANIFEST.subpaths[selected.component]}</p>

          <fieldset class="mb-4">
            <legend class="text-xs font-semibold mb-1.5">Width</legend>
            <div class="flex gap-1">
              {#each [1, 2, 3] as s}
                <button type="button" aria-pressed={selected.span === s} class="flex-1 py-1.5 rounded-lg text-xs font-semibold border {selected.span === s ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white' : 'border-slate-200 dark:border-white/10'}" onclick={() => update(selected.id, { span: s as 1 | 2 | 3 })}>{s} col</button>
              {/each}
            </div>
          </fieldset>

          <div class="space-y-3">
            {#each editable(selected.component) as key (selected.id + key)}
              {@const value = selected.props[key]}
              {@const kind = kindOf(selected.component, key, value)}
              {@const fid = `prop-${selected.id}-${key}`}
              <div>
                {#if kind === 'boolean'}
                  <label class="flex items-center gap-2 text-sm">
                    <input id={fid} type="checkbox" checked={value === true} onchange={(e) => setProp(selected, key, (e.target as HTMLInputElement).checked)} />
                    <span class="font-mono text-xs">{key}</span>
                  </label>
                {:else}
                  <label for={fid} class="block font-mono text-xs mb-1">{key}</label>
                  {#if kind === 'enum'}
                    <select id={fid} class="w-full px-2 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5" value={String(value ?? '')} onchange={(e) => setProp(selected, key, (e.target as HTMLSelectElement).value)}>
                      <option value="">(default)</option>
                      {#each ENUMS[`${selected.component}.${key}`] as opt}<option value={opt}>{opt}</option>{/each}
                    </select>
                  {:else if kind === 'number'}
                    <input id={fid} type="number" class="w-full px-2 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5" value={value as number ?? ''} oninput={(e) => { const t = (e.target as HTMLInputElement).value; setProp(selected, key, t === '' ? undefined : Number(t)); }} />
                  {:else if kind === 'json'}
                    <textarea id={fid} rows="6" spellcheck="false" class="w-full px-2 py-1.5 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5" value={jsonText(selected, key)} oninput={(e) => onJson(selected, key, (e.target as HTMLTextAreaElement).value)}></textarea>
                    {#if jsonErrors[`${selected.id}.${key}`]}<p class="text-xs text-rose-700 dark:text-rose-400 mt-1">{jsonErrors[`${selected.id}.${key}`]}</p>{/if}
                  {:else if kind === 'longtext'}
                    <textarea id={fid} rows="4" class="w-full px-2 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5" value={String(value ?? '')} oninput={(e) => setProp(selected, key, (e.target as HTMLTextAreaElement).value)}></textarea>
                  {:else}
                    <input id={fid} type="text" class="w-full px-2 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5" value={String(value ?? '')} oninput={(e) => setProp(selected, key, (e.target as HTMLInputElement).value)} />
                  {/if}
                {/if}
              </div>
            {/each}
          </div>

          <div class="flex gap-2 mt-4">
            <button type="button" class="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-white/10" onclick={() => duplicate(selected.id)}>Duplicate</button>
            <button type="button" class="flex-1 py-2 rounded-lg text-sm font-semibold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30" onclick={() => remove(selected.id)}>Remove</button>
          </div>
        {:else}
          <h2 class="text-sm font-bold mb-1">Properties</h2>
          <p class="text-sm text-slate-600 dark:text-slate-400">Select a component on the canvas to edit its props. Every field is a prop the component really declares, and the export uses the same values.</p>
        {/if}
      </div>
    </aside>
  </div>

  {#if exportOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Export">
      <button type="button" class="absolute inset-0 bg-black/50" aria-label="Close export" onclick={() => (exportOpen = false)}></button>
      <div class="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl">
        <div class="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-white/10">
          <button type="button" aria-pressed={exportTab === 'sola'} class="px-3 py-1.5 rounded-lg text-sm font-semibold {exportTab === 'sola' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : ''}" onclick={() => (exportTab = 'sola')}>Dashboard.sola</button>
          <button type="button" aria-pressed={exportTab === 'mount'} class="px-3 py-1.5 rounded-lg text-sm font-semibold {exportTab === 'mount' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : ''}" onclick={() => (exportTab = 'mount')}>Mount it</button>
          <button type="button" class="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 dark:border-white/10" onclick={copyExport}>{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" class="px-2 py-1.5 rounded-lg text-sm" aria-label="Close export" onclick={() => (exportOpen = false)}>✕</button>
        </div>
        <pre class="flex-1 overflow-auto m-0 p-4 text-xs leading-relaxed font-mono bg-slate-950 text-slate-100 rounded-b-2xl" tabindex="0" aria-label="Exported code"><code>{exportCode}</code></pre>
        <p class="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">Install with <code class="font-mono">npm install @sola-air-ui/ui @sola-air-ui/core</code>. Every component and prop in this file exists in the package.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Components size themselves to their block. */
  .studio-block :global(.sola-component-root) {
    width: 100%;
  }
</style>
