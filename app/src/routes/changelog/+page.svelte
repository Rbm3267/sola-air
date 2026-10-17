<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { CHANGELOG, GITHUB_URL, VERSIONS } from '$lib/data/site';

  let activeFilter = $state('All');

  const packageNames = [
    'All',
    ...Array.from(
      new Set(CHANGELOG.flatMap((section) => section.packages.map((p) => p.pkg)))
    )
  ];

  const filteredSections = $derived(
    activeFilter === 'All'
      ? CHANGELOG
      : CHANGELOG.map((s) => ({
          ...s,
          packages: s.packages.filter((p) => p.pkg === activeFilter)
        })).filter((s) => s.packages.length > 0)
  );

  function parseLeadTag(item: string): { tag: string | null; rest: string } {
    const m = item.match(/^\*\*([^*]+)\*\*:\s*([\s\S]+)$/);
    if (m) return { tag: m[1], rest: m[2] };
    return { tag: null, rest: item };
  }
</script>

<svelte:head>
  <title>Changelog — Sola AIR</title>
  <meta
    name="description"
    content="Release history and engineering notes across the Sola AIR packages, compiler, runtime, and editor tools."
  />
</svelte:head>

<div class="flex flex-col w-full bg-white dark:bg-[#090d19] text-slate-900 dark:text-white transition-colors duration-300 min-h-screen">
  <Navbar />

  <div class="absolute top-0 inset-x-0 h-[350px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.06),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.12),rgba(9,13,25,0))] pointer-events-none"></div>

  <main id="main-content" class="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
    <!-- Header -->
    <div class="border-b border-slate-200/80 dark:border-white/[0.06] pb-8 mb-8">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold mb-3">
        <span>sola-air {VERSIONS.solaAir} · core {VERSIONS.core} · compiler {VERSIONS.compiler} · ui {VERSIONS.ui}</span>
      </div>
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Changelog
      </h1>
      <p class="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-2 max-w-[68ch] leading-relaxed">
        Every release and fix across the Sola AIR packages, read directly from <a href="{GITHUB_URL}/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer" class="text-blue-700 dark:text-blue-400 underline font-mono text-xs">CHANGELOG.md</a> at build time.
      </p>

      <!-- Package Filter Pills -->
      <div class="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter releases by package">
        {#each packageNames as name (name)}
          <!-- No type="button": the CSS reset's [type="button"] rule ties with bg-blue-600 and
               loads later, which left the selected pill white on white. -->
          <button
            onclick={() => (activeFilter = name)}
            aria-pressed={activeFilter === name}
            class="px-3 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer border {activeFilter === name
              ? 'bg-blue-600 text-white border-blue-600 font-semibold'
              : 'bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:border-blue-500/40'}">
            {name}
          </button>
        {/each}
      </div>
    </div>

    <!-- Release Entries -->
    <div class="space-y-10">
      {#each filteredSections as section (section.id)}
        <section id={section.id} class="p-6 sm:p-8 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
            <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {section.title}
            </h2>
            {#if section.date}
              <time datetime={section.date} class="text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                {section.date}
              </time>
            {/if}
          </div>

          <div class="space-y-6">
            {#each section.packages as entry (entry.pkg)}
              <div class="space-y-2.5">
                <h3 class="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold">
                  {entry.pkg}
                </h3>
                <ul class="space-y-2 pl-4 list-disc text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {#each entry.items as item}
                    {@const parsed = parseLeadTag(item)}
                    <li class="max-w-[72ch]">
                      {#if parsed.tag}
                        <span class="font-semibold text-slate-900 dark:text-white">{parsed.tag}:</span>{' '}
                      {/if}
                      <span>{parsed.rest.replace(/`([^`]+)`/g, '$1')}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </main>
</div>
