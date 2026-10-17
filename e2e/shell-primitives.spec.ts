// Behaviour checks for the shell primitives in RFC 0002: LauncherDock,
// CommandPalette, CompanionDrawer and ToastHost. Each one is compiled from its
// .sola source and mounted in a real browser with the tokens and core loaded.

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
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

/**
 * Compile a library component and mount it. `setup` is a JavaScript expression
 * run in the page, with `SolaCore` in scope, that returns the props. It lets a
 * test pass signals and callbacks that cannot cross the Playwright boundary.
 */
async function mount(page: Page, componentFile: string, setup = '({})') {
  const compile = await getCompiler();
  const source = readFileSync(join(REPO_ROOT, 'packages/ui/src', componentFile), 'utf8');
  const { code } = compile(source, { target: 'iife', exportName: 'Component', filename: componentFile });

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('about:blank');
  await page.addStyleTag({ content: TOKENS_CSS });
  await page.addScriptTag({ content: CORE_IIFE });
  await page.addScriptTag({ content: code });
  await page.evaluate((s) => {
    const host = document.createElement('div');
    host.id = 'host';
    document.body.appendChild(host);
    const props = new Function('SolaCore', `return (${s});`)((window as any).SolaCore);
    (window as any).Component(host, props);
  }, setup);
  return errors;
}

