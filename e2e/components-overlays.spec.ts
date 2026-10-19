// The /components catalog shows each component on a card with backdrop-blur. That
// makes the card the containing block for `position: fixed`, so a menu or dialog
// rendered inside it lands offset from the pointer and clipped to the card. These
// tests open every popup on the page and check where it actually appears.

import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const open = async (page: Page, id: string) => {
  await page.goto(`/components?component=${id}`);
  await page.waitForLoadState('networkidle');
};

const center = (l: Locator) => l.evaluate((el) => el.scrollIntoView({ block: 'center' }));

async function box(l: Locator) {
  const b = await l.boundingBox();
  expect(b, 'element has a box').not.toBeNull();
  return b!;
}

async function expectInViewport(page: Page, l: Locator) {
  const b = await box(l);
  const vp = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 1);
  expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1);
}

test.describe('component catalog popups', () => {
  test('the context menu opens at the pointer', async ({ page }) => {
    await open(page, 'sola-context-menu');
    const area = page.getByRole('region', { name: /Context menu area/ });
    await center(area);
    const a = await box(area);
    await page.mouse.click(a.x + 40, a.y + 30, { button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const m = await box(menu);
    expect(Math.abs(m.x - (a.x + 40))).toBeLessThanOrEqual(2);
    expect(Math.abs(m.y - (a.y + 30))).toBeLessThanOrEqual(2);
    await expect(page.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('the context menu stays on screen near the window edge', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await open(page, 'sola-context-menu');
    const area = page.getByRole('region', { name: /Context menu area/ });
    // Put the area at the bottom-right of the window, then right-click its corner.
    await area.evaluate((el) => el.scrollIntoView({ block: 'end' }));
    const a = await box(area);
    await area.click({ button: 'right', position: { x: a.width - 20, y: a.height - 20 } });
    await expect(page.getByRole('menu')).toBeVisible();
    await expectInViewport(page, page.getByRole('menu'));
  });

  for (const [id, button, name] of [
    ['sola-dialog', 'Open Dialog', /Confirm Action/],
    ['sola-drawer', 'Open Drawer', /Detail View/],
    ['sola-command-palette', 'Open Command Palette (Cmd+K)', /Command Palette/]
  ] as const) {
    test(`${id} starts closed and covers the window when opened`, async ({ page }) => {
      await open(page, id);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: button }).click();
      const dialog = page.getByRole('dialog', { name }).first();
      await expect(dialog).toBeVisible();
      // The overlay is a child of <body>, so no card can offset or clip it.
      expect(await page.evaluate(() => [...document.body.children].some((el) => el.matches('div.fixed.inset-0')))).toBe(true);
      const overlay = await box(page.locator('body > div.fixed.inset-0').first());
      const vp = page.viewportSize()!;
      expect(overlay).toMatchObject({ x: 0, y: 0, width: vp.width, height: vp.height });
    });
  }

  test('floating labels never sit on top of the placeholder', async ({ page }) => {
    await open(page, 'sola-input');
    const email = page.getByLabel('Email Address');
    await expect(email).toHaveAttribute('placeholder', 'you@example.com');
    for (const name of ['Email Address', 'Password']) {
      const input = page.getByLabel(name);
      const label = page.locator('label', { hasText: name });
      const l = await box(label);
      const i = await box(input);
      // The label rides on the top border: its middle is at or above the input's top edge.
      expect(l.y + l.height / 2).toBeLessThanOrEqual(i.y + 1);
    }
  });

  test('the tooltip preview renders and shows its tooltip on hover', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, 'sola-tooltip');
    await page.getByRole('button', { name: 'Top', exact: true }).hover();
    await expect(page.getByRole('tooltip')).toHaveText(/Top tooltip/);
    expect(errors).toEqual([]);
  });

  for (const [id, trigger, panel] of [
    ['sola-dropdown', (p: Page) => p.getByRole('button', { name: 'More actions' }), (p: Page) => p.getByRole('menu')],
    ['sola-select', (p: Page) => p.locator('button[aria-haspopup="listbox"]'), (p: Page) => p.getByRole('listbox').locator('xpath=ancestor::div[contains(@class,"z-50")]')],
    ['sola-popover', (p: Page) => p.getByRole('button', { name: 'Click to open Popover' }), (p: Page) => p.getByRole('dialog')],
    ['sola-date-picker', (p: Page) => p.getByRole('button', { name: /2026-08-01/ }), (p: Page) => p.getByRole('button', { name: 'Next month' }).locator('xpath=ancestor::div[contains(@class,"z-50")]')]
  ] as const) {
    test(`${id} opens next to its trigger and on screen`, async ({ page }) => {
      await open(page, id);
      const t = trigger(page);
      await center(t);
      await t.click();
      const p = panel(page);
      await expect(p).toBeVisible();
      await expectInViewport(page, p);
      const tb = await box(t);
      const pb = await box(p);
      // Within 40px of the trigger on the closest side.
      const gap = Math.max(pb.y - (tb.y + tb.height), tb.y - (pb.y + pb.height), pb.x - (tb.x + tb.width), tb.x - (pb.x + pb.width), 0);
      expect(gap).toBeLessThanOrEqual(40);
    });
  }
});

test.describe('component catalog contents', () => {
  test('every category has a filter, and every entry renders a component', async ({ page }) => {
    test.setTimeout(180_000);
    // Read from the file rather than imported: a dynamic TS import fails when the
    // whole suite runs together.
    const src = readFileSync(join(__dirname, '..', 'app', 'src', 'lib', 'data', 'componentCatalog.ts'), 'utf8');
    const COMPONENT_CATALOG = [...src.matchAll(/^ {4}id: '([a-z0-9-]+)',\r?\n {4}name: '[^']*',\r?\n {4}category: '([^']+)'/gm)]
      .map((m) => ({ id: m[1], category: m[2] }));
    expect(COMPONENT_CATALOG).toHaveLength(42);
    await page.goto('/components');
    await page.waitForLoadState('networkidle');
    for (const category of new Set(COMPONENT_CATALOG.map((c) => c.category))) {
      await expect(page.getByRole('button', { name: category, exact: true }), `filter for ${category}`).toBeVisible();
    }
    for (const c of COMPONENT_CATALOG) {
      await page.goto(`/components?component=${c.id}`);
      const stage = page.locator('div.min-h-\\[220px\\]').first();
      // Element count, not text: the skeleton preview is boxes with no text.
      await expect.poll(() => stage.locator('*').count(), { message: `${c.id} renders a component` }).toBeGreaterThan(1);
    }
  });
});
