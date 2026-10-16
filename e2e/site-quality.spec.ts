// Standing checks for the site problems the design review found, so they
// cannot quietly come back: sub-12px body text, contradictory component
// counts, dead repository links, unproven performance claims, and Studio
// rendering as a 60px sliver on a phone.

import { test, expect, type Page } from '@playwright/test';

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Every page on the site. Sweeps run over all of them: the earlier checks
 *  covered four or five, so a dead repository link on /privacy and stale
 *  "1,000Hz" copy on /demo both passed while broken. */
const ALL_PAGES = ['/', '/docs', '/components', '/studio',
                   '/demo', '/demo/ai', '/preview', '/overview', '/privacy'];

/** Every rendered text size on the page, for elements that actually show text. */
async function textSizes(page: Page) {
  return page.evaluate(() => {
    const out: { text: string; px: number; tag: string }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      // Only elements whose own text is what a reader sees.
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent?.trim() ?? '')
        .join(' ')
        .trim();
      if (!own) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const px = parseFloat(style.fontSize);
      if (Number.isFinite(px)) out.push({ text: own.slice(0, 60), px, tag: el.tagName });
    }
    return out;
  });
}

for (const path of ALL_PAGES) {
  test(`${path} has no text below the 12px floor`, async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const tooSmall = (await textSizes(page)).filter((t) => t.px < 12);
    expect(
      tooSmall,
      `text under 12px: ${JSON.stringify(tooSmall.slice(0, 10), null, 2)}`
    ).toEqual([]);
  });
}

test('nav offers four destinations, with the rest under Tools', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  const nav = page.locator('header nav').first();
  await expect(nav.getByRole('link', { name: 'Docs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Components' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Studio' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Tools' })).toBeVisible();

  // Secondary destinations must not sit at the top level any more.
  await expect(nav.getByRole('link', { name: 'AI Demo' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Extension' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Community' })).toHaveCount(0);

  // They are reachable, one click away.
  await nav.getByRole('button', { name: 'Tools' }).click();
  const header = page.locator('header');
  await expect(header.getByRole('link', { name: /AI Demo/ })).toBeVisible();
  await expect(header.getByRole('link', { name: /Extension/ })).toBeVisible();
});

test('hero CTA sends a developer to the quickstart', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  const cta = page.getByRole('link', { name: 'Get started' }).first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/docs');
});

test('the hero demonstrates the thing the headline claims', async ({ page }) => {
  // "Your UI shouldn't wait to be asked" has to be shown, not asserted. The
  // hero used to be three tabs of generic telemetry widgets instead.
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  await expect(page.getByText('Sentinel · observing')).toBeVisible();

  const destination = page.getByPlaceholder('Lisbon');
  await expect(destination).toBeVisible();

  // Nothing suggested until the user actually does something.
  await expect(page.getByText('the form has not been touched')).toBeVisible();

  // Exactly what the on-screen copy tells the visitor to do: type, then stop.
  // No blur. Sentinel could previously only observe focus and blur, so typing
  // produced no events and the panel said "Waiting for a pause…" forever.
  await destination.click();
  await destination.type('Lisbon', { delay: 40 });

  const suggestion = page.locator('[role="status"]').filter({ hasText: 'Add dates' });
  await expect(suggestion).toBeVisible({ timeout: 8000 });
  await expect(suggestion).toContainText('confidence');

  // The observer buffer must reflect real events, not a canned script — and it
  // must show the typing, which is the behaviour the thesis is about.
  await expect(page.getByText(/focused "destination"/i)).toBeVisible();
  await expect(page.getByText(/typing in "destination"/i)).toBeVisible();
});

test('every repository link points at the real repository', async ({ page }) => {
  for (const path of ALL_PAGES) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href*="github.com"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      expect(href, `${path} links to a repository that does not exist: ${href}`)
        .toMatch(/github\.com\/[Rr]bm3267\/sola-air/);
    }
  }
});

test('no performance claim without a number behind it', async ({ page }) => {
  const banned = [
    /1,?000\s?Hz/i,
    /sub-millisecond/i,
    /hardware-grade/i,
    /zero garbage collection/i,
    /spring physics/i
  ];

  for (const path of ALL_PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    for (const pattern of banned) {
      expect(body, `${path} still claims ${pattern}`).not.toMatch(pattern);
    }
  }
});