test.describe('LauncherDock', () => {
  const setup = `({
    items: [{ id: 'home', label: 'Home' }, { id: 'inbox', label: 'Inbox', icon: '✉', badge: '3' }],
    active: 'home',
    label: 'Main launcher',
    onSelect: (item) => { (window.__picked = window.__picked || []).push(item.id); }
  })`;

  test('is a named nav with one named button per item', async ({ page }) => {
    const errors = await mount(page, 'LauncherDock.sola', setup);
    await expect(page.getByRole('navigation', { name: 'Main launcher' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inbox' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('marks the active item and shows badge and fallback icon', async ({ page }) => {
    await mount(page, 'LauncherDock.sola', setup);
    await expect(page.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Home' })).toContainText('H');
    await expect(page.getByRole('button', { name: 'Inbox' })).toContainText('3');
  });

  test('reports the chosen item, and follows an active signal', async ({ page }) => {
    await mount(page, 'LauncherDock.sola', `(() => {
      const [active, setActive] = SolaCore.createSignal('home');
      window.__setActive = setActive;
      return {
        items: [{ id: 'home', label: 'Home' }, { id: 'inbox', label: 'Inbox' }],
        active,
        onSelect: (item) => { (window.__picked = window.__picked || []).push(item.id); setActive(item.id); }
      };
    })()`);

    await page.getByRole('button', { name: 'Inbox' }).click();
    expect(await page.evaluate(() => (window as any).__picked)).toEqual(['inbox']);
    await expect(page.getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('CommandPalette', () => {
  const setup = `({
    commands: [
      { id: 'save', label: 'Save file', hint: 'Ctrl+S' },
      { id: 'open', label: 'Open file' },
      { id: 'theme', label: 'Toggle theme' }
    ],
    onSelect: (c) => { (window.__chosen = window.__chosen || []).push(c.id); },
    onClose: () => { window.__closed = (window.__closed || 0) + 1; }
  })`;

  test('stays hidden until the hotkey, then opens with focus in the search field', async ({ page }) => {
    const errors = await mount(page, 'CommandPalette.sola', setup);
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('combobox')).toBeFocused();
    await expect(page.getByRole('option')).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test('filters as you type and says when nothing matches', async ({ page }) => {
    await mount(page, 'CommandPalette.sola', setup);
    await page.keyboard.press('ControlOrMeta+k');

    await page.getByRole('combobox').fill('FILE');
    await expect(page.getByRole('option')).toHaveCount(2);

    await page.getByRole('combobox').fill('zzz');
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(page.getByText('No matching commands')).toBeVisible();
  });

  test('arrow keys move the selection and Enter chooses it', async ({ page }) => {
    await mount(page, 'CommandPalette.sola', setup);
    await page.keyboard.press('ControlOrMeta+k');

    const input = page.getByRole('combobox');
    const options = page.getByRole('option');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    const activeId = await input.getAttribute('aria-activedescendant');
    expect(await options.nth(1).getAttribute('id')).toBe(activeId);

    // The selection wraps from the last row back to the first.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).__chosen)).toEqual(['theme']);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('clicking a row chooses it', async ({ page }) => {
    await mount(page, 'CommandPalette.sola', setup);
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('option', { name: /Open file/ }).click();
    expect(await page.evaluate(() => (window as any).__chosen)).toEqual(['open']);
  });

  test('Escape closes it and focus returns to where it was', async ({ page }) => {
    await mount(page, 'CommandPalette.sola', setup);
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'before';
      b.textContent = 'before';
      document.body.appendChild(b);
      b.focus();
    });

    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#before')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__closed)).toBe(1);
  });

  test('can be driven from outside, and hotkey "" turns the shortcut off', async ({ page }) => {
    await mount(page, 'CommandPalette.sola', `(() => {
      const [open, setOpen] = SolaCore.createSignal(false);
      window.__setOpen = setOpen;
      return { commands: [{ id: 'a', label: 'Alpha' }], isOpen: open, hotkey: '' };
    })()`);

    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.evaluate(() => (window as any).__setOpen(true));
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(() => (window as any).__setOpen(false));
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

test.describe('CompanionDrawer', () => {
  const setup = `(() => {
    const [open, setOpen] = SolaCore.createSignal(false);
    window.__setOpen = setOpen;
    return {
      title: 'Assistant',
      isOpen: open,
      onClose: () => { window.__closed = (window.__closed || 0) + 1; setOpen(false); }
    };
  })()`;

  test('is hidden from the page and the tab order while closed', async ({ page }) => {
    const errors = await mount(page, 'CompanionDrawer.sola', setup);
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('opens as a named, non-modal dialog and moves focus into it', async ({ page }) => {
    await mount(page, 'CompanionDrawer.sola', setup);
    await page.evaluate(() => (window as any).__setOpen(true));

    const drawer = page.getByRole('dialog', { name: 'Assistant' });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-modal', 'false');
    await expect(drawer).toBeFocused();
  });

  test('Escape and the close button close it, and focus returns', async ({ page }) => {
    await mount(page, 'CompanionDrawer.sola', setup);
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'before';
      b.textContent = 'before';
      document.body.appendChild(b);
      b.focus();
    });

    await page.evaluate(() => (window as any).__setOpen(true));
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#before')).toBeFocused();

    await page.evaluate(() => (window as any).__setOpen(true));
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await page.evaluate(() => (window as any).__closed)).toBe(2);
  });

  test('Escape pressed outside the drawer leaves it open', async ({ page }) => {
    await mount(page, 'CompanionDrawer.sola', setup);
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'outside';
      b.textContent = 'outside';
      document.body.appendChild(b);
      (window as any).__setOpen(true);
    });
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.locator('#outside').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('can start open and sit on the left', async ({ page }) => {
    await mount(page, 'CompanionDrawer.sola', `({ title: 'Notes', initialOpen: true, side: 'left', width: '300px' })`);
    const drawer = page.getByRole('dialog', { name: 'Notes' });
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(box!.x).toBe(0);
    expect(Math.round(box!.width)).toBe(300);
  });
});

test.describe('ToastHost', () => {
  const emit = (page: Page, payload: unknown) =>
    page.evaluate((p) => (window as any).SolaCore.bus.emit('sola:toast', p), payload);

  test('shows a toast sent over the bus, in a polite live region', async ({ page }) => {
    const errors = await mount(page, 'ToastHost.sola', `({ duration: 0 })`);
    const region = page.getByRole('region', { name: 'Notifications' });
    await expect(region).toHaveAttribute('aria-live', 'polite');

    await emit(page, { kind: 'success', text: 'Saved' });
    await expect(region.getByRole('status')).toHaveText(/Saved/);
    expect(errors).toEqual([]);
  });

  test('an error toast is an alert', async ({ page }) => {
    await mount(page, 'ToastHost.sola', `({ duration: 0 })`);
    await emit(page, { kind: 'error', text: 'Save failed' });
    await expect(page.getByRole('alert')).toHaveText(/Save failed/);
  });

  test('ignores a payload with no text', async ({ page }) => {
    await mount(page, 'ToastHost.sola', `({ duration: 0 })`);
    await emit(page, { kind: 'info' });
    await emit(page, null);
    await emit(page, { kind: 'info', text: 'real' });
    await expect(page.getByRole('status')).toHaveCount(1);
  });

  test('the dismiss button removes the toast and reports it', async ({ page }) => {
    await mount(page, 'ToastHost.sola', `({ duration: 0, onDismiss: (t) => { window.__gone = t.text; } })`);
    await emit(page, { text: 'Hello' });
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(page.getByText('Hello')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__gone)).toBe('Hello');
  });

  test('a toast leaves by itself after its duration', async ({ page }) => {
    await mount(page, 'ToastHost.sola', `({ duration: 150 })`);
    await emit(page, { text: 'Short lived' });
    await expect(page.getByText('Short lived')).toBeVisible();
    await expect(page.getByText('Short lived')).toHaveCount(0);

    // A duration in the payload beats the prop.
    await emit(page, { text: 'Sticky', duration: 0 });
    await page.waitForTimeout(400);
    await expect(page.getByText('Sticky')).toBeVisible();
  });

  test('keeps only the newest toasts when the stack is full', async ({ page }) => {
    await mount(page, 'ToastHost.sola', `({ duration: 0, max: 2 })`);
    for (const text of ['one', 'two', 'three']) await emit(page, { text });
    await expect(page.getByRole('status')).toHaveCount(2);
    await expect(page.getByText('one')).toHaveCount(0);
    await expect(page.getByText('three')).toBeVisible();
  });

  test('listen "" turns the subscription off, and a custom type is honoured', async ({ page }) => {
    await mount(page, 'ToastHost.sola', `({ duration: 0, listen: '' })`);
    await emit(page, { text: 'nobody hears this' });
    await expect(page.getByRole('status')).toHaveCount(0);

    await mount(page, 'ToastHost.sola', `({ duration: 0, listen: 'app:note' })`);
    await page.evaluate(() => (window as any).SolaCore.bus.emit('app:note', { text: 'custom' }));
    await expect(page.getByText('custom')).toBeVisible();
  });
});
