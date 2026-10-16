# Security Policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue or pull request.

Use GitHub's private reporting: open the **Security** tab of this repository and choose **Report a vulnerability**. Include what you found, the package and version, and steps to reproduce it.

You can expect an acknowledgement within a few days. Fixes ship as a normal patch release, and the changelog will say what was fixed.

## What is in scope

- `@sola-air-ui/*` packages and the `sola-air` meta-package on npm
- The Sola Relay (`@sola-air-ui/relay`), including how it handles queries and credentials
- The Chrome and VS Code extensions
- The site at sola-air.dev

## Things to know

- The Relay keeps database credentials on the machine it runs on. Components pass only a source name and query, never a connection string.
- `$persist` and sticky bus events write to browser storage. Don't put sensitive values in them.
- Model output from `$intent` should be rendered as text. The shipped components do this; if you render it as HTML yourself, sanitize it first.

## Supported versions

Fixes go into the latest release of each package.
