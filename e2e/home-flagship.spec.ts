// The homepage's Compiler X-Ray and shell stage claim specific things about
// the framework. These checks hold them to what the code really does.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEMO = readFileSync(join(__dirname, '..', 'app/src/lib/pages/ClusterCardDemo.sola'), 'utf8').replace(/\r\n/g, '\n');

test.describe('homepage Compiler X-Ray', () => {
  test('pane 1 is the real source file', async ({ page }) => {
    await page.goto('/');
    const source = await page.getByTestId('xray-source').innerText();
    // Empty lines render as a single space so they keep their height.
    const lines = (t: string) => t.replace(/\r\n/g, '\n').trim().split('\n').map((l) => l.trimEnd());
    expect(lines(source)).toEqual(lines(DEMO));
  });

  test('pane 2 is real compiler output: one effect per text node it updates', async ({ page }) => {
    await page.goto('/');
    const compiled = page.getByTestId('xray-compiled');
    await expect(compiled).toContainText('createSignal(1420)');
    await expect(compiled).toContainText('textContent = String((rps())');
    await expect(compiled).toContainText('textContent = String((util())');
    await page.getByRole('button', { name: 'Show all' }).click();
    await expect(compiled).toContainText("from '@sola-air-ui/core'");
  });

  test('pane 3 is that component, driven over the bus', async ({ page }) => {
    await page.goto('/');
    const live = page.getByTestId('xray-live');
    await expect(live).toContainText('1420 req/s');
    await page.getByRole('button', { name: /Burst/ }).click();
    await expect(live).toContainText('1580 req/s');
    await expect(live).toContainText('79% capacity');
  });
});

test.describe('homepage shell stage', () => {
  test('mounts a real closed shadow root, and the inspector reads it from the DOM', async ({ page }) => {
    await page.goto('/');
    const facts = page.getByTestId('shadow-facts');
    await expect(facts).toContainText('#shadow-root (closed)');
    await expect(facts).toContainText('host.shadowRoot');
    await expect(facts).toContainText('null');
    await expect(facts).toContainText('finds nothing');

    const dom = await page.getByTestId('shell-parent').evaluate((el) => {
      const host = el.querySelector('#sola-home-companion') as HTMLElement | null;
      return { host: !!host, open: host?.shadowRoot ?? null, inner: el.querySelector('.intent-card') };
    });
    expect(dom.host).toBe(true);
    expect(dom.open).toBeNull();   // closed: page scripts cannot see in
    expect(dom.inner).toBeNull();  // and cannot query the card inside
  });
});
