<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import DataCard from '$lib/components/DataCard.svelte';
  import DynamicForm from '$lib/components/DynamicForm.svelte';
  import ListBlock from '$lib/components/ListBlock.svelte';
  import ClusterMatrix from '$lib/components/ClusterMatrix.svelte';
  import StreamView from '$lib/components/StreamView.svelte';
  import SolaMount from '$lib/components/SolaMount.svelte';
  import GaugeCardSola from '@sola-air-ui/ui/GaugeCard.sola';
  import TactileDialCardSola from '@sola-air-ui/ui/TactileDialCard.sola';
  import FlowWaterfallSola from '@sola-air-ui/ui/FlowWaterfall.sola';
  import IncidentTriageMatrixSola from '@sola-air-ui/ui/IncidentTriageMatrix.sola';
  import SolaSafeHTMLSola from '@sola-air-ui/ui/SolaSafeHTML.sola';
  import DiffAudit from '$lib/components/DiffAudit.svelte';
  import SchemaInspector from '$lib/components/SchemaInspector.svelte';
  import SentinelCapsule from '$lib/components/SentinelCapsule.svelte';
  import SolaButton from '$lib/components/SolaButton.svelte';
  import SolaDialog from '$lib/components/SolaDialog.svelte';
  import SolaTabs from '$lib/components/SolaTabs.svelte';
  import SolaTooltip from '$lib/components/SolaTooltip.svelte';
  import SolaAvatar from '$lib/components/SolaAvatar.svelte';
  import SolaSkeleton from '$lib/components/SolaSkeleton.svelte';
  import SolaSelect from '$lib/components/SolaSelect.svelte';
  import SolaDropdown from '$lib/components/SolaDropdown.svelte';
  import SolaAccordion from '$lib/components/SolaAccordion.svelte';
  import SolaCheckbox from '$lib/components/SolaCheckbox.svelte';
  import SolaRadioGroup from '$lib/components/SolaRadioGroup.svelte';
  import SolaInput from '$lib/components/SolaInput.svelte';
  import SolaTextarea from '$lib/components/SolaTextarea.svelte';
  import SolaDataTable from '$lib/components/SolaDataTable.svelte';
  import SolaPagination from '$lib/components/SolaPagination.svelte';
  import SolaEmptyState from '$lib/components/SolaEmptyState.svelte';
  import SolaPopover from '$lib/components/SolaPopover.svelte';
  import SolaDrawer from '$lib/components/SolaDrawer.svelte';
  import SolaBreadcrumb from '$lib/components/SolaBreadcrumb.svelte';
  import SolaCommandPalette from '$lib/components/SolaCommandPalette.svelte';
  import SolaCodeBlock from '$lib/components/SolaCodeBlock.svelte';
  import SolaDatePicker from '$lib/components/SolaDatePicker.svelte';
  import SolaSidebar from '$lib/components/SolaSidebar.svelte';
  import SolaChart from '$lib/components/SolaChart.svelte';
  import SolaSplitter from '$lib/components/SolaSplitter.svelte';
  import SolaContextMenu from '$lib/components/SolaContextMenu.svelte';
  import SolaFileUpload from '$lib/components/SolaFileUpload.svelte';
  import SolaKbd from '$lib/components/SolaKbd.svelte';
  import SolaHoverCard from '$lib/components/SolaHoverCard.svelte';
  import { COMPONENT_CATALOG, type CatalogComponent } from '$lib/data/componentCatalog';
  import { isPublished, PUBLISHED_COUNT, CATALOG_COUNT, VERSIONS, UI_MANIFEST } from '$lib/data/site';
  import { toSolaFile, mountComponentSnippet, previewNote, PACKAGE_EQUIVALENT } from '$lib/data/solaExport';
  import { fade, fly } from 'svelte/transition';

  import { onMount } from 'svelte';
  import { page } from '$app/state';

  let activeCategory = $state<string>('All');
  let searchQuery = $state<string>('');
  let selectedComponent = $state<CatalogComponent>(COMPONENT_CATALOG[0]);
  let codeTab = $state<'sola' | 'mount'>('sola');

  // Interactive Live Playground State
  let liveProps = $state<Record<string, any>>({ ...COMPONENT_CATALOG[0].defaultConfig });

  // Update liveProps whenever selected component changes and sync URL parameter
  function selectComponent(comp: CatalogComponent) {
    selectedComponent = comp;
    liveProps = { ...comp.defaultConfig };
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('component', comp.id);
      window.history.replaceState({}, '', url.toString());
    }
  }

  onMount(() => {
    const compParam = page.url.searchParams.get('component') || page.url.searchParams.get('id');
    if (compParam) {
      const found = COMPONENT_CATALOG.find(c => c.id === compParam || c.name.toLowerCase() === compParam.toLowerCase());
      if (found) {
        selectComponent(found);
      }
    }
  });

  // Copy Feedback State
  let copied = $state(false);
  function copyCode(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }

  const categories = [
    'All',
    'Metrics & KPIs',
    'Gauges & Rings',
    'Controllers & Sliders',
    'Flows & Cascades',
    'Lists & Feeds',
    'Matrices & Graphs',
    'Forms & Inputs',
    'Status & HUD'
  ];

  const filteredComponents = $derived(
    COMPONENT_CATALOG.filter(item => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    })
  );

  // Generated from what @sola-air-ui/ui really exports, never hand-written:
  // a published component gets a real .sola file or mount call with only the
  // props it declares; a site preview says plainly that there is nothing to install.
  const activeCodeSnippet = $derived.by(() => {
    const name = selectedComponent.componentName;
    if (!isPublished(selectedComponent)) return previewNote(name, UI_MANIFEST);
    return codeTab === 'sola'
      ? toSolaFile([{ component: name, props: liveProps }], UI_MANIFEST)
      : mountComponentSnippet(name, liveProps, UI_MANIFEST);
  });

  const catalogPublishedCount = COMPONENT_CATALOG.filter(isPublished).length;
