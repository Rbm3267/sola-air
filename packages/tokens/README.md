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

## Host Design System Presets (`data-preset`)

`@sola-air-ui/tokens` includes built-in Chameleon presets (`shadcn`, `enterprise`, `linear`) so Sola AIR components automatically adopt the radii, border contrast, surface elevation, and density of your host application in both light and dark modes (`data-theme="light" | "dark"`):

```html
<html lang="en" data-preset="shadcn" data-theme="dark">
```

- `data-preset="shadcn"` — Zinc monochrome surfaces, crisp `6px–8px` radii, flat `1px` borders, inverted primary actions.
- `data-preset="enterprise"` — High-density workspace geometry, `8px` card radius, compact padding (`14px 16px` cards, `8px 12px` table cells), sky-blue accent.
- `data-preset="linear"` — Precision graphite surfaces (`#08090a` / `#0f1012`), `5px` control radius, `#5e6ad2` indigo-violet accent, subtle top-edge inset highlight.

## Scoping note for widget/iframe environments

If you're embedding Sola output inside something that auto-scopes CSS to a container (e.g. a CMS widget sandbox), point the token stylesheet's root selector at your actual mount element rather than `:root` — a scoped `:root` selector matches nothing, since `:root` always resolves to `<html>` regardless of nesting.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
