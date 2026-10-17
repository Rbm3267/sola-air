import { test } from 'node:test';
import assert from 'node:assert';
import { releaseNotes, tagFor, publishedPackages } from './github-releases.mjs';

const changelog = `# Changelog

## Unreleased

## 2026-10-17: core 1.5.0

### \`@sola-air-ui/core\`

- Added a thing.

## 2026-10-16: core 1.4.0, compiler 1.3.0, ui 1.4.0

### \`@sola-air-ui/core\`

- Fixed effects.

### \`@sola-air-ui/ui\`

- DataCard props.

### Chrome extension

- Not a package.

## 2026-09-01

### \`@sola-air-ui/ui@1.3.0\`

- Old format.
`;

test('takes the package subsection of the section that names the version', () => {
  assert.strictEqual(releaseNotes(changelog, '@sola-air-ui/core', '1.5.0'), '- Added a thing.');
  assert.strictEqual(releaseNotes(changelog, '@sola-air-ui/core', '1.4.0'), '- Fixed effects.');
});

test('a combined heading gives each package only its own part', () => {
  assert.strictEqual(releaseNotes(changelog, '@sola-air-ui/ui', '1.4.0'), '- DataCard props.');
});

test('understands the name@version heading form', () => {
  assert.strictEqual(releaseNotes(changelog, '@sola-air-ui/ui', '1.3.0'), '- Old format.');
});

test('returns null when there is no entry, and does not match a longer version', () => {
  assert.strictEqual(releaseNotes(changelog, '@sola-air-ui/relay', '1.0.2'), null);
  assert.strictEqual(releaseNotes(changelog, '@sola-air-ui/core', '1.5.01'), null);
  assert.strictEqual(releaseNotes(changelog, '@sola-air-ui/core', '1.5'), null);
});

test('tags drop the scope', () => {
  assert.strictEqual(tagFor('@sola-air-ui/core', '1.5.0'), 'core-v1.5.0');
  assert.strictEqual(tagFor('sola-air', '1.1.0'), 'sola-air-v1.1.0');
});

test('the real package list excludes the VS Code extension and private packages', () => {
  const names = publishedPackages().map((p) => p.name);
  assert(names.includes('@sola-air-ui/core'));
  assert(!names.includes('sola-vscode'));
});
