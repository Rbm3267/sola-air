// Automated accessibility checks with axe-core, run against every page of the
// site in both themes. axe covers the machine-checkable part of WCAG 2.1 A and
// AA (names, roles, contrast, landmarks, labels, valid ARIA). It does not
// replace a keyboard and screen-reader pass.
//
// A violation fails the test. BASELINE can cap how many elements may break a
// rule on a page while a fix is pending; it is empty now, after the pass that
// fixed everything axe found. Add an entry only with a reason, and remove it
// when the problem is fixed.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ALL_PAGES = ['/', '/docs', '/components', '/studio',
                   '/demo', '/demo/ai', '/preview', '/overview', '/privacy', '/changelog'];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Most elements allowed to break each rule, per page, with the reason. Empty: nothing is allowed. */
const BASELINE: Record<string, Record<string, { max: number; reason: string }>> = {};

for (const scheme of ['light', 'dark'] as const) {
  for (const path of ALL_PAGES) {
    test(`${path} has no new axe violations (${scheme})`, async ({ page }) => {
      // The site reads its theme from localStorage, not from the OS setting.
      await page.addInitScript((s) => localStorage.setItem('sola_theme', s), scheme);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark');

      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const allowed = BASELINE[path] ?? {};
      const found = violations
        .filter((v) => v.nodes.length > (allowed[v.id]?.max ?? 0))
        .map((v) => ({
          rule: v.id,
          impact: v.impact,
          help: v.help,
          count: v.nodes.length,
          baseline: allowed[v.id]?.max ?? 0,
          nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' '))
        }));

      expect(found, `axe violations on ${path} (${scheme}) beyond the baseline`).toEqual([]);
    });
  }
}
