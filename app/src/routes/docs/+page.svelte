<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import DataCard from '$lib/components/DataCard.svelte';
  // Every runnable sample below comes from one module that e2e/docs-snippets.spec.ts
  // compiles and mounts in a browser, so a broken sample fails the build, not the reader.
  import {
    syntaxExample,
    signalExample,
    derivedExample,
    effectExample,
    mountExample,
    intentMacroExample,
    dataMacroExample,
    persistDockExample,
    shellBootstrapExample,
    busBasicsExample,
    busComponentExample,
    busConfigExample,
    busHostExample
  } from '$lib/data/docsSnippets';
  import { VERSIONS, FACTS } from '$lib/data/site';

  let activeSection = $state('quickstart');
  let askQuery = $state('');
  let askLoading = $state(false);
  let aiAnswer = $state('');
  let isMobileNavOpen = $state(false);
  let packageManager = $state<'npm' | 'pnpm' | 'yarn' | 'bun'>('npm');

  // Live Docs Sandbox State
  let sandboxTitle = $state('Active Cluster Telemetry');
  let sandboxValue = $state('1,420 RPS');

  // Copy Feedback State
  let copiedId = $state('');
  function handleCopy(text: string, id: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      copiedId = id;
      setTimeout(() => {
        if (copiedId === id) copiedId = '';
      }, 2000);
    }
  }

  const groups = [
    {
      name: 'Getting Started',
      items: [
        { id: 'quickstart', title: 'Installation & Setup', badge: `v${VERSIONS.core}` },
        { id: 'syntax', title: 'The .sola Format' }
      ]
    },
    {
      name: 'Core Concepts',
      items: [
        { id: 'api-reactivity', title: 'Reactivity & Signals' },
        { id: 'api-macros', title: 'Compiler Macros' },
        { id: 'engine', title: 'Zero-VDOM Engine' }
      ]
    },
    {
      name: 'Deployment & Adapters',
      items: [
        { id: 'host-embedding', title: 'React & Portal Embeds' },
        { id: 'persistent-shell', title: 'Persistent Shell' },
        { id: 'event-bus', title: 'Event Bus' },
        { id: 'relay-saas', title: 'Sola Relay SaaS' },
        { id: 'mcp', title: 'MCP Server' },
        { id: 'llm-spec', title: 'AI Prompting Spec' }
      ]
    }
  ];

  // Flat list for Next / Prev navigation
  const allItems = $derived(groups.flatMap(g => g.items));
  const currentIndex = $derived(allItems.findIndex(i => i.id === activeSection));
  const currentItem = $derived(allItems[currentIndex] || allItems[0]);
  const currentGroup = $derived(groups.find(g => g.items.some(i => i.id === activeSection)) || groups[0]);
  const prevItem = $derived(currentIndex > 0 ? allItems[currentIndex - 1] : null);
  const nextItem = $derived(currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null);

  async function askSolaAi() {
    if (!askQuery.trim() || askLoading) return;
    askLoading = true;
    aiAnswer = '';

    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intent: `You are the Sola Framework Technical Assistant. Answer concisely with working code examples: ${askQuery}` 
        })
      });

      const data = await res.json();
      if (typeof data === 'string') {
        aiAnswer = data;
      } else if (data.components) {
        aiAnswer = "Generated Component Architecture:\n\n" + JSON.stringify(data.components, null, 2);
      } else {
        aiAnswer = JSON.stringify(data, null, 2);
      }
    } catch {
      aiAnswer = "Sola AIR components compile directly into native reactive DOM nodes via @sola-air-ui/compiler. Use createSignal() for local state, $intent for ambient generative resolution, and $data for live remote polling without virtual DOM overhead.";
    } finally {
      askLoading = false;
    }
  }

  // Dynamic CLI code by package manager
  const scaffoldCmds = {
    npm: 'npm create sola@latest my-sola-app',
    pnpm: 'pnpm create sola my-sola-app',
    yarn: 'yarn create sola my-sola-app',
    bun: 'bun create sola my-sola-app'
  };

  const installCmds = {
    npm: 'npm install @sola-air-ui/core @sola-air-ui/compiler @sola-air-ui/vite-plugin-sola',
    pnpm: 'pnpm add @sola-air-ui/core @sola-air-ui/compiler @sola-air-ui/vite-plugin-sola',
    yarn: 'yarn add @sola-air-ui/core @sola-air-ui/compiler @sola-air-ui/vite-plugin-sola',
    bun: 'bun add @sola-air-ui/core @sola-air-ui/compiler @sola-air-ui/vite-plugin-sola'
  };

  const viteConfigCode = `import { defineConfig } from 'vite';
import sola from '@sola-air-ui/vite-plugin-sola';

export default defineConfig({
  plugins: [sola()]
});`;



  const dockerfileCode = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "relay-server.js"]`;

  const nginxCode = `server {
    listen 443 ssl http2;
    server_name sola-relay.internal.net;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}`;

  const relayJsonCode = `{
  "port": 8080,
  "datasources": {
    "postgres": {
      "host": "db.internal.net",
      "user": "sola_reader",
      "password": "\${DB_PASSWORD}"
    }
  }
}`;

  const engineExample = `// Sola Native Output (Zero Virtual DOM overhead)
