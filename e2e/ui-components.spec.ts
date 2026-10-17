// Behaviour checks for @sola-air-ui/ui primitives, mounted in a real browser.
//
// The review found the library was not adoptable as a design system: props that
// a parent could not set, a Modal with no dialog role, no focus trap and no
// Escape handling, and colours hardcoded past the tokens package. These are the
// tests that keep those fixed.

import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = join(__dirname, '..');
const CORE_IIFE = readFileSync(join(REPO_ROOT, 'packages/core/dist/sola-core.iife.js'), 'utf8');
const TOKENS_CSS = readFileSync(join(REPO_ROOT, 'packages/tokens/src/tokens.css'), 'utf8');

type CompileFn = (source: string, options?: Record<string, unknown>) => { code: string };
let compilePromise: Promise<CompileFn> | undefined;
function getCompiler(): Promise<CompileFn> {
  compilePromise ??= import(
    pathToFileURL(join(REPO_ROOT, 'packages/compiler/src/index.js')).href
  ).then((m) => m.compile as CompileFn);
  return compilePromise;
}

/** Compile a library component and mount it into a blank page with tokens loaded. */
async function mount(page: Page, componentFile: string, props: Record<string, unknown> = {}) {
  const compile = await getCompiler();
  const source = readFileSync(join(REPO_ROOT, 'packages/ui/src', componentFile), 'utf8');
  const { code } = compile(source, {
    target: 'iife',
    exportName: 'Component',
    filename: componentFile
  });

  await page.goto('about:blank');
  await page.addStyleTag({ content: TOKENS_CSS });
  await page.addScriptTag({ content: CORE_IIFE });
  await page.addScriptTag({ content: code });
  await page.evaluate((p) => {
    const host = document.createElement('div');
    host.id = 'host';
    document.body.appendChild(host);
    (window as any).Component(host, p);
  }, props);
}

test.describe('TextInput', () => {
  test('accepts label, placeholder and value from its parent', async ({ page }) => {
    await mount(page, 'TextInput.sola', {
      label: 'Cluster name',
      placeholder: 'eu-west-1',
      initialValue: 'us-east-2'
    });

    // Every one of these used to be unreachable: they were plain `let`, not props.
    await expect(page.locator('label')).toHaveText('Cluster name');
    const input = page.locator('input');
    await expect(input).toHaveAttribute('placeholder', 'eu-west-1');
    await expect(input).toHaveValue('us-east-2');
  });

  test('label is wired to the input it names', async ({ page }) => {
    await mount(page, 'TextInput.sola', { label: 'Email' });

    const forAttr = await page.locator('label').getAttribute('for');
    const inputId = await page.locator('input').getAttribute('id');
    expect(forAttr).toBeTruthy();
    expect(forAttr).toBe(inputId);

    // Clicking the label must focus the input — the point of associating them.
    await page.locator('label').click();
    await expect(page.locator('input')).toBeFocused();
  });

  test('reports changes to the parent', async ({ page }) => {
    await page.goto('about:blank');
    await mount(page, 'TextInput.sola', {});
    await page.evaluate(() => {
      (window as any).__seen = [];
      const host = document.getElementById('host')!;
      host.innerHTML = '';
      (window as any).Component(host, {
        label: 'Query',
        onInput: (v: string) => (window as any).__seen.push(v)
      });
    });

    await page.locator('input').fill('abc');
    const seen = await page.evaluate(() => (window as any).__seen);
    expect(seen[seen.length - 1]).toBe('abc');
  });

  test('surfaces an error state accessibly', async ({ page }) => {
    await mount(page, 'TextInput.sola', { label: 'Port', errorText: 'Must be a number' });

    const input = page.locator('input');
    await expect(input).toHaveAttribute('aria-invalid', 'true');

    const describedBy = await input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveText('Must be a number');
    await expect(page.locator(`#${describedBy}`)).toHaveAttribute('role', 'alert');
  });
});

