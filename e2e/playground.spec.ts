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