</script>

<svelte:head>
  <title>Component Catalog — Sola Design System</title>
</svelte:head>

<div class="min-h-screen bg-[#fafafa] dark:bg-[#090d19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
  <Navbar />

  <main id="main-content" class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8">
    
    <!-- Hero Header -->
    <header class="flex flex-col gap-4 border-b border-slate-900/[0.03] dark:border-white/[0.04] pb-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-mono font-semibold mb-2 shadow-2xs">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Sola Component Catalog</span>
          </div>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Foundational UI Building Blocks
          </h1>
          <p class="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-2xl mt-1 leading-relaxed">
            Components for showing, monitoring and editing data. Use them in a side project or a company dashboard.
          </p>
        </div>

        <!-- Search Input -->
        <div class="w-full md:w-80 relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input 
            type="text" 
            bind:value={searchQuery}
            placeholder="Search component catalog..."
            class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs transition-all"
          />
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        {#each categories as category}
          <button 
            onclick={() => activeCategory = category}
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs {activeCategory === category ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}">
            {category}
          </button>
        {/each}
      </div>
    </header>

    <!-- Standardized 2-Column Catalog & Inspector Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Left Column: Component List Directory (4 cols) -->
      <div class="lg:col-span-4 flex flex-col gap-3">
        <div class="flex items-center justify-between px-1 text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
          <span>CATALOG ({filteredComponents.length})</span>
          <span>{catalogPublishedCount} of {PUBLISHED_COUNT} package components shown</span>
        </div>

        <div class="flex flex-col gap-2.5 max-h-[750px] overflow-y-auto pr-1">
          {#each filteredComponents as comp (comp.id)}
            <button 
              onclick={() => selectComponent(comp)}
              class="w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-2 cursor-pointer shadow-2xs group {selectedComponent.id === comp.id ? 'bg-white dark:bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.08]' }">
              
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {selectedComponent.id === comp.id ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}"></span>
                  <span class="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {comp.name}
                  </span>
                </div>
                <!-- A reader needs to know whether they can install this today
                     or whether it only exists in this catalog. -->
                {#if isPublished(comp)}
                  <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20">
                    Published
                  </span>
                {:else}
                  <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    Preview
                  </span>
                {/if}
              </div>

              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed max-w-[68ch]">
                {comp.description}
              </p>

              <div class="flex items-center justify-between pt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span class="text-blue-600 dark:text-blue-400 font-bold">{comp.category}</span>
                <span>.{comp.componentName}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Right Column: Interactive Stage & Code Generator (8 cols) -->
      <div class="lg:col-span-8 flex flex-col gap-6">
        
        <!-- Component Header & Actions -->
        <div class="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <span>{selectedComponent.category}</span>
              <span>•</span>
              <span class="text-slate-500 dark:text-slate-400">{selectedComponent.componentName}.sola</span>
            </div>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {selectedComponent.name}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[68ch]">
              {selectedComponent.tagline}
            </p>
          </div>

          <!-- Open in Studio Action Button -->
          <a 
            href="/studio?add={selectedComponent.id}" 
            class="px-5 py-2.5 rounded-xl bg-slate-950 dark:bg-blue-600 text-white dark:text-white hover:bg-slate-800 dark:hover:bg-blue-500 font-semibold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0">
            <span>Drop in Studio</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>

        <!-- Live Interactive Stage Container -->
        <div class="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              <h3 class="text-xs font-semibold font-mono text-slate-900 dark:text-white uppercase tracking-wider">
                Live Interactive Stage
              </h3>
            </div>
            <span class="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-500/20">
              Compiled DOM
            </span>
          </div>

          <!-- Dynamic Component Mount -->
          <div class="min-h-[220px] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#090d19] border border-slate-100 dark:border-white/5 rounded-2xl w-full">
            {#if selectedComponent.componentName === 'DataCard'}
              <div class="w-full max-w-sm">
                <DataCard config={liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'GaugeCard'}
              <div class="w-full max-w-sm">
                {#key JSON.stringify(liveProps)}
                  <SolaMount component={GaugeCardSola} props={liveProps} />
                {/key}
              </div>
            {:else if selectedComponent.componentName === 'TactileDialCard'}
              <div class="w-full max-w-sm">
                {#key JSON.stringify(liveProps)}
                  <SolaMount component={TactileDialCardSola} props={liveProps} />
                {/key}
              </div>
            {:else if selectedComponent.componentName === 'FlowWaterfall'}
              <div class="w-full">
                {#key JSON.stringify(liveProps)}
                  <SolaMount component={FlowWaterfallSola} props={liveProps} />
                {/key}
              </div>
            {:else if selectedComponent.componentName === 'ListBlock'}
              <div class="w-full">
                <ListBlock config={liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'DynamicForm'}
              <div class="w-full max-w-md">
                <DynamicForm config={liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'ClusterMatrix'}
              <div class="w-full">
                <ClusterMatrix config={liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'IncidentTriageMatrix'}
              <div class="w-full">
                {#key JSON.stringify(liveProps)}
                  <SolaMount component={IncidentTriageMatrixSola} props={liveProps} />
                {/key}
              </div>
            {:else if selectedComponent.componentName === 'StreamView'}
              <div class="w-full">
                <StreamView config={liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'DiffAudit'}
              <div class="w-full">
                <DiffAudit config={liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'SchemaInspector'}
              <div class="w-full">
                <SchemaInspector config={liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'SentinelCapsule'}
              <div class="w-full max-w-lg">
                <SentinelCapsule {...liveProps} />
              </div>
            {:else if selectedComponent.componentName === 'SolaButton'}
              <div class="w-full flex flex-wrap items-center justify-center gap-3">
                <SolaButton variant={liveProps.variant || 'primary'} size={liveProps.size || 'default'} label={liveProps.label || 'Button'} loading={liveProps.loading} disabled={liveProps.disabled} />
                <SolaButton variant="secondary" size={liveProps.size || 'default'} label="Secondary" />
                <SolaButton variant="ghost" size={liveProps.size || 'default'} label="Ghost" />
                <SolaButton variant="destructive" size={liveProps.size || 'default'} label="Delete" />
                <SolaButton variant="outline" size={liveProps.size || 'default'} label="Outline" />
              </div>
            {:else if selectedComponent.componentName === 'SolaDialog'}
              <div class="w-full flex flex-col items-center gap-4">
                <SolaButton variant="primary" label="Open Dialog" onclick={() => liveProps.open = true} />
                <SolaDialog open={liveProps.open} title={liveProps.title || 'Dialog'} description={liveProps.description || ''} onclose={() => liveProps.open = false} />
              </div>
            {:else if selectedComponent.componentName === 'SolaTabs'}
              <div class="w-full space-y-6">
                <div>
                  <p class="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider max-w-[68ch]">Underline</p>
                  <SolaTabs variant="underline" tabs={liveProps.tabs || []} activeTab={liveProps.activeTab || ''} />
                </div>
                <div>
                  <p class="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider max-w-[68ch]">Pill</p>
                  <SolaTabs variant="pill" tabs={liveProps.tabs || []} activeTab={liveProps.activeTab || ''} />
                </div>
                <div>
                  <p class="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider max-w-[68ch]">Segmented Control</p>
                  <SolaTabs variant="segment" tabs={liveProps.tabs || []} activeTab={liveProps.activeTab || ''} />
                </div>
              </div>
            {:else if selectedComponent.componentName === 'SolaTooltip'}
              <div class="w-full flex items-center justify-center gap-6 py-8">
                <SolaTooltip text="Top tooltip" position="top">
                  <SolaButton variant="secondary" label="Top" />
                </SolaTooltip>
                <SolaTooltip text="Bottom tooltip" position="bottom">
                  <SolaButton variant="secondary" label="Bottom" />
                </SolaTooltip>
                <SolaTooltip text="Left tooltip" position="left">
                  <SolaButton variant="secondary" label="Left" />
                </SolaTooltip>
                <SolaTooltip text="Right tooltip" position="right">
                  <SolaButton variant="secondary" label="Right" />
                </SolaTooltip>
              </div>
            {:else if selectedComponent.componentName === 'SolaAvatar'}
              <div class="w-full flex flex-wrap items-end justify-center gap-4">
                <SolaAvatar initials="AB" size="xs" status="online" />
                <SolaAvatar initials="CD" size="sm" status="busy" />
                <SolaAvatar initials={liveProps.initials || 'JD'} size={liveProps.size || 'default'} status={liveProps.status || 'online'} shape={liveProps.shape || 'circle'} />
                <SolaAvatar initials="EF" size="lg" status="away" />
                <SolaAvatar initials="GH" size="xl" status="offline" />
              </div>
            {:else if selectedComponent.componentName === 'SolaSkeleton'}
              <div class="w-full max-w-sm space-y-4">
                <SolaSkeleton variant={liveProps.variant || 'card'} count={liveProps.count || 1} animate={liveProps.animate !== false} />
              </div>
            {:else if selectedComponent.componentName === 'SolaSelect'}
              <div class="w-full max-w-xs">
                <SolaSelect options={liveProps.options || []} value={liveProps.value || ''} placeholder={liveProps.placeholder || 'Select...'} searchable={liveProps.searchable !== false} />
              </div>
            {:else if selectedComponent.componentName === 'SolaDropdown'}
              <div class="w-full flex justify-center py-4">
                <SolaDropdown items={liveProps.items || []} position={liveProps.position || 'bottom-left'} />
              </div>
            {:else if selectedComponent.componentName === 'SolaAccordion'}
              <div class="w-full max-w-md">
                <SolaAccordion items={liveProps.items || []} variant={liveProps.variant || 'separated'} multiple={liveProps.multiple !== false} />
              </div>
            {:else if selectedComponent.componentName === 'SolaCheckbox'}
              <div class="w-full flex flex-col gap-3 max-w-xs">
                <SolaCheckbox checked={liveProps.checked} label={liveProps.label || 'Checkbox'} indeterminate={liveProps.indeterminate} disabled={liveProps.disabled} />
                <SolaCheckbox checked={true} label="Notifications enabled" />
                <SolaCheckbox checked={false} label="Marketing emails" />
                <SolaCheckbox indeterminate={true} label="Select all (indeterminate)" />
              </div>
            {:else if selectedComponent.componentName === 'SolaRadioGroup'}
              <div class="w-full max-w-sm">
                <SolaRadioGroup options={liveProps.options || []} value={liveProps.value || ''} variant={liveProps.variant || 'card'} />
              </div>
            {:else if selectedComponent.componentName === 'SolaInput'}
              <div class="w-full max-w-sm space-y-4">
                <SolaInput label={liveProps.label || 'Email'} type={liveProps.type || 'text'} placeholder={liveProps.placeholder || ''} hint={liveProps.hint || ''} error={liveProps.error || ''} />
                <SolaInput label="Password" type="password" placeholder="Enter password" />
                <SolaInput label="With Error" type="text" value="bad-value" error="This field is invalid" />
              </div>
            {:else if selectedComponent.componentName === 'SolaTextarea'}
              <div class="w-full max-w-sm">
                <SolaTextarea label={liveProps.label || 'Description'} placeholder={liveProps.placeholder || 'Enter text...'} rows={liveProps.rows || 4} maxLength={liveProps.maxLength || 500} />
              </div>
            {:else if selectedComponent.componentName === 'SolaDataTable'}
              <div class="w-full">
                <SolaDataTable columns={liveProps.columns || []} rows={liveProps.rows || []} selectable={liveProps.selectable} striped={liveProps.striped} compact={liveProps.compact} />
              </div>
            {:else if selectedComponent.componentName === 'SolaPagination'}
              <div class="w-full flex justify-center py-4">
                <SolaPagination currentPage={liveProps.currentPage || 3} totalPages={liveProps.totalPages || 12} siblingCount={liveProps.siblingCount || 1} />
              </div>
            {:else if selectedComponent.componentName === 'SolaEmptyState'}
              <div class="w-full max-w-sm">
                <SolaEmptyState title={liveProps.title || 'No results'} description={liveProps.description || ''} icon={liveProps.icon || 'search'} actionLabel={liveProps.actionLabel || ''} />
              </div>
            {:else if selectedComponent.componentName === 'SolaPopover'}
              <div class="w-full flex justify-center py-8">
                <SolaPopover position={liveProps.position || 'bottom'}>
                  {#snippet trigger()}<SolaButton variant="secondary" label="Click to open Popover" />{/snippet}
                  <div class="p-4 text-sm text-slate-600 dark:text-slate-300">
                    <p class="font-semibold text-slate-900 dark:text-white mb-1">Popover Content</p>
                    <p>This is a floating panel that appears on click.</p>
                  </div>
                </SolaPopover>
              </div>
            {:else if selectedComponent.componentName === 'SolaDrawer'}
              <div class="w-full flex flex-col items-center gap-4">
                <SolaButton variant="primary" label="Open Drawer" onclick={() => liveProps.open = true} />
                <SolaDrawer open={liveProps.open} position={liveProps.position || 'right'} title={liveProps.title || 'Detail View'} width={liveProps.width || '400px'} onclose={() => liveProps.open = false}>
                  <div class="p-4 text-sm text-slate-600 dark:text-slate-300 space-y-3">
                    <p>Drawer panel content goes here. Supports left, right, and bottom positions.</p>
                    <SolaInput label="Name" placeholder="Enter name" />
                    <SolaButton variant="primary" label="Save" />
                  </div>
                </SolaDrawer>
              </div>
            {:else if selectedComponent.componentName === 'SolaBreadcrumb'}
              <div class="w-full">
                <SolaBreadcrumb items={liveProps.items || []} />
              </div>
            {:else if selectedComponent.componentName === 'SolaCommandPalette'}
              <div class="w-full flex flex-col items-center gap-4">
                <SolaButton variant="secondary" label="Open Command Palette (Cmd+K)" onclick={() => liveProps.open = true} />
                <SolaCommandPalette open={liveProps.open} commands={liveProps.commands || []} placeholder={liveProps.placeholder || 'Search commands...'} onclose={() => liveProps.open = false} />
              </div>
            {:else if selectedComponent.componentName === 'SolaCodeBlock'}
              <div class="w-full">
                <SolaCodeBlock code={liveProps.code || ''} language={liveProps.language || 'typescript'} title={liveProps.title || ''} showLineNumbers={liveProps.showLineNumbers !== false} copyable={liveProps.copyable !== false} />
              </div>
            {:else if selectedComponent.componentName === 'SolaDatePicker'}
              <div class="w-full flex justify-center py-6">
                <SolaDatePicker range={liveProps.range} rangeValue={liveProps.rangeValue || { start: '2026-08-01', end: '2026-08-30' }} value={liveProps.value || ''} label={liveProps.label || 'Select Date'} />
              </div>
            {:else if selectedComponent.componentName === 'SolaSidebar'}
              <div class="w-full max-w-sm h-96 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
                <SolaSidebar collapsed={liveProps.collapsed} activeId={liveProps.activeId || 'dashboard'} />
              </div>
            {:else if selectedComponent.componentName === 'SolaChart'}
              <div class="w-full">
                <SolaChart type={liveProps.type || 'area'} color={liveProps.color || 'indigo'} title={liveProps.title || 'Signal Telemetry'} subtitle={liveProps.subtitle || 'Real-time throughput'} height={liveProps.height || 180} />
              </div>
            {:else if selectedComponent.componentName === 'SolaSplitter'}
              <div class="w-full">
                <SolaSplitter direction={liveProps.direction || 'horizontal'} initialSplit={liveProps.initialSplit || 50} />
              </div>
            {:else if selectedComponent.componentName === 'SolaContextMenu'}
              <div class="w-full">
                <SolaContextMenu />
              </div>
            {:else if selectedComponent.componentName === 'SolaFileUpload'}
              <div class="w-full max-w-md">
                <SolaFileUpload accept={liveProps.accept || '.json, .csv, .ts'} maxSizeMb={liveProps.maxSizeMb || 10} />
              </div>
            {:else if selectedComponent.componentName === 'SolaKbd'}
              <div class="w-full flex flex-wrap items-center justify-center gap-4 py-8">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">Search:</span>
                  <SolaKbd keys={['⌘', 'K']} size="md" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">Save:</span>
                  <SolaKbd keys={['Ctrl', 'S']} size="md" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">Terminal:</span>
                  <SolaKbd keys={['⌃', '`']} size="sm" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">Reload:</span>
                  <SolaKbd keys={['⇧', '⌘', 'R']} size="lg" />
                </div>
              </div>
            {:else if selectedComponent.componentName === 'SolaHoverCard'}
              <div class="w-full flex flex-col items-center justify-center gap-4 py-12">
                <p class="text-sm text-slate-600 dark:text-slate-300 max-w-[68ch]">
                  Hover over the handle to preview metadata:
                  <SolaHoverCard handle="@sola-architecture" title="Sola Architecture" description="Zero-VDOM, direct reactive graph bindings with no diffing between a signal write and the DOM." />
                </p>
              </div>
            {:else if selectedComponent.componentName === 'SolaSafeHTML'}
              <div class="w-full max-w-md">
                {#key JSON.stringify(liveProps)}
                  <SolaMount component={SolaSafeHTMLSola} props={liveProps} />
                {/key}
              </div>
            {:else}
              <!-- New components show schema-driven preview card -->
              <div class="w-full max-w-md flex flex-col items-center gap-5 py-6">
                <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
                  <svg class="w-7 h-7 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                </div>
                <div class="text-center">
                  <h4 class="font-semibold text-sm text-slate-900 dark:text-white">{selectedComponent.name}</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">{selectedComponent.description}</p>
                </div>
                <div class="w-full bg-slate-950 rounded-xl p-4 text-xs font-mono text-blue-300 overflow-x-auto">
                  <pre><code>{previewNote(selectedComponent.componentName, UI_MANIFEST)}</code></pre>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-mono font-semibold border border-slate-200 dark:border-white/10">
                    Site preview
                  </span>
                  {#if PACKAGE_EQUIVALENT[selectedComponent.componentName]}
                    <span class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-semibold border border-emerald-200 dark:border-emerald-500/20">
                      Package has {PACKAGE_EQUIVALENT[selectedComponent.componentName]}
                    </span>
                  {/if}
                </div>
              </div>
            {/if}
          </div>

          <!-- Live Props Customizer / Playground Controls -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
            <h4 class="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Component Properties Playground
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {#if liveProps.title !== undefined}
                <div>
                  <label for="live-prop-title" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Title Prop</label>
                  <input 
                    type="text" 
                    id="live-prop-title" bind:value={liveProps.title} 
                    class="w-full bg-white dark:bg-[#090d19] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              {/if}

              {#if liveProps.value !== undefined}
                <div>
                  <label for="live-prop-value" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Value Prop</label>
                  <input 
                    type="text" 
                    id="live-prop-value" bind:value={liveProps.value} 
                    class="w-full bg-white dark:bg-[#090d19] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              {/if}

              {#if liveProps.trend !== undefined}
                <div>
                  <label for="live-prop-trend" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Trend Badge</label>
                  <input 
                    type="text" 
                    id="live-prop-trend" bind:value={liveProps.trend} 
                    class="w-full bg-white dark:bg-[#090d19] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              {/if}

              {#if liveProps.percentage !== undefined}
                <div>
                  <label for="live-prop-percentage" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Percentage ({liveProps.percentage}%)
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    id="live-prop-percentage" bind:value={liveProps.percentage} 
                    class="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              {/if}

              {#if liveProps.color !== undefined}
                <div>
                  <label for="live-prop-color" class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Accent Theme</label>
                  <select 
                    id="live-prop-color" bind:value={liveProps.color}
                    class="w-full bg-white dark:bg-[#090d19] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500">
                    <option value="emerald">Emerald</option>
                    <option value="sky">Sky Blue</option>
                    <option value="amber">Amber</option>
                    <option value="violet">Violet</option>
                    <option value="rose">Rose</option>
                  </select>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Multi-Target Code Generator Box -->
        <div class="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
            <h3 class="text-xs font-semibold font-mono text-slate-900 dark:text-white uppercase tracking-wider">
              Component Code Export
            </h3>

            <!-- Code Framework Tabs -->
            <div class="flex items-center bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl text-xs font-mono">
              <button 
                onclick={() => codeTab = 'sola'} 
                aria-pressed={codeTab === 'sola'}
                class="px-3 py-1 rounded-lg transition-all cursor-pointer font-bold {codeTab === 'sola' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'}">
                .sola
              </button>
              <button 
                onclick={() => codeTab = 'mount'} 
                aria-pressed={codeTab === 'mount'}
                class="px-3 py-1 rounded-lg transition-all cursor-pointer font-bold {codeTab === 'mount' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'}">
                Mount from JS
              </button>
            </div>
          </div>

          <!-- Code Snippet Output Window -->
          <div class="relative group">
            <pre class="bg-slate-950 text-blue-300 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed shadow-inner border border-slate-800"><code>{activeCodeSnippet}</code></pre>
            <button 
              onclick={() => copyCode(activeCodeSnippet)}
              class="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
              {#if copied}
                <svg class="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="text-blue-400">Copied!</span>
              {:else}
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy</span>
              {/if}
            </button>
          </div>
        </div>

      </div>

    </div>

  </main>
</div>
