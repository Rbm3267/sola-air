// Studio arranges real @sola-air-ui/ui components. What the canvas mounts and
// what Export writes are the same component and props, so these tests change a
// block on the canvas and read the result in both places.

import { test, expect, type Page } from '@playwright/test';

async function open(page: Page, query = '') {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio' + query);
  await page.evaluate(() => localStorage.removeItem('sola-studio-v2'));
  await page.goto('/studio' + query);
  await page.waitForLoadState('networkidle');
}

const blocks = (page: Page) => page.locator('main [data-block]');

async function exportedCode(page: Page) {
  await page.getByRole('button', { name: 'Export .sola' }).click();
  const code = await page.getByRole('dialog', { name: 'Export' }).locator('pre').innerText();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Export' })).toHaveCount(0);
  return code;
}

test('every template mounts its components without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const id of ['revenue', 'on-call', 'signup', 'support', 'assistant']) {
    await open(page, `?template=${id}`);
    const n = await blocks(page).count();
    expect(n, `${id} has blocks`).toBeGreaterThan(2);
    for (let i = 0; i < n; i++) {
      await expect(blocks(page).nth(i).locator('.studio-block *').first(), `${id} block ${i} mounted`).toBeAttached();
    }
  }
  expect(errors).toEqual([]);
});

test('editing a prop changes the component and the exported file', async ({ page }) => {
  await open(page, '?template=revenue');
  await page.getByRole('button', { name: 'Edit DataCard' }).first().click();
  const title = page.getByLabel('title', { exact: true });
  await title.fill('Annual recurring revenue');
  await expect(blocks(page).first()).toContainText(/Annual recurring revenue/i);

  const code = await exportedCode(page);
  expect(code).toContain("import DataCard from '@sola-air-ui/ui/data-card';");
  expect(code).toContain('title="Annual recurring revenue"');
  expect(code).not.toContain('not in @sola-air-ui/ui');
});

test('JSON props are edited as JSON and bad JSON keeps the last good value', async ({ page }) => {
  await open(page, '?template=support');
  await page.getByRole('button', { name: 'Edit Table' }).click();
  const rows = page.getByLabel('rows', { exact: true });
  await rows.fill('[{"Name":"Delta Works","Seats":7}]');
  await expect(page.locator('main [data-block]').filter({ hasText: 'Delta Works' })).toHaveCount(1);
  await rows.fill('[{"Name": ');
  await expect(page.getByText(/Not valid JSON yet/)).toBeVisible();
  await expect(page.locator('main [data-block]').filter({ hasText: 'Delta Works' })).toHaveCount(1);
});

test('blocks can be added, resized, moved, duplicated and removed', async ({ page }) => {
  await open(page, '?template=revenue');
  const start = await blocks(page).count();
  await page.getByRole('button', { name: /^Badge/ }).click();
  await expect(blocks(page)).toHaveCount(start + 1);
  await expect(page.getByRole('complementary', { name: 'Properties' })).toContainText('Badge');

  await page.getByRole('button', { name: '3 col' }).click();
  await expect(blocks(page).last()).toHaveClass(/lg:col-span-3/);

  await page.getByRole('button', { name: 'Move Badge earlier' }).click();
  await expect(blocks(page).nth(start - 1)).toContainText('Badge');

  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(blocks(page)).toHaveCount(start + 2);
  await page.getByRole('button', { name: 'Remove Badge' }).first().click();
  await expect(blocks(page)).toHaveCount(start + 1);
});

test('the canvas survives a reload', async ({ page }) => {
  await open(page, '?template=signup');
  const n = await blocks(page).count();
  await page.getByRole('button', { name: 'Remove Alert' }).click();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(blocks(page)).toHaveCount(n - 1);
});

test('Arc fills the canvas with real components and drops anything else', async ({ page }) => {
  await page.route('**/api/intent', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.mode).toBe('studio');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        blocks: [
          { component: 'DataCard', span: 1, props: { title: 'Signups today', value: '312', icon: 'not-a-prop' } },
          { component: 'MadeUpWidget', span: 2, props: { title: 'Nope' } },
          { type: 'Badge', colSpan: 1, config: { label: 'On track', variant: 'success' } }
        ]
      })
    });
  });
  await open(page);
  await page.getByLabel('Describe a layout for Arc').fill('signups today with a status badge');
  await page.getByRole('button', { name: 'Generate with Arc' }).click();
  await expect(blocks(page)).toHaveCount(2);
  await expect(blocks(page).first()).toContainText('312');
  await expect(blocks(page).last()).toContainText('On track');

  const code = await exportedCode(page);
  expect(code).not.toContain('MadeUpWidget');
  expect(code).not.toContain('icon=');
});