test.describe('Select', () => {
  test('renders options handed to it and reports the choice', async ({ page }) => {
    // Previously the only way to supply options was slot content, which made
    // the component impractical to drive from data.
    await mount(page, 'Select.sola', {
      label: 'Region',
      options: [
        { value: 'eu-west-1', label: 'EU West' },
        { value: 'us-east-2', label: 'US East' }
      ]
    });

    const select = page.locator('select');
    await expect(select.locator('option')).toHaveCount(3); // placeholder + 2
    await expect(page.locator('label')).toHaveText('Region');

    const forAttr = await page.locator('label').getAttribute('for');
    expect(forAttr).toBe(await select.getAttribute('id'));

    await page.evaluate(() => {
      (window as any).__picked = [];
      const host = document.getElementById('host')!;
      host.innerHTML = '';
      (window as any).Component(host, {
        label: 'Region',
        options: ['alpha', 'beta'],
        onChange: (v: string) => (window as any).__picked.push(v)
      });
    });

    await page.locator('select').selectOption('beta');
    expect(await page.evaluate(() => (window as any).__picked)).toEqual(['beta']);
  });
});

test.describe('DataCard', () => {
  test('shows the title, value and trend its parent gives it', async ({ page }) => {
    await mount(page, 'DataCard.sola', { title: 'Cluster Volume', value: '1,420 RPS', trend: '+14%' });

    // The published card ignored every prop and always read "METRIC $0.00 +0.0%".
    const card = page.locator('.sola-data-card');
    await expect(card).toContainText('Cluster Volume');
    await expect(card).toContainText('1,420 RPS');
    await expect(card).toContainText('+14%');
    await expect(card).not.toContainText('METRIC');
    await expect(card).not.toContainText('$0.00');
  });

  test('shows no trend footer when none is given, rather than a made-up one', async ({ page }) => {
    await mount(page, 'DataCard.sola', { title: 'Open incidents', value: '42' });

    const card = page.locator('.sola-data-card');
    await expect(card).toContainText('Open incidents');
    await expect(card).toContainText('42');
    await expect(card.locator('.card-footer')).toHaveCount(0);
    await expect(card).not.toContainText('+0.0%');
    await expect(card).not.toContainText('vs last period');
  });
});

test.describe('Modal', () => {
  test('announces itself as a dialog', async ({ page }) => {
    await mount(page, 'Modal.sola', { title: 'Confirm deploy', initialOpen: true });

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // The accessible name must come from the visible title.
    const labelledBy = await dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    await expect(page.locator(`#${labelledBy}`)).toHaveText('Confirm deploy');
  });

  test('closes on Escape', async ({ page }) => {
    await mount(page, 'Modal.sola', { title: 'Settings', initialOpen: true });
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.sola-modal-container')).not.toHaveClass(/active/);
  });

  test('keeps Tab inside the dialog', async ({ page }) => {
    await mount(page, 'Modal.sola', { title: 'Trapped', initialOpen: true });

    // Focus moves into the dialog on open rather than staying on the page behind.
    await expect(page.locator('.close-btn')).toBeFocused();

    // With one focusable control, Tab must cycle back to it, never escape to the body.
    await page.keyboard.press('Tab');
    const insideDialog = await page.evaluate(() =>
      !!document.activeElement?.closest('[role="dialog"]')
    );
    expect(insideDialog, 'focus must stay within the dialog').toBe(true);
  });

  test('returns focus to whatever opened it', async ({ page }) => {
    await mount(page, 'Modal.sola', { title: 'Focus return', initialOpen: false });

    await page.evaluate(() => {
      const trigger = document.createElement('button');
      trigger.id = 'trigger';
      trigger.textContent = 'Open';
      document.body.prepend(trigger);
      trigger.focus();
    });

    // Open it the way a parent would, through the controlled prop.
    await page.evaluate(() => {
      const host = document.getElementById('host')!;
      host.innerHTML = '';
      (window as any).Component(host, { title: 'Focus return', initialOpen: true });
    });
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#trigger')).toBeFocused();
  });
});

