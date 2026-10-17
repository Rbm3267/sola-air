#!/usr/bin/env node
// Builds skills/sola: an Agent Skill for Claude and a Gemini CLI extension that
// share one folder. Everything component-specific is generated from the repo
// (the ui manifest, the .sola sources, AGENTS.md), so the skill cannot describe
// a component or prop that does not exist.
//
//   node scripts/build-skill.mjs           write skills/sola
//   node scripts/build-skill.mjs --check   fail if skills/sola is out of date

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { readUiManifest } from './ui-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'skills', 'sola');
const CHECK = process.argv.includes('--check');

const lf = (s) => s.replace(/\r\n/g, '\n');
const read = (rel) => lf(readFileSync(path.join(ROOT, rel), 'utf8'));
const version = (dir) => JSON.parse(read(`packages/${dir}/package.json`)).version;

/** Every file the skill should contain, as relative path → contents. */
const files = new Map();
const emit = (rel, contents) => files.set(rel, lf(contents));

const versions = {
  core: version('core'),
  compiler: version('compiler'),
  ui: version('ui'),
  tokens: version('tokens'),
  mcp: version('sola-mcp')
};

// ── vendor: what scripts/preview.mjs needs to run with no install ───────────
const compilerBundle = buildSync({
  stdin: {
    contents: "export { compile } from './packages/compiler/src/index.js';\nexport { checkSource } from './packages/compiler/src/check.js';\n",
    resolveDir: ROOT,
    sourcefile: 'sola-compiler-entry.js'
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  write: false,
  legalComments: 'none',
  banner: { js: `// @sola-air-ui/compiler ${versions.compiler}, bundled with acorn and htmlparser2 for scripts/preview.mjs. Generated; do not edit.` }
});
// The compiler reads its version from ../package.json at runtime; the skill has no
// such file, so the bundle gets the version as a literal instead.
const versionRead = /(\w+)\(new URL\("\.\.\/package\.json", import\.meta\.url\), "utf8"\)/;
const bundled = compilerBundle.outputFiles[0].text;
if (!versionRead.test(bundled)) throw new Error('build-skill: the compiler no longer reads ../package.json the expected way; update the version replacement.');
emit('vendor/sola-compiler.mjs', bundled.replace(versionRead, () => JSON.stringify(JSON.stringify({ version: versions.compiler }))));

const coreBundle = buildSync({
  entryPoints: [path.join(ROOT, 'packages/core/src/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'SolaCore',
  minify: true,
  target: ['es2020'],
  write: false,
  banner: {
    js: `/* @sola-air-ui/core v${versions.core} | MIT */`
  }
});
emit('vendor/sola-core.iife.min.js', coreBundle.outputFiles[0].text);
emit('vendor/tokens.css', read('packages/tokens/src/tokens.css'));

const ui = readUiManifest(ROOT);
const uiPkg = JSON.parse(read('packages/ui/package.json'));
const components = [];
for (const [subpath, file] of Object.entries(uiPkg.exports)) {
  if (typeof file !== 'string' || !file.endsWith('.sola')) continue;
  const name = path.basename(file, '.sola');
  const source = read(`packages/ui/${file.replace(/^\.\//, '')}`);
  emit(`vendor/ui/${name}.sola`, source);
  components.push({ name, importPath: ui.subpaths[name], props: parseProps(source) });
}
components.sort((a, b) => a.name.localeCompare(b.name));
emit('vendor/ui-manifest.json', JSON.stringify(
  Object.fromEntries(components.map((c) => [c.name, { importPath: c.importPath, file: `ui/${c.name}.sola`, props: c.props.map((p) => p.name) }])),
  null, 2) + '\n');

/** `export let name = default;` → { name, def }. A default spanning lines shows as its first token. */
function parseProps(source) {
  const script = (source.match(/<script[^>]*>([\s\S]*?)<\/script>/) || [, ''])[1];
  return script.split('\n')
    .map((line) => line.match(/^\s*export\s+let\s+(\w+)(?:\s*=\s*(.*?))?;?\s*(?:\/\/\s*(.*))?$/))
    .filter(Boolean)
    .map(([, name, def = '', note = '']) => {
      let d = def.trim();
      if (/^[[{(]$/.test(d) || (d.startsWith('[') && !d.endsWith(']')) || (d.startsWith('{') && !d.endsWith('}'))) d = d[0] === '[' ? '[…]' : '{…}';
      // A prop the component checks with `typeof x === 'function'` also takes a getter,
      // so a parent can pass a signal and the component follows it. Callbacks excluded.
      const getter = !/^on[A-Z]/.test(name) && new RegExp(`typeof ${name} === ['"]function['"]`).test(source);
      return { name, def: d || 'undefined', note: [getter ? 'value or getter' : '', note.trim()].filter(Boolean).join('; ') };
    });
}

// ── reference ───────────────────────────────────────────────────────────────
const groups = [
  ['Layout', ['Canvas', 'Card', 'Stack', 'Dashboard', 'StatGrid']],
  ['Data display', ['DataCard', 'Table', 'Chart', 'GaugeCard', 'FlowWaterfall', 'IncidentTriageMatrix', 'StreamView', 'MarkdownViewer', 'HtmlViewer', 'SolaSafeHTML']],
  ['Inputs', ['Button', 'TextInput', 'Select', 'DatePicker', 'Toggle', 'TactileDialCard']],
  ['Feedback', ['Alert', 'Badge', 'Spinner', 'Toast', 'Modal']],
  ['Shell', ['LauncherDock', 'CommandPalette', 'CompanionDrawer', 'ToastHost']],
  ['AI and intent', ['IntentCard', 'IntentList', 'AmbientSuggestion', 'ConversationThread', 'ActionStrip', 'ConfidenceBadge', 'IntentSheet']]
];
const grouped = new Set(groups.flatMap(([, n]) => n));
const ungrouped = components.filter((c) => !grouped.has(c.name)).map((c) => c.name);
if (ungrouped.length) groups.push(['Other', ungrouped]);
const byName = Object.fromEntries(components.map((c) => [c.name, c]));
const esc = (s) => s.replace(/\|/g, '\\|');
let ref = `# @sola-air-ui/ui ${versions.ui}: components\n\n`;
ref += `Generated from the package by scripts/build-skill.mjs. Every component listed here exists, and every prop listed is one it declares with \`export let\`. Nothing else is accepted.\n\n`;
ref += `Import each one by its subpath, for example \`import DataCard from '@sola-air-ui/ui/data-card';\`. A prop marked "value or getter" also accepts a function, so the component follows a changing value, e.g. \`rows={() => data().rows}\`. Other props are read once at mount; pass an expression that reads a signal and the child is re-mounted when it changes.\n`;
for (const [title, names] of groups) {
  const present = names.filter((n) => byName[n]);
  if (!present.length) continue;
  ref += `\n## ${title}\n`;
  for (const n of present) {
    const c = byName[n];
    ref += `\n### ${c.name}\n\n\`import ${c.name} from '${c.importPath}';\`\n\n`;
    if (!c.props.length) { ref += 'No props; content goes in its slot.\n'; continue; }
    ref += '| Prop | Default | Note |\n|---|---|---|\n';
    for (const p of c.props) ref += `| \`${p.name}\` | \`${esc(p.def)}\` | ${esc(p.note)} |\n`;
  }
}
emit('reference/components.md', ref);
emit('reference/AGENTS.md', read('AGENTS.md'));

// ── examples (hand-written, checked by scripts/skill.test.mjs) ──────────────
for (const f of readdirSync(path.join(ROOT, 'scripts/skill-src/examples'))) {
  emit(`examples/${f}`, read(`scripts/skill-src/examples/${f}`));
}
emit('scripts/preview.mjs', read('scripts/skill-src/preview.mjs'));

// ── instructions: one body, two front doors ─────────────────────────────────
const body = read('scripts/skill-src/instructions.md')
  .replaceAll('{{UI_VERSION}}', versions.ui)
  .replaceAll('{{CORE_VERSION}}', versions.core)
  .replaceAll('{{COMPILER_VERSION}}', versions.compiler)
  .replaceAll('{{COMPONENT_COUNT}}', String(components.length))
  .replaceAll('{{COMPONENT_LIST}}', groups.map(([t, ns]) => `- ${t}: ${ns.filter((n) => byName[n]).join(', ')}`).join('\n'));

emit('SKILL.md', `---
name: sola-ui
description: Design and build user interfaces with Sola AIR (.sola single-file components and the @sola-air-ui/ui component library), and render a live HTML preview of the design. Use when the user asks for a UI, dashboard, form, portal widget or shell in Sola, or mentions .sola files or @sola-air-ui packages.
---

${body.replaceAll('<SKILL_DIR>', '<skill-dir>')}`);

emit('GEMINI.md', `# Sola AIR design skill

${body.replaceAll('<SKILL_DIR>', '~/.gemini/extensions/sola-ui')}`);

emit('gemini-extension.json', JSON.stringify({
  name: 'sola-ui',
  version: versions.ui,
  description: 'Design with Sola AIR components (.sola) and preview them as HTML.',
  contextFileName: 'GEMINI.md',
  mcpServers: {
    'sola-mcp': { command: 'npx', args: ['-y', `@sola-air-ui/mcp@${versions.mcp}`] }
  }
}, null, 2) + '\n');

emit('README.md', `# Sola AIR skill (Claude and Gemini)

Generated by \`node scripts/build-skill.mjs\` from @sola-air-ui/ui ${versions.ui}, core ${versions.core} and compiler ${versions.compiler}. Do not edit by hand; edit \`scripts/skill-src/\` and regenerate.

- **Claude Code:** copy this folder to \`~/.claude/skills/sola-ui/\` (or \`.claude/skills/sola-ui/\` in a project).
- **Claude.ai:** zip this folder and upload it under Settings → Capabilities → Skills. Code execution must be on; the preview script runs there.
- **Gemini CLI:** copy this folder to \`~/.gemini/extensions/sola-ui/\`. It loads \`GEMINI.md\` as context and starts the \`@sola-air-ui/mcp\` server.

Everything the preview needs is in \`vendor/\` (Node 18+, no install, no network).
`);

// ── standalone repo (Rbm3267/sola-ui-skill) ─────────────────────────────────
// One public repo that is both a Claude Code plugin marketplace and a Gemini CLI
// extension: the Gemini gallery needs gemini-extension.json at the repo root,
// and a Claude plugin keeps its skill under skills/<name>/.
const REPO_URL = 'https://github.com/Rbm3267/sola-ui-skill';
const repoDirArg = (() => { const i = process.argv.indexOf('--repo'); return i >= 0 ? process.argv[i + 1] : null; })();
if (repoDirArg) {
  const dir = path.resolve(repoDirArg);
  // The directory is emptied (except .git), so refuse anything that could be this
  // repo or someone's unrelated folder.
  if (!path.relative(dir, ROOT).startsWith('..')) {
    console.error(`build-skill: --repo ${repoDirArg} contains this repo; pass an empty folder or a sola-ui-skill clone`);
    process.exit(2);
  }
  const existing = existsSync(dir) ? readdirSync(dir).filter((f) => f !== '.git') : [];
  if (existing.length && !existing.includes('gemini-extension.json')) {
    console.error(`build-skill: ${repoDirArg} is not empty and is not a sola-ui-skill checkout; refusing to clear it`);
    process.exit(2);
  }
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f !== '.git') rmSync(path.join(dir, f), { recursive: true, force: true });
  const put = (rel, contents) => {
    const p = path.join(dir, rel);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, lf(contents));
  };
  const rootOnly = new Set(['GEMINI.md', 'gemini-extension.json', 'README.md']);
  for (const [rel, contents] of files) if (!rootOnly.has(rel)) put(`skills/sola-ui/${rel}`, contents);

  const description = 'Design with Sola AIR: write .sola components using the real @sola-air-ui/ui props, and render a self-contained HTML preview.';
  put('GEMINI.md', `# Sola AIR design skill\n\n${body.replaceAll('<SKILL_DIR>', '~/.gemini/extensions/sola-ui/skills/sola-ui')}`);
  put('gemini-extension.json', files.get('gemini-extension.json'));
  put('.claude-plugin/plugin.json', JSON.stringify({
    name: 'sola-ui',
    version: versions.ui,
    description,
    author: { name: 'Sola AIR', url: 'https://sola-air.dev' },
    homepage: 'https://sola-air.dev',
    repository: REPO_URL,
    license: 'MIT',
    keywords: ['sola', 'ui', 'components', 'design', 'web-components', 'zero-vdom']
  }, null, 2) + '\n');
  put('.claude-plugin/marketplace.json', JSON.stringify({
    name: 'sola-air',
    description: 'Sola AIR plugins for Claude Code.',
    owner: { name: 'Sola AIR', url: 'https://sola-air.dev' },
    plugins: [{ name: 'sola-ui', source: './', description }]
  }, null, 2) + '\n');
  put('.mcp.json', JSON.stringify({
    mcpServers: { 'sola-mcp': { command: 'npx', args: ['-y', `@sola-air-ui/mcp@${versions.mcp}`] } }
  }, null, 2) + '\n');
  put('LICENSE', read('LICENSE'));
  put('README.md', `# Sola AIR UI skill

A skill for Claude and an extension for Gemini CLI that design with [Sola AIR](https://sola-air.dev): they write \`.sola\` components using only the components and props @sola-air-ui/ui ${versions.ui} really ships, check them, and render a self-contained HTML preview (\`skills/sola-ui/scripts/preview.mjs\`, Node 18+, no install, no network).

This repo is generated from [Rbm3267/sola-air](https://github.com/Rbm3267/sola-air) by \`scripts/build-skill.mjs\` on each release. Open issues and pull requests there.

## Install

**Claude Code**

\`\`\`bash
claude plugin marketplace add Rbm3267/sola-ui-skill
claude plugin install sola-ui@sola-air
\`\`\`

**Claude.ai** (code execution on): zip the \`skills/sola-ui\` folder and upload it under Settings → Capabilities → Skills.

**Gemini CLI**

\`\`\`bash
gemini extensions install ${REPO_URL}
\`\`\`

It loads \`GEMINI.md\` and starts the \`@sola-air-ui/mcp\` server.

## What's inside

- \`skills/sola-ui/SKILL.md\`: instructions (the same text is \`GEMINI.md\`)
- \`skills/sola-ui/reference/components.md\`: every component, its import path and props, generated from the package
- \`skills/sola-ui/examples/\`: designs that are previewed and tested in a real browser in sola-air's CI
- \`skills/sola-ui/scripts/preview.mjs\` and \`vendor/\`: compiler ${versions.compiler}, core ${versions.core}, design tokens and the component sources

MIT licensed.
`);
  console.log(`wrote ${dir} (sola-ui ${versions.ui})`);
  process.exit(0);
}

// ── write or check ──────────────────────────────────────────────────────────
function listExisting(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? listExisting(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

if (CHECK) {
  const stale = [];
  for (const [rel, contents] of files) {
    const p = path.join(OUT, rel);
    if (!existsSync(p) || lf(readFileSync(p, 'utf8')) !== contents) stale.push(rel);
  }
  for (const rel of listExisting(OUT)) if (!files.has(rel)) stale.push(`${rel} (should not exist)`);
  if (stale.length) {
    console.error(`skills/sola is out of date. Run \`node scripts/build-skill.mjs\`.\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`skills/sola is up to date (${files.size} files).`);
} else {
  rmSync(OUT, { recursive: true, force: true });
  for (const [rel, contents] of files) {
    const p = path.join(OUT, rel);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, contents);
  }
  console.log(`wrote skills/sola (${files.size} files, ${components.length} components)`);
}
