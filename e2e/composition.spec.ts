// A .sola component can render another with <Child prop={...} />. These tests
// compile a real parent and child, mount them in a browser, and check what a
// developer relies on: props from signals arrive and update, and a child that
// leaves the page stops running.

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = join(__dirname, '..');
const CORE_IIFE = readFileSync(join(REPO_ROOT, 'packages/core/dist/sola-core.iife.js'), 'utf8');

type CompileFn = (source: string, options?: Record<string, unknown>) => { code: string };
let compilePromise: Promise<CompileFn> | undefined;
function getCompiler(): Promise<CompileFn> {
  compilePromise ??= import(pathToFileURL(join(REPO_ROOT, 'packages/compiler/src/index.js')).href).then(
    (m) => m.compile as CompileFn
  );
  return compilePromise;
}

const CHIP = `<script>
  export let title = 'none';
  export let tick = null;
  let clicks = $state(0);
  onDestroy(() => { window.__log.push('destroyed:' + title); });
  // Runs whenever the parent's tick changes. A removed child must stop doing this.
  createEffect(() => { if (typeof tick === 'function') tick(); window.__tickRuns[title] = (window.__tickRuns[title] || 0) + 1; });
</script>
<span class="chip" onclick={() => clicks += 1}>{title}:{clicks}</span>`;

async function mountParent(page: Page, parentSource: string) {
  const compile = await getCompiler();
  const child = compile(CHIP, { target: 'iife', exportName: 'Chip', filename: 'Chip.sola' }).code;
  const parent = compile(parentSource, { target: 'iife', exportName: 'Parent', filename: 'Parent.sola' }).code;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('about:blank');
  await page.evaluate(() => { (window as any).__log = []; (window as any).__tickRuns = {}; });
  await page.addScriptTag({ content: CORE_IIFE });
  await page.addScriptTag({ content: child });
  await page.addScriptTag({ content: parent.replace(/^\s*import[^\n]*\n/gm, '') });
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'host';
    document.body.appendChild(host);
    (window as any).__teardown = (window as any).Parent(host, {});
  });
  return errors;
}

const click = (page: Page, id: string) =>
  page.evaluate(async (i) => {
    (document.getElementById(i) as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 30));
  }, id);

test.describe('child components', () => {
  test('a prop from a signal expression arrives, and updates when the signal changes', async ({ page }) => {
    const errors = await mountParent(page, `<script>
  import Chip from './Chip.sola';
  let ctx = $state({ title: 'Incident 42' });
  function rename() { ctx = { title: 'Incident 43' }; }
</script>
<div><Chip title={ctx.title} /><button id="rename" onclick={rename}>rename</button></div>`);
    await expect(page.locator('.chip')).toHaveText('Incident 42:0');
    await click(page, 'rename');
    await expect(page.locator('.chip')).toHaveText('Incident 43:0');
    await expect(page.locator('.chip')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('the old child is torn down when a prop change re-mounts it', async ({ page }) => {
    await mountParent(page, `<script>
  import Chip from './Chip.sola';
  let ctx = $state({ title: 'A' });
  function rename() { ctx = { title: 'B' }; }
</script>
<div><Chip title={ctx.title} /><button id="rename" onclick={rename}>rename</button></div>`);
    await click(page, 'rename');
    expect(await page.evaluate(() => (window as any).__log)).toEqual(['destroyed:A']);
  });

  test('a child inside {#if} is destroyed when the branch closes, and stops reacting', async ({ page }) => {
    await mountParent(page, `<script>
  import Chip from './Chip.sola';
  let open = $state(true);
  let tick = $state(0);
  function close() { open = false; }
  function bump() { tick += 1; }
</script>
<div>{#if open}<Chip title="inside" tick={tick} />{/if}<button id="close" onclick={close}>c</button><button id="bump" onclick={bump}>b</button></div>`);
    const runs = () => page.evaluate(() => (window as any).__tickRuns['inside']);
    expect(await runs()).toBe(1);
    await click(page, 'bump');
    expect(await runs()).toBe(2); // alive: reacts to the shared signal

    await click(page, 'close');
    await expect(page.locator('.chip')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__log)).toEqual(['destroyed:inside']);

    await click(page, 'bump');
    await click(page, 'bump');
    expect(await runs(), 'the removed child no longer runs its effect').toBe(2);
  });

  test('toggling a branch repeatedly does not pile up live effects', async ({ page }) => {
    await mountParent(page, `<script>
  import Chip from './Chip.sola';
  let open = $state(true);
  let tick = $state(0);
  function toggle() { open = !open; }
  function bump() { tick += 1; }
</script>
<div>{#if open}<Chip title="t" tick={tick} />{/if}<button id="toggle" onclick={toggle}>t</button><button id="bump" onclick={bump}>b</button></div>`);
    for (let i = 0; i < 5; i++) { await click(page, 'toggle'); await click(page, 'toggle'); }
    const before = await page.evaluate(() => (window as any).__tickRuns['t']);
    await click(page, 'bump');
    const after = await page.evaluate(() => (window as any).__tickRuns['t']);
    expect(after - before, 'one live child reacts once to one change').toBe(1);
  });

  test('a keyed {#each} item destroys its child when removed', async ({ page }) => {
    await mountParent(page, `<script>
  import Chip from './Chip.sola';
  let items = $state([{ id: 1, name: 'one' }, { id: 2, name: 'two' }, { id: 3, name: 'three' }]);
  function drop() { items = items.filter(i => i.id !== 2); }
</script>
<div>{#each items as it (it.id)}<Chip title={it.name} />{/each}<button id="drop" onclick={drop}>d</button></div>`);
    await expect(page.locator('.chip')).toHaveCount(3);
    await click(page, 'drop');
    await expect(page.locator('.chip')).toHaveCount(2);
    expect(await page.evaluate(() => (window as any).__log)).toEqual(['destroyed:two']);
  });

  test('a prop that is a bare $state name still passes the live accessor', async ({ page }) => {
    await mountParent(page, `<script>
  import Chip from './Chip.sola';
  let name = $state('first');
  function rename() { name = 'second'; }
</script>
<div><Chip title={name} /><button id="rename" onclick={rename}>r</button></div>`);
    // The accessor is passed as-is, as before: the child is not re-mounted on change.
    await click(page, 'rename');
    expect(await page.evaluate(() => (window as any).__log)).toEqual([]);
  });

  test('tearing down the parent destroys its children', async ({ page }) => {
    await mountParent(page, `<script>
  import Chip from './Chip.sola';
  let ctx = $state({ title: 'kid' });
</script>
<div><Chip title={ctx.title} /></div>`);
    await page.evaluate(() => (window as any).__teardown());
    expect(await page.evaluate(() => (window as any).__log)).toEqual(['destroyed:kid']);
  });
});
