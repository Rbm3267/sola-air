<script lang="ts">
  // The site had no footer at all, which left three pages reachable from
  // nowhere: /privacy (a policy nobody could find, which a Chrome Web Store
  // listing is expected to link), /demo, and /overview — the one page actually
  // written in Sola, and so the strongest dogfooding argument the project has.
  //
  // Kept short on purpose: four groups of at most three links, so no column
  // runs longer than the others and the footer stays one compact band.
  import { GITHUB_URL, VSCODE_URL, OPEN_VSX_URL, VERSIONS } from '$lib/data/site';

  const versions = [
    ['sola-air', VERSIONS.solaAir],
    ['core', VERSIONS.core],
    ['compiler', VERSIONS.compiler],
    ['ui', VERSIONS.ui]
  ] as const;

  const columns = [
    {
      heading: 'Learn',
      links: [
        { href: '/docs', label: 'Documentation' },
        { href: '/components', label: 'Components' },
        { href: '/overview', label: 'Written in Sola' }
      ]
    },
    {
      heading: 'Try',
      links: [
        { href: '/studio', label: 'Studio' },
        { href: '/demo', label: 'Playground' },
        { href: '/demo/ai', label: 'AI Demo' }
      ]
    },
    {
      heading: 'Extensions',
      links: [
        { href: '/preview', label: 'Chrome' },
        { href: VSCODE_URL, label: 'VS Code', external: true },
        { href: OPEN_VSX_URL, label: 'Open VSX', external: true }
      ]
    },
    {
      heading: 'Project',
      links: [
        { href: '/changelog', label: 'Changelog' },
        { href: GITHUB_URL, label: 'GitHub', external: true },
        { href: '/privacy', label: 'Privacy' }
      ]
    }
  ];
</script>

<footer class="w-full border-t border-slate-200/80 dark:border-white/[0.06] mt-16">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] gap-x-6 gap-y-6">
      <div class="col-span-2 sm:col-span-4 lg:col-span-1">
        <span class="block text-sm font-semibold text-slate-900 dark:text-white">Sola AIR</span>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-snug max-w-[34ch]">
          A zero-VDOM runtime whose UI can suggest before it is asked.
        </p>
      </div>

      {#each columns as column (column.heading)}
        <nav aria-label={column.heading}>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {column.heading}
          </h2>
          <ul class="mt-2 flex flex-col gap-1.5">
            {#each column.links as link (link.href)}
              <li>
                <a
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noreferrer' : undefined}
                  aria-label={link.label === 'Chrome' ? 'Chrome extension' : link.label === 'VS Code' ? 'VS Code extension' : undefined}
                  class="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </nav>
      {/each}
    </div>

    <div class="mt-6 pt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <span>MIT licensed</span>
      <!-- Each number names the package it belongs to; four bare version
           strings across the site previously read as contradictions. -->
      <span class="font-mono tabular-nums">
        {#each versions as [pkg, version], i (pkg)}{#if i > 0}{' · '}{/if}<span class="whitespace-nowrap">{pkg} {version}</span>{/each}
      </span>
    </div>
  </div>
</footer>
