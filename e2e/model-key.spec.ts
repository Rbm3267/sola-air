// SvelteKit 3 hands the server only the environment variables declared in
// app/src/env.ts. GEMINI_API_KEY was not declared, so after the upgrade the live
// site answered "no model key" to every AI request even with the key set.
//
// Run with EXPECT_MODEL_KEY=1 against a server started with GEMINI_API_KEY set to
// any value (CI does). The key does not have to be valid: the test only checks
// that the server saw it, which shows up as a failed model call, not the offline
// reply.

import { test, expect } from '@playwright/test';

test('the server sees GEMINI_API_KEY', async ({ request }) => {
  test.skip(!process.env.EXPECT_MODEL_KEY, 'set EXPECT_MODEL_KEY when the server runs with GEMINI_API_KEY');
  const res = await request.post('/api/intent', { data: { mode: 'architect', query: 'hello' } });
  const text = await res.text();
  expect(text).not.toContain('no GEMINI_API_KEY is set');
  expect(text).not.toContain('no model key configured');
});

test('Generate reports a missing key as offline, with a 503', async ({ request }) => {
  test.skip(!!process.env.EXPECT_MODEL_KEY, 'only meaningful when the server has no key');
  const res = await request.post('/api/intent', { data: { mode: 'sola', prompt: 'a counter' } });
  expect(res.status()).toBe(503);
  expect((await res.json()).error).toContain('no model key configured');
});
