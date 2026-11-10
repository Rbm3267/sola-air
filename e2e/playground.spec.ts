// The playground on /demo opens on the Native tab, but generated cards are drawn
// in Custom Grid only, so typing an intent from any other tab looked like it did
// nothing. Its card controls also appeared only on hover, which a touch screen
// never does, so an iPad could not resize or move a card.

import { test, expect } from '@playwright/test';

const reply = [{ component: 'DataCard', config: { title: 'Probe metric', value: '4242 probes', trend: 'steady', icon: 'activity' } }];

test('typing an intent from another tab shows the generated card', async ({ page }) => {
  await page.route('**/api/intent', (route) => route.fulfill({ json: reply }));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /Behavioral Intent/ }).or(page.getByText('Behavioral Intent').first()).click();

  await page.getByPlaceholder(/Speak or type intent/).fill('Show cash runway');
  await page.getByPlaceholder(/Speak or type intent/).press('Enter');

  await expect(page.getByText('Probe metric').first()).toBeVisible();
});

test('a suggestion also shows its card', async ({ page }) => {
  await page.route('**/api/intent', (route) => route.fulfill({ json: reply }));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add a CPU temperature gauge with 72% load' }).click();
  await expect(page.getByText('Probe metric').first()).toBeVisible();
});

test('card controls are visible without hover on a touch device', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByText('Custom Grid').first().tap();
  await page.getByRole('button', { name: /Finance/ }).tap();
  const width = page.getByTitle('Toggle width (1x / 2x / 3x)').first();
  await expect(width).toBeVisible();
  const opacity = await width.evaluate((el) => getComputedStyle(el.closest('.widget-toolbar')!).opacity);
  expect(opacity).toBe('1');
  await width.tap();
  await context.close();
});

test('the Custom Grid and every preset draw without a page error', async ({ page }) => {
  // A gauge with a color it did not know threw while rendering and blanked the
  // whole view, so nothing generated could ever appear.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Custom Grid/ }).click();
  await expect(page.getByText('p99 Latency SLA')).toBeVisible();
  for (const preset of [/Enterprise Operations/, /Finance/, /SaaS Cloud/]) {
    await page.getByRole('button', { name: preset }).click();
    await page.waitForTimeout(300);
  }
  expect(errors).toEqual([]);
});

test('a failed request shows a message instead of nothing', async ({ page }) => {
  await page.route('**/api/intent', (route) => route.fulfill({ status: 500, json: { error: 'Unable to process AI request at this time. Please try again.' } }));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder(/Speak or type intent/).fill('anything');
  await page.getByPlaceholder(/Speak or type intent/).press('Enter');
  await expect(page.getByRole('alert')).toContainText('Unable to process AI request');
});

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

test('each preset replaces the cards on the Custom Grid', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Custom Grid/ }).click();
  await page.getByRole('button', { name: /Finance/ }).click();
  await expect(page.getByText('Monthly Recurring Revenue')).toBeVisible();
  await page.getByRole('button', { name: /SaaS Cloud/ }).click();
  await expect(page.getByText('Enterprise ARR').first()).toBeVisible();
  await expect(page.getByText('Monthly Recurring Revenue')).toHaveCount(0);
});

// ---- Generate tab ---------------------------------------------------------

const GOOD = `<script>
  let n = $state(0);
  let doubled = $derived(n * 2);
  function inc() { n += 1; }
</script>
<div class="box"><p id="out">count {n}, doubled {doubled}</p><button id="go" onclick={inc}>Add</button></div>
<style>.box { padding: 8px; }</style>`;

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
