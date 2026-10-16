// The extension's "Copy code" output has to work when pasted into a project.
// These tests check it against the real @sola-air-ui/ui package, not against the
// extension's own idea of what exists.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from '../../compiler/src/index.js';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const { COMPONENTS, escapeHtml, importLine, generateCode, summarize } = require('../codegen.js');

const uiDir = join(here, '../../ui');
const uiExports = JSON.parse(readFileSync(join(uiDir, 'package.json'), 'utf8')).exports;

describe('component table', () => {
  it('every published component points at a real subpath export of @sola-air-ui/ui', () => {
    for (const [id, c] of Object.entries(COMPONENTS)) {
      if (!c.subpath) continue;
      const entry = uiExports[`./${c.subpath}`];
      assert.ok(entry, `${id}: @sola-air-ui/ui has no export "./${c.subpath}"`);
      assert.ok(existsSync(join(uiDir, entry)), `${id}: ${entry} does not exist`);
      assert.ok(entry.toLowerCase().includes(c.name.toLowerCase()), `${id}: ${entry} is not ${c.name}`);
    }
  });

  it('a component with no subpath is genuinely absent from the package', () => {
    const exported = new Set(Object.values(uiExports).map((p) => String(p).split('/').pop().replace('.sola', '')));
    for (const [id, c] of Object.entries(COMPONENTS)) {
      if (c.subpath) continue;
      assert.ok(!exported.has(c.name), `${id}: ${c.name} IS in the package now; give it a subpath`);
    }
  });

  it('an unreleased component produces a comment, not an import that fails', () => {
    const line = importLine('slider');
    assert.ok(line.startsWith('//'), line);
    assert.ok(!/^import /m.test(line), line);
    assert.ok(line.includes('RangeSlider'));
  });

  it('Button is imported from its subpath, since it is not re-exported from the root', () => {
    assert.strictEqual(importLine('button'), "import Button from '@sola-air-ui/ui/button';");
  });
});

describe('generated code', () => {
  const stats = [
    { label: 'Open incidents', value: '42' },
    { label: 'MTTR', value: '1,420' }
  ];

  it('one metric is a single DataCard with its import', () => {
    const code = generateCode('gauge', [stats[0]]);
    assert.ok(code.includes("import DataCard from '@sola-air-ui/ui/data-card';"), code);
    assert.ok(code.includes('<DataCard title="Open incidents" value="42" />'), code);
    assert.ok(!code.includes('GaugeCard'), 'the code matches what is drawn, a DataCard');
  });

  it('several metrics are a StatGrid of DataCards and import both', () => {
    const code = generateCode('datacard', stats);
    assert.ok(code.includes("import DataCard from '@sola-air-ui/ui/data-card';"));
    assert.ok(code.includes("import StatGrid from '@sola-air-ui/ui/stat-grid';"));
    assert.ok(code.includes('<StatGrid columns="2">'));
    assert.ok(code.includes('<DataCard title="MTTR" value="1,420" />'), 'the value is kept as shown');
  });

  it('nothing scraped gives only the import of the picked component', () => {
    assert.strictEqual(generateCode('toggle', []), "import Toggle from '@sola-air-ui/ui/toggle';");
  });

  it('text from the page cannot break the generated markup', () => {
    const code = generateCode('datacard', [{ label: 'Say "hi" {now}', value: "it's\nbroken" }]);
    assert.ok(code.includes('title={"Say \\"hi\\" {now}"}'), code);
    assert.ok(code.includes('value={"it\'s\\nbroken"}'), code);
  });

  it('the generated markup compiles as a .sola component', () => {
    const markup = generateCode('datacard', stats).split('\n').filter((l) => !l.startsWith('import')).join('\n');
    const imports = generateCode('datacard', stats).split('\n').filter((l) => l.startsWith('import')).join('\n');
    const source = `<script>\n${imports}\n</script>\n${markup}`;
    const { code } = compile(source, { filename: 'Pasted.sola' });
    assert.ok(code.includes('DataCard('), 'DataCard is mounted');
    assert.ok(code.includes('StatGrid('), 'StatGrid is mounted');
  });

  it('the summary is one short line', () => {
    assert.strictEqual(summarize('datacard', [stats[0]]), '<DataCard title="Open incidents" value="42" />');
    assert.strictEqual(summarize('datacard', stats), '<StatGrid> of 2 DataCards');
    assert.ok(!summarize('datacard', stats).includes('\n'));
  });
});

describe('escapeHtml', () => {
  it('escapes everything that can open or close markup or an attribute', () => {
    assert.strictEqual(escapeHtml(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  });
  it('handles null, undefined and numbers', () => {
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
    assert.strictEqual(escapeHtml(42), '42');
  });
});

describe('side panel', () => {
  const html = readFileSync(join(here, '../sidepanel.html'), 'utf8');
  const buttons = [...html.matchAll(/data-component="(\w+)">[\s\S]*?<span class="pill"[^>]*>([^<]+)<\/span>/g)]
    .map((m) => ({ id: m[1], pill: m[2] }));

  it('offers exactly the components the code generator knows', () => {
    assert.deepStrictEqual(buttons.map((b) => b.id).sort(), Object.keys(COMPONENTS).sort());
  });

  it('labels a component "Studio preview" exactly when it is not in @sola-air-ui/ui', () => {
    for (const b of buttons) {
      const released = Boolean(COMPONENTS[b.id].subpath);
      assert.strictEqual(b.pill === 'Studio preview', !released, `${b.id}: pill "${b.pill}", released=${released}`);
    }
  });

  it('states how many of them are installable', () => {
    const released = Object.values(COMPONENTS).filter((c) => c.subpath).length;
    assert.ok(html.includes(`${Object.keys(COMPONENTS).length} previews · ${released} are in @sola-air-ui/ui`));
  });

  it('shows the scoped package names', () => {
    assert.ok(html.includes('npm install @sola-air-ui/core @sola-air-ui/ui'));
    assert.ok(!html.includes('@sola/core'), 'the old unscoped name is gone');
  });
});
