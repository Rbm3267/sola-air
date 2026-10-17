<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { COMPONENT_CATALOG, type CatalogComponent } from '$lib/data/componentCatalog';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { STUDIO_PRESETS } from '$lib/data/studioPresets';
  import { CATALOG_COUNT, UI_MANIFEST } from '$lib/data/site';
  import { toSolaFile, mountSnippet, studioCardToItem } from '$lib/data/solaExport';

  // --- 1. Universal Canvas Card Data Model ---
  interface StudioCard {
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    cols: 1 | 2 | 3;
    value: string | number;
    delta?: string;
    accentColor: string;
    config?: Record<string, any>;
  }

  let arcPromptInput = $state('');
  let isGeneratingArc = $state(false);
  let arcError = $state('');
  let activeCardId = $state<string | null>(null);
  let exportModalOpen = $state(false);
  let exportTab = $state<'sola' | 'mount'>('sola');
  let presetMenuOpen = $state(false);

  // Non-blocking Left Docked Palette State. Starts closed on phones, where it
  // renders as a sheet over the canvas rather than beside it.
  let paletteOpen = $state(true);
  let componentSearch = $state('');
  let componentCategory = $state('All');

  // Extract all categories dynamically from catalog
  const catalogCategories = [
    'All',
    'Metrics & KPIs',
    'Controllers & Sliders',
    'Forms & Inputs',
    'Data Display',
    'Navigation',
    'Status & HUD',
    'Overlays & Dialogs',
    'Flows & Cascades',
    'Lists & Feeds',
    'Matrices & Graphs'
  ];

  const filteredCatalog = $derived(
    COMPONENT_CATALOG.filter(c => {
      const matchCat = componentCategory === 'All' || c.category === componentCategory;
      const matchSearch =
        !componentSearch ||
        c.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
        c.description.toLowerCase().includes(componentSearch.toLowerCase()) ||
        c.tagline.toLowerCase().includes(componentSearch.toLowerCase());
      return matchCat && matchSearch;
    })
  );

  let copyNotification = $state(false);

  // Drag-and-Drop & Snap-to-Grid State
  let draggedCardId = $state<string | null>(null);
  let draggedPaletteItem = $state<CatalogComponent | null>(null);
  let dragOverCardId = $state<string | null>(null);

  // Universal Layout Presets
  const samplePresets: Record<string, { label: string; desc: string; cards: StudioCard[] }> = {
    general: {
      label: 'Executive Analytics',
      desc: 'KPI stat tiles, telemetry chart, and event feeds',
      cards: [
        { id: 'c1', type: 'stat', title: 'Primary Metric', subtitle: 'Live aggregated total', cols: 1, value: '$48,500', delta: '+14.2%', accentColor: 'emerald' },
        { id: 'c2', type: 'progress', title: 'Goal Completion', subtitle: 'Target milestone progress', cols: 1, value: 78, delta: '78%', accentColor: 'emerald' },
        { id: 'c3', type: 'slider', title: 'Adjustment Range', subtitle: 'Tactile input controller', cols: 1, value: 65, accentColor: 'emerald' },
        { id: 'c4', type: 'chart', title: 'Signal Throughput', subtitle: 'Live signal mesh', cols: 2, value: '95 req/s', accentColor: 'emerald' },
        { id: 'c5', type: 'feed', title: 'Activity & Updates', subtitle: 'Recent events log', cols: 1, value: 'Active', accentColor: 'slate' }
      ]
    },
    noc: {
      label: 'Telemetry & Ops NOC',
      desc: 'System health beacons, latency charts, and data tables',
      cards: [
        { id: 'n1', type: 'status', title: 'System Health HUD', subtitle: 'All 24 cluster nodes nominal', cols: 1, value: 'Optimal', accentColor: 'emerald' },
        { id: 'n2', type: 'chart', title: 'P99 Cluster Latency', subtitle: '12ms average across edge', cols: 2, value: '12.4ms', accentColor: 'emerald' },
        { id: 'n3', type: 'table', title: 'Active Ingestion Nodes', subtitle: 'Zero-VDOM stream brokers', cols: 2, value: 'Active', accentColor: 'slate' },
        { id: 'n4', type: 'radial_dial', title: 'CPU Ceiling Dial', subtitle: 'Haptic throttle limiter', cols: 1, value: 64, accentColor: 'emerald' }
      ]
    },
    product: {
      label: 'Sprint & Project Board',
      desc: 'Velocity counters, task backlog table, and date range',
      cards: [
        { id: 'p1', type: 'stat', title: 'Sprint Velocity', subtitle: 'Story points completed', cols: 1, value: '94 pts', delta: '+8.2%', accentColor: 'indigo' },
        { id: 'p2', type: 'progress', title: 'Sprint Progress', subtitle: 'Target: 100 points', cols: 1, value: 86, delta: '86%', accentColor: 'indigo' },
        { id: 'p3', type: 'datepicker', title: 'Sprint Timeline', subtitle: 'Sprint 24 milestone window', cols: 1, value: '2026-08-30', accentColor: 'emerald' },
        { id: 'p4', type: 'table', title: 'Assigned Work Items', subtitle: 'Active deliverables', cols: 2, value: 'Backlog', accentColor: 'slate' },
        { id: 'p5', type: 'code', title: 'Automation Hook', subtitle: 'Zero-VDOM state binding', cols: 1, value: 'TypeScript', accentColor: 'slate' }
      ]
    },
    ecommerce: {
      label: 'Commerce & Funnels',
      desc: 'Revenue waterfall bridges, conversion gauges, and discount sliders',
      cards: [
        { id: 'e1', type: 'stat', title: 'Daily Revenue', subtitle: 'Store orders volume', cols: 1, value: '$24,800', delta: '+22.4%', accentColor: 'emerald' },
        { id: 'e2', type: 'progress', title: 'Checkout Conversion', subtitle: 'Goal: > 3.5%', cols: 1, value: 82, delta: '4.1%', accentColor: 'emerald' },
        { id: 'e3', type: 'slider', title: 'Promo Discount Tier', subtitle: 'Promotional discount level', cols: 1, value: 15, accentColor: 'emerald' },
        { id: 'e4', type: 'waterfall', title: 'Revenue Waterfall', subtitle: 'Gross sales to net payout', cols: 2, value: '$135k', accentColor: 'emerald', config: { bars: [{ name: 'Gross Sales', val: 120, d: '+$120k' }, { name: 'Upsells', val: 30, d: '+$30k' }, { name: 'Refunds', val: -15, d: '-$15k' }, { name: 'Net Settlement', val: 135, d: '$135k' }] } }
      ]
    }
  };

  let cards = $state<StudioCard[]>([...samplePresets.general.cards]);
  let selectedPresetKey = $state('general');

  const activeCard = $derived(cards.find((c) => c.id === activeCardId) || null);

  function loadSample(key: string) {
    selectedPresetKey = key;
    presetMenuOpen = false;
    if (samplePresets[key]) {
      cards = JSON.parse(JSON.stringify(samplePresets[key].cards));
      activeCardId = null;
    } else {
      const preset = STUDIO_PRESETS.find(t => t.id === key);
      if (preset) {
        cards = JSON.parse(JSON.stringify(preset.cards));
        activeCardId = null;
      }
    }
  }

  // Color Accent Themes
  const COLOR_OPTIONS = [
    { id: 'blue', name: 'Blue', hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500', textDark: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-50 dark:bg-blue-500/10', badgeBorder: 'border-blue-200/60 dark:border-blue-500/20', accent: 'accent-blue-500', ring: 'ring-blue-500/20', border: 'border-blue-500' },
    { id: 'emerald', name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500', textDark: 'text-emerald-700 dark:text-emerald-400', badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10', badgeBorder: 'border-emerald-200/60 dark:border-emerald-500/20', accent: 'accent-emerald-500', ring: 'ring-emerald-500/20', border: 'border-emerald-500' },
    { id: 'sky', name: 'Sky Blue', hex: '#0ea5e9', bg: 'bg-sky-500', text: 'text-sky-500', textDark: 'text-sky-600 dark:text-sky-400', badgeBg: 'bg-sky-50 dark:bg-sky-500/10', badgeBorder: 'border-sky-200/60 dark:border-sky-500/20', accent: 'accent-sky-500', ring: 'ring-sky-500/20', border: 'border-sky-500' },
    { id: 'violet', name: 'Violet', hex: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-500', textDark: 'text-violet-600 dark:text-violet-400', badgeBg: 'bg-violet-50 dark:bg-violet-500/10', badgeBorder: 'border-violet-200/60 dark:border-violet-500/20', accent: 'accent-violet-500', ring: 'ring-violet-500/20', border: 'border-violet-500' },
    { id: 'amber', name: 'Amber', hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-500', textDark: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-50 dark:bg-amber-500/10', badgeBorder: 'border-amber-200/60 dark:border-amber-500/20', accent: 'accent-amber-500', ring: 'ring-amber-500/20', border: 'border-amber-500' },
    { id: 'rose', name: 'Rose', hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-500', textDark: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-50 dark:bg-rose-500/10', badgeBorder: 'border-rose-200/60 dark:border-rose-500/20', accent: 'accent-rose-500', ring: 'ring-rose-500/20', border: 'border-rose-500' },
    { id: 'indigo', name: 'Indigo', hex: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-500', textDark: 'text-indigo-600 dark:text-indigo-400', badgeBg: 'bg-indigo-50 dark:bg-indigo-500/10', badgeBorder: 'border-indigo-200/60 dark:border-indigo-500/20', accent: 'accent-indigo-500', ring: 'ring-indigo-500/20', border: 'border-indigo-500' }
  ];

  function getColor(colorId?: string) {
    return COLOR_OPTIONS.find(c => c.id === colorId) || COLOR_OPTIONS[0];
  }

  // Undo History Stack (Max 30 snapshots)
  let undoStack = $state<StudioCard[][]>([]);

  function pushHistory() {
    undoStack = [...undoStack.slice(-30), JSON.parse(JSON.stringify(cards))];
  }

  function undo() {
    if (undoStack.length > 0) {
      const previous = undoStack[undoStack.length - 1];
      undoStack = undoStack.slice(0, -1);
      cards = previous;
      activeCardId = null;
    }
  }

  onMount(() => {
    // On a phone the palette covers the canvas, so open it on demand only.
    if (window.matchMedia('(max-width: 767px)').matches) {
      paletteOpen = false;
    }

    const presetParam = page.url.searchParams.get('preset') || page.url.searchParams.get('template');
    if (presetParam) {
      loadSample(presetParam);
    }
    const addParam = page.url.searchParams.get('add') || page.url.searchParams.get('component');
    if (addParam) {
      const found = COMPONENT_CATALOG.find(c => c.id === addParam || c.componentName === addParam);
      if (found) {
        addCatalogComponent(found);
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          undo();
        }
      }
      if (e.key === 'Escape') {
        presetMenuOpen = false;
        activeCardId = null;
        exportModalOpen = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  let confirmClearCanvas = $state(false);
  let clearTimer: any = null;

  function clearCanvas() {
    if (!confirmClearCanvas) {
      confirmClearCanvas = true;
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        confirmClearCanvas = false;
      }, 3000);
      return;
    }
    pushHistory();
    confirmClearCanvas = false;
    cards = [];
    activeCardId = null;
    selectedPresetKey = 'blank';
    presetMenuOpen = false;
  }

  // --- Drag and Drop & Snap-to-Grid Handlers ---
  function onDragStart(e: DragEvent, id: string) {
    draggedCardId = id;
    draggedPaletteItem = null;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  function onPaletteDragStart(e: DragEvent, item: CatalogComponent) {
    draggedPaletteItem = item;
    draggedCardId = null;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', item.id);
    }
  }

  function onDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = draggedPaletteItem ? 'copy' : 'move';
    if (dragOverCardId !== id) {
      dragOverCardId = id;
    }
  }

  function onDragLeave(id: string) {
    if (dragOverCardId === id) {
      dragOverCardId = null;
    }
  }

  function onDrop(e: DragEvent, targetId?: string) {
    e.preventDefault();

    if (draggedPaletteItem) {
      addCatalogComponent(draggedPaletteItem, targetId);
      draggedPaletteItem = null;
      dragOverCardId = null;
      return;
    }

    if (!draggedCardId || (targetId && draggedCardId === targetId)) {
      draggedCardId = null;
      dragOverCardId = null;
      return;
    }

    const fromIdx = cards.findIndex(c => c.id === draggedCardId);
    const toIdx = targetId ? cards.findIndex(c => c.id === targetId) : cards.length - 1;

    if (fromIdx !== -1 && toIdx !== -1) {
      pushHistory();
      const updated = [...cards];
      const [movedCard] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, movedCard);
      cards = updated;
    }
    draggedCardId = null;
    dragOverCardId = null;
  }

  function onDragEnd() {
    draggedCardId = null;
    draggedPaletteItem = null;
    dragOverCardId = null;
  }

  // --- Component Factory ---
  // Values arrive either bare (75) or already carrying a unit ("1.2%").
  function withPercent(v: string | number): string {
    const t = String(v ?? '').trim();
    return t.endsWith('%') ? t : t + '%';
  }

  // Turn whatever a catalog component carries as defaultConfig into something
  // visible on the canvas, so a dropped component shows real sample data
  // instead of a placeholder sentence.
  function configPreview(card: StudioCard): { label: string; value: string }[] {
    const cfg = card.config ?? {};
    const skip = new Set(['sola', 'react', 'svelte', 'html', 'icon', 'color', 'variant', 'size', 'position']);
    const rows: { label: string; value: string }[] = [];
    for (const [k, v] of Object.entries(cfg)) {
      if (skip.has(k) || v == null || v === '') continue;
      let text: string;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        text = v.slice(0, 3).map((x) => (typeof x === 'object' && x ? (x.label ?? x.title ?? x.name ?? JSON.stringify(x)) : String(x))).join(', ');
        if (v.length > 3) text += ` +${v.length - 3}`;
      } else if (typeof v === 'object') {
        continue;
      } else {
        text = String(v);
      }
      rows.push({ label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase()), value: text.slice(0, 42) });
      if (rows.length >= 5) break;
    }
    return rows;
  }

  function tablePreview(card: StudioCard) {
    const cfg: any = card.config ?? {};
    const columns: string[] = Array.isArray(cfg.columns) && cfg.columns.length
      ? cfg.columns.map((c: any) => (typeof c === 'object' ? (c.label ?? c.key ?? '') : String(c))).slice(0, 4)
      : ['Name', 'Value', 'Status'];
    const source: any[] = Array.isArray(cfg.rows) ? cfg.rows : Array.isArray(cfg.items) ? cfg.items : [];
    const rows = source.slice(0, 3).map((r: any) =>
      typeof r === 'object' && r !== null
        ? columns.map((_, i) => String(Object.values(r)[i] ?? '—')).slice(0, columns.length)
        : columns.map((_, i) => (i === 0 ? String(r) : '—'))
    );
    return {
      columns,
      rows: rows.length ? rows : [
        ['cluster-eu-1', '1,204', 'Healthy'].slice(0, columns.length),
        ['cluster-us-2', '842', 'Degraded'].slice(0, columns.length)
      ]
    };
  }

  function codePreview(card: StudioCard): string {
    const cfg: any = card.config ?? {};
    return String(cfg.code ?? cfg.sola ?? cfg.snippet ?? `<script>
  let count = $state(0);
<\/script>

<span>{count}</span>`);
  }

  function createCardFromCatalog(item: CatalogComponent): StudioCard {
    const newId = 'c_' + Math.random().toString(36).substring(2, 8);
    const cat = item.category;
    let cardType = 'stat';
    let cols: 1 | 2 | 3 = 1;

    if (cat === 'Metrics & KPIs') {
      cardType = item.id === 'sola-chart' ? 'chart' : 'stat';
      cols = item.id === 'sola-chart' ? 2 : 1;
    } else if (cat === 'Gauges & Rings') {
      cardType = 'progress';
    } else if (cat === 'Controllers & Sliders') {
      cardType = item.id.includes('dial') ? 'radial_dial' : 'slider';
    } else if (cat === 'Flows & Cascades') {
      cardType = 'waterfall';
      cols = 2;
    } else if (cat === 'Lists & Feeds') {
      cardType = 'feed';
    } else if (cat === 'Matrices & Graphs') {
      cardType = 'node_graph';
      cols = 2;
    } else if (cat === 'Forms & Inputs') {
      cardType = item.id === 'sola-date-picker' ? 'datepicker' : 'form';
      cols = item.id === 'sola-date-picker' ? 1 : 2;
    } else if (cat === 'Data Display') {
      cardType = item.id === 'sola-data-table' ? 'table' : item.id === 'sola-code-block' ? 'code' : 'stat';
      cols = 2;
    } else {
      cardType = 'status';
    }

    return {
      id: newId,
      type: cardType,
      title: item.name,
      subtitle: item.tagline || item.description.slice(0, 45) + '...',
      cols,
      value: item.defaultConfig?.value || (cardType === 'progress' ? 75 : cardType === 'slider' ? 50 : 'Active'),
      delta: item.defaultConfig?.delta || '+12.4%',
      accentColor: 'emerald',
      config: item.defaultConfig
    };
  }

  function addCatalogComponent(item: CatalogComponent, targetId?: string) {
    pushHistory();
    const newCard = createCardFromCatalog(item);

    if (targetId) {
      const idx = cards.findIndex(c => c.id === targetId);
      if (idx !== -1) {
        cards = [...cards.slice(0, idx), newCard, ...cards.slice(idx)];
      } else {
        cards = [...cards, newCard];
      }
    } else {
      cards = [...cards, newCard];
    }
    activeCardId = newCard.id;
  }

  function addComponent(type: StudioCard['type']) {
    const item = COMPONENT_CATALOG.find(c => c.id.includes(type)) || COMPONENT_CATALOG[0];
    addCatalogComponent(item);
  }

  function removeCard(id: string, e?: Event) {
    if (e) e.stopPropagation();
    pushHistory();
    cards = cards.filter((c) => c.id !== id);
    if (activeCardId === id) activeCardId = null;
  }

  function duplicateCard(card: StudioCard, e?: Event) {
    if (e) e.stopPropagation();
    pushHistory();
    const copy: StudioCard = {
      ...JSON.parse(JSON.stringify(card)),
      id: 'c_' + Math.random().toString(36).substring(2, 8),
      title: card.title + ' (Copy)'
    };
    const idx = cards.findIndex((c) => c.id === card.id);
    cards = [...cards.slice(0, idx + 1), copy, ...cards.slice(idx + 1)];
    activeCardId = copy.id;
  }

  function setCols(card: StudioCard, cols: 1 | 2 | 3, e?: Event) {
    if (e) e.stopPropagation();
    pushHistory();
    card.cols = cols;
    cards = [...cards];
  }

  // --- Sola Arc AI Co-Pilot ---
  async function generateWithArc() {
    if (!arcPromptInput.trim()) return;
    isGeneratingArc = true;
    arcError = '';
    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The field is `intent`. This sent `prompt`, which the endpoint never
        // reads, so every request came back 400 with an empty-input error.
        body: JSON.stringify({
          intent: `Generate a responsive studio dashboard canvas containing 4 components based on this request: "${arcPromptInput}"`
        })
      });

      // A 400 does not throw, so this used to fall through to a silent no-op.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        arcError = body?.error ?? `Generation failed (${res.status}). Please try again.`;
        return;
      }

      // The endpoint answers with a bare array of { component, colSpan, config },
      // the same shape /demo consumes. This expected { components: [...] } with
      // an entirely different item shape, so even a successful response mapped
      // every field to its default and produced four identical placeholder tiles.
      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data.components) ? data.components : [];
      if (items.length === 0) {
        arcError = 'Arc did not return any components for that request. Try describing the panels you want.';
        return;
      }

      // Map the generator's component names onto the canvas card types.
      // The model is not consistent about the key: production answers have come
      // back with { type: "DataCard" } and local ones with
      // { component: "DataCard" }. Trusting `type` blindly put a component name
      // where a card type belongs, so no renderer branch matched and every
      // generated card fell through to the placeholder.
      const TYPE_BY_COMPONENT: Record<string, string> = {
        GaugeCard: 'progress', DataCard: 'stat', StatGrid: 'stat',
        Chart: 'chart', SolaChart: 'chart', FlowWaterfall: 'waterfall',
        Table: 'table', SolaDataTable: 'table', ListBlock: 'feed', StreamView: 'feed',
        DynamicForm: 'status', IncidentTriageMatrix: 'table',
        TactileDialCard: 'radial_dial', ProgressSteps: 'progress',
        SolaCodeBlock: 'code', MarkdownViewer: 'code'
      };
      const CARD_TYPES = new Set([
        'stat', 'progress', 'slider', 'radial_dial', 'waterfall',
        'chart', 'feed', 'table', 'code', 'status'
      ]);

      pushHistory();
      const generated: StudioCard[] = items.map((item: any, i: number) => {
        const config = item.config ?? {};
        // Either key may hold the component name; only accept a value that is
        // genuinely one of the canvas card types.
        const named = item.component ?? item.type ?? '';
        const cardType = CARD_TYPES.has(item.type) ? item.type : (TYPE_BY_COMPONENT[named] ?? 'stat');
        return {
          id: 'arc_' + i + '_' + Math.random().toString(36).substring(2, 6),
          type: cardType,
          title: config.title ?? item.title ?? named ?? 'Telemetry Node',
          subtitle: config.subtitle ?? config.subtext ?? item.subtitle ?? 'Generated from your intent',
          cols: (item.colSpan ?? item.cols ?? (i === 0 ? 2 : 1)) as 1 | 2 | 3,
          value: config.value ?? item.value ?? '—',
          delta: config.trend ?? config.delta ?? item.delta,
          accentColor: 'emerald',
          config
        };
      });
      cards = generated;
      activeCardId = generated[0].id;
      // Only clear on success — wiping the prompt after a failure loses the
      // user's words and leaves nothing to retry.
      arcPromptInput = '';
    } catch (err) {
      arcError = err instanceof Error ? err.message : 'Could not reach the intent service.';
    } finally {
      isGeneratingArc = false;
    }
  }

  // --- Code Exporter ---
  // A real .sola file built from the published components, plus how to mount it.
  // Card types the package has no component for are listed as comments.
  const generatedCode = $derived(
    exportTab === 'sola'
      ? toSolaFile(cards.map(studioCardToItem), UI_MANIFEST)
      : mountSnippet('Dashboard.sola')
  );

  function copyCode() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedCode);
      copyNotification = true;
      setTimeout(() => (copyNotification = false), 2000);
    }
  }
