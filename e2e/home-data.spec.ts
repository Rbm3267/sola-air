// The homepage `$data` section runs real .sola files that call `$data`, against
// a stand-in endpoint on the site. These tests check what the section claims:
// rows arrive through the real code path, the button fetches again, switching
// source swaps the file, and the old source stops polling.

import { test, expect } from './fixtures';

test.describe('homepage: $data demo', () => {
  test('shows the source it runs and the rows it fetched', async ({ page }) => {
    await page.goto('/');
    const live = page.getByTestId('data-demo-live');
    await live.scrollIntoViewIfNeeded();

    await expect(page.getByTestId('data-demo-source')).toContainText('$data("sheet://demo-finance"');
    await expect(live).toContainText('Aug');
    await expect(live).toContainText('$169400');
    await expect(live).toContainText('$184200');
    await expect(live).toContainText('Fetched at');
    await expect(live).not.toContainText('undefined');
    await expect(live).not.toContainText('Loading…');
  });

  test('"Fetch again" sends another request to the relay', async ({ page }) => {
    await page.goto('/');
    const live = page.getByTestId('data-demo-live');
    await live.scrollIntoViewIfNeeded();
    await expect(live).toContainText('$184200');

    const next = page.waitForRequest((r) => r.url().includes('/api/demo-relay') && r.method() === 'POST');
    await page.locator('#data-refetch').click();
    const request = await next;
    expect(request.postDataJSON().source).toBe('sheet://demo-finance');
  });

  test('switching to PostgreSQL swaps the file and the rows', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('data-demo-live').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'PostgreSQL' }).click();

    const live = page.getByTestId('data-demo-live');
    await expect(page.getByTestId('data-demo-source')).toContainText('$data("postgres-primary:nodes"');
    await expect(live).toContainText('node-a');
    await expect(live).toContainText('node-d');
    await expect(live).toContainText('CPU');
    await expect(live).not.toContainText('Aug');
  });

  test('the source that was switched away from stops polling', async ({ page }) => {
    await page.clock.install();
    const sources: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/demo-relay') && r.method() === 'POST') sources.push(r.postDataJSON().source);
    });
    await page.goto('/');
    const live = page.getByTestId('data-demo-live');
    await live.scrollIntoViewIfNeeded();
    await expect(live).toContainText('$184200');

    await page.getByRole('button', { name: 'PostgreSQL' }).click();
    await expect(live).toContainText('node-a');

    const switchedAt = sources.length;
    await page.clock.fastForward(46_000); // three refresh intervals
    await expect.poll(() => sources.length).toBeGreaterThan(switchedAt);
    const after = sources.slice(switchedAt);
    expect(after.every((s) => s === 'postgres-primary:nodes'), `only the active source polls, saw ${after}`).toBe(true);
  });
});

test.describe('demo relay endpoint', () => {
  test('answers a known source with rows', async ({ request }) => {
    const res = await request.post('/api/demo-relay', { data: { source: 'sheet://demo-finance' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.rows.length).toBe(4);
    expect(body.rows[0]).toMatchObject({ month: 'Jun', mrr: 152300 });
  });

  test('rejects an unknown source and a body that is not JSON', async ({ request }) => {
    const unknown = await request.post('/api/demo-relay', { data: { source: 'sheet://someone-elses' } });
    expect(unknown.status()).toBe(404);
    expect((await unknown.json()).error).toContain('Unknown demo source');

    const bad = await request.post('/api/demo-relay', { data: 'not json', headers: { 'content-type': 'text/plain' } });
    expect(bad.status()).toBe(400);
  });
});
