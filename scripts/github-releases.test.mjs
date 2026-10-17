import { test } from 'node:test';
import assert from 'node:assert';
import { releaseNotes, tagFor, publishedPackages } from './github-releases.mjs';
import { parseChangelog, readChangelog, packageLabel } from './changelog-parse.mjs';

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

test('parseChangelog parses dated sections and skips empty Unreleased sections', () => {
  const parsed = parseChangelog(changelog);
  assert.strictEqual(parsed.length, 3);
  assert.strictEqual(parsed[0].date, '2026-10-17');
  assert.strictEqual(parsed[0].title, 'core 1.5.0');
  assert.deepStrictEqual(parsed[0].packages, [
    { pkg: '@sola-air-ui/core', items: ['Added a thing.'] }
  ]);
  assert.strictEqual(parsed[1].packages.length, 3);
});

test('packageLabel folds versions and notes into one package name', () => {
  assert.strictEqual(packageLabel('`@sola-air-ui/ui@1.3.0`'), '@sola-air-ui/ui');
  assert.strictEqual(packageLabel('`@sola-air-ui/ui`'), '@sola-air-ui/ui');
  assert.strictEqual(packageLabel('VS Code extension (`sola-vscode` 0.2.0)'), 'VS Code extension');
  assert.strictEqual(packageLabel('Website (app/, not published to npm)'), 'Website');
  assert.strictEqual(packageLabel('`sola-air`'), 'sola-air');
});

test('readChangelog parses the real root CHANGELOG.md with non-empty entries', () => {
  const entries = readChangelog();
  assert(entries.length >= 5, `expected >= 5 changelog releases, got ${entries.length}`);
  for (const entry of entries) {
    assert(entry.date, 'entry.date must be non-empty');
    assert(entry.packages.length > 0, `entry ${entry.id} must have at least one package group`);
    const names = entry.packages.map((p) => p.pkg);
    assert.strictEqual(new Set(names).size, names.length, `entry ${entry.id} lists a package twice`);
  }
  const ids = entries.map((e) => e.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'section ids must be unique');
  const labels = new Set(entries.flatMap((e) => e.packages.map((p) => p.pkg)));
  for (const label of labels) assert.doesNotMatch(label, /@\d+\.\d+\.\d+|\(/, `filter label "${label}" still carries a version or note`);
});

