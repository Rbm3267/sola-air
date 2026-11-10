// The code exporters on /components, /studio and /demo all go through
// app/src/lib/data/solaExport.ts. Each used to emit code that did not work:
// JSX tags for components that are mount functions, a `config={...}` prop no
// component takes, a CDN URL and custom elements that do not exist. These
// checks run the generator over the site's real inputs and hold the output to
// what the package actually ships.

import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COMPONENT_CATALOG as PREVIEWS } from '../app/src/lib/data/componentCatalog';
import { PACKAGE_CATALOG_ADDITIONS } from '../app/src/lib/data/packageCatalog';

const COMPONENT_CATALOG = [...PREVIEWS, ...PACKAGE_CATALOG_ADDITIONS];
import {
  toSolaFile,
  mountComponentSnippet,
  previewNote,
  PACKAGE_EQUIVALENT,
  type UiManifest
} from '../app/src/lib/data/solaExport';
import { readUiManifest } from '../scripts/ui-manifest.mjs';
import { STUDIO_COMPONENTS, buildBlock, tidyGeneratedProps } from '../app/src/lib/data/studioComponents';
import { usageRecord } from '../app/src/lib/data/usage';
import { createLimiter } from '../app/src/lib/data/rateLimit';
import { STUDIO_TEMPLATES } from '../app/src/lib/data/studioTemplates';

const REPO_ROOT = join(__dirname, '..');
const UI: UiManifest = readUiManifest(REPO_ROOT);

type Diagnostic = { code: string; message: string };
let tools: Promise<{
  compile: (src: string, o?: object) => { code: string };
  checkSource: (src: string, f?: string) => Diagnostic[];
}>;
function getTools() {
  tools ??= Promise.all([
    import(pathToFileURL(join(REPO_ROOT, 'packages/compiler/src/index.js')).href),
    import(pathToFileURL(join(REPO_ROOT, 'packages/compiler/src/check.js')).href)
  ]).then(([c, k]) => ({ compile: c.compile, checkSource: k.checkSource }));
  return tools;
}

/** The output must compile, pass sola-check, and only use real imports and props. */
async function expectValidSola(source: string, name: string) {
  const { compile, checkSource } = await getTools();
  expect(checkSource(source, name), `${name}: sola-check`).toEqual([]);
  expect(() => compile(source, { filename: name }), `${name}: compiles`).not.toThrow();

  const imports = [...source.matchAll(/import (\w+) from '([^']+)'/g)];
  for (const [, component, from] of imports) {
    expect(UI.subpaths[component], `${name}: ${component} is in @sola-air-ui/ui`).toBe(from);
  }
  for (const [, component, attrs] of source.matchAll(/<([A-Z]\w*) ([^>]*?)\/>/g)) {
    const used = [...attrs.matchAll(/(\w+)=/g)].map((m) => m[1]);
    for (const prop of used) {
      expect(UI.props[component], `${name}: <${component}> declares ${prop}`).toContain(prop);
    }
  }
  return imports.map((m) => m[1]);
}

test.describe('generated .sola code', () => {
  test('the manifest lists every shipped component with its props', () => {
    expect(Object.keys(UI.subpaths).length).toBeGreaterThanOrEqual(37);
    expect(UI.subpaths.DataCard).toBe('@sola-air-ui/ui/data-card');
    expect(UI.props.DataCard).toEqual(['title', 'value', 'trend', 'period', 'tone']);
  });

  for (const entry of COMPONENT_CATALOG.filter((c) => c.componentName in UI.subpaths)) {
    test(`/components exports ${entry.componentName} as working code`, async () => {
      const source = toSolaFile([{ component: entry.componentName, props: entry.defaultConfig }], UI);
      expect(await expectValidSola(source, `${entry.id}.sola`)).toEqual([entry.componentName]);

      const mount = mountComponentSnippet(entry.componentName, entry.defaultConfig, UI);
      expect(mount).toContain(`import ${entry.componentName} from '${UI.subpaths[entry.componentName]}';`);
      expect(mount).toContain(`${entry.componentName}(document.getElementById('app'),`);
    });
  }

  test('a site preview says there is nothing to install, and names the real equivalent', () => {
    const note = previewNote('SolaButton', UI);
    expect(note).toContain('not part of @sola-air-ui/ui');
    expect(note).toContain(`import Button from '${UI.subpaths.Button}';`);
    expect(note).not.toMatch(/<SolaButton/);
    for (const [preview, real] of Object.entries(PACKAGE_EQUIVALENT)) {
      expect(UI.subpaths[real], `${preview} points at ${real}, which must ship`).toBeTruthy();
    }
  });

  // Studio offers only real components, and a block is the component and props
  // the canvas mounts, so every template must export a file that compiles and
  // names only what the package ships.
  const templateItems = (id: string) =>
    STUDIO_TEMPLATES.find((t) => t.id === id)!.blocks
      .map((b) => buildBlock(b.component, b.props, b.span, UI.props[b.component] ?? []))
      .filter((b): b is NonNullable<typeof b> => !!b);

  test('every Studio component is published, and its sample uses declared props only', async () => {
    for (const c of STUDIO_COMPONENTS) {
      expect(UI.subpaths[c.name], `${c.name} must ship in @sola-air-ui/ui`).toBeTruthy();
      expect(UI.subpaths[c.name].endsWith(c.id), `${c.name} id matches its subpath`).toBe(true);
      for (const k of Object.keys(c.sample)) expect(UI.props[c.name], `${c.name}.${k}`).toContain(k);
    }
  });

  test('every Studio template exports a .sola file that compiles', async () => {
    for (const t of STUDIO_TEMPLATES) {
      const items = templateItems(t.id);
      expect(items.length, `${t.id} keeps every block`).toBe(t.blocks.length);
      const source = toSolaFile(items, UI);
      await expectValidSola(source, `${t.id}.sola`);
      expect(source).not.toContain('not in @sola-air-ui/ui');
    }
  });

  test('an exported Studio template mounts and renders in a browser', async ({ page }) => {
    const { compile } = await getTools();
    const { readFileSync } = await import('node:fs');
    const items = templateItems('revenue');
    const source = toSolaFile(items, UI);

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('about:blank');
    await page.addScriptTag({ content: readFileSync(join(REPO_ROOT, 'packages/core/dist/sola-core.iife.js'), 'utf8') });
    // The no-bundler build reads imported components from window, under their own names.
    for (const name of [...new Set(items.map((i) => i.component))]) {
      const file = join(REPO_ROOT, 'packages/ui/src', `${name}.sola`);
      const { code } = compile(readFileSync(file, 'utf8'), { target: 'iife', exportName: name, filename: name + '.sola' });
      await page.addScriptTag({ content: code });
    }
    const { code } = compile(source, { target: 'iife', exportName: 'Dashboard', filename: 'Dashboard.sola' });
    await page.addScriptTag({ content: code });
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'app';
      document.body.appendChild(host);
      (window as any).Dashboard(host);
    });

    const app = page.locator('#app');
    for (const text of ['Monthly revenue', '$48,500', 'Quarter target', 'Weekly revenue', 'Net margin']) {
      await expect(app).toContainText(text);
    }
    expect(errors).toEqual([]);
  });

  test('/demo widgets keep published components and comment out previews', async () => {
    const source = toSolaFile(
      [
        { component: 'DataCard', span: 1, props: { title: 'Edge Requests', value: '42.8M / hr', trend: '+12%', icon: 'activity' }, label: 'Edge Requests' },
        { component: 'GaugeCard', span: 1, props: { title: 'p99', value: '18 ms', percentage: 94, subtext: 'ok', color: 'indigo' } },
        { component: 'ListBlock', span: 2, props: { title: 'Clusters', items: [] }, label: 'Clusters' }
      ],
      UI
    );
    await expectValidSola(source, 'Demo.sola');
    expect(source, 'icon is not a DataCard prop').not.toContain('icon=');
    expect(source).toContain('"Clusters" (ListBlock): a preview on this site');
    expect(source).not.toContain('config=');
  });
});