test.describe('Toast', () => {
  test('announces itself politely, and errors assertively', async ({ page }) => {
    await mount(page, 'Toast.sola', { message: 'Saved', type: 'success' });
    const toast = page.getByRole('status');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute('aria-live', 'polite');
    await expect(toast).toContainText('Saved');

    await mount(page, 'Toast.sola', { message: 'Deploy failed', type: 'error' });
    const alert = page.getByRole('alert');
    await expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  test('auto-dismisses when given a duration', async ({ page }) => {
    await mount(page, 'Toast.sola', { message: 'Transient', duration: 300 });
    await expect(page.locator('.sola-toast')).toHaveClass(/visible/);
    await expect(page.locator('.sola-toast')).not.toHaveClass(/visible/, { timeout: 3000 });
  });
});

test.describe('IntentSheet', () => {
  test('opens as a labelled dialog and closes on Escape', async ({ page }) => {
    // `open` was read as open() but written as open(false); a prop can be
    // neither, so closing used to throw.
    await mount(page, 'ai/IntentSheet.sola', { open: true, title: 'Suggested action' });

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const labelledBy = await dialog.getAttribute('aria-labelledby');
    await expect(page.locator(`#${labelledBy}`)).toHaveText('Suggested action');

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test('the library is overwhelmingly token-driven', async () => {
  // Not "zero hex": several components use blue, amber and rose shades that the
  // tokens package has no equivalent for, and forcing those onto the emerald
  // ramp would change the design rather than make it themeable. What must hold
  // is that the great majority of colours are theme-swappable, and that this
  // does not regress.
  const files = (readdirSync(join(REPO_ROOT, 'packages/ui/src'), { recursive: true }) as string[])
    .filter((rel) => rel.endsWith('.sola'));

  let tokenised = 0;
  let bare = 0;
  for (const rel of files) {
    const source = readFileSync(join(REPO_ROOT, 'packages/ui/src', rel), 'utf8');
    const styleStart = source.indexOf('<style>');
    if (styleStart === -1) continue;
    const css = source.slice(styleStart);
    tokenised += (css.match(/var\(--sola-/g) || []).length;
    for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = css.slice(Math.max(0, m.index! - 200), m.index!);
      const lastVar = before.lastIndexOf('var(--sola');
      if (lastVar === -1 || before.slice(lastVar).includes(')')) bare++;
    }
  }

  // Measured after the migration: 366 token references against 106 remaining
  // literals. These are a ratchet — a change may improve them, never regress.
  expect(tokenised, 'token references across the library').toBeGreaterThanOrEqual(360);
  expect(bare, 'colours with no token behind them').toBeLessThanOrEqual(106);
});

test('migrated components take every colour from tokens', async () => {
  // A component that hardcodes colour cannot be rebranded or themed without a
  // fork, which is what made the library unusable as a design system.
  const files = ['TextInput.sola', 'Modal.sola', 'Toast.sola', 'ai/IntentSheet.sola',
    'LauncherDock.sola', 'CommandPalette.sola', 'CompanionDrawer.sola', 'ToastHost.sola'];
  for (const file of files) {
    const source = readFileSync(join(REPO_ROOT, 'packages/ui/src', file), 'utf8');
    const styleBlock = source.slice(source.indexOf('<style>'));

    // Hex colours are allowed only as a var() fallback, so the component still
    // renders standalone without the tokens stylesheet loaded.
    const bareHex = [...styleBlock.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].filter((m) => {
      const before = styleBlock.slice(Math.max(0, m.index! - 200), m.index!);
      const lastVar = before.lastIndexOf('var(--sola');
      if (lastVar === -1) return true;
      // Inside the var() call if no closing paren has intervened.
      return before.slice(lastVar).includes(')');
    });

    expect(bareHex.map((m) => m[0]), `${file} has colours outside a token fallback`).toEqual([]);
  }
});
