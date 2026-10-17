import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compileComponentTool, validateComponentTool, SOLA_DOCS } from '../src/mcp-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.resolve(__dirname, '../../ui');

describe('@sola-air-ui/mcp tools & docs', () => {
  it('compileComponentTool compiles valid .sola source with filename option', () => {
    const res = compileComponentTool({
      source: `<script>let count = $state(0);</script><button onclick={() => count++}>{count}</button><style>button { color: #10b981; }</style>`,
      filename: 'Counter.sola'
    });
    assert.strictEqual(res.ok, true);
    assert.ok(res.js.includes('createSignal(0)'));
    assert.ok(res.js.includes('set_count(count() + 1)'));
    assert.ok(res.css && res.css.includes('#10b981'));
    assert.ok(res.scopeHash && res.scopeHash.startsWith('sola-'));
  });

  it('compileComponentTool rejects unbalanced template blocks via sola-check', () => {
    const res = compileComponentTool({
      source: `<script>let open = $state(true);</script>{#if open}<div>Open</div>`,
      filename: 'Broken.sola'
    });
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /SOLA001/);
  });

  it('validateComponentTool flags both syntax errors and unbalanced blocks', () => {
    const ok = validateComponentTool({
      source: `<script>let x = $state(1);</script><p>{x}</p>`
    });
    assert.strictEqual(ok.valid, true);
    assert.deepStrictEqual(ok.errors, []);

    const unclosed = validateComponentTool({
      source: `{#each items as item}<li>{item}</li>`
    });
    assert.strictEqual(unclosed.valid, false);
    assert.ok(unclosed.errors.some((e) => e.includes('SOLA001')));
  });

  it('SOLA_DOCS teaches current Sola 1.4+ syntax and its example compiles cleanly', () => {
    assert.ok(!SOLA_DOCS.includes('</template>'), 'SOLA_DOCS must not wrap markup in <template>...</template>');
    assert.ok(SOLA_DOCS.includes('$persist'));
    assert.ok(SOLA_DOCS.includes('$on'));
    assert.ok(SOLA_DOCS.includes('$lastEvent'));
    assert.ok(SOLA_DOCS.includes('mountShell'));

    const match = SOLA_DOCS.match(/## 7\. Complete Example\s+([\s\S]+)$/);
    assert.ok(match, 'SOLA_DOCS includes Complete Example section');
    const example = match[1].trim();
    const res = compileComponentTool({ source: example, filename: 'Example.sola' });
    assert.strictEqual(res.ok, true, `Complete Example must compile: ${res.error}`);
  });
});

describe('@sola-air-ui/ui root exports & TypeScript declarations', () => {
  it('re-exports and declares every subpath .sola component from index.js and types/index.d.ts', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(UI_DIR, 'package.json'), 'utf8'));
    const indexJs = fs.readFileSync(path.join(UI_DIR, 'src/index.js'), 'utf8');
    const indexDts = fs.readFileSync(path.join(UI_DIR, 'types/index.d.ts'), 'utf8');

    for (const [subpath, file] of Object.entries(pkg.exports)) {
      if (typeof file !== 'string' || !file.endsWith('.sola')) continue;
      const name = path.basename(file, '.sola');
      const relFromSrc = file.replace(/^\.\/src\//, './');
      assert.ok(
        indexJs.includes(`as ${name} } from '${relFromSrc}'`),
        `packages/ui/src/index.js must re-export ${name} (${subpath} -> ${relFromSrc})`
      );
      assert.ok(
        new RegExp(`export const ${name}: SolaComponent(?:<[^>]+>)?;`).test(indexDts),
        `packages/ui/types/index.d.ts must declare ${name}`
      );
    }
  });
});

describe('sola-mcp bin', () => {
  // Starts the real bin and speaks MCP to it over stdio. npm runs bins through a
  // symlink on macOS and Linux; an earlier version only started when argv[1]
  // matched its own real path, so it exited silently there. The linked case is
  // what catches that.
  const SRC = path.resolve(__dirname, '../src');
  const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));

  function initialize(binPath) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [binPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error(`no reply from ${binPath}; stdout: ${out}`)); }, 10000);
      child.stdout.on('data', (chunk) => {
        out += chunk;
        const line = out.split('\n').find((l) => l.includes('"id":1'));
        if (line) { clearTimeout(timer); child.kill(); resolve(JSON.parse(line)); }
      });
      child.on('exit', (code) => { if (!out.includes('"id":1')) { clearTimeout(timer); reject(new Error(`bin exited (${code}) without replying`)); } });
      child.stdin.write(JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } }
      }) + '\n');
    });
  }

  it('answers initialize with its package version', async () => {
    const reply = await initialize(path.join(SRC, 'index.js'));
    assert.strictEqual(reply.result.serverInfo.name, 'sola-mcp');
    assert.strictEqual(reply.result.serverInfo.version, version);
  });

  it('still starts when run through a linked path, as npm bins are', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sola-mcp-bin-'));
    const linked = path.join(dir, 'src');
    fs.symlinkSync(SRC, linked, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      const reply = await initialize(path.join(linked, 'index.js'));
      assert.strictEqual(reply.result.serverInfo.name, 'sola-mcp');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
