# @sola-air-ui/mcp

An MCP (Model Context Protocol) server for [Sola AIR](https://sola-air.dev) — lets Claude Code (or any MCP-compatible client) compile and validate `.sola` components and query the Sola API reference directly, without leaving your editor/agent session.

## Install & run

```bash
npx @sola-air-ui/mcp
```

## Add to Claude Code

```bash
claude mcp add sola -- npx @sola-air-ui/mcp
```

## Provided MCP Tools & Resources

### Tools
- **`compile_component`** — Compiles a `.sola` single-file component (`source`, optional `filename`) to JavaScript. Runs `sola-check` first to catch unbalanced template blocks, then returns `{ ok, js, code, css, scopeHash }` (or `{ ok: false, error, diagnostics }`).
- **`validate_component`** — Validates a `.sola` component (`source`, optional `filename`) using `sola-check` and the compiler, returning `{ valid, errors, diagnostics }` for syntax errors (`SOLA000`) and unbalanced/malformed `{#if}` / `{#each}` / `{:else}` blocks (`SOLA001`).

### Resources
- **`sola://docs`** (`text/plain`) — Complete Sola AIR API reference covering `.sola` file structure, reactive runes (`$state`, `$derived`, `$effect`, `$persist`, `$intent`, `$data`, `$on`, `$lastEvent`), template syntax, compiler/checker API, core runtime exports, and official `@sola-air-ui/ui` components.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