test('the page written in Sola is legible and links its own source', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/overview');
  await page.waitForLoadState('networkidle');

  const heading = page.getByRole('heading', { name: /This page is a Sola component/i });
  await expect(heading).toBeVisible();

  // The original bug was white text on a white ground in the light theme.
  const contrast = await heading.evaluate((el) => {
    const lum = (c: string) => {
      const [r, g, b] = (c.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).map(Number);
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let bg = 'rgb(255,255,255)';
    for (let n: HTMLElement | null = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !c.includes('rgba(0, 0, 0, 0)')) { bg = c; break; }
    }
    const a = lum(getComputedStyle(el).color);
    const b = lum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast, 'heading must meet WCAG AA for large text').toBeGreaterThan(3);

  // A compiler sells itself with its own output.
  const source = page.getByRole('link', { name: /Read its source/i });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute('href', /Overview\.sola$/);

  // And the signal it renders must actually be live.
  const value = page.locator('.proof-value');
  const before = await value.innerText();
  await page.getByRole('button', { name: /Emit signal/i }).click();
  await expect(value).not.toHaveText(before);
});

test('Studio is usable on a phone', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/studio');
  await page.waitForLoadState('networkidle');

  // Nothing may overflow the viewport horizontally.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, 'page must not scroll sideways on a 390px screen')
    .toBeLessThanOrEqual(PHONE.width + 1);

  // The original failure was not overflow but starvation: the palette docked
  // beside the canvas and left it about 60px wide, clipping every card to two
  // characters. The canvas must get essentially the whole screen.
  const canvas = page.locator('main').first();
  const box = await canvas.boundingBox();
  expect(box, 'studio canvas must render').not.toBeNull();
  expect(box!.width, 'canvas must not be squeezed by a docked palette')
    .toBeGreaterThan(PHONE.width * 0.85);
});

