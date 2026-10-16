// Compiles every code sample the docs publish and runs it in a real browser.
//
// This exists because the docs' own "The .sola Format" example used to render
// the source text of an internal runtime function where a number belonged. A
// sample that cannot survive being compiled and mounted is not documentation,
// so it fails here before a reader ever meets it.
//
// No dev server needed: each snippet is compiled to an IIFE bundle, injected
// into about:blank alongside core's IIFE build, and asserted against the DOM.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { solaSnippets, jsSnippets, dataSnippets } from '../app/src/lib/data/docsSnippets';

const REPO_ROOT = join(__dirname, '..');

const CORE_IIFE = readFileSync(
  join(REPO_ROOT, 'packages/core/dist/sola-core.iife.js'),
  'utf8'
);

// The compiler is a real ESM package and these specs are transpiled to CJS,
// so it has to be pulled in dynamically rather than with a static import.
type CompileFn = (source: string, options?: Record<string, unknown>) => { code: string };
let compilePromise: Promise<CompileFn> | undefined;
function getCompiler(): Promise<CompileFn> {
  compilePromise ??= import(
    pathToFileURL(join(REPO_ROOT, 'packages/compiler/src/index.js')).href
  ).then((m) => m.compile as CompileFn);
  return compilePromise;
}

test.describe('published docs snippets', () => {
  for (const snippet of solaSnippets) {
    test(`.sola snippet "${snippet.id}" compiles and renders`, async ({ page }) => {
      const compile = await getCompiler();
      const { code } = compile(snippet.code, {
        target: 'iife',
        exportName: 'DocsSnippet',
        filename: `docs:${snippet.id}`
      });

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.goto('about:blank');
      await page.addScriptTag({ content: CORE_IIFE });
      await page.addScriptTag({ content: code });
      await page.evaluate((props) => {
        const host = document.createElement('div');
        host.id = 'host';
        document.body.appendChild(host);
        (window as any).DocsSnippet(host, props);
      }, snippet.props ?? {});

      const host = page.locator('#host');
      for (const expected of snippet.expectText) {
        await expect(host).toContainText(expected);
      }

      // The original bug rendered a function body into the DOM. Assert directly
      // against that failure mode, not just against the happy-path strings.
      const text = (await host.innerText()).trim();
      expect(text, 'snippet must not render function source').not.toMatch(/=>\s*\{|function\s*\(/);
      expect(text, 'snippet must not render NaN').not.toContain('NaN');
      expect(text, 'snippet must not render undefined').not.toContain('undefined');

      if (snippet.click) {
        await host.locator(snippet.click).first().click();
        for (const expected of snippet.expectAfterClick ?? []) {
          await expect(host).toContainText(expected);
        }
      }

      expect(pageErrors, 'snippet must not throw').toEqual([]);
    });
  }

  for (const snippet of jsSnippets) {
    test(`runtime snippet "${snippet.id}" produces its documented output`, async ({ page }) => {
      // Rewrite the sample's bare import to read from the IIFE global, leaving
      // every other line — the part a reader copies — executed verbatim.
      const executable = snippet.code.replace(
        /import\s*\{([^}]+)\}\s*from\s*'@sola-air-ui\/core';/,
        'const {$1} = window.SolaCore;'
      );

      await page.goto('about:blank');
      await page.addScriptTag({ content: CORE_IIFE });

      const logs = await page.evaluate((src) => {
        const captured: string[] = [];
        const original = console.log;
        console.log = (...args: unknown[]) => captured.push(args.map(String).join(' '));
        try {
          new Function(src)();
        } finally {
          console.log = original;
        }
        return captured;
      }, executable);

      expect(logs).toEqual(snippet.expectLogs);
    });
  }
});

// The Persistent Shell guide promises state that survives a full page load, a
// style-isolated closed shadow root, and live sync between tabs. about:blank has
// no storage, so these run on a routed same-origin URL.
test.describe('persistent shell guide', () => {
  const ORIGIN = 'http://sola.test';

  async function servePortal(context: import('@playwright/test').BrowserContext) {
    await context.route(`${ORIGIN}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>portal</title><h1>Portal page</h1>' })
    );
  }

  async function mountDock(page: import('@playwright/test').Page, code: string) {
    await page.addScriptTag({ content: CORE_IIFE });
    await page.addScriptTag({ content: code });
    await page.evaluate(() => {
      (window as any).shell = (window as any).SolaCore.mountShell((window as any).Dock, {}, { id: 'portal-dock' });
    });
  }

  const inShell = (page: import('@playwright/test').Page, fn: string) =>
    page.evaluate((src) => new Function('root', `return (${src})`)((window as any).shell.root), fn);

  test('open state and typed notes survive navigation; tabs sync; sign-out clears', async ({ context }) => {
    const compile = await getCompiler();
    const snippet = solaSnippets.find((s) => s.id === 'persist-dock')!;
    const { code } = compile(snippet.code, { target: 'iife', exportName: 'Dock', filename: 'docs:persist-dock' });

    await servePortal(context);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${ORIGIN}/a`);
    await mountDock(page, code);

    // Shadow root is closed: the page cannot reach into it.
    expect(await page.evaluate(() => document.getElementById('portal-dock')!.shadowRoot)).toBeNull();
    // Component styles landed inside the shadow root, not document.head.
    expect(await inShell(page, `root.querySelectorAll('style').length`)).toBeGreaterThan(0);

    await inShell(page, `root.querySelector('button').click()`);
    await inShell(page, `(() => { const i = root.querySelector('input'); i.value = 'carry me'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    expect(await inShell(page, `!!root.querySelector('aside')`)).toBe(true);

    // Full navigation: a new document, same origin.
    await page.goto(`${ORIGIN}/b`);
    await mountDock(page, code);
    expect(await inShell(page, `!!root.querySelector('aside')`)).toBe(true);
    expect(await inShell(page, `root.querySelector('input').value`)).toBe('carry me');

    // A second tab starts from defaults (sessionStorage is per tab) but then syncs live.
    const other = await context.newPage();
    await other.goto(`${ORIGIN}/a`);
    await mountDock(other, code);
    expect(await inShell(other, `!!root.querySelector('aside')`)).toBe(false);
    await inShell(other, `root.querySelector('button').click()`);
    await inShell(other, `root.querySelector('button').click()`); // open, then closed
    await expect.poll(() => inShell(page, `!!root.querySelector('aside')`)).toBe(false);

    // Sign-out wipes this tab's state and resets the live signals.
    await inShell(page, `root.querySelector('button').click()`);
    await expect.poll(() => inShell(page, `!!root.querySelector('aside')`)).toBe(true);
    await page.evaluate(() => (window as any).SolaCore.clearPersistentState());
    await expect.poll(() => inShell(page, `!!root.querySelector('aside')`)).toBe(false);
    await expect.poll(() => inShell(page, `root.querySelector('input').value`)).toBe('');
    expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('sola:')))).toEqual([]);

    expect(errors).toEqual([]);
  });
});

// The event bus: a host page talks to a shell inside a closed shadow root without
// importing anything, rejected input is dropped, and only `broadcast` types reach
// other tabs. Runs on a routed same-origin URL because about:blank has no storage.
test.describe('event bus', () => {
  const ORIGIN = 'http://sola.test';
  const COMPONENT = `<script>
    let toast = $state('');
    let ctx = $lastEvent('sola:context');
    $on('sola:toast', (t) => { toast = t.text; });
  </script>
  <div><p id="ctx">{ctx?.title}</p><p id="toast">{toast}</p></div>`;

  type PageT = import('@playwright/test').Page;
  const read = (page: PageT, sel: string) =>
    page.evaluate((s) => (window as any).shell.root.querySelector(s)?.textContent ?? null, sel);

  async function boot(page: PageT, code: string) {
    await page.addScriptTag({ content: CORE_IIFE });
    await page.addScriptTag({ content: code });
    await page.evaluate(() => {
      const core = (window as any).SolaCore;
      core.configureBus({
        dom: { target: window, in: ['sola:context'], out: ['sola:navigate'] },
        broadcast: ['sola:toast'],
        validate: {
          'sola:context': (p: any) => typeof p?.title === 'string',
          'sola:toast': (p: any) => typeof p?.text === 'string',
        },
        onReject: (i: any) => ((window as any).rejections ||= []).push(i),
      });
      (window as any).shell = core.mountShell((window as any).Comp, {}, { id: 'bus-shell' });
    });
  }

  test('host CustomEvents reach a closed shadow root; bad input is dropped; only broadcast types cross tabs', async ({ context }) => {
    const compile = await getCompiler();
    const { code } = compile(COMPONENT, { target: 'iife', exportName: 'Comp', filename: 'docs:bus' });
    await context.route(`${ORIGIN}/**`, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>portal</title><h1>page</h1>' }));

    const a = await context.newPage();
    const errors: string[] = [];
    a.on('pageerror', (e) => errors.push(e.message));
    await a.goto(`${ORIGIN}/a`);
    await boot(a, code);

    // A host script with no Sola import dispatches a plain CustomEvent.
    await a.evaluate(() => window.dispatchEvent(new CustomEvent('sola:context', { detail: { title: 'INC0012' } })));
    await expect.poll(() => read(a, '#ctx')).toBe('INC0012');

    // The shell sits in a closed root: the page cannot read it.
    expect(await a.evaluate(() => document.getElementById('bus-shell')!.shadowRoot)).toBeNull();

    // Malformed input and unlisted types are dropped, and reported without the payload.
    await a.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sola:context', { detail: { title: 99, secret: 'hunter2' } }));
      window.dispatchEvent(new CustomEvent('sola:toast', { detail: { text: 'from-the-dom' } })); // not in dom.in
    });
    await a.waitForTimeout(100);
    expect(await read(a, '#ctx')).toBe('INC0012');
    expect(await read(a, '#toast')).toBe('');
    const rejections = await a.evaluate(() => (window as any).rejections);
    expect(rejections).toEqual([{ type: 'sola:context', reason: 'invalid', from: 'dom', direction: 'in' }]);
    expect(JSON.stringify(rejections)).not.toContain('hunter2');

    // A second tab: a broadcast type arrives, a local-only type does not.
    const b = await context.newPage();
    await b.goto(`${ORIGIN}/b`);
    await boot(b, code);
    await b.evaluate(() => {
      const bus = (window as any).SolaCore.bus;
      bus.emit('sola:toast', { text: 'saved in tab B' });
      bus.emit('sola:context', { title: 'only-in-B' });
    });
    await expect.poll(() => read(a, '#toast')).toBe('saved in tab B');
    await a.waitForTimeout(150);
    expect(await read(a, '#ctx')).toBe('INC0012');

    // dom.out: bus -> host CustomEvent, readable by the host without importing Sola.
    await a.evaluate(() => {
      (window as any).navs = [];
      window.addEventListener('sola:navigate', (e: any) => (window as any).navs.push(e.detail));
      (window as any).SolaCore.bus.emit('sola:navigate', { view: 'triage' });
    });
    expect(await a.evaluate(() => (window as any).navs)).toEqual([{ view: 'triage' }]);

    expect(errors).toEqual([]);
  });
});


// $data snippets call the Sola Relay, so they cannot run like the snippets above.
// The relay request is answered here with fixed rows, which still proves the
// published code compiles, reads the { loading, data, error } signal correctly
// and renders what the relay sends back.
test.describe('published $data snippets', () => {
  for (const snippet of dataSnippets) {
    test(`$data snippet "${snippet.id}" renders rows from the relay`, async ({ page }) => {
      const compile = await getCompiler();
      const { code } = compile(snippet.code, {
        target: 'iife',
        exportName: 'DocsSnippet',
        filename: `docs:${snippet.id}`
      });

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      let relayBody: Record<string, unknown> | undefined;
      const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS'
      };
      await page.route('**/api/query', async (route) => {
        const request = route.request();
        if (request.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: cors });
          return;
        }
        relayBody = request.postDataJSON();
        // Hold the answer back briefly so the loading state is observable.
        await new Promise((r) => setTimeout(r, 300));
        await route.fulfill({
          status: 200,
          headers: { ...cors, 'content-type': 'application/json' },
          body: JSON.stringify({ rows: snippet.rows, rowCount: snippet.rows.length })
        });
      });

      await page.goto('about:blank');
      await page.addScriptTag({ content: CORE_IIFE });
      await page.addScriptTag({ content: code });
      await page.evaluate(() => {
        const host = document.createElement('div');
        host.id = 'host';
        document.body.appendChild(host);
        (window as any).DocsSnippet(host, {});
      });

      const host = page.locator('#host');
      for (const expected of snippet.expectText) {
        await expect(host).toContainText(expected);
      }

      const text = (await host.innerText()).trim();
      expect(text, 'snippet must not render undefined').not.toContain('undefined');
      expect(text, 'snippet must not render function source').not.toMatch(/=>\s*\{|function\s*\(/);
      expect(relayBody?.source, 'the relay is asked for the source the snippet names').toBeTruthy();
      expect(pageErrors, 'snippet must not throw').toEqual([]);
    });
  }
});
