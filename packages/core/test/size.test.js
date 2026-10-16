import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { measureCore } from '../../../scripts/core-size.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('the core size we state', () => {
  const { gzipKb, gzipBytes } = measureCore();

  it('measures a plausible gzipped bundle', () => {
    assert.ok(gzipBytes > 1000 && gzipBytes < 100000, `gzip bytes = ${gzipBytes}`);
  });

  it('AGENTS.md states the measured size, not a stale one', () => {
    const text = readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    const m = text.match(/\(`~(\d+(?:\.\d)?) kB`\) gzipped|`~(\d+(?:\.\d)?) kB` gzipped/);
    assert.ok(m, 'AGENTS.md should state "~N kB gzipped" for the core runtime');
    const stated = Number(m[1] ?? m[2]);
    assert.ok(
      Math.abs(stated - Number(gzipKb)) <= 0.3,
      `AGENTS.md says ~${stated} kB but the core bundle is ${gzipKb} kB gzipped; update the line`
    );
  });
});
