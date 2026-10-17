import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import solaPlugin from '../src/index.js';
import { compile } from '../../compiler/src/index.js';

describe('@sola-air-ui/vite-plugin-sola', () => {
  it('loads .sola files with or without Vite query suffixes (?import, ?v=123)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-plugin-sola-'));
    const file = path.join(dir, 'Counter.sola');
    fs.writeFileSync(file, '<script>let n = $state(1);</script><button>{n}</button>');

    const plugin = solaPlugin({ compile });
    const resPlain = await plugin.load(file);
    assert.ok(resPlain && resPlain.code.includes('createSignal(1)'));

    const resQuery = await plugin.load(`${file}?import&t=12345`);
    assert.ok(resQuery && resQuery.code.includes('createSignal(1)'));

    const resOther = await plugin.load('/some/file.js?import');
    assert.strictEqual(resOther, null);
  });
});
