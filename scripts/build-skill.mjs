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
import { parse as acornParse } from 'acorn';
import { readUiManifest } from './ui-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'skills', 'sola');
const CHECK = process.argv.includes('--check');
process.chdir(ROOT);

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
// acorn and htmlparser2 go in files of their own, readable and under the 256 KiB
// a plugin directory reviewer will read; the compiler imports them by path.
// The compiler only uses htmlparser2's Parser; exporting just that leaves out the
// DOM helpers and their second copy of the entity tables.
const VENDOR_LIBS = { acorn: "export * from 'acorn';\n", htmlparser2: "export { Parser } from './node_modules/htmlparser2/lib/esm/Parser.js';\n" };
// entities ships its decode tables as one long string of UTF-16 code units
// ("...".split("").map(c => c.charCodeAt(0))). The directory's scanner treats a
// string like that as a packed payload it cannot read, so write the same numbers
// out as a plain array.
const PACKED_TABLE = /new Uint16Array\(\s*('(?:[^'\\]|\\[\s\S])*'|"(?:[^"\\]|\\[\s\S])*")\.split\(""\)\.map\(\(c\) => c\.charCodeAt\(0\)\)\s*\)/g;
const unpackTables = (code) => code.replace(PACKED_TABLE, (_, literal) => {
  const units = Function(`return ${literal}`)().split('').map((c) => c.charCodeAt(0));
  const rows = [];
  for (let i = 0; i < units.length; i += 20) rows.push('  ' + units.slice(i, i + 20).join(', '));
  return `new Uint16Array([\n${rows.join(',\n')}\n])`;
});
// Minified or packed code is what a reviewer cannot read; fail before shipping it.
const assertReadable = (rel, code) => {
  const longest = Math.max(...code.split('\n').map((l) => l.length));
  if (longest > 5000) throw new Error(`build-skill: ${rel} has a ${longest}-character line; vendor readable source, not minified or packed code.`);
};
for (const [lib, entry] of Object.entries(VENDOR_LIBS)) {
  let out = buildSync({
    absWorkingDir: ROOT,
    stdin: { contents: entry, resolveDir: ROOT, sourcefile: `${lib}-entry.js` },
    bundle: true, format: 'esm', platform: 'node', target: 'node18', write: false, legalComments: 'inline',
    banner: { js: `// ${lib} ${JSON.parse(read(`node_modules/${lib}/package.json`)).version} (MIT${lib === 'htmlparser2' ? '; includes entities, BSD-2-Clause' : ''}), bundled for scripts/preview.mjs. Licenses: THIRD_PARTY_LICENSES.md. Generated; do not edit.` }
  }).outputFiles[0].text;
  // Drop comments (keeping the banner): the plugin directory's scanner reads the
  // spec and bug-tracker links in them as places data could be sent.
  const ranges = [];
  acornParse(out, { ecmaVersion: 'latest', sourceType: 'module', onComment: (_b, _t, s, e) => ranges.push([s, e]) });
  let stripped = out;
  for (const [s, e] of ranges.slice(1).reverse()) stripped = stripped.slice(0, s) + stripped.slice(e);
  out = unpackTables(stripped.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n'));
  assertReadable(`vendor/${lib}.mjs`, out);
  if (/https?:\/\//.test(out)) throw new Error(`build-skill: vendor/${lib}.mjs still contains a URL; check it before shipping.`);
  if (out.length > 250 * 1024) throw new Error(`build-skill: vendor/${lib}.mjs is ${Math.round(out.length / 1024)} KiB; keep each vendored file under 256 KiB.`);
  emit(`vendor/${lib}.mjs`, out);
}
// The vendored files carry third-party code, so ship each library's license with
// them. htmlparser2's bundle includes the entities decoder, which is BSD-2-Clause.
const entitiesDir = ['node_modules/htmlparser2/node_modules/entities', 'node_modules/entities'].find((d) => existsSync(path.join(ROOT, d, 'LICENSE')));
if (!entitiesDir) throw new Error('build-skill: cannot find the entities package htmlparser2 bundles; update THIRD_PARTY_LICENSES.');
const thirdParty = [
  ['acorn', 'node_modules/acorn', 'vendor/acorn.mjs'],
  ['htmlparser2', 'node_modules/htmlparser2', 'vendor/htmlparser2.mjs'],
  ['entities', entitiesDir, 'vendor/htmlparser2.mjs (the entity decoder)']
].map(([name, dir, usedIn]) => {
  const pkg = JSON.parse(read(`${dir}/package.json`));
  return `## ${name} ${pkg.version} (${pkg.license})\n\nUsed in ${usedIn}.\n\n\`\`\`\n${read(`${dir}/LICENSE`).trim()}\n\`\`\``;
});
emit('vendor/THIRD_PARTY_LICENSES.md', `# Third-party licenses\n\nThe files in this folder bundle the libraries below. Their code is unchanged except that comments are removed and the entity tables are written out as plain number arrays.\n\n${thirdParty.join('\n\n')}\n`);
const compilerBundle = buildSync({
  absWorkingDir: ROOT,
  external: Object.keys(VENDOR_LIBS),
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
  banner: { js: `// @sola-air-ui/compiler ${versions.compiler}, bundled for scripts/preview.mjs (acorn and htmlparser2 are the files next to it). Generated; do not edit.` }
});
// The compiler reads its version from ../package.json at runtime; the skill has no
// such file, so the bundle gets the version as a literal instead.
const versionRead = /(\w+)\(new URL\("\.\.\/package\.json", import\.meta\.url\), "utf8"\)/;
let bundled = compilerBundle.outputFiles[0].text;
for (const lib of Object.keys(VENDOR_LIBS)) {
  const bare = `from "${lib}";`;
  if (!bundled.includes(bare)) throw new Error(`build-skill: expected the compiler bundle to import ${lib}; update VENDOR_LIBS.`);
  bundled = bundled.replaceAll(bare, `from "./${lib}.mjs";`);
}
if (!versionRead.test(bundled)) throw new Error('build-skill: the compiler no longer reads ../package.json the expected way; update the version replacement.');
bundled = bundled.replace(versionRead, () => JSON.stringify(JSON.stringify({ version: versions.compiler })));
// That was the compiler's only file read, so its fs import is now dead. Drop it:
// the vendored compiler should not import file access it never uses.
const fsImport = 'import { readFileSync } from "node:fs";\n';
if (bundled.includes(fsImport) && bundled.split('readFileSync').length === 2) bundled = bundled.replace(fsImport, '');
assertReadable('vendor/sola-compiler.mjs', bundled);
emit('vendor/sola-compiler.mjs', bundled);

// Unminified, same options as packages/core/build.js's sola-core.iife.js.
const coreBundle = buildSync({
  absWorkingDir: ROOT,
  entryPoints: [path.join(ROOT, 'packages/core/src/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'SolaCore',
  minify: false,
  target: ['es2020'],
  write: false,
  banner: {
    js: `/* @sola-air-ui/core v${versions.core} — IIFE build for no-bundler environments */`
  }
}).outputFiles[0].text;
assertReadable('vendor/sola-core.iife.js', coreBundle);
emit('vendor/sola-core.iife.js', coreBundle);
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

emit('GEMINI.md', body.replaceAll('<SKILL_DIR>', '~/.gemini/extensions/sola-ui'));

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

// ── standalone repos ────────────────────────────────────────────────────────
// Two public repos, generated from the same files:
//   --repo <dir>         Rbm3267/sola-ui-skill: the Claude Code plugin marketplace.
//                        It holds the skill and nothing that launches a process.
//   --gemini-repo <dir>  The Gemini CLI extension layout, for a repo of its own. Nothing
//                        publishes it today (no sola-ui-gemini repo exists); it is kept
//                        so a Gemini extension can be released later. The Gemini
//                        gallery needs gemini-extension.json at the repo root, and that
//                        file starts the @sola-air-ui/mcp server through npx. Keeping it
//                        out of the Claude plugin's repo means the plugin directory
//                        reviews a skill, not an npx-launched server.
const REPO_URL = 'https://github.com/Rbm3267/sola-ui-skill';
const GEMINI_REPO_URL = 'https://github.com/Rbm3267/sola-ui-gemini';
const argValue = (flag) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; };
const description = 'Design with Sola AIR: write .sola components using the real @sola-air-ui/ui props, and render a self-contained HTML preview.';

/** Empty `dirArg` (keeping .git) and return a writer for it; refuse a folder that is not a clone of `marker`. */
function openRepoDir(dirArg, flag, markers) {
  const dir = path.resolve(dirArg);
  // The directory is emptied (except .git), so refuse anything that could be this
  // repo or someone's unrelated folder.
  if (!path.relative(dir, ROOT).startsWith('..')) {
    console.error(`build-skill: ${flag} ${dirArg} contains this repo; pass an empty folder or a clone of the target repo`);
    process.exit(2);
  }
  const existing = existsSync(dir) ? readdirSync(dir).filter((f) => f !== '.git') : [];
  if (existing.length && !markers.some((m) => existing.includes(m))) {
    console.error(`build-skill: ${dirArg} is not empty and does not look like a checkout of the target repo; refusing to clear it`);
    process.exit(2);
  }
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f !== '.git') rmSync(path.join(dir, f), { recursive: true, force: true });
  const put = (rel, contents) => {
    const p = path.join(dir, rel);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, lf(contents));
  };
  return { dir, put };
}
// The plugin directory accepts only Markdown, text, JSON, YAML and images from
// organizations it has not verified, so the plugin repo cannot carry the vendored
// compiler, the preview script or .sola files. Its skill is the instructions, the
// reference and the examples (as Markdown), and it checks and previews a design
// with @sola-air-ui/preview from npm. skills/sola keeps the offline version.
const PREVIEW_VERSION = JSON.parse(read('packages/preview/package.json')).version;
const PREVIEW_CMD = `npx -y @sola-air-ui/preview@${PREVIEW_VERSION}`;
const pluginBody = (() => {
  let b = body;
  const swap = (from, to) => {
    if (!b.includes(from)) throw new Error(`build-skill: the plugin edition expected ${JSON.stringify(from.slice(0, 60))} in instructions.md; update pluginBody.`);
    b = b.replace(from, to);
  };
  swap(`This skill vendors core ${versions.core}, compiler ${versions.compiler} and those components, so you can check a design and render it to HTML with no install.`,
    `The skill checks and previews a design with the \`@sola-air-ui/preview\` npm package (${PREVIEW_VERSION}), which brings core, the compiler, the design tokens and those components. npx downloads it from the npm registry the first time.`);
  swap('node <SKILL_DIR>/scripts/preview.mjs design.sola', `${PREVIEW_CMD} design.sola`);
  swap('Working examples are in `examples/`.', 'Working examples are in `examples/`, one design per Markdown file.');
  return b.replaceAll('<SKILL_DIR>', '<skill-dir>');
})();
const PLUGIN_ALLOWED = /(\.md|\.json|\.png)$|^LICENSE$/;
/** Fail the build if the plugin repo holds anything the directory would refuse. */
function assertPluginFiles(dir) {
  const bad = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      if (f === '.git') continue;
      const p = path.join(d, f);
      const rel = path.relative(dir, p).split(path.sep).join('/');
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!PLUGIN_ALLOWED.test(rel)) bad.push(`${rel} (type not allowed)`);
      else if (!rel.endsWith('.png') && readFileSync(p, 'utf8').startsWith('#!')) bad.push(`${rel} (starts with #!)`);
    }
  };
  walk(dir);
  if (bad.length) throw new Error(`build-skill: the plugin directory would refuse:\n  ${bad.join('\n  ')}`);
}
const putPluginSkill = (put) => {
  put('skills/sola-ui/SKILL.md', files.get('SKILL.md').split('\n---\n')[0] + '\n---\n\n' + pluginBody);
  put('skills/sola-ui/reference/components.md', files.get('reference/components.md'));
  put('skills/sola-ui/reference/AGENTS.md', files.get('reference/AGENTS.md'));
  for (const [rel, contents] of files) {
    if (!rel.startsWith('examples/') || !rel.endsWith('.sola')) continue;
    const name = path.basename(rel, '.sola');
    put(`skills/sola-ui/examples/${name}.md`, `# Example: ${name}\n\nSave this as \`${name}.sola\`, then run \`${PREVIEW_CMD} ${name}.sola\`. It passes the preview check in sola-air's CI.\n\n\`\`\`html\n${contents.trimEnd()}\n\`\`\`\n`);
  }
};
const putSkill = (put) => {
  const rootOnly = new Set(['GEMINI.md', 'gemini-extension.json', 'README.md']);
  for (const [rel, contents] of files) if (!rootOnly.has(rel)) put(`skills/sola-ui/${rel}`, contents);
};

