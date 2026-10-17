<script lang="ts">
  // The site had no footer at all, which left three pages reachable from
  // nowhere: /privacy (a policy nobody could find, which a Chrome Web Store
  // listing is expected to link), /demo, and /overview — the one page actually
  // written in Sola, and so the strongest dogfooding argument the project has.
  import { GITHUB_URL, VSCODE_URL, VERSIONS, PUBLISHED_COUNT } from '$lib/data/site';

  const columns = [
    {
      heading: 'Framework',
      links: [
        { href: '/docs', label: 'Documentation' },
        { href: '/components', label: `Components (${PUBLISHED_COUNT} published)` },
        { href: '/overview', label: 'Written in Sola' }
      ]
    },
    {
      heading: 'Tools',
      links: [
        { href: '/studio', label: 'Studio' },
        { href: '/demo', label: 'Playground' },
        { href: '/demo/ai', label: 'AI Demo' },
        { href: '/preview', label: 'Browser Extension' },
        { href: VSCODE_URL, label: 'VS Code Extension', external: true }
      ]
    },
    {
      heading: 'Project',
      links: [
        { href: GITHUB_URL, label: 'GitHub', external: true },
        { href: '/privacy', label: 'Privacy' }
      ]
    }
  ];
</script>

<footer class="w-full border-t border-slate-200/80 dark:border-white/[0.06] mt-24">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      <div class="col-span-2 md:col-span-1">
        <span class="block text-sm font-semibold text-slate-900 dark:text-white">Sola AIR</span>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[30ch]">
          A zero-VDOM runtime whose UI can suggest before it is asked.
        </p>
      </div>

      {#each columns as column (column.heading)}
        <nav aria-label={column.heading}>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {column.heading}
          </h2>
          <ul class="mt-3 flex flex-col gap-2">
            {#each column.links as link (link.href)}
              <li>
                <a
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noreferrer' : undefined}
                  class="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </nav>
      {/each}
    </div>

    <div class="mt-10 pt-6 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <span class="text-sm text-slate-500 dark:text-slate-400">MIT licensed.</span>
      <!-- Each number names the package it belongs to; four bare version
           strings across the site previously read as contradictions. -->
      <span class="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
        sola-air {VERSIONS.solaAir} · core {VERSIONS.core} · compiler {VERSIONS.compiler} · ui {VERSIONS.ui}
      </span>
    </div>
  </div>
</footer>
