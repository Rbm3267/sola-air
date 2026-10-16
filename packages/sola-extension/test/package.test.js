// The /preview page links straight to the committed sola-extension.zip, so users
// install whatever is in it. These tests keep it identical to the source, and keep
// the extension's claims (a closed Shadow DOM) true in the code.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildZip, readZip, extensionFiles, ZIP_PATH, EXTENSION_DIR } from '../../../scripts/extension-zip.mjs';

describe('sola-extension.zip', () => {
  const committed = readZip(readFileSync(ZIP_PATH));
  const byName = new Map(committed.map((f) => [f.name, f.data]));

  it('uses forward-slash paths', () => {
    for (const f of committed) assert.ok(!f.name.includes('\\'), `backslash in "${f.name}"`);
  });

  it('contains exactly the files the extension ships', () => {
    const expected = extensionFiles().map((f) => f.name).sort();
    assert.deepStrictEqual(committed.map((f) => f.name).sort(), expected);
  });

  it('matches the source, byte for byte (run `node scripts/extension-zip.mjs` if this fails)', () => {
    for (const { name, data } of extensionFiles()) {
      assert.ok(byName.get(name)?.equals(data), `${name} in the zip differs from packages/sola-extension/${name}`);
    }
  });

  it('includes the code generator the content script needs', () => {
    assert.ok(byName.has('codegen.js'));
  });

  it('round-trips: what buildZip writes, readZip reads back', () => {
    const files = [
      { name: 'a.txt', data: Buffer.from('hello hello hello hello') },
      { name: 'dir/b.bin', data: Buffer.from([0, 1, 2, 255, 254]) },
      { name: 'empty.txt', data: Buffer.alloc(0) }
    ];
    const back = readZip(buildZip(files));
    assert.deepStrictEqual(back.map((f) => f.name), files.map((f) => f.name));
    back.forEach((f, i) => assert.ok(f.data.equals(files[i].data), f.name));
  });
});

describe('extension claims match the code', () => {
  const content = readFileSync(join(EXTENSION_DIR, 'content.js'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(EXTENSION_DIR, 'manifest.json'), 'utf8'));

  it('every Shadow DOM the extension creates is closed, as the manifest says', () => {
    assert.ok(/closed Shadow DOM/i.test(manifest.description), 'manifest still makes the claim');
    const roots = content.match(/attachShadow\(\{[^}]*\}\)/g) || [];
    assert.ok(roots.length >= 2, 'found the shadow roots');
    for (const r of roots) assert.ok(r.includes("mode: 'closed'"), `${r} is not closed`);
  });

  it('never puts scraped text into markup without escaping it', () => {
    const card = content.slice(content.indexOf('function buildCardHTML'), content.indexOf('function createHost'));
    const interpolations = [...card.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1].trim());
    const allowed = /^(escapeHtml\(.*\)|heading|host|color|rows)$/;
    for (const expr of interpolations) assert.ok(allowed.test(expr), `unescaped interpolation in buildCardHTML: \${${expr}}`);
  });

  it('only acts on component ids it knows', () => {
    assert.ok(content.includes('hasOwnProperty.call(SolaCodegen.COMPONENTS, componentId)'));
  });

  it('sidepanel injects the code generator before the content script', () => {
    const panel = readFileSync(join(EXTENSION_DIR, 'sidepanel.js'), 'utf8');
    assert.ok(/files:\s*\['codegen\.js',\s*'content\.js'\]/.test(panel));
  });
});