const repoDirArg = argValue('--repo');
const geminiDirArg = argValue('--gemini-repo');
if (repoDirArg) {
  // Existing clones from before the split also have gemini-extension.json at the root.
  const { dir, put } = openRepoDir(repoDirArg, '--repo', ['.claude-plugin', 'gemini-extension.json']);
  putPluginSkill(put);
  put('.claude-plugin/plugin.json', JSON.stringify({
    name: 'sola-ui',
    displayName: 'Sola UI',
    version: versions.ui,
    description,
    author: { name: 'Sola AIR', url: 'https://sola-air.dev' },
    homepage: 'https://sola-air.dev',
    repository: REPO_URL,
    documentationUrl: 'https://sola-air.dev/docs',
    privacyPolicyUrl: 'https://sola-air.dev/privacy#sola-ui-skill',
    supportUrl: 'https://github.com/Rbm3267/sola-air/issues',
    license: 'MIT',
    keywords: ['sola', 'ui', 'components', 'design', 'web-components', 'zero-vdom']
  }, null, 2) + '\n');
  put('.claude-plugin/marketplace.json', JSON.stringify({
    name: 'sola-air',
    description: 'Sola AIR plugins for Claude Code.',
    owner: { name: 'Sola AIR', url: 'https://sola-air.dev' },
    plugins: [{ name: 'sola-ui', source: './', description }]
  }, null, 2) + '\n');
  // The Claude plugin is the skill alone: no .mcp.json, no gemini-extension.json, and
  // nothing else that starts a process. The directory picks the listing icon up from
  // .claude-plugin/icon.png. It is a 512x512 copy of the logo (the 1024px, 830 KB
  // original never showed on the listing); keep it square and at most 512px.
  const icon = readFileSync(path.join(ROOT, 'brand/logo/sola-icon-512.png'));
  const [iconW, iconH] = [icon.readUInt32BE(16), icon.readUInt32BE(20)];
  if (icon.toString('ascii', 1, 4) !== 'PNG' || iconW !== iconH || iconW > 512) {
    throw new Error(`build-skill: brand/logo/sola-icon-512.png must be a square PNG of at most 512px (is ${iconW}x${iconH}).`);
  }
  writeFileSync(path.join(dir, '.claude-plugin/icon.png'), icon);
  put('LICENSE', read('LICENSE'));
  put('README.md', `# Sola AIR UI skill

A skill for Claude that designs with [Sola AIR](https://sola-air.dev): it writes \`.sola\` components using only the components and props @sola-air-ui/ui ${versions.ui} really ships, checks them, and renders a self-contained HTML preview.

This repo is generated from [Rbm3267/sola-air](https://github.com/Rbm3267/sola-air) by \`scripts/build-skill.mjs\` on each release. Open issues and pull requests there.

## Install

**Claude Code**

\`\`\`bash
claude plugin marketplace add Rbm3267/sola-ui-skill
claude plugin install sola-ui@sola-air
\`\`\`

**Claude.ai** (code execution on, with access to the npm registry): zip the \`skills/sola-ui\` folder and upload it under Settings → Capabilities → Skills.

## What's inside

- \`skills/sola-ui/SKILL.md\`: instructions
- \`skills/sola-ui/reference/components.md\`: every component, its import path and props, generated from the package
- \`skills/sola-ui/reference/AGENTS.md\`: the full \`.sola\` language spec
- \`skills/sola-ui/examples/\`: designs, one per Markdown file, that pass the preview check in sola-air's CI

The plugin is Markdown and JSON only. To check and preview a design it runs \`${PREVIEW_CMD}\`, which npx downloads from the npm registry with the compiler, core, design tokens and component sources. The preview reads only the \`.sola\` file you give it and writes one HTML file next to it. Nothing in the plugin reads credentials. MIT licensed.

For a version with the compiler bundled, which previews with no install and no network, copy \`skills/sola\` from [Rbm3267/sola-air](https://github.com/Rbm3267/sola-air) instead.
`);
  assertPluginFiles(dir);
  console.log(`wrote ${dir} (sola-ui ${versions.ui}, Claude plugin)`);
  process.exit(0);
}
if (geminiDirArg) {
  const { dir, put } = openRepoDir(geminiDirArg, '--gemini-repo', ['gemini-extension.json']);
  putSkill(put);
  put('GEMINI.md', body.replaceAll('<SKILL_DIR>', '~/.gemini/extensions/sola-ui/skills/sola-ui'));
  put('gemini-extension.json', files.get('gemini-extension.json'));
  put('LICENSE', read('LICENSE'));
  put('README.md', `# Sola AIR UI extension for Gemini CLI

An extension for Gemini CLI that designs with [Sola AIR](https://sola-air.dev): it writes \`.sola\` components using only the components and props @sola-air-ui/ui ${versions.ui} really ships, and renders a self-contained HTML preview.

This repo is generated from [Rbm3267/sola-air](https://github.com/Rbm3267/sola-air) by \`scripts/build-skill.mjs\` on each release. Open issues and pull requests there.

## Install

\`\`\`bash
gemini extensions install ${GEMINI_REPO_URL}
\`\`\`

It loads \`GEMINI.md\` and starts the \`@sola-air-ui/mcp\` server on your machine (npx downloads it from the npm registry the first time). The server needs no credentials. For Claude, see ${REPO_URL}.

MIT licensed.
`);
  console.log(`wrote ${dir} (sola-ui ${versions.ui}, Gemini extension)`);
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