export default function mount(target, props) {
  const el = document.createElement('div');
  el.className = 'sola-card-s8f9';
  
  const textNode = document.createTextNode(props.title);
  el.appendChild(textNode);
  
  target.appendChild(el);
  return () => target.removeChild(el);
}`;

  const llmSystemPrompt = `You are a specialist in the Sola component format (.sola).
Sola components compile single-file markup into pure zero-VDOM native DOM nodes.
- Use <script> with $state(val) and $derived(expr)
- Use $persist(key, initial) instead of $state when a value must survive page loads and sync across tabs
- Use $on('type', handler) to react to a bus event, and let x = $lastEvent('type') for its latest payload as a reactive value
- Use HTML template with {expression} and standard HTML elements; attach handlers with lowercase attributes such as onclick
- Use <style> for scoped CSS; :global(selector) opts a selector out of scoping, for markup the component does not own
- Use $intent("...") for ambient generative nodes
- Use $data("uri://...") for live signal bindings`;

  // With a bundler (ESM path)
  const bundlerEmbedCode = `// --- Step 1: install packages ---
// npm install @sola-air-ui/core @sola-air-ui/compiler

// --- Step 2: pre-compile your .sola component to JS with the CLI ---
// (run in your build script or as a prebuild step)
// npx sola compile src/components/MyWidget.sola --out src/components/MyWidget.js

// --- Step 3: import and mount inside any TypeScript/JS source file ---
import { createSignal, createEffect } from '@sola-air-ui/core';
import mountMyWidget from './MyWidget.js'; // compiled Sola component

// Mount into any DOM container
const container = document.getElementById('sola-root');
const cleanup = mountMyWidget(container, {
  title: 'My Widget',
  value: 42
});

// Tear down when the component unmounts
export function onDestroy() { cleanup(); }

// --- Shared reactive state (outside a component) ---
export const [count, setCount] = createSignal(0);
createEffect(() => {
  console.log('count changed:', count());
});`;

  // Without a bundler (IIFE path)
  const noBundlerEmbedCode = `// --- Step 1: load sola-core globally ---
// Serve sola-core.iife.min.js and include it before your component script:
// <script src="/scripts/sola-core.iife.min.js"><` + `/script>
// This makes window.SolaCore available on the page.

// --- Step 2: pre-compile your .sola component to an IIFE ---
// sola compile MyWidget.sola --target iife --export-name MyWidget --out my-widget.js
// Serve my-widget.js. It expects window.SolaCore to already be present
// and registers itself as window['MyWidget'].

// --- Step 3: mount from any page script or controller ---
var container = document.getElementById('sola-widget-root');

// Props map directly to the component's exported let declarations.
var cleanup = window.MyWidget(container, {
  title: 'My Widget',
  value: 42
});

// Optional: tear down reactivity when the container is removed
// cleanup();`;

  const mcpInstallCode = `# Add to your Claude Code MCP config (~/.claude/claude_desktop_config.json
# or via: claude mcp add sola-mcp)

{
  "mcpServers": {
    "sola": {
      "command": "npx",
      "args": ["-y", "@sola-air-ui/mcp"]
    }
  }
}`;

  const mcpToolsCode = `// Tools exposed to the AI agent:

// 1. compile_component — compile a .sola source string to JS + CSS
//    Input:  { source: string, filename?: string }
//    Output: { ok: true, js: string, css: string | null }
//         or { ok: false, error: string }

// 2. validate_component — check a .sola source for errors without full output
//    Input:  { source: string }
//    Output: { valid: boolean, errors: string[] }

// 3. sola://docs resource — full Sola API reference as plain text
//    Read by the agent automatically to understand .sola syntax,
//    runes ($state, $derived, $intent), template directives, and compiler output.`;

  const mcpAgentCode = `// When an AI agent (Claude Code, Cursor, Copilot) has the Sola MCP active,
// it can author and compile .sola components inline without leaving the editor.

// Example agent workflow:
// 1. Agent reads sola://docs to learn the syntax
// 2. Agent writes a .sola component based on the task
// 3. Agent calls compile_component({ source, filename: 'Widget.sola' })
// 4. Agent writes the returned JS to disk or wires it into the build
// 5. If compilation fails, error message includes file + line:col

// The MCP server runs as a local stdio process — no network, no auth.
// It uses the same @sola-air-ui/compiler under the hood, so output is
// identical to running: sola compile Widget.sola`;

  const reactEmbedCode = `import React, { useEffect, useRef } from 'react';
import mountMyWidget from './MyWidget.js'; // pre-compiled .sola component

export function SolaWidget({ title, value }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Mount Sola component directly into React DOM container
    const unmount = mountMyWidget(containerRef.current, { title, value });
    return () => unmount();
  }, [title, value]);

  return <div ref={containerRef} className="sola-container" />;
}`;
</script>

