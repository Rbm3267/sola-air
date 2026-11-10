# RFC 0003: the Generate tab and its sandbox

Status: implemented · Where: `app` (`/demo`, Generate tab) · Files: `app/src/lib/components/GenerateDemo.svelte`, `app/src/routes/api/intent/+server.ts` (mode `sola`), `solaGenerate()` in `app/vite.config.ts`

## Problem

The playground could only pick from a fixed list of components and fill in their settings. Letting a model write a whole component is the obvious next step, and it means running code that nobody on the team has read. This RFC records how that is kept safe and what it does not cover.

## What it does

1. The visitor describes a small interface (at most 500 characters).
2. `POST /api/intent` with `mode: 'sola'` asks the model for one `.sola` file. The server returns the text. It never compiles or runs it. The reply is capped at 14,000 characters.
3. The page compiles the file in the browser with `@sola-air-ui/compiler`, target `iife`.
4. The page counts `{#if}` and `{#each}` against their closing tags, the same check `sola-check` makes. The compiler accepts an unclosed block and prints it as text, so a mismatch counts as an error.
5. On any error the page makes one more request with the compiler's message and the previous file, and asks for a corrected whole file. A second failure is shown to the visitor as it is.
6. The compiled script runs inside an iframe. The visitor can switch to the source and copy it.

## The frame

```html
<iframe sandbox="allow-scripts" srcdoc="…">
```

The document inside carries this policy:

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:
```

What that gives, and where each part comes from:

| Property | Why it holds |
| --- | --- |
| The component cannot read the page, its DOM, cookies or storage | The sandbox has no `allow-same-origin`, so the frame has an opaque origin. |
| The component cannot make network requests | `default-src 'none'` covers `fetch`, `XMLHttpRequest`, WebSocket, images, frames and form posts. |
| The component cannot navigate the page, open windows or submit forms | None of `allow-top-navigation`, `allow-popups` or `allow-forms` is set. |
| The component cannot load more code | `script-src` allows inline script only, and the frame has no remote `src`. |
| `localStorage` and `$persist` fail quietly | The opaque origin has no storage. `$persist` falls back to a plain signal. |

The frame contains the core runtime (`sola-core.iife.min.js`) and the compiled component. The runtime is built at build time by `solaGenerate()` from `packages/core/src` through `scripts/core-size.mjs`, so the page and the size check use one build.

## Tested

`e2e/playground.spec.ts` runs a deliberately hostile component and checks, from inside the frame, that it cannot read `window.parent.document` or `localStorage`, and that its `fetch` is rejected and reaches no server. The cookie claim in the table follows from the opaque origin and is not asserted by a test. Other tests cover a working component, the retry with its error, and the message shown when the model call fails.

## Not covered

- **The frame can still use the visitor's CPU.** An infinite loop in a component freezes the frame, and in some browsers the tab. There is no timeout or worker.
- **The frame can draw anything inside itself.** A model can write a page that imitates a login form. The frame cannot send what is typed anywhere, but it can mislead. The text under the frame says what it is.
- **Browser bugs.** The boundary is the browser's iframe sandbox and CSP. A flaw in either is a flaw here.
- **Output quality.** Whether the model writes good components is not a safety question and is not tested offline.
- **Cost and abuse.** Every request is a model call. The route's per-address limit (15 requests a minute) applies, and the limit is held in memory per server instance.

## Why in the browser

The compiler reads its own `package.json` with `node:fs` when it loads. On the server that read would depend on where the bundler places the file at runtime. In the browser the build supplies a stand-in for that one call, so nothing depends on the server's file layout. It also keeps untrusted source off the server entirely.

## Open questions

- A wall-clock limit on the frame (run it in a Worker, or reload it when it stops answering).
- Whether the generated component should be allowed to import `@sola-air-ui/ui` components. That needs those modules inside the frame and widens what it can do, so it is left out.
- A test that compiles the example file in the prompt, so the prompt cannot drift from what the compiler accepts.