</script>

<svelte:head>
  <title>Sola Design Studio — Drag & Drop Canvas Builder</title>
</svelte:head>

<div class="flex flex-col w-full min-h-screen bg-[#fafafa] dark:bg-[#090d19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
  <Navbar />

  <!-- 1. Top Workspace Header -->
  <header class="sticky top-16 z-30 bg-white/80 dark:bg-[#090d19]/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 px-4 sm:px-6 py-2.5 shadow-2xs">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
      
      <!-- Left: Studio Title & Palette Toggle -->
      <div class="flex items-center gap-3">
        <!-- The page had no h1 at all: nothing announced what it was, to a
             screen reader or a search engine. Visually it is the toolbar
             label the page already implied. -->
        <h1 class="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap hidden sm:block">Studio</h1>
        <button
          onclick={() => (paletteOpen = !paletteOpen)}
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {paletteOpen ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'}"
          title={paletteOpen ? 'Hide Component Palette' : 'Show Component Palette'}>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          <span class="hidden sm:inline">Palette</span>
          <span class="px-1.5 py-0.2 bg-blue-900/50 rounded-md text-xs font-mono">{COMPONENT_CATALOG.length}</span>
        </button>

        <div class="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

        <div class="flex items-center gap-2">
          <span class="font-semibold tracking-tight text-slate-900 dark:text-white text-xs whitespace-nowrap">Canvas</span>
          <span class="px-2 py-0.5 text-xs font-mono font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200/60 dark:border-blue-500/20">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </span>
        </div>
      </div>

      <!-- Center / Templates Switcher -->
      <div class="flex items-center gap-2">
        <div class="relative">
          <button
            onclick={() => (presetMenuOpen = !presetMenuOpen)}
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer">
            <span>Templates</span>
            <svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {#if presetMenuOpen}
            <div class="absolute right-0 sm:left-0 mt-2 w-64 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-1.5 z-50 animate-[fadeSlide_120ms_ease-out]">
              <div class="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                Starter Templates
              </div>
              {#each Object.entries(samplePresets) as [key, preset]}
                <button
                  onclick={() => loadSample(key)}
                  class="w-full text-left p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer {selectedPresetKey === key ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-800 dark:text-slate-200'}">
                  <div class="font-bold">{preset.label}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 font-normal">{preset.desc}</div>
                </button>
              {/each}
              <div class="my-1 border-t border-slate-100 dark:border-white/5"></div>
              <button
                onclick={clearCanvas}
                class="w-full text-left px-3 py-2 rounded-xl text-xs {confirmClearCanvas ? 'bg-rose-500 text-white font-semibold' : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold'} transition-all cursor-pointer">
                {confirmClearCanvas ? 'Tap again to confirm clear' : 'Clear Canvas'}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right: Export Button -->
      <div class="flex items-center gap-2">
        <button
          onclick={() => (exportModalOpen = true)}
          class="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-transparent dark:border-white/10 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Export</span>
        </button>
      </div>
    </div>
  </header>

  <!-- 2. Main Studio Workspace Layout -->
  <div class="flex-1 flex w-full relative">
    
    <!-- 2A. Component palette. Below md it is a bottom sheet over the canvas —
         docking it beside a 390px viewport left the canvas a 60px sliver. -->
    {#if paletteOpen}
      <button
        class="md:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs"
        aria-label="Close component palette"
        onclick={() => (paletteOpen = false)}></button>
      <aside class="fixed md:sticky inset-x-0 bottom-0 md:inset-auto z-40 md:z-20 w-full md:w-80 shrink-0 max-h-[75vh] md:max-h-none rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-r border-slate-200/80 dark:border-white/10 bg-white/95 md:bg-white/70 dark:bg-[#090d19]/95 md:dark:bg-[#090d19]/80 backdrop-blur-xl md:h-[calc(100vh-6.5rem)] md:top-28 overflow-y-auto flex flex-col transition-all duration-200 shadow-2xl md:shadow-none">
        <!-- Sheet grabber, mobile only -->
        <div class="md:hidden pt-2 pb-1 flex justify-center shrink-0">
          <span class="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20"></span>
        </div>
        
        <!-- Palette Header & Search -->
        <div class="p-4 border-b border-slate-100 dark:border-white/5 space-y-3 sticky top-0 bg-white/95 dark:bg-[#090d19]/95 backdrop-blur-xl z-10">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono">Primitives</span>
              <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">Drag & Drop</span>
            </div>
            <button onclick={() => (paletteOpen = false)} aria-label="Close primitives palette" class="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          </div>

          <div class="relative">
            <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              bind:value={componentSearch}
              placeholder="Search {CATALOG_COUNT} components..."
              class="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
            {#if componentSearch}
              <button onclick={() => (componentSearch = '')} class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-xs">&times;</button>
            {/if}
          </div>

          <!-- Category Pills -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {#each catalogCategories as cat}
              <button
                onclick={() => (componentCategory = cat)}
                class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer {componentCategory === cat ? 'bg-blue-500 text-slate-950 font-semibold shadow-xs' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}">
                {cat}
              </button>
            {/each}
          </div>
        </div>

        <!-- Draggable Primitives List -->
        <div class="p-3 space-y-2 flex-1">
          {#if filteredCatalog.length === 0}
            <div class="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No components matching "{componentSearch}".
            </div>
          {:else}
            {#each filteredCatalog as item}
              <!-- The row only drags; the "+ Add" button inside it is the keyboard path. -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                draggable="true"
                ondragstart={(e) => onPaletteDragStart(e, item)}
                ondragend={onDragEnd}
                class="group flex items-start gap-2.5 p-2.5 bg-white dark:bg-white/[0.03] hover:bg-blue-50/60 dark:hover:bg-blue-500/10 border border-slate-200/70 dark:border-white/5 hover:border-blue-500/40 rounded-xl transition-all cursor-grab active:cursor-grabbing shadow-2xs hover:shadow-xs">
                
                <!-- Category SVG Icon -->
                <div class="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  {#if item.category === 'Metrics & KPIs'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 15 4-6 4 4 6-8"/></svg>
                  {:else if item.category === 'Controllers & Sliders'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="m12 12 4-4"/></svg>
                  {:else if item.category === 'Forms & Inputs'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {:else if item.category === 'Data Display'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                  {:else if item.category === 'Status & HUD'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {:else if item.category === 'Lists & Feeds'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  {:else if item.category === 'Matrices & Graphs'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="6" cy="18" r="3"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="6" y1="9" x2="6" y2="15"/></svg>
                  {:else}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/></svg>
                  {/if}
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-1">
                    <span class="font-semibold text-xs text-slate-900 dark:text-white truncate">{item.name}</span>
                    <button
                      onclick={() => addCatalogComponent(item)}
                      class="text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-500 font-semibold px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-500/20 cursor-pointer">
                      + Add
                    </button>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[68ch]">{item.tagline || item.description}</p>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </aside>
    {/if}

    <!-- 2B. Central Interactive Live Canvas -->
    <main id="main-content"
      ondragover={(e) => onDragOver(e, 'canvas-root')}
      ondrop={(e) => onDrop(e)}
      class="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      
      <!-- Sola Arc Generative Prompt Bar (Top of Canvas) -->
      <div class="w-full bg-white dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-2 sm:p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div class="flex items-center gap-2 px-2 shrink-0">
          <div class="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>
          </div>
          <span class="text-xs font-mono font-semibold text-slate-900 dark:text-white">Arc</span>
        </div>

        <input
          type="text"
          bind:value={arcPromptInput}
          onkeydown={(e) => e.key === 'Enter' && generateWithArc()}
          placeholder="Describe any component or layout (e.g. 'Realtime revenue waterfall and p99 latency gauge')..."
          class="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none font-sans"
        />

        <button
          onclick={generateWithArc}
          disabled={isGeneratingArc || !arcPromptInput.trim()}
          class="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs shadow-blue-500/20">
          {#if isGeneratingArc}
            <span class="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            <span>Synthesizing...</span>
          {:else}
            <span>Generate with Arc</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          {/if}
        </button>
      </div>

      <!-- Arc could fail with no feedback at all: the prompt was cleared and
           nothing appeared. A failure has to be visible and recoverable. -->
      {#if arcError}
        <div
          role="alert"
          class="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-3">
          <svg class="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16.5v.5"/></svg>
          <div class="flex-1">
            <p class="text-sm text-rose-900 dark:text-rose-200 max-w-[68ch]">{arcError}</p>
            <p class="text-xs text-rose-700/80 dark:text-rose-300/70 mt-0.5 max-w-[68ch]">Your prompt is still in the box — edit it and try again.</p>
          </div>
          <button
            type="button"
            onclick={() => (arcError = '')}
            aria-label="Dismiss error"
            class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 p-1 rounded-lg cursor-pointer">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      {/if}

      <!-- Canvas Grid State -->
      {#if cards.length === 0}
        <div class="bg-white dark:bg-[#0f172a]/70 backdrop-blur-xl border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white mb-1">Canvas is empty</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5">Drag any component from the left palette or type a prompt for Sola Arc.</p>
          <div class="flex items-center gap-2">
            <button
              onclick={() => addComponent('stat')}
              class="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
              + Add Metric Tile
            </button>
            <button
              onclick={() => loadSample('general')}
              class="px-4 py-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
              Load Sample Dashboard
            </button>
          </div>
        </div>
      {:else}
        <!-- Responsive Drag-and-Drop Snap Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {#each cards as card (card.id)}
            {@const c = getColor(card.accentColor)}
            <!-- A card holds inputs and buttons, so it is not itself a button; focus on any of them selects it. -->
            <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
            <div
              draggable="true"
              ondragstart={(e) => onDragStart(e, card.id)}
              ondragover={(e) => onDragOver(e, card.id)}
              ondragleave={() => onDragLeave(card.id)}
              ondrop={(e) => onDrop(e, card.id)}
              ondragend={onDragEnd}
              onclick={() => (activeCardId = card.id)}
              onfocusin={() => (activeCardId = card.id)}
              class="{card.cols === 3 ? 'lg:col-span-3 md:col-span-2' : card.cols === 2 ? 'md:col-span-2' : 'col-span-1'} bg-white dark:bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl border transition-all duration-150 p-5 shadow-xs relative group flex flex-col justify-between select-none cursor-pointer {activeCardId === card.id ? `${c.border} ring-2 ${c.ring} shadow-md` : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm'} {dragOverCardId === card.id ? `scale-[1.01] ${c.border} ring-2 ${c.ring} bg-slate-50/50 dark:bg-white/5` : ''}">
              
              <!-- Card Controls Bar (Header) -->
              <div class="flex items-center justify-between gap-2 mb-3">
                
                <!-- Left Title & Drag Grip -->
                <div class="flex items-center gap-2 min-w-0">
                  <div class="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white p-0.5 rounded transition-colors" title="Drag to snap position">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{card.title}</h4>
                    {#if card.subtitle}
                      <p class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[68ch]">{card.subtitle}</p>
                    {/if}
                  </div>
                </div>

                <!-- Right Inline Quick Controls -->
                <div class="flex items-center gap-1">
                  <!-- Width Span Pills -->
                  <div class="flex items-center bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg border border-slate-200/60 dark:border-white/10 text-xs font-mono font-semibold">
                    <button
                      onclick={(e) => setCols(card, 1, e)}
                      class="px-1.5 py-0.5 rounded {card.cols === 1 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}">1x</button>
                    <button
                      onclick={(e) => setCols(card, 2, e)}
                      class="px-1.5 py-0.5 rounded {card.cols === 2 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}">2x</button>
                    <button
                      onclick={(e) => setCols(card, 3, e)}
                      class="px-1.5 py-0.5 rounded {card.cols === 3 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}">3x</button>
                  </div>

                  <!-- Duplicate -->
                  <button
                    onclick={(e) => duplicateCard(card, e)}
                    class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Duplicate Card">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>

                  <!-- Remove -->
                  <button
                    onclick={(e) => removeCard(card.id, e)}
                    class="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                    title="Delete Card">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              <!-- Card Body / Visual Rendering -->
              <div class="my-2">
                {#if card.type === 'stat'}
                  <div class="flex items-baseline justify-between">
                    <span class="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">{card.value}</span>
                    {#if card.delta}
                      <span class="px-2 py-0.5 rounded-md text-xs font-mono font-semibold {c.badgeBg} {c.textDark} {c.badgeBorder}">{card.delta}</span>
                    {/if}
                  </div>
                  <div class="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                    <span>Direct editable value</span>
                    <span class="{c.textDark} font-bold">Zero-VDOM</span>
                  </div>

                {:else if card.type === 'progress'}
                  <div class="flex items-center gap-6 py-2">
                    <div class="relative w-16 h-16 shrink-0">
                      <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="3" class="text-slate-100 dark:text-white/5"/>
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="{Number(card.value)}, 100" stroke-linecap="round" class="{c.text}"/>
                      </svg>
                      <span class="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold">{withPercent(card.value)}</span>
                    </div>
                    <div class="space-y-1.5 flex-1">
                      <div class="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                        <span>Completion</span>
                        <span class="{c.textDark} font-bold">> 70%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        aria-label="Completion"
                        bind:value={card.value}
                        class="w-full {c.accent} cursor-pointer h-1.5 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none" />
                    </div>
                  </div>

                {:else if card.type === 'slider'}
                  <div class="space-y-3 py-2">
                    <div class="flex justify-between items-center font-mono">
                      <span class="text-2xl font-black text-slate-900 dark:text-white">{withPercent(card.value)}</span>
                      <span class="text-xs {c.textDark} font-semibold">Live Signal</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      aria-label="Live signal value"
                      bind:value={card.value}
                      class="w-full {c.accent} cursor-pointer h-2 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none" />
                    <div class="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                      <span>0% (Min)</span>
                      <span>50% (Mid)</span>
                      <span>100% (Max)</span>
                    </div>
                  </div>

                {:else if card.type === 'radial_dial'}
                  <div class="flex flex-col items-center justify-center py-2 space-y-2">
                    <div class="relative w-24 h-24 flex items-center justify-center">
                      <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="6" class="text-slate-100 dark:text-white/5" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="{(Number(card.value) / 100) * 251.2} 251.2" class="{c.text} transition-all duration-75" />
                      </svg>
                      <div class="absolute inset-0 flex flex-col items-center justify-center font-mono">
                        <span class="text-lg font-bold text-slate-900 dark:text-white">{card.value}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Val</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      aria-label="Dial value"
                      bind:value={card.value}
                      class="w-32 {c.accent} cursor-pointer h-1.5 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none" />
                  </div>

                {:else if card.type === 'waterfall'}
                  <div class="space-y-2 py-1">
                    {#if card.config && card.config.bars}
                      {#each card.config.bars as bar}
                        <div class="flex items-center gap-2 text-xs font-mono">
                          <span class="w-24 truncate text-slate-500 dark:text-slate-400">{bar.name}</span>
                          <div class="flex-1 h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                            <div class="{c.bg} rounded-full h-full" style="width: {Math.min(100, Math.max(10, bar.val))}%"></div>
                          </div>
                          <span class="w-12 text-right font-bold {bar.val >= 0 ? c.textDark : 'text-rose-500'}">{bar.d}</span>
                        </div>
                      {/each}
                    {/if}
                  </div>

                {:else if card.type === 'chart'}
                  <div class="space-y-2 py-1">
                    <div class="flex items-baseline justify-between font-mono">
                      <span class="text-2xl font-black text-slate-900 dark:text-white">{card.value}</span>
                      <span class="text-xs font-semibold {c.textDark} px-2 py-0.5 rounded {c.badgeBg}">Direct DOM</span>
                    </div>
                    <div class="h-16 flex items-end gap-1.5 pt-2">
                      {#each [40, 25, 60, 45, 80, 55, 90, 70, 85, 65, 95, 75] as height, idx}
                        <div class="flex-1 {c.bg} rounded-t transition-all" style="height: {height}%;"></div>
                      {/each}
                    </div>
                  </div>

                {:else if card.type === 'feed'}
                  <div class="space-y-1.5 py-1 text-xs">
                    <div class="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <span class="font-semibold text-slate-800 dark:text-slate-200">Cluster Sync</span>
                      <span class="text-xs font-mono {c.textDark}">12ms ago</span>
                    </div>
                    <div class="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <span class="font-semibold text-slate-800 dark:text-slate-200">Edge Ingress P99</span>
                      <span class="text-xs font-mono {c.textDark}">Nominal</span>
                    </div>
                  </div>

                {:else if card.type === 'table'}
                  <div class="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/5">
                    <table class="w-full text-xs">
                      <thead class="bg-slate-50 dark:bg-white/[0.02]">
                        <tr>
                          {#each tablePreview(card).columns as col}
                            <th class="text-left font-semibold text-slate-600 dark:text-slate-300 px-2.5 py-1.5">{col}</th>
                          {/each}
                        </tr>
                      </thead>
                      <tbody>
                        {#each tablePreview(card).rows as row}
                          <tr class="border-t border-slate-100 dark:border-white/5">
                            {#each row as cell}
                              <td class="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 font-mono">{cell}</td>
                            {/each}
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>

                {:else if card.type === 'code'}
                  <pre class="p-3 rounded-xl bg-slate-900 dark:bg-black/40 overflow-x-auto"><code class="text-xs font-mono text-slate-100">{codePreview(card)}</code></pre>

                {:else}
                  <!-- Every other catalog component landed here and rendered a
                       title plus a stock sentence, so most of the palette showed
                       no data at all once dropped. The mock data was already on
                       the card as `config`; this surfaces it. -->
                  <div class="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5 space-y-1.5">
                    {#each configPreview(card) as row}
                      <div class="flex items-baseline justify-between gap-3 text-xs">
                        <span class="text-slate-500 dark:text-slate-400 shrink-0">{row.label}</span>
                        <span class="font-mono text-slate-800 dark:text-slate-200 text-right truncate">{row.value}</span>
                      </div>
                    {:else}
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full {c.bg}"></span>
                        <span class="font-semibold text-xs text-slate-900 dark:text-white">{card.title}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>

            </div>
          {/each}
        </div>
      {/if}
    </main>

    <!-- 2C. Properties inspector — a bottom sheet on phones, docked from md up. -->
    {#if activeCard}
      <aside class="fixed md:sticky inset-x-0 bottom-0 md:inset-auto z-40 md:z-20 w-full md:w-80 shrink-0 max-h-[75vh] md:max-h-none rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l border-slate-200/80 dark:border-white/10 bg-white/95 md:bg-white/70 dark:bg-[#090d19]/95 md:dark:bg-[#090d19]/80 backdrop-blur-xl md:h-[calc(100vh-6.5rem)] md:top-28 overflow-y-auto p-4 flex flex-col transition-all duration-200 shadow-2xl md:shadow-none">
        
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            <h3 class="font-semibold text-xs uppercase tracking-wider text-slate-900 dark:text-white font-mono">Properties</h3>
          </div>
          <button
            onclick={() => (activeCardId = null)}
            class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs cursor-pointer">
            &times;
          </button>
        </div>

        <div class="space-y-3.5 text-xs pt-3">
          <!-- Active Card Badge -->
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 flex items-center justify-between">
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Selected Node</span>
            <span class="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{activeCard.type}</span>
          </div>

          <!-- Title -->
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              bind:value={activeCard.title}
              class="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:border-blue-500 text-slate-900 dark:text-white outline-none" />
          </div>

          <!-- Subtitle -->
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
            <input
              type="text"
              bind:value={activeCard.subtitle}
              class="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:border-blue-500 text-slate-900 dark:text-white outline-none" />
          </div>

          <!-- Value -->
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Primary Value</label>
            <input
              type="text"
              bind:value={activeCard.value}
              class="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:border-blue-500 text-slate-900 dark:text-white outline-none font-mono" />
          </div>

          <!-- Color Accent -->
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Color Accent</label>
            <div class="grid grid-cols-6 gap-1.5 p-1.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
              {#each COLOR_OPTIONS as color}
                <button
                  onclick={() => {
                    if (activeCard) {
                      pushHistory();
                      activeCard.accentColor = color.id;
                      cards = [...cards];
                    }
                  }}
                  class="h-7 rounded-lg {color.bg} transition-all flex items-center justify-center cursor-pointer {activeCard.accentColor === color.id ? 'ring-2 ring-slate-900 dark:ring-white scale-105 shadow-xs' : 'opacity-70 hover:opacity-100 hover:scale-105'}"
                  title={color.name}>
                  {#if activeCard.accentColor === color.id}
                    <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Column Span -->
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Column Width</label>
            <div class="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/60 dark:border-white/10 font-mono text-xs">
              <button
                onclick={() => activeCard && (activeCard.cols = 1)}
                class="py-1.5 rounded-lg transition-all {activeCard.cols === 1 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">1 Col</button>
              <button
                onclick={() => activeCard && (activeCard.cols = 2)}
                class="py-1.5 rounded-lg transition-all {activeCard.cols === 2 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">2 Col</button>
              <button
                onclick={() => activeCard && (activeCard.cols = 3)}
                class="py-1.5 rounded-lg transition-all {activeCard.cols === 3 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">3 Col</button>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <button
              onclick={() => duplicateCard(activeCard)}
              class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 cursor-pointer">
              Duplicate
            </button>
            <button
              onclick={() => removeCard(activeCard.id)}
              class="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer">
              Delete Card
            </button>
          </div>
        </div>
      </aside>
    {/if}

  </div>

  <!-- 3. Export Modal -->
  {#if exportModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={() => (exportModalOpen = false)}
      class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
      
      <div
        onclick={(e) => e.stopPropagation()}
        class="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-4 animate-[scaleUp_150ms_ease-out]">
        
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
              &lt;/&gt;
            </div>
            <div>
              <h3 class="font-semibold text-sm text-slate-900 dark:text-white">Export Sola Canvas</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">Zero-VDOM native code generator</p>
            </div>
          </div>
          <button
            onclick={() => (exportModalOpen = false)}
            class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-500 text-xs flex items-center justify-center cursor-pointer">
            &times;
          </button>
        </div>

        <!-- Framework Tabs -->
        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button
            onclick={() => (exportTab = 'sola')}
            aria-pressed={exportTab === 'sola'}
            class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {exportTab === 'sola' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
            Dashboard.sola
          </button>
          <button
            onclick={() => (exportTab = 'mount')}
            aria-pressed={exportTab === 'mount'}
            class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {exportTab === 'mount' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
            Mount from JS
          </button>
        </div>

        <!-- Code Block -->
        <div class="relative">
          <pre class="bg-slate-950 text-slate-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-72 border border-white/5">{generatedCode}</pre>
          <button
            onclick={copyCode}
            class="absolute top-3 right-3 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer {copyNotification ? 'bg-blue-500 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'}">
            {copyNotification ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

      </div>
    </div>
  {/if}

</div>
