// Holds skills/sola to the repo: it must be freshly generated, list exactly the
// components and props the package ships, and every example in it must pass the
// same checks a user's design does.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUiManifest } from './ui-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = path.join(ROOT, 'skills', 'sola');
const PREVIEW = path.join(SKILL, 'scripts', 'preview.mjs');
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: ROOT });
const read = (rel) => readFileSync(path.join(SKILL, rel), 'utf8').replace(/\r\n/g, '\n');

describe('skills/sola', () => {
  it('is up to date with the repo (run node scripts/build-skill.mjs)', () => {
    const r = run(path.join(ROOT, 'scripts', 'build-skill.mjs'), ['--check']);
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  });

  it('lists exactly the components and props @sola-air-ui/ui ships', () => {
    const ui = readUiManifest(ROOT);
    const ref = read('reference/components.md');
    const listed = [...ref.matchAll(/^### (\w+)$/gm)].map((m) => m[1]).sort();
    assert.deepStrictEqual(listed, Object.keys(ui.subpaths).sort());
    for (const [name, props] of Object.entries(ui.props)) {
      const section = ref.split(`### ${name}\n`)[1].split('\n### ')[0].split('\n## ')[0];
      assert.ok(section.includes(`import ${name} from '${ui.subpaths[name]}';`), `${name} import line`);
      const documented = [...section.matchAll(/^\| `(\w+)` \|/gm)].map((m) => m[1]);
      assert.deepStrictEqual(documented, props, `${name} props`);
    }
  });

  it('has valid Claude skill and Gemini extension metadata', () => {
    const skill = read('SKILL.md');
    const front = skill.match(/^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---\n/);
    assert.ok(front, 'SKILL.md frontmatter');
    assert.match(front[1], /^[a-z0-9-]{1,64}$/);
    assert.ok(front[2].length <= 1024, 'description at most 1024 characters');
    const ext = JSON.parse(read('gemini-extension.json'));
    assert.strictEqual(ext.name, front[1]);
    assert.strictEqual(ext.contextFileName, 'GEMINI.md');
    assert.ok(existsSync(path.join(SKILL, 'GEMINI.md')));
    assert.match(ext.mcpServers['sola-mcp'].args.join(' '), /@sola-air-ui\/mcp@\d+\.\d+\.\d+/);
  });

  for (const file of readdirSync(path.join(SKILL, 'examples'))) {
    it(`example ${file} passes the preview check`, () => {
      const r = run(PREVIEW, [path.join(SKILL, 'examples', file), '--check']);
      assert.strictEqual(r.status, 0, r.stderr || r.stdout);
    });
  }

  it('the syntax example in SKILL.md passes the preview check', () => {
    const block = read('SKILL.md').match(/```html\n([\s\S]*?)```/)[1];
    const dir = mkdtempSync(path.join(os.tmpdir(), 'sola-skill-'));
    writeFileSync(path.join(dir, 'syntax.sola'), block);
    const r = run(PREVIEW, [path.join(dir, 'syntax.sola'), '--check']);
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  });

  it('rejects an unbalanced block and a component that does not exist', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'sola-skill-'));
    writeFileSync(path.join(dir, 'broken.sola'), '<script>let a = $state(1);</script>\n{#if a}<p>x</p>\n');
    writeFileSync(path.join(dir, 'fake.sola'), "<script>import Fancy from '@sola-air-ui/ui/fancy';</script><Fancy />\n");
    const broken = run(PREVIEW, [path.join(dir, 'broken.sola')]);
    assert.strictEqual(broken.status, 1);
    assert.match(broken.stderr, /broken\.sola:2:1 {2}SOLA001/);
    const fake = run(PREVIEW, [path.join(dir, 'fake.sola')]);
    assert.strictEqual(fake.status, 1);
    assert.match(fake.stderr, /cannot preview import '@sola-air-ui\/ui\/fancy'/);
  });
});
