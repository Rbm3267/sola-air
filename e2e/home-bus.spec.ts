// The homepage section that shows $persist, $on and $lastEvent runs the real
// BusDemo.sola file and prints that same file as its code sample. These tests
// drive it the way a visitor would, so the claims in the copy beside it are
// checked rather than asserted.

import { test, expect } from './fixtures';

test.describe('homepage: $persist + event bus demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByTestId('bus-demo-live').scrollIntoViewIfNeeded();
  });

  test('shows the source of the component that is running', async ({ page }) => {
    const source = page.getByTestId('bus-demo-source');
    await expect(source).toContainText("$persist('home.demo.asks'");
    await expect(source).toContainText("$on('sola:ask'");
    await expect(source).toContainText("$lastEvent('sola:ask')");
    await expect(page.locator('#demo-count')).toHaveText('0');
    await expect(page.locator('#demo-last')).toHaveText('nothing yet');
  });

  test('delivers the same event twice instead of dropping the repeat', async ({ page }) => {
    const emit = page.getByRole('button', { name: 'Emit sola:ask' });
    await emit.click();
    await expect(page.locator('#demo-count')).toHaveText('1');
    await emit.click();
    await expect(page.locator('#demo-count')).toHaveText('2');
    await expect(page.locator('#demo-last')).toHaveText('How do I deploy?');
  });

  test('a remount keeps the $persist value but not the last event', async ({ page }) => {
    const emit = page.getByRole('button', { name: 'Emit sola:ask' });
    await emit.click();
    await emit.click();
    await expect(page.locator('#demo-count')).toHaveText('2');

    await page.getByRole('button', { name: 'Remount component' }).click();
    await expect(page.locator('#demo-count')).toHaveText('2');
    await expect(page.locator('#demo-last')).toHaveText('nothing yet');
  });

  test('the count survives a full page reload', async ({ page }) => {
    const emit = page.getByRole('button', { name: 'Emit sola:ask' });
    await emit.click();
    await emit.click();
    await emit.click();
    await expect(page.locator('#demo-count')).toHaveText('3');

    await page.reload();
    await page.getByTestId('bus-demo-live').scrollIntoViewIfNeeded();
    await expect(page.locator('#demo-count')).toHaveText('3');
  });
});
