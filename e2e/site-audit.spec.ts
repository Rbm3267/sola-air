import { test, expect } from '@playwright/test';

test.describe('Sola AIR Site & Product Audit', () => {

  test('Homepage Integrity & Consistency Check', async ({ page }) => {
    await page.goto('/');

    // 1. Title verification
    await expect(page).toHaveTitle(/Sola/);

    // 2. Main Brand Mark & Slogan
    await expect(page.locator('h1')).toContainText("Your UI shouldn't wait to be");

    // 3. Primary Navigation Elements. Secondary destinations moved under Tools,
    //    so only the four that matter are asserted at the top level here;
    //    site-quality.spec.ts covers the menu itself.
    const nav = page.locator('header nav').first();
    await expect(nav.getByRole('link', { name: 'Docs' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Components' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Studio' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Tools' })).toBeVisible();
  });

  test('Component Library Page Audit', async ({ page }) => {
    await page.goto('/components');

    // Verify header and catalog list
    await expect(page.locator('h1')).toContainText('Foundational UI Building Blocks');
    await expect(page.getByRole('button', { name: 'Metric Card' }).first()).toBeVisible();

    // Code export is generated from the real package: an import from its
    // subpath, only declared props, and a mount call. No JSX, no `config={...}`.
    await page.getByRole('button', { name: '.sola', exact: true }).click();
    const code = page.locator('pre code').last();
    await expect(code).toContainText("import DataCard from '@sola-air-ui/ui/data-card';");
    await expect(code).toContainText('<DataCard title="Net Revenue Retention"');
    await expect(code).not.toContainText('config=');
    await expect(code).not.toContainText('icon=');

    await page.getByRole('button', { name: 'Mount from JS' }).click();
    await expect(code).toContainText("DataCard(document.getElementById('app'),");

    // A site-only preview says so instead of offering code that cannot install.
    await page.getByRole('button', { name: /Button/ }).filter({ hasText: 'Preview' }).first().click();
    await expect(code).toContainText('is a preview built for this site');
    await expect(code).toContainText("import Button from '@sola-air-ui/ui/button';");
  });

  test('Interactive Documentation & Navigation Audit', async ({ page }) => {
    await page.goto('/docs');

    // Verify Docs Header & Content
    await expect(page.getByRole('heading', { name: 'Installation & Setup' })).toBeVisible();
    await expect(page.getByText('Reactivity & Signals').first()).toBeVisible();
  });

  test('Playground & Voice Recognition UI Audit', async ({ page }) => {
    await page.goto('/demo');

    // Verify Speech & Text Input elements
    await expect(page.getByRole('heading', { name: 'Ambient Intent Playground' })).toBeVisible();
    const input = page.locator('input[placeholder*="Speak or type intent"]');
    await expect(input).toBeVisible();

    // Verify Microphone button exists
    const micButton = page.locator('button[aria-label="Voice intent recognition"]');
    await expect(micButton).toBeVisible();
  });

});
