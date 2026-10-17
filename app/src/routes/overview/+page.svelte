<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import SolaMount from '$lib/components/SolaMount.svelte';
  import mount from '$lib/pages/Overview.sola';
  import { GITHUB_URL, PUBLISHED_COUNT } from '$lib/data/site';

  const SOURCE_URL = `${GITHUB_URL}/blob/main/app/src/lib/pages/Overview.sola`;
</script>

<svelte:head>
  <title>Written in Sola — Sola AIR</title>
  <meta name="description" content="A page of this site compiled from a single .sola component, with its source linked." />
</svelte:head>

<div class="flex flex-col w-full min-h-screen bg-[#fafafa] dark:bg-[#090d19] text-slate-900 dark:text-slate-100">
  <Navbar />
  <main id="main-content" class="contents">
  <SolaMount component={mount} props={{ primitiveCount: PUBLISHED_COUNT }} />

  <footer class="max-w-[1140px] w-full mx-auto px-6 pb-16 pt-4">
    <p class="text-sm text-slate-600 dark:text-slate-400 max-w-[68ch]">
      This page is compiled from one <code class="font-mono text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded">.sola</code> file.
      <a href={SOURCE_URL} target="_blank" rel="noreferrer" class="font-semibold text-blue-700 dark:text-blue-400 hover:underline">Read its source</a>
      and compare it with what the browser is running.
    </p>
  </footer>
  </main>
</div>
