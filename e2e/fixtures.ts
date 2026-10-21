// The homepage is prerendered, so its buttons are on screen before the scripts
// attach their handlers, and a click in that gap does nothing. This `test` waits
// after every goto and reload until the root layout marks the page hydrated.

import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const hydrated = () => page.waitForSelector('html[data-hydrated]', { state: 'attached' });
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const response = await goto(...args);
      await hydrated();
      return response;
    };
    page.reload = async (...args) => {
      const response = await reload(...args);
      await hydrated();
      return response;
    };
    await use(page);
  }
});

export { expect };
