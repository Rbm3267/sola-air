<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import InteractiveHero from '$lib/components/InteractiveHero.svelte';
  import CompilerWorkbench from '$lib/components/CompilerWorkbench.svelte';
</script>

<svelte:head>
  <title>Sola AIR — UI that suggests before it is asked</title>
  <meta name="description" content="Add an ambient companion to an app you already have. Sola Sentinel notices when someone hesitates on a form, and a closed Shadow DOM shell keeps its styles apart from yours." />
</svelte:head>

<div class="flex flex-col w-full bg-white dark:bg-[#090d19] text-slate-900 dark:text-white transition-colors duration-300 min-h-screen">
  <Navbar />

  <!-- Luminous Solar + Air Radial Bloom Background -->
  <div class="absolute top-0 inset-x-0 h-[680px] bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(56,189,248,0.12),rgba(37,99,235,0.06)_45%,rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(56,189,248,0.14),rgba(9,13,25,0))] pointer-events-none"></div>

  <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col pt-4 w-full">
    <main id="main-content" class="contents">
      <!-- 1. Hero + 2. Live Sentinel Form Demo + 3. Install Command -->
      <InteractiveHero />

      <!-- 4. Live 3-Pane Compiler X-Ray Workbench -->
      <CompilerWorkbench />
    </main>
  </div>
</div>
