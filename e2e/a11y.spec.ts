// Automated accessibility checks with axe-core, run against every page of the
// site in both themes. axe covers the machine-checkable part of WCAG 2.1 A and
// AA (names, roles, contrast, landmarks, labels, valid ARIA). It does not
// replace a keyboard and screen-reader pass.
//
// A violation fails the test, with one exception: BASELINE lists problems that
// were already on the site when this suite was added. Each entry caps how many
// elements may break that rule on that page, so a new violation of any rule
// still fails, including one more of a rule that is already listed. When you
// fix a baseline problem, lower or delete its entry.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ALL_PAGES = ['/', '/docs', '/components', '/studio',
                   '/demo', '/demo/ai', '/preview', '/overview', '/privacy'];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const CONTRAST = 'Text below 4.5:1: slate-500 and slate-400 on light surfaces, white on blue-500, emerald-600 on tinted fills. Needs a palette decision.';
const RANGE = 'Range input with no accessible name.';
const SCROLL = 'Code block scrolls sideways but cannot take keyboard focus.';
const COPY = 'Icon-only button with no accessible name.';
const NESTED = 'Draggable role="button" rows contain focusable children.';

/** Most elements allowed to break each rule, per page. Highest count across both themes. */
const BASELINE: Record<string, Record<string, { max: number; reason: string }>> = {
  '/': {
    'color-contrast': { max: 11, reason: CONTRAST },
    'label': { max: 1, reason: RANGE },
    'scrollable-region-focusable': { max: 3, reason: SCROLL }
  },
  '/docs': {
    'button-name': { max: 3, reason: COPY },
    'color-contrast': { max: 10, reason: CONTRAST }
  },
  '/components': {
    'color-contrast': { max: 5, reason: CONTRAST },
    'label': { max: 3, reason: 'Text input with no label.' }
  },
  '/studio': {
    'button-name': { max: 1, reason: COPY },
    'color-contrast': { max: 12, reason: CONTRAST },
    'label': { max: 2, reason: RANGE },
    'nested-interactive': { max: 62, reason: NESTED }
  },
  '/demo': {
    'color-contrast': { max: 11, reason: CONTRAST },
    'label': { max: 1, reason: RANGE }
  },
  '/demo/ai': {
    'color-contrast': { max: 39, reason: CONTRAST },
    'label': { max: 1, reason: RANGE }
  },
  '/preview': {
    'color-contrast': { max: 5, reason: CONTRAST }
  },
  '/overview': {
    'color-contrast': { max: 1, reason: CONTRAST }
  }
};

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
