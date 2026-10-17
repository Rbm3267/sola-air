// Parses CHANGELOG.md into structured release sections so the website's
// /changelog route and build-time metadata never drift from the canonical
// markdown changelog at the root of the repository.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @typedef {Object} ChangelogPackageEntry
 * @property {string} pkg
 * @property {string[]} items
 */

/**
 * @typedef {Object} ChangelogSection
 * @property {string} id
 * @property {string} date
 * @property {string} title
 * @property {ChangelogPackageEntry[]} packages
 */

/**
 * @param {string} markdown
 * @returns {ChangelogSection[]}
 */
export function parseChangelog(markdown) {
  const sections = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  /** @type {ChangelogSection | null} */
  let currentSection = null;
  /** @type {ChangelogPackageEntry | null} */
  let currentPkg = null;
  /** @type {string[]} */
  let currentBulletLines = [];

  function flushBullet() {
    if (currentPkg && currentBulletLines.length > 0) {
      const text = currentBulletLines.join(' ').replace(/\s+/g, ' ').trim();
      if (text) currentPkg.items.push(text);
    }
    currentBulletLines = [];
  }

  function flushSection() {
    flushBullet();
    if (currentSection && currentSection.packages.length > 0) {
      sections.push(currentSection);
    }
    currentSection = null;
    currentPkg = null;
  }

  for (const rawLine of lines) {
    const h2 = rawLine.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      flushSection();
      const heading = h2[1].trim();
      if (/^unreleased$/i.test(heading)) {
        currentSection = {
          id: 'unreleased',
          date: 'Unreleased',
          title: 'Upcoming in next release',
          packages: []
        };
        continue;
      }

      const dated = heading.match(/^(\d{4}-\d{2}-\d{2})(?:\s*[:—-]?\s*(.*))?$/);
      const date = dated ? dated[1] : '';
      const rawTitle = dated ? (dated[2] || '').trim().replace(/^\((.+)\)$/, '$1') : heading;
      const slug = heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      currentSection = {
        id: slug || `release-${sections.length + 1}`,
        date,
        title: rawTitle || date,
        packages: []
      };
      continue;
    }

    if (!currentSection) continue;

    const h3 = rawLine.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      flushBullet();
      const pkg = h3[1].replace(/`/g, '').trim();
      currentPkg = { pkg, items: [] };
      currentSection.packages.push(currentPkg);
      continue;
    }

    const bulletStart = rawLine.match(/^\s*-\s+(.+)$/);
    if (bulletStart) {
      flushBullet();
      if (!currentPkg) {
        currentPkg = { pkg: 'General', items: [] };
        currentSection.packages.push(currentPkg);
      }
      currentBulletLines.push(bulletStart[1].trim());
      continue;
    }

    if (currentBulletLines.length > 0 && /^\s{2,}\S/.test(rawLine)) {
      currentBulletLines.push(rawLine.trim());
    }
  }

  flushSection();
  return sections;
}

/**
 * @param {string} [repoRoot]
 * @returns {ChangelogSection[]}
 */
export function readChangelog(repoRoot = DEFAULT_ROOT) {
  const md = readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8');
  return parseChangelog(md);
}
