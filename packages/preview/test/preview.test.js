// sola-preview must accept every design the skill's own preview accepts and
// reject the same mistakes. Needs packages/core/dist (npm run build -w @sola-air-ui/core).

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const CLI = path.resolve(HERE, '../src/cli.js');
const EXAMPLES = path.join(ROOT, 'scripts/skill-src/examples');
const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
const tmp = () => mkdtempSync(path.join(os.tmpdir(), 'sola-preview-'));

describe('sola-preview', () => {
  for (const file of readdirSync(EXAMPLES)) {
    it(`checks and renders the skill example ${file}`, () => {
      const out = path.join(tmp(), 'out.html');
      const r = run([path.join(EXAMPLES, file), '-o', out]);
      assert.strictEqual(r.status, 0, r.stderr || r.stdout);
      const html = readFileSync(out, 'utf8');
      assert.match(html, /window\.SolaCore|var SolaCore/);
      assert.match(html, /--sola-/);
      assert.ok(!/<script[^>]+src=/i.test(html), 'everything is inline');
    });
  }

  it('rejects an unbalanced block and a component that does not exist', () => {
    const dir = tmp();
    writeFileSync(path.join(dir, 'broken.sola'), '<script>let a = $state(1);</script>\n{#if a}<p>x</p>\n');
    writeFileSync(path.join(dir, 'fake.sola'), "<script>import Fancy from '@sola-air-ui/ui/fancy';</script><Fancy />\n");
    const broken = run([path.join(dir, 'broken.sola')]);
    assert.strictEqual(broken.status, 1);
    assert.match(broken.stderr, /broken\.sola:2:1 {2}SOLA001/);
    const fake = run([path.join(dir, 'fake.sola')]);
    assert.strictEqual(fake.status, 1);
    assert.match(fake.stderr, /cannot preview import '@sola-air-ui\/ui\/fancy'/);
  });

  it('accepts root imports and escapes </script> in --props JSON', () => {
    const dir = tmp();
    const sola = path.join(dir, 'root.sola');
    const out = path.join(dir, 'root.html');
    writeFileSync(sola, "<script>\nimport { Button } from '@sola-air-ui/ui';\nexport let label = 'Go';\n</script>\n<Button label={label} />\n");
    const r = run([sola, '-o', out, '--props', '{"label":"</script><script>alert(1)</script>"}']);
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
    const html = readFileSync(out, 'utf8');
    assert.ok(!html.includes('"</script><script>alert(1)</script>"'));
    assert.ok(html.includes('<\\/script>'));
  });

  it('--check prints a summary and writes nothing', () => {
    const r = run([path.join(EXAMPLES, readdirSync(EXAMPLES)[0]), '--check']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /: ok \(\d+ components?\)/);
  });
});
