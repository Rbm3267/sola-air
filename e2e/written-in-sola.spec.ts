// The Written in Sola page shows three .sola files, the compiler's output for
// each, and the components running. The panes are read from the files at build
// time; these tests check they match the files and that each example works.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOUR = join(__dirname, '..', 'app', 'src', 'lib', 'pages', 'tour');
const step = (page: import('@playwright/test').Page, n: number) => page.locator('section.step').nth(n);

test.beforeEach(async ({ page }) => {
  await page.goto('/overview');
  await page.waitForLoadState('networkidle');
});

test('each step shows its real source and the compiled output', async ({ page }) => {
  for (const [i, name] of ['Counter', 'Tasks', 'Incidents'].entries()) {
    const s = step(page, i);
    const source = readFileSync(join(TOUR, `${name}.sola`), 'utf8').replace(/\r\n/g, '\n');
    expect((await s.locator('pre').textContent())?.replace(/\r\n/g, '\n')).toBe(source);
    await s.getByRole('button', { name: 'Compiled JavaScript' }).click();
    await expect(s.locator('pre')).toContainText('Compiled by @sola-air-ui/compiler');
    await expect(s.locator('pre')).toContainText('createEffect');
  }
});

test('the counter updates its value and the derived value', async ({ page }) => {
  const s = step(page, 0).locator('.result');
  await s.getByRole('button', { name: 'Add one' }).click();
  await s.getByRole('button', { name: 'Add one' }).click();
  await expect(s.locator('.value')).toHaveText('2');
  await expect(s.locator('.note')).toHaveText('doubled: 4');
});

test('the task list adds, ticks and counts tasks', async ({ page }) => {
  const s = step(page, 1).locator('.result');
  await expect(s.getByText('1 left')).toBeVisible();
  await s.getByRole('checkbox').nth(1).check();
  // Ticking replaces the task object; the keyed row must show the new state.
  await expect(s.locator('li span').nth(1)).toHaveClass(/done/);
  await expect(s.getByText('All done.')).toBeVisible();
  await s.getByLabel('New task').fill('Ship it');
  await s.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(s.locator('li')).toHaveCount(3);
  await expect(s.getByText('1 left')).toBeVisible();
  await expect(s.getByLabel('New task')).toHaveValue('');
});

test('the incidents example drives real @sola-air-ui/ui components', async ({ page }) => {
  const s = step(page, 2).locator('.result');
  await expect(s.locator('tbody tr')).toHaveCount(2);
  await s.getByRole('button', { name: 'Resolve oldest open' }).click();
  await expect(s.locator('tbody tr')).toHaveCount(1);
  await expect(s.locator('.sola-data-card')).toContainText('1');
  await s.getByRole('switch', { name: 'Open only' }).click();
  await expect(s.locator('tbody tr')).toHaveCount(4);
});