<svelte:head>
  <title>{currentItem.title} - Sola Documentation</title>
</svelte:head>

<div class="flex flex-col w-full min-h-screen overflow-x-hidden bg-[#fafafa] dark:bg-[#090d19] text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans">
  <Navbar />

  <!-- Mobile Sticky Header (Tailwind Style) -->
  <div class="lg:hidden sticky top-16 z-30 bg-white/90 dark:bg-[#090d19]/90 backdrop-blur-xl border-b border-slate-900/[0.03] dark:border-white/[0.04] px-4 py-3 flex items-center justify-between shadow-2xs">
    <div class="flex items-center gap-2 text-xs font-mono">
      <span class="text-slate-500 dark:text-slate-400">{currentGroup.name}</span>
      <span class="text-slate-300 dark:text-slate-700">/</span>
      <span class="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{currentItem.title}</span>
    </div>
    <button 
      onclick={() => (isMobileNavOpen = !isMobileNavOpen)}
      class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer">
      <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      <span>Menu</span>
    </button>
  </div>

  <!-- Mobile Navigation Slide Drawer -->
  {#if isMobileNavOpen}
    <div class="lg:hidden bg-white/95 dark:bg-[#090d19]/95 border-b border-slate-900/[0.04] dark:border-white/[0.06] p-5 space-y-6 shadow-2xl">
      {#each groups as grp}
        <div>
          <h5 class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{grp.name}</h5>
          <div class="space-y-1">
            {#each grp.items as item}
              <button 
                onclick={() => { activeSection = item.id; isMobileNavOpen = false; }}
                class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between {activeSection === item.id ? 'bg-blue-500/10 text-blue-800 dark:text-blue-400 font-semibold border border-blue-500/25' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}">
                <span>{item.title}</span>
                {#if item.badge}
                  <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-800 dark:text-blue-300 font-semibold">{item.badge}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Main 3-Column Docs Layout Container (Tailwind CSS style) -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-10 w-full items-start">
    
    <!-- 1. Left Sidebar Navigation (Tailwind Rail style) -->
    <aside class="hidden lg:block w-64 shrink-0 sticky top-24 space-y-8 pr-4">
      
      <!-- Quick Search Bar -->
      <div class="relative">
        <input 
          type="text"
          bind:value={askQuery}
          onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); askSolaAi(); } }}
          placeholder="Quick search... ⌘K"
          class="w-full pl-8 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-400 shadow-2xs transition-all"
        />
        <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-2.5 top-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      <!-- Navigation Hierarchy -->
      {#each groups as grp}
        <div class="space-y-2">
          <h5 class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 px-3">
            {grp.name}
          </h5>
          <ul class="border-l border-slate-200 dark:border-white/10 space-y-1">
            {#each grp.items as item}
              <li>
                <button 
                  onclick={() => activeSection = item.id}
                  class="w-full text-left pl-4 pr-3 py-1.5 text-xs transition-all duration-150 cursor-pointer flex items-center justify-between border-l -ml-px {activeSection === item.id ? 'border-blue-500 font-semibold text-blue-700 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 rounded-r-lg' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400'}">
                  <span class="truncate">{item.title}</span>
                  {#if item.badge}
                    <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-800 dark:text-blue-300 font-semibold">{item.badge}</span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}

      <!-- Documentation Meta Box -->
      <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs space-y-2">
        <div class="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>Sola AIR v{VERSIONS.solaAir}</span>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">
          Single-file zero-VDOM reactivity for the ambient web.
        </p>
      </div>
    </aside>

    <!-- 2. Center Article Reader (Tailwind Prose & Code Blocks) -->
    <main id="main-content" class="flex-1 w-full min-w-0 space-y-12">
      
      <!-- AI Answer Callout (if active) -->
      {#if aiAnswer}
        <div class="p-6 rounded-3xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs font-mono text-slate-900 dark:text-blue-200 leading-relaxed whitespace-pre-wrap relative shadow-xs">
          <button 
            onclick={() => (aiAnswer = '')}
            class="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-base font-bold cursor-pointer">
            &times;
          </button>
          <div class="flex items-center gap-2 mb-3 text-blue-800 dark:text-blue-400 font-semibold uppercase tracking-wider text-xs">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" stroke-dasharray="4 4"/><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            <span>Sola Arc Intelligence Response</span>
          </div>
          {aiAnswer}
        </div>
      {/if}

      <!-- ================= 1. QUICKSTART ================= -->
      {#if activeSection === 'quickstart'}
        <article class="space-y-8">
          <!-- Article Header -->
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Getting Started</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Installation & Setup
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Get started with Sola by creating a new standalone project or integrating the compiler into your existing Vite setup.
            </p>
          </header>

          <!-- Tailwind Style Callout Note -->
          <div class="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 p-4 rounded-r-2xl space-y-1">
            <h4 class="text-xs font-semibold text-blue-950 dark:text-blue-400 font-mono">Zero-VDOM Runtime Note</h4>
            <p class="text-xs text-blue-900 dark:text-blue-300 leading-relaxed max-w-[68ch]">
              Sola compiles directly to standard ES modules without virtual DOM reconciliation. No runtime react-dom or large framework wrappers required.
            </p>
          </div>

          <!-- Step 1: Scaffold -->
          <section class="space-y-4 pt-2">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Creating a new project</span>
            </h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 max-w-[68ch]">
              The fastest way to get started is with the official CLI initializer, which sets up Vite, UnoCSS, and Sola compiler hooks automatically:
            </p>

            <!-- Code Window (Tailwind Style) -->
            <div class="rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                  <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span class="w-3 h-3 rounded-full bg-blue-500/80"></span>
                  <span class="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2">Terminal</span>
                </div>
                <!-- Package Manager Tabs -->
                <div class="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs font-mono">
                  {#each (['npm', 'pnpm', 'yarn', 'bun'] as const) as pm}
                    <button 
                      onclick={() => packageManager = pm}
                      class="px-2 py-0.5 rounded transition-all cursor-pointer {packageManager === pm ? 'bg-blue-500 text-white font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-white'}">
                      {pm}
                    </button>
                  {/each}
                </div>
              </div>
              <div class="p-5 flex items-center justify-between font-mono text-xs text-blue-400 overflow-x-auto">
                <code>$ {scaffoldCmds[packageManager]}</code>
                <button 
                  onclick={() => handleCopy(scaffoldCmds[packageManager], 'scaffold')}
                  class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 ml-4">
                  {#if copiedId === 'scaffold'}
                    <span class="text-xs text-blue-400 font-semibold px-1">Copied!</span>
                  {:else}
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {/if}
                </button>
              </div>
            </div>
          </section>

          <!-- Step 2: Existing Vite Project -->
          <section class="space-y-4 pt-4">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Adding to an existing Vite app</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 max-w-[68ch]">
              If you already have a Vite application, install the Sola core runtime and Vite compiler plugin:
            </p>

            <div class="rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Terminal</span>
                <span class="text-xs font-mono text-slate-500">{packageManager}</span>
              </div>
              <div class="p-5 flex items-center justify-between font-mono text-xs text-blue-400 overflow-x-auto">
                <code>$ {installCmds[packageManager]}</code>
                <button 
                  onclick={() => handleCopy(installCmds[packageManager], 'install')}
                  class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 ml-4">
                  {#if copiedId === 'install'}
                    <span class="text-xs text-blue-400 font-semibold px-1">Copied!</span>
                  {:else}
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {/if}
                </button>
              </div>
            </div>
          </section>

          <!-- Step 3: Vite Plugin Config -->
          <section class="space-y-4 pt-4">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Configuring Vite</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 max-w-[68ch]">
              Add the Sola plugin to your <code>vite.config.ts</code>:
            </p>

            <div class="rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-mono text-slate-500 dark:text-slate-400">vite.config.ts</span>
                <span class="text-xs font-mono text-slate-500">TypeScript</span>
              </div>
              <div class="p-5 relative font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
                <pre><code>{viteConfigCode}</code></pre>
                <button 
                  onclick={() => handleCopy(viteConfigCode, 'vite-cfg')}
                  class="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer">
                  {#if copiedId === 'vite-cfg'}
                    <span class="text-xs text-blue-400 font-semibold px-1">Copied!</span>
                  {:else}
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {/if}
                </button>
              </div>
            </div>
          </section>
        </article>

      <!-- ================= 2. SYNTAX ================= -->
      {:else if activeSection === 'syntax'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Component Architecture</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              The .sola Format
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Anatomy of single-file components compiling into reactive native DOM nodes.
            </p>
          </header>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs">
              <span class="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 uppercase">Part 1</span>
              <h4 class="font-semibold font-mono text-slate-900 dark:text-white text-xs mt-1 mb-1">&lt;script&gt;</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">Defines reactive signals (<code>$state</code>, <code>$derived</code>) and handlers.</p>
            </div>
            <div class="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs">
              <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">Part 2</span>
              <h4 class="font-semibold font-mono text-slate-900 dark:text-white text-xs mt-1 mb-1">HTML Template</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">Standard declarative markup with <code>&#123;expression&#125;</code> bindings.</p>
            </div>
            <div class="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs">
              <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">Part 3</span>
              <h4 class="font-semibold font-mono text-slate-900 dark:text-white text-xs mt-1 mb-1">&lt;style&gt;</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">Auto-scoped CSS hashed at compile time with 0 global collisions.</p>
            </div>
          </div>

          <!-- Code Window -->
          <div class="rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
            <div class="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <span class="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <img src="/sola-file-icon.png" alt="" width="16" height="16" class="w-4 h-4" />MetricCard.sola
              </span>
              <span class="text-xs font-mono text-slate-500">Single-File Component</span>
            </div>
            <div class="p-5 relative font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{syntaxExample}</code></pre>
              <button 
                onclick={() => handleCopy(syntaxExample, 'syntax')}
                class="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer">
                {#if copiedId === 'syntax'}
                  <span class="text-xs text-blue-400 font-semibold px-1">Copied!</span>
                {:else}
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {/if}
              </button>
            </div>
          </div>

          <!-- Interactive Live Sandbox -->
          <div class="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                <h3 class="text-xs font-semibold font-mono text-slate-900 dark:text-white uppercase tracking-wider">Live Synchronized Sandbox</h3>
              </div>
              <span class="text-xs font-mono bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">Native DOM</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Card Title Prop</label>
                  <input 
                    type="text" 
                    bind:value={sandboxTitle}
                    class="w-full bg-slate-50 dark:bg-[#090d19] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Card Value Prop</label>
                  <input 
                    type="text" 
                    bind:value={sandboxValue}
                    class="w-full bg-slate-50 dark:bg-[#090d19] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div class="flex items-center justify-center p-4 border border-slate-100 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-[#090d19]">
                <DataCard config={{ title: sandboxTitle, value: sandboxValue, trend: "+14.8% vs baseline", icon: "activity" }} />
              </div>
            </div>
          </div>
        </article>

      <!-- ================= 3. REACTIVITY ================= -->
      {:else if activeSection === 'api-reactivity'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Core Concepts</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Reactivity & Signals
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Fine-grained state tracking primitives designed for zero overhead.
            </p>
          </header>

          <section class="space-y-3">
            <h3 class="text-base font-bold font-mono text-slate-900 dark:text-white">createSignal(initialValue)</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              Creates a local reactive state tuple. Invoking the getter registers subscriptions; calling the setter notifies dependencies.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{signalExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-base font-bold font-mono text-slate-900 dark:text-white">createDerived(fn)</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              Creates a memoized computation that automatically re-evaluates only when its dependencies change.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{derivedExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-base font-bold font-mono text-slate-900 dark:text-white">createEffect(callback)</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              Executes side effects and automatically reruns whenever accessed signals change.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{effectExample}</code></pre>
            </div>
          </section>
        </article>

      <!-- ================= 4. MACROS ================= -->
      {:else if activeSection === 'api-macros'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Core Concepts</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Compiler Macros
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Macros for ambient generative resolution, remote data, state that outlives a page, and events.
            </p>
          </header>

          <section class="space-y-3">
            <h3 class="text-base font-bold font-mono text-slate-900 dark:text-white">$intent(prompt, options)</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              Sends a natural-language prompt to the provider you configure with <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">configureIntent</code> at runtime and returns a signal that holds the result, with <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">.loading</code> and <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">.error</code>. Your server chooses the model; nothing is resolved at compile time.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{intentMacroExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-base font-bold font-mono text-slate-900 dark:text-white">$data(sourceUri, options)</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              Reads from a Sola Relay source (PostgreSQL, MySQL or Google Sheets) and returns a signal of <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">{"{"} loading, data, error {"}"}</code>.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{dataMacroExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-base font-bold font-mono text-slate-900 dark:text-white">$persist(key, initial, options)</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              Reads and assigns like <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$state</code>, but the value survives a page load and syncs across tabs. See <button type="button" class="underline decoration-dotted cursor-pointer" onclick={() => activeSection = 'persistent-shell'}>Persistent Shell</button>.
            </p>
          </section>

          <section class="space-y-3">
            <h3 class="text-base font-bold font-mono text-slate-900 dark:text-white">$on(type, handler) and $lastEvent(type)</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$on</code> runs a handler on every emission of a bus event, repeats included, and unsubscribes when the component is destroyed. <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">let x = $lastEvent(type)</code> is the latest payload as a reactive value. See <button type="button" class="underline decoration-dotted cursor-pointer" onclick={() => activeSection = 'event-bus'}>Event Bus</button>.
            </p>
          </section>
        </article>

      <!-- ================= 5. ENGINE ================= -->
      {:else if activeSection === 'engine'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Architecture</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Zero-VDOM Engine
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              How Sola compiles components into direct DOM operations.
            </p>
          </header>

          <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
            <pre><code>{engineExample}</code></pre>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="p-5 border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5">
              <h4 class="font-semibold text-slate-900 dark:text-white text-xs mb-1 font-mono">{FACTS.coreSizeKb} bundle</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">No third-party runtime dependencies.</p>
            </div>
            <div class="p-5 border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5">
              <h4 class="font-semibold text-slate-900 dark:text-white text-xs mb-1 font-mono">No Diff Step</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">Only the DOM nodes a changed signal owns are written to.</p>
            </div>
          </div>
        </article>

      <!-- ================= 6. HOST EMBEDDING ================= -->
      {:else if activeSection === 'host-embedding'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Deployment & Adapters</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Host Embedding
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Sola components are plain functions — mount them into any DOM container from any host framework or enterprise platform.
            </p>
          </header>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">React 19 Hook Wrapper</h3>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{reactEmbedCode}</code></pre>
            </div>
          </section>

          <section class="space-y-6">
            <div class="space-y-1">
              <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">With a Bundler (ESM)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">For environments with a build step — Vite, webpack, Rollup, esbuild, or any bundler that resolves npm packages. Install <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">@sola-air-ui/core</code>, pre-compile <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">.sola</code> files to JS with the CLI, then import and mount normally inside any TypeScript or JavaScript source file.</p>
            </div>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{bundlerEmbedCode}</code></pre>
            </div>

            <div class="space-y-1">
              <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Without a Bundler (IIFE)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">For environments with no build step — plain <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">&lt;script&gt;</code> tags, CMS platforms, portals. Load <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">sola-core.iife.min.js</code> as a global script, compile your component with <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">--target iife</code>, then mount via <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">window.ComponentName(container, props)</code>.</p>
            </div>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{noBundlerEmbedCode}</code></pre>
            </div>
          </section>
        </article>

      <!-- ================= 6b. PERSISTENT SHELL ================= -->
      {:else if activeSection === 'persistent-shell'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Deployment & Adapters</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Persistent Shell
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Keep an assistant, drawer or conversation alive across full page navigations in multi-page portals — same open state, same thread, same theme on every page.
            </p>
          </header>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">The problem</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              When every page is its own server-rendered endpoint, navigating destroys the DOM. Nothing in memory survives, so a UI that should feel continuous has to be rebuilt from stored state on each load. Two pieces make that cheap: <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$persist</code> for the state, and <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">mountShell</code> for the container.
            </p>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">1. State that outlives the page</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
              <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$persist(key, initial, options)</code> reads and assigns exactly like <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$state</code>. It hydrates synchronously, so the first paint is already correct, writes back on every change, and mirrors live to other same-origin tabs and frames.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
                <span class="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <img src="/sola-file-icon.png" alt="" width="16" height="16" class="w-4 h-4" />Dock.sola
                </span>
              </div>
              <div class="p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
                <pre><code>{persistDockExample}</code></pre>
              </div>
            </div>
            <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                  <tr><th class="px-4 py-2 font-semibold">Option</th><th class="px-4 py-2 font-semibold">Default</th><th class="px-4 py-2 font-semibold">What it does</th></tr>
                </thead>
                <tbody class="text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-white/5">
                  <tr><td class="px-4 py-2 font-mono">storage</td><td class="px-4 py-2 font-mono">'session'</td><td class="px-4 py-2">'session' survives navigation in one tab. 'local' also survives new tabs and restarts. 'memory' never persists.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">sync</td><td class="px-4 py-2 font-mono">true</td><td class="px-4 py-2">Mirror changes to other open tabs and frames.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">version</td><td class="px-4 py-2 font-mono">1</td><td class="px-4 py-2">Bump when the stored shape changes; older values are discarded.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">validate</td><td class="px-4 py-2 font-mono">—</td><td class="px-4 py-2">Reject stored or received values that don't match the expected shape.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">ttlMs</td><td class="px-4 py-2 font-mono">—</td><td class="px-4 py-2">Discard stored values older than this.</td></tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
              <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">sessionStorage</code> is per tab: a new tab starts from defaults, then live-syncs with the others. Choose <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">'local'</code> if new tabs should inherit state. If storage is blocked, the value still works in memory for that page.
            </p>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">2. A container that survives with it</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
              Load one bootstrap file on every page. <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">mountShell</code> attaches a host to <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">document.body</code> inside a Shadow DOM, so the portal's CSS can't leak in and yours can't leak out. Component styles are injected into the shadow root for you.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{shellBootstrapExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Before you ship</h3>
            <ul class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch] list-disc pl-5 space-y-2">
              <li><strong class="text-slate-900 dark:text-white">Clear on sign-out.</strong> Persisted state outlives the session. Call <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">clearPersistentState()</code> when someone signs out so the next person on a shared machine starts clean. It also resets every other open tab.</li>
              <li><strong class="text-slate-900 dark:text-white">Store little, and nothing sensitive.</strong> Keep to small, JSON-serializable UI state. No tokens, personal data or record contents; fetch those fresh on each page.</li>
              <li><strong class="text-slate-900 dark:text-white">Pass design tokens in.</strong> CSS custom properties from the portal don't cross the shadow boundary unless defined on the shadow host, so hand your token CSS to <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">css</code>.</li>
              <li><strong class="text-slate-900 dark:text-white">Debug with an open root.</strong> A closed shadow root is invisible to page scripts and to devtools queries. Use <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">shadow: 'open'</code> in development.</li>
              <li><strong class="text-slate-900 dark:text-white">No bundler?</strong> Use the IIFE builds: <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">SolaCore.mountShell</code> and <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">SolaCore.clearPersistentState</code> are on the global, and a component compiled with <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">target: 'iife'</code> is available as a global mount function.</li>
              <li><strong class="text-slate-900 dark:text-white">Keep script policy in mind.</strong> If the portal's content-security policy blocks third-party or inline scripts, serve the bootstrap from the portal's own origin.</li>
            </ul>
          </section>
        </article>

      <!-- ================= 6c. EVENT BUS ================= -->
      {:else if activeSection === 'event-bus'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Deployment & Adapters</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Event Bus
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Typed events between components, pages and tabs, with explicit rules about what is allowed to cross into or out of your app.
            </p>
          </header>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Events are not state</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              A signal drops a write that equals its current value, which is right for state. An event is different: "ask about this incident" fired twice with the same payload has to be delivered twice. That is why the bus is its own primitive, separate from <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$state</code>, <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$persist</code> and <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$intent</code>.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{busBasicsExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">In a component</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
              <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$on</code> subscribes for the life of the component. <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">$lastEvent</code> gives the latest payload as a reactive value for your markup.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{busComponentExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Configure it once</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
              Call <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">configureBus</code> at bootstrap, before any component subscribes. Everything is off until you list it.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{busConfigExample}</code></pre>
            </div>
            <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                  <tr><th class="px-4 py-2 font-semibold">Option</th><th class="px-4 py-2 font-semibold">What it does</th></tr>
                </thead>
                <tbody class="text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-white/5">
                  <tr><td class="px-4 py-2 font-mono">broadcast</td><td class="px-4 py-2">Types mirrored to other tabs. Everything else stays in this page.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">dom.in</td><td class="px-4 py-2">Host page <code class="font-mono">CustomEvent</code>s forwarded into the bus.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">dom.out</td><td class="px-4 py-2">Bus events re-dispatched as <code class="font-mono">CustomEvent</code>s on the target.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">validate / guard</td><td class="px-4 py-2">Check a payload's shape, and apply your policy. Core ships no role logic.</td></tr>
                  <tr><td class="px-4 py-2 font-mono">sticky</td><td class="px-4 py-2">Replay the last payload to a handler that registers late (see below).</td></tr>
                  <tr><td class="px-4 py-2 font-mono">onReject</td><td class="px-4 py-2">Called in this page only when an event is dropped. It carries no payload.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Talking to the host page</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
              With <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">dom.in</code> and <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">dom.out</code> the host app needs no Sola import. Both are allowlists: nothing crosses unless you name it, and a type cannot be in both lists, so a loop cannot form.
            </p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{busHostExample}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">The rules <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">createBus()</code> enforces</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">
              Anything on a page can dispatch a <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">CustomEvent</code>, and any same-origin context can post to a <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">BroadcastChannel</code>. Events that cross those boundaries are untrusted, so these mistakes throw when the bus is created instead of failing quietly later:
            </p>
            <ul class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch] list-disc pl-5 space-y-2">
              <li>A type in <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">dom.in</code> or <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">broadcast</code> needs a <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">validate</code> entry or a per-type <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">guard</code>. To accept one unchecked on purpose, write <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">validate: {"{"} type: () =&gt; true {"}"}</code> so the decision is visible in review.</li>
              <li>A type cannot be in both <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">dom.in</code> and <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">dom.out</code>.</li>
              <li><code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">sticky</code> needs a positive <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">ttlMs</code>, and a <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">session</code> sticky needs an explicit <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">consume</code>.</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Sticky events</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              A shell often mounts a moment after the event it needs, or after a navigation. A <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">sticky</code> type replays its last payload once to each handler that registers late, with <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">meta.replayed</code> set so a handler can tell. <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">store: 'memory'</code> lasts for the page; <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">store: 'session'</code> also survives a navigation in that tab. It expires after <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">ttlMs</code>.
            </p>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
              <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">consume</code> decides what a reload does. With <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">consume: true</code> the stored copy is deleted the first time it is replayed, so a one-shot handoff such as "open this in the drawer" cannot repeat on F5. The copy in memory stays until <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">ttlMs</code>, so a second component that mounts a moment later in the same page still receives it. With <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">consume: false</code> it stays available, for context several components read.
            </p>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Before you ship</h3>
            <ul class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch] list-disc pl-5 space-y-2">
              <li><strong class="text-slate-900 dark:text-white">Do not make consequential actions sticky.</strong> A replay could repeat work, such as another model call after a reload.</li>
              <li><strong class="text-slate-900 dark:text-white">Keep <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">broadcast</code> short.</strong> Anything listed there fires in every open tab, which is rarely what you want for an action.</li>
              <li><strong class="text-slate-900 dark:text-white">Treat <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">dom.out</code> payloads as public.</strong> Every script on the page can read them. Never put sensitive data in one.</li>
              <li><strong class="text-slate-900 dark:text-white">Clear on sign-out.</strong> <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">clearPersistentState()</code> also wipes sticky events, in this page and in other tabs.</li>
              <li><strong class="text-slate-900 dark:text-white">Rejections stay in the page.</strong> <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">onReject</code> is a plain callback that receives the type and the reason, never the payload, and is never forwarded to the DOM or the bus.</li>
            </ul>
          </section>
        </article>

      <!-- ================= 7. RELAY SAAS ================= -->
      {:else if activeSection === 'relay-saas'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Deployment & Adapters</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sola Relay SaaS
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Deploying Sola Relay close to private database clusters.
            </p>
          </header>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">1. Dockerfile</h3>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{dockerfileCode}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">2. Nginx Reverse Proxy</h3>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{nginxCode}</code></pre>
            </div>
          </section>
        </article>

      <!-- ================= 8. MCP SERVER ================= -->
      {:else if activeSection === 'mcp'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">AI Tooling</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              MCP Server
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              Give any MCP-compatible AI agent (Claude Code, Cursor, Copilot) direct access to the Sola compiler and API reference — no context window stuffing required.
            </p>
          </header>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Installation</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">Add <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">@sola-air-ui/mcp</code> to your Claude Code or editor MCP config. The server runs locally as a stdio process — no API keys, no network calls.</p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{mcpInstallCode}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Exposed Tools & Resources</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">The MCP server exposes two tools and one resource. An agent reads <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">sola://docs</code> to learn the syntax, then calls <code class="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">compile_component</code> to produce runnable JS.</p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{mcpToolsCode}</code></pre>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-sm font-semibold font-mono text-slate-900 dark:text-white">Agent Workflow</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">How a coding agent uses the MCP end-to-end — from reading the spec to writing compiled output to disk.</p>
            <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
              <pre><code>{mcpAgentCode}</code></pre>
            </div>
          </section>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-5 border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5">
              <h4 class="font-semibold text-slate-900 dark:text-white text-xs mb-1 font-mono">compile_component</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">Compile any .sola source to a JS ES module + scoped CSS. Returns structured JSON with line-level error details on failure.</p>
            </div>
            <div class="p-5 border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5">
              <h4 class="font-semibold text-slate-900 dark:text-white text-xs mb-1 font-mono">validate_component</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">Check a .sola source for errors without emitting the full compiled output. Useful for pre-flight checks before writing files.</p>
            </div>
            <div class="p-5 border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5">
              <h4 class="font-semibold text-slate-900 dark:text-white text-xs mb-1 font-mono">sola://docs</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal max-w-[68ch]">Full Sola API reference as plain text — template syntax, runes, compiler output format. Read once at session start.</p>
            </div>
          </div>
        </article>

      <!-- ================= 9. LLM SPEC ================= -->
      {:else if activeSection === 'llm-spec'}
        <article class="space-y-8">
          <header class="space-y-2 pb-6 border-b border-slate-900/[0.04] dark:border-white/[0.05]">
            <p class="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 max-w-[68ch]">Deployment & Adapters</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              AI Prompting Spec
            </h1>
            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-[68ch]">
              System prompt context for Claude 3.5 Sonnet, GPT-4o, and Gemini 2.5 Flash models.
            </p>
          </header>

          <div class="rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto">
            <pre><code>{llmSystemPrompt}</code></pre>
          </div>
        </article>
      {/if}

      <!-- Next / Previous Page Navigation Footer (Tailwind Style) -->
      <nav class="pt-8 border-t border-slate-900/[0.04] dark:border-white/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#if prevItem}
          <button 
            onclick={() => activeSection = prevItem.id}
            class="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/40 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-left transition-all group cursor-pointer shadow-2xs">
            <div class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <svg class="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              <span>Previous</span>
            </div>
            <div class="text-sm font-semibold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {prevItem.title}
            </div>
          </button>
        {:else}
          <div></div>
        {/if}

        {#if nextItem}
          <button 
            onclick={() => activeSection = nextItem.id}
            class="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/40 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-right transition-all group cursor-pointer shadow-2xs ml-auto w-full sm:w-auto sm:min-w-[200px]">
            <div class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
              <span>Next</span>
              <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
            <div class="text-sm font-semibold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {nextItem.title}
            </div>
          </button>
        {/if}
      </nav>

    </main>

  </div>
</div>
