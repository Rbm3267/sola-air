#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { version: CLI_VERSION } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// Dependency ranges written into every scaffolded project. Kept here as the
// single source and checked against the workspace manifests by
// test/scaffold.test.js, so a package release cannot silently leave the
// scaffold pointing at versions that were never published.
export const SOLA_DEPS = {
  dependencies: {
    '@sola-air-ui/core': '^1.1.1',
    '@sola-air-ui/ui': '^1.3.0'
  },
  devDependencies: {
    '@sola-air-ui/compiler': '^1.0.8',
    '@sola-air-ui/vite-plugin-sola': '^1.0.3',
    'vite': '^6.0.0'
  }
};

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  emerald: '\x1b[38;2;16;185;129m',
  sky: '\x1b[38;2;14;165;233m',
  amber: '\x1b[38;2;245;158;11m',
  slate: '\x1b[38;2;148;163;184m'
};

const defaultProjectName = 'my-sola-app';

// Exported so tests can scaffold into a temp directory without going through
// argv or stdin. Only the CLI entrypoint below prompts.
export async function run(targetArg, { cwd = process.cwd(), quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;

  log(`
${c.emerald}   ✧ ${c.reset}
${c.emerald} ✧ ◯ ✧  ${c.bold}create-sola v${CLI_VERSION}${c.reset}
${c.emerald}   ✧   ${c.slate}Zero-VDOM Ambient Reactive Runtime${c.reset}
`);

  let projectName = targetArg;
  if (!projectName) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    projectName = await new Promise((resolve) => {
      rl.question(`${c.bold}? Project name:${c.reset} ${c.dim}(${defaultProjectName})${c.reset} `, (answer) => {
        resolve(answer.trim() || defaultProjectName);
      });
    });
    rl.close();
  }

  const targetDir = path.resolve(cwd, projectName);

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    throw new Error(`Directory '${projectName}' is not empty.`);
  }

  log(`\n${c.dim}Scaffolding project in${c.reset} ${c.bold}${targetDir}${c.reset}...\n`);

  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });

  // 1. package.json
  const pkg = {
    name: projectName,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: { ...SOLA_DEPS.dependencies },
    devDependencies: { ...SOLA_DEPS.devDependencies }
  };
  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  // 2. vite.config.js
  // Uses the published plugin rather than a hand-rolled copy, so a scaffolded
  // project and the documented setup are the same code path.
  const viteConfig = `import { defineConfig } from 'vite';
import sola from '@sola-air-ui/vite-plugin-sola';

export default defineConfig({
  plugins: [sola()]
});
`;
  fs.writeFileSync(path.join(targetDir, 'vite.config.js'), viteConfig);

  // 3. index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName} — Powered by Sola</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2'><circle cx='12' cy='12' r='8'/></svg>" />
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #090d19;
        color: #f8fafc;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtml);

  // 4. src/App.sola
  const appSola = `<script>
  let title = "${projectName}";
  let count = $state(0);
  let double = $derived(count * 2);

  function increment() {
    count++;
  }

  function reset() {
    count = 0;
  }
</script>

<div class="sola-app">
  <div class="badge">Zero-VDOM Native</div>
  <h1>{title}</h1>
  <p class="subtitle">Fine-grained reactive signals running directly on raw DOM nodes.</p>

  <div class="counter-card">
    <div class="metric-row">
      <div class="stat">
        <span class="label">Count</span>
        <span class="val">{count}</span>
      </div>
      <div class="stat">
        <span class="label">Double</span>
        <span class="val text-emerald">{double}</span>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" onclick={increment}>Increment (+1)</button>
      <button class="btn btn-secondary" onclick={reset}>Reset</button>
    </div>
  </div>
</div>

<style>
  .sola-app {
    text-align: center;
    max-width: 480px;
    padding: 32px 24px;
  }

  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    font-family: monospace;
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
    margin-bottom: 16px;
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 900;
    margin: 0 0 8px 0;
    letter-spacing: -0.03em;
  }

  .subtitle {
    color: #94a3b8;
    font-size: 0.95rem;
    margin: 0 0 28px 0;
    line-height: 1.5;
  }

  .counter-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(16px);
    border-radius: 24px;
    padding: 28px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .metric-row {
    display: flex;
    justify-content: space-around;
    margin-bottom: 24px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
    font-family: monospace;
  }

  .val {
    font-size: 2rem;
    font-weight: 900;
  }

  .text-emerald {
    color: #10b981;
  }

  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .btn {
    padding: 10px 18px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }

  .btn-primary {
    background: #10b981;
    color: #022c22;
  }

  .btn-primary:hover {
    background: #34d399;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.12);
  }
</style>
`;
  fs.writeFileSync(path.join(targetDir, 'src', 'App.sola'), appSola);

  // 5. src/main.js
  const mainJs = `import App from './App.sola';

const container = document.getElementById('app');
if (container) {
  App(container);
}
`;
  fs.writeFileSync(path.join(targetDir, 'src', 'main.js'), mainJs);

  // 6. .gitignore
  const gitignore = `node_modules
dist
.DS_Store
`;
  fs.writeFileSync(path.join(targetDir, '.gitignore'), gitignore);

  // 7. README.md
  const readme = `# ${projectName}

Built with [Sola](https://sola-air.dev) — Zero-VDOM Ambient Reactive Runtime.

## Quickstart

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build for Production

\`\`\`bash
npm run build
\`\`\`
`;
  fs.writeFileSync(path.join(targetDir, 'README.md'), readme);

  log(`${c.emerald}✔ Project created successfully!${c.reset}\n`);
  log(`To get started:\n`);
  log(`  ${c.bold}cd ${projectName}${c.reset}`);
  log(`  ${c.bold}npm install${c.reset}`);
  log(`  ${c.bold}npm run dev${c.reset}\n`);

  return targetDir;
}

// Only scaffold when run as a command, so importing this module for tests is safe.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (invokedDirectly) {
  run(process.argv[2]).catch((err) => {
    console.error(`\n${c.amber}Error: ${err.message}${c.reset}`);
    process.exit(1);
  });
}
