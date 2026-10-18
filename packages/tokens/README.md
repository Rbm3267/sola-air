# @sola-air-ui/tokens

Design tokens for [Sola AIR](https://sola-air.dev) — spacing, radius, type scale, color, and semantic palette values, shared across `@sola-air-ui/ui` components so everything renders from one consistent system instead of hardcoded values scattered per component.

## Install

```bash
npm install @sola-air-ui/tokens
```

## Usage

**As CSS custom properties** (drop into any stylesheet or `.sola` component):

```css
@import '@sola-air-ui/tokens/css';

.my-panel {
  padding: var(--sola-space-lg);
  border-radius: var(--sola-radius-lg);
  color: var(--sola-text-primary);
}
```

**As JS values** (for computed styles, chart theming, etc.):

```js
import tokens from '@sola-air-ui/tokens';

console.log(tokens.space.lg, tokens.radius.lg, tokens.color.primary);
```

## Presets (`data-preset`)

Three built-in presets change radii, borders, surfaces, density and the accent colour. Each has a light and a dark version, picked with `data-theme="light" | "dark"`. Without `data-preset` you get the default Sola look.

```html
<html lang="en" data-preset="zinc" data-theme="dark">
```

- `zinc`: neutral grey surfaces, `6px–8px` radii, `1px` borders, monochrome primary buttons.
- `compact`: denser cards (`14px 16px`) and table cells (`8px 12px`), `8px` card radius, sky-blue accent.
- `graphite`: graphite surfaces, `5px` control radius, indigo accent, hairline borders.

To match your own design system, override the same custom properties (`--sola-card-radius`, `--sola-control-radius`, `--sola-color-primary-500`, `--sola-btn-primary-fg` and so on) on `:root`.

## Scoping note for widget/iframe environments

If you're embedding Sola output inside something that auto-scopes CSS to a container (e.g. a CMS widget sandbox), point the token stylesheet's root selector at your actual mount element rather than `:root` — a scoped `:root` selector matches nothing, since `:root` always resolves to `<html>` regardless of nesting.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
