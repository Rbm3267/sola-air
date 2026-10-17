// Guards the two ways the scaffold has silently rotted before:
//   1. pinning dependency versions that were never published, and
//   2. shipping an App.sola whose syntax the compiler cannot actually handle.
//
// The published-version check runs against the workspace manifests, so cutting
// a release without updating the scaffold fails here rather than in a new
// user's first five minutes. `npm run test:scaffold` in CI additionally
// installs and builds the generated project against the real registry.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, SOLA_DEPS } from '../src/cli.js';
import { compile } from '../../compiler/src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES = path.join(__dirname, '..', '..');

// Workspace directory for each scaffolded dependency, so its real version can
// be read from the manifest that will be published.
const WORKSPACE_DIR = {
  '@sola-air-ui/core': 'core',
  '@sola-air-ui/ui': 'ui',
  '@sola-air-ui/compiler': 'compiler',
  '@sola-air-ui/vite-plugin-sola': 'vite-plugin-sola'
};

function workspaceVersion(pkgName) {
  const dir = WORKSPACE_DIR[pkgName];
  if (!dir) return null;
  const manifest = JSON.parse(
    fs.readFileSync(path.join(PACKAGES, dir, 'package.json'), 'utf8')
  );
  return manifest.version;
}

// Minimal caret-range check: ^X.Y.Z is satisfied by the workspace version when
// majors match and the workspace version is not older than the floor.
function satisfiesCaret(range, version) {
  assert.match(range, /^\^\d+\.\d+\.\d+$/, `unsupported range form: ${range}`);
  const [rMaj, rMin, rPat] = range.slice(1).split('.').map(Number);
  const [vMaj, vMin, vPat] = version.split('.').map(Number);
  if (vMaj !== rMaj) return false;
  if (vMin !== rMin) return vMin > rMin;
  return vPat >= rPat;
}

describe('create-sola scaffold', () => {
  it('pins dependency versions that match the workspace packages', () => {
    const all = { ...SOLA_DEPS.dependencies, ...SOLA_DEPS.devDependencies };
    for (const [pkgName, range] of Object.entries(all)) {
      const actual = workspaceVersion(pkgName);
      if (!actual) continue; // third-party (vite) — not ours to track
      assert.ok(
        satisfiesCaret(range, actual),
        `scaffold pins ${pkgName}@${range} but the workspace ships ${actual}`
      );
    }
  });

  it('uses the published vite plugin rather than a hand-rolled copy', async () => {
    const dir = await scaffoldToTemp('vite-plugin-check');
    const viteConfig = fs.readFileSync(path.join(dir, 'vite.config.js'), 'utf8');
    assert.match(viteConfig, /from '@sola-air-ui\/vite-plugin-sola'/);
    assert.doesNotMatch(viteConfig, /function sola\(/, 'must not inline its own plugin');
  });

  it('generates an App.sola the compiler can build', async () => {
    const dir = await scaffoldToTemp('compile-check');
    const source = fs.readFileSync(path.join(dir, 'src', 'App.sola'), 'utf8');
    const { code } = compile(source, { filename: 'App.sola' });

    // The reactive rewrite must have happened: bare reads become getter calls
    // and the derived body tracks the signal.
    assert.match(code, /createDerived\(\(\) => count\(\) \* 2\)/);
    assert.match(code, /set_count\(count\(\) \+ 1\)/);
    assert.ok(!code.includes('()()'), 'no double-called signals');

    // Generated module must at least parse as JS.
    new Function(code.replace(/^import.*$/gm, '').replace('export default ', 'globalThis.__m = '));
  });

  it('writes every file the README tells the user to run', async () => {
    const dir = await scaffoldToTemp('files-check');
    for (const rel of ['package.json', 'vite.config.js', 'index.html', 'src/App.sola', 'src/main.js', '.gitignore', 'README.md']) {
      assert.ok(fs.existsSync(path.join(dir, rel)), `missing ${rel}`);
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    assert.deepStrictEqual(pkg.dependencies, SOLA_DEPS.dependencies);
    assert.deepStrictEqual(pkg.devDependencies, SOLA_DEPS.devDependencies);
  });

  it('recommends the Sola AIR VS Code extension', async () => {
    const dir = await scaffoldToTemp('extensions-check');
    const rec = JSON.parse(fs.readFileSync(path.join(dir, '.vscode', 'extensions.json'), 'utf8'));
    assert.deepStrictEqual(rec.recommendations, ['SolaAIR.sola-vscode']);
  });
});

async function scaffoldToTemp(name) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), `sola-scaffold-${name}-`));
  await run('my-sola-app', { cwd, quiet: true });
  return path.join(cwd, 'my-sola-app');
}
