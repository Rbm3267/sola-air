<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Navbar from '$lib/components/Navbar.svelte';
  import IntentBar from '$lib/components/IntentBar.svelte';
  import SolaMount from '$lib/components/SolaMount.svelte';
  import { STUDIO_COMPONENTS, STUDIO_BY_NAME, buildBlock, tidyGeneratedProps, type StudioComponent } from '$lib/data/studioComponents';
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
    // A gauge added here starts without the demo "Live Gauge" badge and footer.
    const b = makeBlock(def.name, tidyGeneratedProps(def.name, {}));
    if (!b) return;
    blocks = [...blocks, b];
    selectedId = b.id;
    paletteOpen = false;
  }

  function loadTemplate(id: string) {
    const t = STUDIO_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    blocks = t.blocks.map((b) => makeBlock(b.component, tidyGeneratedProps(b.component, b.props), b.span)).filter((b): b is Block => !!b);
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

  // --- Moving and resizing on the canvas -----------------------------------
  // Pointer events, so a finger on an iPad works as well as a mouse. The canvas
  // list holds the pointer for the whole gesture: a block that is mid-move is
  // re-inserted in the DOM, which would drop a capture held on the block itself.
  let canvasEl = $state<HTMLOListElement | null>(null);
  let gesture = $state<{ kind: 'move' | 'resize'; id: string } | null>(null);

  function startGesture(e: PointerEvent, kind: 'move' | 'resize', id: string) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!canvasEl) return;
    e.preventDefault();
    canvasEl.setPointerCapture(e.pointerId);
    gesture = { kind, id };
    selectedId = id;
  }

  function onGestureMove(e: PointerEvent) {
    if (!gesture || !canvasEl) return;
    if (gesture.kind === 'move') {
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-block-id]');
      const overId = over?.dataset.blockId;
      if (!over || !overId || overId === gesture.id) return;
      // Swap only once the pointer is well inside the other block, so two blocks of
      // different sizes do not trade places back and forth under a still pointer.
      const r = over.getBoundingClientRect();
      const inside =
        Math.abs(e.clientX - (r.left + r.width / 2)) < r.width * 0.3 &&
        Math.abs(e.clientY - (r.top + r.height / 2)) < r.height * 0.3;
      if (!inside) return;
      const from = blocks.findIndex((b) => b.id === gesture!.id);
      const to = blocks.findIndex((b) => b.id === overId);
      if (from < 0 || to < 0) return;
      const next = [...blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      blocks = next;
    } else {
      const el = canvasEl.querySelector<HTMLElement>(`[data-block-id="${gesture.id}"]`);
      if (!el) return;
      const cols = getComputedStyle(canvasEl).gridTemplateColumns.split(' ').length;
      const gap = parseFloat(getComputedStyle(canvasEl).columnGap) || 0;
      const colWidth = (canvasEl.clientWidth + gap) / cols;
      const want = Math.min(cols, Math.max(1, Math.round((e.clientX - el.getBoundingClientRect().left + gap / 2) / colWidth)));
      // On a two-column canvas, "all columns" is stored as 3 like everywhere else.
      const span = (want === cols ? 3 : want) as 1 | 2 | 3;
      const current = blocks.find((b) => b.id === gesture!.id);
      if (current && current.span !== span) update(gesture.id, { span });
    }
  }

  function endGesture() {
    gesture = null;
  }

  function handleKey(e: KeyboardEvent, block: Block, i: number) {
    const d = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 0;
    if (!d) return;
    e.preventDefault();
    move(block.id, d as -1 | 1);
    // The block is re-inserted in the list, so give the grip focus back.
    queueMicrotask(() => canvasEl?.querySelector<HTMLElement>(`[data-block-id="${block.id}"] button[aria-label^="Drag"]`)?.focus());
  }

  function resizeKey(e: KeyboardEvent, block: Block) {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    update(block.id, { span: Math.min(3, Math.max(1, block.span + d)) as 1 | 2 | 3 });
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
    // From the playground's intent box. It arrives through sessionStorage, which a
    // link cannot set, and is read once: put the request in Arc's field and run it.
    let ask = '';
    try {
      ask = sessionStorage.getItem('sola:studio-ask') ?? '';
      sessionStorage.removeItem('sola:studio-ask');
    } catch {
      /* storage blocked: nothing was handed over */
    }
    if (ask.trim()) {
      arcPrompt = ask.slice(0, 1000);
      generate();
    }
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

  const spanClass = (s: number) => `studio-span-${s}`;
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
    <div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
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
    <div class="max-w-[1600px] mx-auto px-4 sm:px-6 pb-5">
      <IntentBar
        bind:value={arcPrompt}
        busy={arcBusy}
        placeholder="Describe a layout, e.g. 'a support desk with tickets'"
        inputLabel="Describe a layout for Arc"
        submitLabel="Generate with Arc"
        onsubmit={() => generate()}
      />
    </div>
    {#if arcError}
      <p role="alert" class="max-w-[1600px] mx-auto px-4 sm:px-6 pb-4 text-sm text-rose-700 dark:text-rose-400">{arcError}</p>
    {/if}
  </div>

  <div class="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
    <!-- Palette -->
    <aside class="{paletteOpen ? 'block' : 'hidden'} lg:block" aria-label="Components">
      <div class="lg:sticky lg:top-6 space-y-5 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
        <label class="sr-only" for="palette-search">Search components</label>
        <input id="palette-search" bind:value={search} placeholder="Search {STUDIO_COMPONENTS.length} components" class="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
        {#each GROUPS as group}
          {@const items = filtered.filter((c) => c.group === group)}
          {#if items.length}
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{group}</h2>
              <ul class="space-y-1.5">
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
      <div class="studio-canvas rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#070a13] p-5 sm:p-8 min-h-[70vh]">
        {#if blocks.length === 0}
          <div class="min-h-[50vh] rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 flex flex-col items-center justify-center text-center p-8 gap-2">
            <p class="text-base font-semibold">The canvas is empty.</p>
            <p class="text-sm text-slate-600 dark:text-slate-400 max-w-sm">Add a component from the left, pick a template, or describe a layout to Arc.</p>
          </div>
        {:else}
          <ol
            bind:this={canvasEl}
            class="studio-grid list-none p-0 m-0"
            onpointermove={onGestureMove}
            onpointerup={endGesture}
            onpointercancel={endGesture}
          >
            {#each blocks as block, i (block.id)}
              {@const active = gesture?.id === block.id}
              <li data-block={block.component} data-block-id={block.id} class="{spanClass(block.span)} group min-w-0 relative self-start">
                <div class="h-full flex flex-col rounded-2xl border bg-white dark:bg-[#0f172a] shadow-sm transition-shadow {active ? 'shadow-xl opacity-90 ring-2 ring-blue-500/50' : ''} {selectedId === block.id ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 dark:border-white/10'}">
                  <div class="flex items-center gap-1 pl-1 pr-2 py-1.5 border-b border-slate-100 dark:border-white/5">
                    <button
                      type="button"
                      class="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none select-none"
                      aria-label="Drag {block.component} to move it"
                      title="Drag to move. With the keyboard, use the arrow keys."
                      onpointerdown={(e) => startGesture(e, 'move', block.id)}
                      onkeydown={(e) => handleKey(e, block, i)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><circle cx="4" cy="3" r="1.3"/><circle cx="10" cy="3" r="1.3"/><circle cx="4" cy="7" r="1.3"/><circle cx="10" cy="7" r="1.3"/><circle cx="4" cy="11" r="1.3"/><circle cx="10" cy="11" r="1.3"/></svg>
                    </button>
                    <button type="button" class="mr-auto text-left min-w-0 py-1" onclick={() => (selectedId = block.id)} aria-pressed={selectedId === block.id}>
                      <span class="block text-xs font-semibold font-mono truncate">{block.component}</span>
                    </button>
                    {#if selectedId === block.id}
                      <button type="button" class="px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30" aria-label="Move {block.component} earlier" disabled={i === 0} onclick={() => move(block.id, -1)}>↑</button>
                      <button type="button" class="px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30" aria-label="Move {block.component} later" disabled={i === blocks.length - 1} onclick={() => move(block.id, 1)}>↓</button>
                    {/if}
                    <button type="button" class="px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Edit {block.component}" onclick={() => (selectedId = block.id)}>Edit</button>
                    <button type="button" class="px-2 py-1.5 rounded text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Remove {block.component}" onclick={() => remove(block.id)}>✕</button>
                  </div>
                  <div class="flex-1 p-5 studio-block overflow-x-auto">
                    {#key JSON.stringify(block.props)}
                      <SolaMount component={STUDIO_MOUNTS[block.component]} props={block.props} />
                    {/key}
                  </div>
                </div>
                <!-- Drag the right edge to change how many columns it spans. -->
                <div
                  role="slider"
                  tabindex="0"
                  aria-label="Width of {block.component}"
                  aria-orientation="horizontal"
                  aria-valuemin="1"
                  aria-valuemax="3"
                  aria-valuenow={block.span}
                  aria-valuetext="{block.span} {block.span === 1 ? 'column' : 'columns'}"
                  class="studio-resize touch-none absolute top-1/2 -right-3 -translate-y-1/2 h-12 w-6 flex items-center justify-center cursor-ew-resize rounded-full transition-opacity {selectedId === block.id || active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}"
                  onpointerdown={(e) => startGesture(e, 'resize', block.id)}
                  onkeydown={(e) => resizeKey(e, block)}
                >
                  <span class="block h-8 w-1.5 rounded-full {active && gesture?.kind === 'resize' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-white/25'}"></span>
                </div>
              </li>
            {/each}
          </ol>
        {/if}
      </div>
    </main>

    <!-- Properties -->
    <aside aria-label="Properties" class="min-w-0">
      <div class="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] p-5">
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
  /* A dotted workspace, so the canvas reads as a place to arrange things. */
  .studio-canvas {
    background-image: radial-gradient(circle, rgb(148 163 184 / 0.45) 1px, transparent 1.2px);
    background-size: 22px 22px;
  }
  /* The canvas decides its own column count from the room it has, so blocks are
     never squeezed into a sliver: one column on a phone, two, then three. A block
     that spans "all columns" always fills the row. */
  .studio-canvas {
    container-type: inline-size;
    container-name: studio;
  }
  .studio-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: minmax(0, 1fr);
  }
  .studio-span-2,
  .studio-span-3 {
    grid-column: 1 / -1;
  }
  @container studio (min-width: 520px) {
    .studio-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @container studio (min-width: 800px) {
    .studio-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .studio-span-2 { grid-column: span 2; }
  }
  .studio-resize:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  /* Components size themselves to their block. */
  .studio-block :global(.sola-component-root) {
    width: 100%;
  }
</style>
