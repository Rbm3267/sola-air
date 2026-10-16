# Sola AIR smoke test on a real ServiceNow instance

A short, repeatable check that the event bus, the closed-shadow-root shell and the
cross-page state behave on a real instance, where host CSS, other scripts and
full-page navigations are all in play. Needs `@sola-air-ui/core` **1.3.0 or newer**.

`smoke.js` is plain JavaScript with no dependencies, no network calls and no
instance-specific code. It mounts a small panel in a closed Shadow DOM and exposes
`window.solaSmoke`.

## Credentials: where they go (and where they don't)

- **Never in this repo, in chat, or in a prompt.** Nothing in this folder needs any.
- Do the work in a folder **outside the git checkout**, for example `~/sola-sn-smoke/`.
- Use whatever login the ServiceNow SDK provides (`now-sdk auth --help`) and keep
  anything it stores out of the repo. If a tool wants an env file, use a git-ignored
  `.env.local` with `chmod 600`.
- Use a **DEV instance** and an account with the minimum roles, not your personal admin
  login. Rotate or disable it afterward.

## Setup

```bash
mkdir ~/sola-sn-smoke && cd ~/sola-sn-smoke
npm init -y
npm i @sola-air-ui/core@^1.3.0
cp node_modules/@sola-air-ui/core/dist/sola-core.iife.js .
cp <path-to-repo>/examples/servicenow-smoke/smoke.js .
```

You now have two files to load, in this order, on **every page** under test:
`sola-core.iife.js`, then `smoke.js`. Load them with the mechanism your app already uses
for the shell (the same path as your `mountSolaLayer`). For a quick first pass on a single
page you can paste both into the browser console instead.

## Level 1: one page (about 2 minutes)

Open a DEV page with both files loaded, then run `solaSmoke.run()` in the console.

| # | Check | Expected |
| - | ----- | -------- |
| 1 | shell is in a closed shadow root | PASS |
| 2 | host `CustomEvent` reaches the shell | PASS |
| 3 | malformed context is rejected | PASS |
| 4 | rejection report carries no payload | PASS |
| 5 | `dom.out` reaches a host listener | PASS |
| 6 | unlisted bus events do not leak onto `window` | PASS |
| 7 | host CSS cannot restyle the shell | PASS (panel border = 1px) |
| 8 | sticky handoff was stored | PASS |
| 9 | `clearPersistentState` removes every `sola:` key | PASS |

**If 7 fails:** the instance's stylesheet is reaching inside the shell, so the shadow root
is not being used. Check that `mountShell` ran with `shadow: 'closed'` and the panel is
under `#sola-smoke`.

## Level 2: across pages and tabs (about 5 minutes)

These need the two files loaded on at least two different pages (for example a Service
Portal page and a workspace or classic `.do` page).

**A. Sticky handoff survives a navigation, once**
1. On page A: `solaSmoke.handoff('go-to-ops')`.
2. Navigate to page B (a full page load).
3. Expect the panel's **handoff** row to read `go-to-ops (replayed)`.
4. Reload page B. Expect the **handoff** row to be `-` (consumed, so F5 does not repeat it).
5. Expect: shows once, never twice.

**B. State syncs across tabs**
1. Open pages in two tabs with the harness loaded.
2. In tab 2: `solaSmoke.toast('hello')`.
3. Expect tab 1's **toast** row to read `hello`.
4. In tab 2: `window.dispatchEvent(new CustomEvent('sola:context', {detail:{title:'X'}}))`.
5. Expect tab 2's **context** row to read `X` and tab 1's to stay unchanged
   (`sola:context` is local-only; it is not a broadcast type).

**C. Sign-out wipes everything**
1. Set a handoff: `solaSmoke.handoff('secret-ish')`.
2. `solaSmoke.signOut()`.
3. In the console: `Object.keys(sessionStorage).filter(k => k.startsWith('sola:'))`.
4. Expect `[]`, and the other tab's panel rows to clear too.

**D. A hostile host script cannot get in**
1. `window.dispatchEvent(new CustomEvent('sola:context', {detail:{title:42, secret:'hunter2'}}))`.
2. Expect the **rejections** row to go up by one and **context** unchanged.
3. `JSON.stringify(solaSmoke.rejections())` must **not** contain `hunter2`.

## Report back

Note the instance version/family, the browser, which pages you loaded it on, and any check
that did not match. A failure on Level 2 A or B on a real instance is the most valuable
result: it means something in the platform (a frame, a service worker, storage policy,
a CSP) is interfering.

## Prompt for a local Claude Code session

> I'm running the Sola AIR smoke test from `examples/servicenow-smoke/README.md` against a
> ServiceNow DEV instance. Help me set up `~/sola-sn-smoke/` outside the repo as the README
> describes, and help me load `sola-core.iife.js` and `smoke.js` on two different pages.
> Do not ask for, print or store any credentials; I will sign in with the SDK myself. Walk
> me through Level 1 and Level 2, and help me interpret any check that fails.

## Cleanup

`solaSmoke.teardown()` removes the shell; `solaSmoke.signOut()` clears stored state. Remove
the two files from the pages you added them to.
