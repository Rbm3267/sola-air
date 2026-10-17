// Checks the extension's manifest and the files it points at. Highlighting itself
// can only be checked inside VS Code (or a TextMate engine), so this guards the
// things that silently break it: a missing file, bad JSON, or a re-added dependency.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const pkg = read('package.json');

test('every file the manifest contributes exists and is valid JSON', () => {
  const { languages, grammars, snippets } = pkg.contributes;
  const paths = [
    languages[0].configuration,
    languages[0].icon.light,
    grammars[0].path,
    snippets[0].path
  ];
  for (const p of paths) {
    assert(existsSync(join(root, p)), `${p} is missing`);
    if (p.endsWith('.json') || p.endsWith('.code-snippets')) read(p);
  }
});

test('highlighting does not depend on another extension', () => {
  assert.strictEqual(pkg.extensionDependencies, undefined);
  const grammar = read(pkg.contributes.grammars[0].path);
  assert.strictEqual(grammar.scopeName, pkg.contributes.grammars[0].scopeName);
  assert(!JSON.stringify(grammar).includes('source.svelte'), 'grammar must not include the Svelte grammar');
});

test('the grammar covers script, style, blocks and expressions', () => {
  const g = read(pkg.contributes.grammars[0].path);
  for (const key of ['script', 'style', 'block-if', 'block-each', 'block-else', 'block-close', 'expression', 'macros']) {
    assert(g.repository[key], `repository.${key}`);
  }
  assert(/state\|derived\|effect\|persist\|intent\|data\|on\|lastEvent/.test(g.repository.macros.match), 'macro names');
});

test('snippets have unique prefixes and escape the dollar sign of macros', () => {
  const snippets = read(pkg.contributes.snippets[0].path);
  const prefixes = Object.values(snippets).map((s) => s.prefix);
  assert.strictEqual(new Set(prefixes).size, prefixes.length, 'duplicate prefix');
  for (const [name, s] of Object.entries(snippets)) {
    const body = [].concat(s.body).join('\n');
    // A bare $state in a snippet body is read as a snippet variable; it must be \$state.
    assert(!/(^|[^\\])\$(state|derived|effect|persist|intent|data|on|lastEvent)\b/.test(body), `${name}: unescaped macro`);
  }
});

test('.vscodeignore lets every contributed file into the .vsix', () => {
  const rules = readFileSync(join(root, '.vscodeignore'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const allowed = (p) => rules.some((r) => r.startsWith('!') && (r.slice(1) === p || (r.endsWith('/**') && p.startsWith(r.slice(1, -2)))));
  const { languages, grammars, snippets } = pkg.contributes;
  for (const p of [languages[0].configuration, languages[0].icon.light, grammars[0].path, snippets[0].path, pkg.icon]) {
    assert(allowed(p.replace(/^\.\//, '')), `${p} would be left out of the .vsix`);
  }
});

test('file and extension icons are crisp HiDPI PNGs (>= 128x128)', () => {
  const { languages } = pkg.contributes;
  for (const rel of [languages[0].icon.light, languages[0].icon.dark, pkg.icon]) {
    const buf = readFileSync(join(root, rel));
    // PNG IHDR width/height sit at bytes 16..23 (big-endian uint32)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert(width >= 128 && height >= 128, `${rel} must be >= 128x128 for Retina/HiDPI editors (got ${width}x${height})`);
  }
});

