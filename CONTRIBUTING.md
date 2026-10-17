# Contributing to Sola AIR

Thanks for helping. This is a small monorepo and the checks are fast, so the easiest way in is to clone it, run the tests, and open a pull request.

## Setup

```bash
git clone https://github.com/Rbm3267/sola-air.git
cd sola-air
npm install
```

CI runs Node 20, so use Node 20 or newer.

## Layout

- `packages/core`: signals, effects, `$intent`, `$data`, the bus, `mountShell`
- `packages/compiler`: turns `.sola` files into JavaScript and CSS
- `packages/ui`: the `.sola` component library
- `packages/relay`: the local data proxy behind `$data`
- `packages/sola-extension`, `packages/vscode-extension`: the Chrome and VS Code extensions
- `app`: the sola-air.dev site and playground

`AGENTS.md` is the reference for `.sola` syntax and what the compiler actually supports. Read it before changing the compiler or docs.

## Checks

```bash
npm test          # unit tests: core, compiler, sentinel, scaffold, extension
npm run test:e2e  # browser tests (Playwright) against the site
```

The browser tests include an axe accessibility check of every page in both themes (`e2e/a11y.spec.ts`). It allows the problems listed in its `BASELINE` and fails on anything new, so fix a baseline problem rather than raising its cap.

CI runs both on every pull request. Add a test with each fix. For a bug fix, check that the test fails without the fix.

## Pull requests

- Keep a change to one thing. A small PR gets reviewed faster.
- Say what changed and why. If a number or claim appears in the docs or on the site, the code must back it up.
- Add a line under `Unreleased` in `CHANGELOG.md` for anything that changes package behavior.
- Don't bump package versions in a feature PR. Releases are their own PR.
- Never commit credentials. Secrets belong in the repository's GitHub Actions secrets.

## Releases

A release PR bumps the versions and moves the `Unreleased` notes under a dated heading. After it merges, run the **Publish to NPM** workflow. It skips any version that is already on npm. When it succeeds, the **GitHub Releases** workflow creates a release (tag like `core-v1.5.0`) for each package whose version has a CHANGELOG entry, using that entry as the notes. Write the CHANGELOG entry as `## date: core 1.5.0` with a ``### `@sola-air-ui/core` `` section under it so the workflow can find it.

## Reporting a security problem

See [SECURITY.md](./SECURITY.md). Please don't open a public issue for it.
