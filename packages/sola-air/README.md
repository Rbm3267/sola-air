# sola-air

Meta-package for [Sola AIR](https://sola-air.dev) — installs the whole framework (core reactivity, compiler, Vite plugin, UI components, design tokens, Sentinel observer, data relay, LLM providers, and the MCP server) with one command, so you don't have to figure out which of the `@sola-air-ui/*` packages you need up front.

## Install

```bash
npm install sola-air
```

This pulls in:

| Package | Purpose |
|---|---|
| `@sola-air-ui/core` | Reactivity engine (signals, effects, lifecycle, `$intent`, `$persist`, bus, shell) |
| `@sola-air-ui/compiler` | `.sola` single-file component compiler and `sola-check` static analyzer |
| `@sola-air-ui/vite-plugin-sola` | Vite integration for `.sola` imports |
| `@sola-air-ui/ui` | Real component library |
| `@sola-air-ui/tokens` | Design tokens |
| `@sola-air-ui/sentinel` | Standalone friction & ambient field-behavior observer |
| `@sola-air-ui/relay` | Local data proxy for `$data` |
| `@sola-air-ui/providers` | Server-side LLM adapters for `$intent` |
| `@sola-air-ui/mcp` | MCP server for agent tooling |

## Quickest start

For a new project, prefer the scaffolder over installing this package directly into an existing one:

```bash
npm create sola@latest my-app
```

## Manual setup

```js
// vite.config.js
import { defineConfig } from 'vite';
import sola from '@sola-air-ui/vite-plugin-sola';

export default defineConfig({ plugins: [sola()] });
```

```html
<!-- App.sola -->
<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>Count: {count}</button>
```

See the [full documentation](https://sola-air.dev) for `$intent`, `$data`, and the complete component library.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