test.describe('generated Studio props', () => {
  test('a generated gauge drops the demo badge and live-feed footer', () => {
    const p = tidyGeneratedProps('GaugeCard', { title: 'Uptime', value: '99%' });
    expect(p.badge).toBe('');
    expect(p.footerLeft).toBe('');
    expect(p.footerRight).toBe('');
  });

  test('a footer the model wrote on purpose is kept', () => {
    expect(tidyGeneratedProps('GaugeCard', { footerLeft: 'Updated daily' }).footerLeft).toBe('Updated daily');
  });

  test('a dial readout that is only a unit is dropped, a number is kept', () => {
    expect(tidyGeneratedProps('TactileDialCard', { metric: 'kHz', unit: 'kHz' })).not.toHaveProperty('metric');
    expect(tidyGeneratedProps('TactileDialCard', { metric: '250 kHz' }).metric).toBe('250 kHz');
  });

  test('other components and bad input pass through', () => {
    expect(tidyGeneratedProps('DataCard', { title: 'x' })).toEqual({ title: 'x' });
    expect(tidyGeneratedProps('DataCard', null)).toEqual({});
  });
});

test.describe('AI usage log line', () => {
  test('carries the counts and nothing else', () => {
    const r = usageRecord('studio', 'gemini-x', { promptTokenCount: 2100, candidatesTokenCount: 800, thoughtsTokenCount: 50, totalTokenCount: 2950 });
    expect(r).toEqual({ event: 'ai_usage', mode: 'studio', model: 'gemini-x', inputTokens: 2100, outputTokens: 800, thinkingTokens: 50, totalTokens: 2950 });
  });
  test('adds the parts when the API gives no total, and tolerates missing data', () => {
    expect(usageRecord('sola', 'm', { promptTokenCount: 10, candidatesTokenCount: 5 }).totalTokens).toBe(15);
    expect(usageRecord('sola', 'm', undefined)).toMatchObject({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });
});

test.describe('per-visitor limit', () => {
  test('allows up to the limit, then says how long to wait', () => {
    const l = createLimiter({ windowMs: 1000 * 60 * 60 * 24, max: 3 });
    const t0 = 1_000_000;
    expect([l.hit('a', t0), l.hit('a', t0 + 1000), l.hit('a', t0 + 2000)]).toEqual([0, 0, 0]);
    const wait = l.hit('a', t0 + 3000);
    // The oldest hit leaves the window a day after it was made.
    expect(wait).toBe(24 * 60 * 60 - 3);
  });

  test('one visitor at the limit does not block another', () => {
    const l = createLimiter({ windowMs: 60_000, max: 1 });
    l.hit('a', 0);
    expect(l.hit('a', 1)).toBeGreaterThan(0);
    expect(l.hit('b', 1)).toBe(0);
  });

  test('frees up once the window has passed', () => {
    const l = createLimiter({ windowMs: 60_000, max: 1 });
    l.hit('a', 0);
    expect(l.hit('a', 30_000)).toBeGreaterThan(0);
    expect(l.hit('a', 60_001)).toBe(0);
  });

  test('a flood of different addresses cannot grow memory without bound', () => {
    const l = createLimiter({ windowMs: 60_000, max: 1, maxKeys: 50 });
    for (let i = 0; i < 500; i++) l.hit('ip' + i, i);
    expect(l.size).toBeLessThanOrEqual(50);
  });
});
