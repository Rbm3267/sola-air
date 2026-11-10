// The playground on /demo. Its intent box hands the request to Studio, which builds
// the layout from the real @sola-air-ui/ui components. The other tabs are demos: a
// mock sheet whose cards recalculate, and a Generate tab that compiles a model's
// .sola file and runs it in a sealed frame.

import { test, expect } from '@playwright/test';

const studioReply = {
  blocks: [{ component: 'DataCard', span: 1, props: { title: 'Probe metric', value: '4242', trend: '+1%' } }]
};

test('the playground has no Custom Grid tab', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: /Custom Grid/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mock Sheet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeVisible();
});

test('typing an intent opens Studio and builds it there', async ({ page }) => {
  const bodies: any[] = [];
  await page.route('**/api/intent', (route) => {
    bodies.push(route.request().postDataJSON());
    route.fulfill({ json: studioReply });
  });
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder(/Speak or type intent/).fill('a probe dashboard');
  await page.getByPlaceholder(/Speak or type intent/).press('Enter');

  await expect(page).toHaveURL(/\/studio/);
  await expect(page.locator('[data-block="DataCard"]').first()).toBeVisible();
  await expect(page.getByText('Probe metric').first()).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ mode: 'studio', intent: 'a probe dashboard' });
  // The request is applied once; left in the address, a reload would repeat it.
  expect(page.url()).not.toContain('ask=');
});

test('a suggestion opens Studio with that request', async ({ page }) => {
  const bodies: any[] = [];
  await page.route('**/api/intent', (route) => {
    bodies.push(route.request().postDataJSON());
    route.fulfill({ json: studioReply });
  });
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Show Q3 revenue and churn rate for enterprise tier' }).click();
  await expect(page).toHaveURL(/\/studio/);
  await expect(page.getByText('Probe metric').first()).toBeVisible();
  expect(bodies[0].intent).toBe('Show Q3 revenue and churn rate for enterprise tier');
});

test('Studio keeps its width control on screen on a touch device', async ({ browser }) => {
  // The playground's old grid hid its controls until hover, which a touch screen
  // never does. Studio shows its Width buttons whenever a block is selected.
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/studio');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /^Edit / }).first().tap();
  const width = page.getByRole('group', { name: 'Width' });
  await expect(width).toBeVisible();
  await width.getByRole('button', { name: '3' }).tap();
  await expect(width.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
  await context.close();
});

const GOOD = `<script>
  let n = $state(0);
  let doubled = $derived(n * 2);
  function inc() { n += 1; }
</script>
<div class="box"><p id="out">count {n}, doubled {doubled}</p><button id="go" onclick={inc}>Add</button></div>
<style>.box { padding: 8px; }</style>`;

test('the mock sheet recalculates its cards when a cell changes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Mock Sheet' }).click();
  await expect(page.getByText('$184,200').first()).toBeVisible();
  await expect(page.getByText('24.0 months')).toBeVisible();

  await page.getByLabel('MRR for Nov').fill('200000');
  await expect(page.getByText('$200,000').first()).toBeVisible();
  await expect(page.getByText('+14.3% vs Oct')).toBeVisible();

  await page.getByLabel('Burn for Nov').fill('0');
  await expect(page.getByText('—').first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset sample data' }).click();
  await expect(page.getByText('$184,200').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('Generate compiles the model\'s file and runs it in a sealed frame', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/intent', (route) => route.fulfill({ json: { source: GOOD } }));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByLabel('What should it build?').fill('a counter');
  await page.getByRole('button', { name: 'Generate', exact: true }).last().click();

  const iframe = page.locator('iframe[title="Generated component"]');
  await expect(iframe).toBeVisible();
  // No allow-same-origin: the frame cannot reach this page.
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
  const inner = page.frameLocator('iframe[title="Generated component"]');
  await expect(inner.locator('#out')).toHaveText('count 0, doubled 0');
  await inner.locator('#go').click();
  await expect(inner.locator('#out')).toHaveText('count 1, doubled 2');

  await page.getByRole('button', { name: /Source \(\.sola\)/ }).click();
  await expect(page.locator('pre')).toContainText('let n = $state(0)');
  expect(errors).toEqual([]);
});

test('Generate asks once for a fix when the file does not compile', async ({ page }) => {
  let calls = 0;
  const bodies: any[] = [];
  await page.route('**/api/intent', (route) => {
    calls += 1;
    bodies.push(route.request().postDataJSON());
    // An unclosed block compiles but would print as text, so the page rejects it.
    route.fulfill({ json: { source: calls === 1 ? '<script>let a = $state(1);</script>{#if a}<p>x</p>' : GOOD } });
  });
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByLabel('What should it build?').fill('a counter');
  await page.getByRole('button', { name: 'Generate', exact: true }).last().click();
  await expect(page.frameLocator('iframe[title="Generated component"]').locator('#out')).toBeVisible();
  expect(calls).toBe(2);
  expect(bodies[1].error).toContain('Unbalanced block');
  expect(bodies[1].previousSource).toContain('{#if a}');
});

test('a generated component cannot reach the page or the network', async ({ page }) => {
  const evil = `<script>
  let report = $state('running');
  $effect(() => {
    const out = [];
    try { out.push('parent:' + typeof window.parent.document.body); } catch { out.push('parent:blocked'); }
    try { out.push('storage:' + typeof localStorage.getItem('x')); } catch { out.push('storage:blocked'); }
    try { out.push('cookie:' + (document.cookie === '' ? 'empty' : 'readable')); } catch { out.push('cookie:blocked'); }
    fetch('/api/intent').then(() => { out.push('fetch:allowed'); report = out.join(' '); }).catch(() => { out.push('fetch:blocked'); report = out.join(' '); });
  });
</script>
<p id="r">{report}</p>`;
  const hits: string[] = [];
  await page.route('**/api/intent', (route) => {
    const body = route.request().postDataJSON?.() ?? {};
    if (body?.mode === 'sola') return route.fulfill({ json: { source: evil } });
    hits.push('network');
    return route.fulfill({ json: {} });
  });
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByLabel('What should it build?').fill('anything');
  await page.getByRole('button', { name: 'Generate', exact: true }).last().click();
  const r = page.frameLocator('iframe[title="Generated component"]').locator('#r');
  await expect(r).toContainText('fetch:blocked');
  await expect(r).toContainText('parent:blocked');
  await expect(r).toContainText('storage:blocked');
  expect(hits).toEqual([]);
});

test('Generate shows the reason when the model fails', async ({ page }) => {
  await page.route('**/api/intent', (route) => route.fulfill({ status: 503, json: { error: 'Arc is offline: this server has no model key configured.' } }));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByLabel('What should it build?').fill('a counter');
  await page.getByRole('button', { name: 'Generate', exact: true }).last().click();
  await expect(page.getByRole('alert')).toContainText('offline');
});
