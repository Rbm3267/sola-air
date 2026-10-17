// Every example in skills/sola, previewed with the skill's own script and opened
// in a real browser: it must render with no errors, and its controls must work.

import { test, expect } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKILL = join(__dirname, '..', 'skills', 'sola');
const OUT = mkdtempSync(join(os.tmpdir(), 'sola-skill-preview-'));

function preview(example: string, extra: string[] = []) {
  const out = join(OUT, `${example}${extra.join('')}.html`.replace(/[^\w.-]/g, '_'));
  const r = spawnSync(process.execPath, [join(SKILL, 'scripts', 'preview.mjs'), join(SKILL, 'examples', `${example}.sola`), '-o', out, ...extra], { encoding: 'utf8' });
  expect(r.status, r.stderr).toBe(0);
  return pathToFileURL(out).href;
}

async function open(page: import('@playwright/test').Page, url: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  return errors;
}

test('ops-dashboard renders cards and a clickable table', async ({ page }) => {
  const errors = await open(page, preview('ops-dashboard'));
  await expect(page.getByText('42,800')).toBeVisible();
  await page.getByRole('cell', { name: 'Search index' }).click();
  await expect(page.getByRole('heading', { name: 'INC-1039' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('signup-form shows its initial values and confirms a valid email', async ({ page }) => {
  const errors = await open(page, preview('signup-form'));
  await expect(page.getByLabel('Plan')).toHaveValue('team');
  await page.getByLabel('Work email').fill('ana@example.com');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.getByText('Workspace created')).toBeVisible();
  expect(errors).toEqual([]);
});

test('companion-shell opens the palette with the hotkey and sends a toast', async ({ page }) => {
  const errors = await open(page, preview('companion-shell'));
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox').fill('save');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Draft saved')).toBeVisible();
  await page.getByRole('button', { name: 'Assistant' }).click();
  await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('--theme dark sets the dark tokens', async ({ page }) => {
  await open(page, preview('ops-dashboard', ['--theme', 'dark']));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