// The site marks its theme with a `.dark` class, while design tokens and
// compiled .sola components key off `data-theme` / prefers-color-scheme. When
// only one of those was set, a visitor on a dark OS viewing the site in light
// mode got dark token values on a light ground — white text on white cards,
// measured at 1.10:1. All four combinations must be legible.
for (const osTheme of ['light', 'dark'] as const) {
  for (const siteTheme of ['light', 'dark'] as const) {
    test(`text is legible with OS ${osTheme} and site ${siteTheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: osTheme });
      await page.setViewportSize(DESKTOP);

      for (const path of ['/', '/demo', '/overview']) {
        await page.goto(path);
        await page.evaluate((t) => localStorage.setItem('sola_theme', t), siteTheme);
        await page.reload({ waitUntil: 'networkidle' });

        const ratio = await page.evaluate(() => {
          const el = document.querySelector('.dash-title, .hero-heading, h1');
          if (!el) return 21;
          const parse = (c: string) => {
            const m = (c || '').match(/[\d.]+/g) ?? ['0', '0', '0'];
            return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
          };
          type C = { r: number; g: number; b: number; a: number };
          const over = (f: C, b: C): C => ({
            r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a),
            b: f.b * f.a + b.b * (1 - f.a), a: 1
          });
          const lum = (c: C) => {
            const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
          };
          // Composite the whole ancestor background stack; a near-transparent
          // overlay must not be mistaken for a solid one.
          const stack: string[] = [];
          for (let n: Element | null = el; n; n = n.parentElement) stack.push(getComputedStyle(n).backgroundColor);
          let bg: C = { r: 255, g: 255, b: 255, a: 1 };
          for (const c of stack.reverse()) { const p = parse(c); if (p.a > 0) bg = over(p, bg); }
          const fg = over(parse(getComputedStyle(el).color), bg);
          return (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
        });

        expect(ratio, `${path} heading contrast (OS ${osTheme}, site ${siteTheme})`).toBeGreaterThan(4.5);
      }
    });
  }
}

test('every page is reachable, and the policy page especially', async ({ page }) => {
  // /privacy, /demo and /overview were linked from nowhere. A privacy policy a
  // visitor cannot reach is a problem beyond navigation.
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  // The site renders client-side, so the nav and footer do not exist yet
  // at goto time.
  await page.waitForLoadState('networkidle');
  const norm = (h: string) => {
    const path = (h ?? '').split('?')[0].split('#')[0];
    return path.length > 1 ? path.replace(/\/$/, '') : path;
  };
  const hrefs = new Set(
    (await page.locator('a[href]').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? '')))
      .map(norm)
  );
  for (const route of ALL_PAGES) {
    expect(hrefs.has(norm(route)), `${route} is not reachable from the homepage`).toBe(true);
  }
});

test('no page ships debug output', async ({ page }) => {
  // /demo/ai rendered `open=false · loading=false · content=null` to visitors.
  for (const path of ALL_PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    for (const pattern of [/open=(true|false)/, /loading=(true|false)/, /content=(null|undefined)/, /undefined/]) {
      expect(body, `${path} shows debug output matching ${pattern}`).not.toMatch(pattern);
    }
  }
});

test('a version on screen names the package it belongs to', async ({ page }) => {
  // Four bare version strings across the site read as contradictions.
  await page.goto('/docs');
  await page.waitForLoadState('networkidle');
  const footer = await page.locator('footer').innerText();
  for (const pkg of ['core', 'compiler', 'ui']) {
    expect(footer, `footer should attribute the ${pkg} version`).toContain(pkg);
  }
});

test('Studio Arc surfaces failure instead of silently doing nothing', async ({ page }) => {
  // Arc sent a field the endpoint never read, so every request came back 400.
  // A 400 does not throw, so the catch never ran, the components check quietly
  // failed, and the finally block wiped the prompt: no spinner, no error, no
  // output, and the user's words gone. Driven here against a forced failure.
  await page.setViewportSize(DESKTOP);
  await page.route('**/api/intent', (route) =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Upstream refused the request.' }) })
  );

  await page.goto('/studio');
  await page.waitForLoadState('networkidle');

  const input = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"]').first();
  const prompt = 'Realtime revenue waterfall and p99 latency gauge';
  await input.fill(prompt);
  await page.getByRole('button', { name: /Generate with Arc/i }).click();

  const alert = page.getByRole('alert');
  await expect(alert, 'a failed generation must say so').toBeVisible({ timeout: 15000 });
  await expect(alert).toContainText('Upstream refused the request.');

  // The prompt has to survive, or there is nothing to retry with.
  await expect(input).toHaveValue(prompt);
});

test('light-mode text contrast does not regress', async ({ page }) => {
  // Light mode was far worse than dark and is the default theme. These counts
  // are a ratchet measured after the fixes, not a target — they may fall,
  // never rise. Elements painted by a CSS gradient are skipped: backgroundColor
  // cannot describe a gradient, so they cannot be judged this way.
  const budget: Record<string, number> = {
    '/': 20, '/docs': 11, '/components': 5, '/studio': 12,
    '/demo': 12, '/demo/ai': 38, '/preview': 6, '/overview': 1, '/privacy': 1
  };

  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize(DESKTOP);

  for (const [path, allowed] of Object.entries(budget)) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const failures = await page.evaluate(() => {
      type C = { r: number; g: number; b: number; a: number };
      const parse = (c: string): C => {
        const m = (c || '').match(/[\d.]+/g) ?? ['0', '0', '0'];
        return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
      };
      const over = (f: C, b: C): C => ({
        r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a),
        b: f.b * f.a + b.b * (1 - f.a), a: 1
      });
      const lum = (c: C) => {
        const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };
      let fails = 0;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3)
          .map((n) => n.textContent?.trim() ?? '').join('');
        if (!own) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        let gradient = false;
        for (let n: HTMLElement | null = el; n; n = n.parentElement) {
          if (getComputedStyle(n).backgroundImage !== 'none') { gradient = true; break; }
        }
        if (gradient) continue;
        const size = parseFloat(cs.fontSize);
        const weight = Number(cs.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const stack: string[] = [];
        for (let n: HTMLElement | null = el; n; n = n.parentElement) stack.push(getComputedStyle(n).backgroundColor);
        let bg: C = { r: 255, g: 255, b: 255, a: 1 };
        for (const c of stack.reverse()) { const q = parse(c); if (q.a > 0) bg = over(q, bg); }
        const fg = over(parse(cs.color), bg);
        const ratio = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
        if (ratio < (large ? 3 : 4.5)) fails++;
      }
      return fails;
    });
    expect(failures, `${path} contrast failures rose above the ratchet`).toBeLessThanOrEqual(allowed);
  }
});

test('a reduced-motion preference is honoured', async ({ page }) => {
  // There was no prefers-reduced-motion rule at all; ~80 elements kept
  // animating for a user who asked the OS to stop motion.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const moving = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((el) => {
      const cs = getComputedStyle(el);
      const dur = parseFloat(cs.animationDuration) || 0;
      const trans = parseFloat(cs.transitionDuration) || 0;
      return dur > 0.05 || trans > 0.05;
    }).length
  );
  expect(moving, 'elements still animating under reduced motion').toBe(0);
});

test('the command palette opens, traps focus, and gives it back', async ({ page }) => {
  // Two components listened for the shortcut — one setting open, one toggling —
  // so they cancelled out and the palette advertised on every page never
  // opened by keyboard at all. Focus also escaped it on the first Tab.
  await page.setViewportSize(DESKTOP);
  await page.goto('/docs');
  await page.waitForLoadState('networkidle');

  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog, 'the advertised shortcut must open the palette').toBeVisible();

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(inside, `focus escaped the dialog on Tab ${i + 1}`).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('every page has exactly one h1', async ({ page }) => {
  // /studio had none, so nothing announced the page; /demo had two, because a
  // library component emitted an h1 of its own — a component cannot know it is
  // the page's main heading.
  await page.setViewportSize(DESKTOP);
  for (const path of ALL_PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1'), `${path} should have exactly one h1`).toHaveCount(1);
  }
});

test('weight is not doing the work of hierarchy', async ({ page }) => {
  // 46% of visible text sat at weight 700 or heavier, so nothing was emphasised
  // because everything was. Headings keep their weight; supporting text does not.
  await page.setViewportSize(DESKTOP);
  for (const path of ['/', '/components', '/studio', '/docs']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const share = await page.evaluate(() => {
      let bold = 0, total = 0;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3)
          .map((n) => n.textContent?.trim() ?? '').join('');
        if (!own || getComputedStyle(el).display === 'none') continue;
        total++;
        if ((Number(getComputedStyle(el).fontWeight) || 400) >= 700) bold++;
      }
      return total ? bold / total : 0;
    });
    expect(share, `${path}: share of text at weight 700+`).toBeLessThan(0.3);
  }
});

test('a component dropped on the Studio canvas shows its sample data', async ({ page }) => {
  // createCardFromCatalog emitted card types the renderer had no branch for —
  // status, form, node_graph, table, code, datepicker — and `status` was the
  // catch-all. Those all fell through to a placeholder sentence, so most of the
  // palette looked empty once dropped.
  await page.setViewportSize(DESKTOP);
  const ids = ['dynamic-form', 'cluster-matrix', 'status-radar', 'sola-data-table', 'sola-code-block'];

  for (const id of ids) {
    await page.goto(`/studio?add=${id}`);
    await page.waitForLoadState('networkidle');
    const text = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('main [class*="col-span"]'));
      return cards.length ? (cards[cards.length - 1] as HTMLElement).innerText : '';
    });
    expect(text, `${id} rendered the empty placeholder`)
      .not.toContain('Direct fine-grained reactive component instance');
    expect(text.replace(/\s/g, '').length, `${id} rendered almost nothing`).toBeGreaterThan(40);
  }
});

test('Arc renders cards whichever key the model uses for the component name', async ({ page }) => {
  // Production answers have come back as { type: "DataCard" } and local ones as
  // { component: "DataCard" }. Trusting `type` as a card type put a component
  // name where a card type belongs, so nothing matched and every generated card
  // fell through to the placeholder.
  await page.setViewportSize(DESKTOP);

  for (const key of ['type', 'component'] as const) {
    await page.route('**/api/intent', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ [key]: 'DataCard', colSpan: 1, config: { title: 'Q3 Revenue', value: '$4.82M', trend: '+18.4%' } }])
      })
    );

    await page.goto('/studio');
    await page.waitForLoadState('networkidle');
    const input = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"]').first();
    await input.fill('q3 revenue');
    await page.getByRole('button', { name: /Generate with Arc/i }).click();

    const canvas = page.locator('main');
    // The title is uppercased by CSS, so match the text as authored.
    await expect(canvas, `key "${key}" produced no usable card`).toContainText(/Q3 Revenue/i, { timeout: 10000 });
    await expect(canvas).toContainText('$4.82M');
    await page.unroute('**/api/intent');
  }
});
