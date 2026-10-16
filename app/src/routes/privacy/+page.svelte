<script lang="ts">
  import { GITHUB_URL, GITHUB_REPO } from '$lib/data/site';
  import Navbar from '$lib/components/Navbar.svelte';
</script>

<svelte:head>
  <title>Privacy Policy — Sola & Sola AIR Chrome Extension</title>
  <meta name="description" content="Privacy Policy for Sola and the Sola AIR Chrome extension." />
</svelte:head>

<div class="flex flex-col w-full bg-white dark:bg-[#090d19] text-slate-900 dark:text-white transition-colors duration-300 min-h-screen">
  <Navbar />

  <!-- Ambient Glow -->
  <div class="absolute top-0 inset-x-0 h-[350px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.06),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.1),rgba(9,13,25,0))] pointer-events-none"></div>

  <main id="main-content" class="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
    <!-- Header -->
    <div class="border-b border-slate-100 dark:border-white/5 pb-8 mb-10">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-mono font-semibold mb-3">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        <span>Official Privacy Policy</span>
      </div>
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Privacy Policy
      </h1>
      <p class="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-mono mt-2 max-w-[68ch]">
        Last updated: October 16, 2026 • Applicable to Sola Platform and the Sola AIR Chrome extension
      </p>
    </div>

    <!-- Content Sections -->
    <div class="space-y-10 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
      
      <!-- Summary Box -->
      <div class="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 space-y-2">
        <h2 class="font-bold text-slate-950 dark:text-white text-base">Key Privacy Highlights</h2>
        <ul class="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <li><strong>No personal data collected:</strong> Sola does not collect, record, or monetize personal identifiers, passwords, browsing history, or website content.</li>
          <li><strong>Runs locally:</strong> Component simulation, signal reactivity, and Shadow DOM rendering occur locally on your machine.</li>
          <li><strong>AI Intent Transparency:</strong> When using optional AI features (Sola Arc / Intent Compiler), natural language queries are transmitted to Google Generative AI (Gemini API) solely to synthesize UI code and architectural responses.</li>
          <li><strong>No selling of data:</strong> We do not sell, rent, or transfer your information to third-party advertisers or data brokers.</li>
        </ul>
      </div>

      <!-- 1. Information We Collect -->
      <section class="space-y-3">
        <h2 class="text-xl font-bold text-slate-950 dark:text-white tracking-tight">1. Information We Collect</h2>
        <p>
          The Sola platform and the Sola AIR Chrome extension are built to collect as little as possible:
        </p>
        <ul class="list-disc list-inside pl-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
          <li>We do not collect names, email addresses, phone numbers, or account profiles.</li>
          <li>We do not record keystrokes or form inputs, and we do not collect or store the contents of pages you visit.</li>
          <li>When you press Target in the extension and drag a box over part of a page, the extension reads the text inside that box in your browser to fill a preview card. That text stays on your device. It is shown on screen and copied to your clipboard only when you press Copy. It is not sent anywhere.</li>
          <li>We do not track authentication tokens, session cookies, or financial credentials.</li>
        </ul>
      </section>

      <!-- 2. AI Processing via Google Gemini API -->
      <section class="space-y-3">
        <h2 class="text-xl font-bold text-slate-950 dark:text-white tracking-tight">2. AI Processing & Third-Party Service Providers</h2>
        <p>
          Sola provides optional generative AI assistance (Sola Arc and Generative Intent Compiler). When you submit a prompt to Sola Arc:
        </p>
        <ul class="list-disc list-inside pl-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
          <li>Your prompt text is transmitted via secure HTTPS to Google's Generative Language API (<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs">generativelanguage.googleapis.com</code>) to generate component ASTs and technical solutions.</li>
          <li>No personal data or browsing telemetry is attached to AI requests.</li>
          <li>AI queries are stateless and not used by Sola for persistent user profiling.</li>
        </ul>
      </section>

      <!-- 3. Local Device Storage -->
      <section class="space-y-3">
        <h2 class="text-xl font-bold text-slate-950 dark:text-white tracking-tight">3. Local Device Storage</h2>
        <p>
          The extension and web application utilize standard <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs text-slate-800 dark:text-slate-200">localStorage</code> and Chrome <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs text-slate-800 dark:text-slate-200">storage.local</code> APIs exclusively to store your personal workspace preferences:
        </p>
        <ul class="list-disc list-inside pl-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
          <li>User interface layout configurations (canvas card positions, active column widths).</li>
          <li>Selected visual themes (Light / Dark mode preference).</li>
          <li>Locally authored component templates.</li>
        </ul>
      </section>

      <!-- 4. Chrome Extension Permissions -->
      <section class="space-y-4">
        <h2 class="text-xl font-bold text-slate-950 dark:text-white tracking-tight">4. Chrome Extension Permissions</h2>
        <p>
          The Sola AIR Chrome extension declares minimal permissions in its <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs text-slate-800 dark:text-slate-200">manifest.json</code> strictly necessary for sandbox rendering:
        </p>

        <div class="divide-y divide-slate-200 dark:divide-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#0c1222]">
          <div class="p-4 space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">activeTab</span>
              <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">Current Tab Access</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 max-w-[68ch]">
              Allows mounting the Sola component preview overlay onto your current active browser tab when you explicitly trigger the action.
            </p>
          </div>

          <div class="p-4 space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">scripting</span>
              <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">Shadow DOM Isolation Injection</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 max-w-[68ch]">
              Injects the isolated Shadow DOM preview container onto the host webpage without modifying host source code.
            </p>
          </div>

          <div class="p-4 space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">sidePanel</span>
              <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">Side Panel Component Palette</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 max-w-[68ch]">
              Renders the slide-out component selection drawer in Chrome's native side panel.
            </p>
          </div>
        </div>
      </section>

      <!-- 5. Contact -->
      <section class="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
        <h2 class="text-xl font-bold text-slate-950 dark:text-white tracking-tight">5. Contact & Questions</h2>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-[68ch]">
          For questions regarding this privacy policy or Sola security architecture, review the open-source repository at <a href="{GITHUB_URL}" class="text-blue-600 dark:text-blue-400 underline font-medium" target="_blank" rel="noopener noreferrer">{GITHUB_REPO}</a>.
        </p>
      </section>

    </div>
  </main>
</div>
