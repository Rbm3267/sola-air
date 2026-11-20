#!/usr/bin/env node
// Weekly live external link checker for sola-air.dev (zero dependencies).
//
// Collects all external http(s) URLs from built HTML and app/src, verifies
// each returns HTTP 2xx/3xx, and flags any Obsidian community listing page
// whose body contains "archived" or "Plugin not found".

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appSrcDir = path.join(repoRoot, 'app', 'src');
const prerenderDir = path.join(repoRoot, 'app', '.svelte-kit', 'output', 'prerendered', 'pages');

const SKIP_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'example.com',
  'billing.example.com',
  'ops-portal.internal',
  'sola-air.dev',
  'www.sola-air.dev',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.w3.org'
]);

const OBSIDIAN_LISTING_RE = /obsidian\.md\/plugins|raw\.githubusercontent\.com\/obsidianmd/i;
const OBSIDIAN_STALE_RE = /\barchived\b|plugin not found/i;

function walkFiles(dir, predicate) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

function collectUrls() {
  const urlSources = new Map();
  const files = [
    ...walkFiles(prerenderDir, (f) => f.endsWith('.html')),
    ...walkFiles(appSrcDir, (f) => /\.(svelte|sola|ts|html)$/.test(f))
  ];

  // Match href="https://..." or quoted URLs in site data / templates
  const urlRe = /https?:\/\/[^\s"'<>`\\){}]+/g;

  for (const file of files) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    const content = readFileSync(file, 'utf-8');
    let m;
    while ((m = urlRe.exec(content)) !== null) {
      let raw = m[0].replace(/[.,;:!?)]+$/, '');
      try {
        const parsed = new URL(raw);
        if (SKIP_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith('.internal')) continue;
        if (raw.includes('${')) continue;
        if (!urlSources.has(raw)) urlSources.set(raw, new Set());
        urlSources.get(raw).add(rel);
      } catch {
        // Ignore non-URL template fragments
      }
    }
  }
  return urlSources;
}

async function checkUrl(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; sola-air-live-link-check/1.0; +https://sola-air.dev)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };
  const isObsidian = OBSIDIAN_LISTING_RE.test(url);

  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers, signal: ctrl.signal });
      const body = method === 'GET' && isObsidian ? await res.text() : '';
      return { status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let result = await attempt(isObsidian ? 'GET' : 'HEAD');
    if (!isObsidian && result.status >= 400) {
      result = await attempt('GET');
    }
    if (result.status < 200 || result.status >= 400) {
      return { url, ok: false, reason: `HTTP ${result.status}` };
    }
    if (isObsidian && OBSIDIAN_STALE_RE.test(result.body)) {
      return { url, ok: false, reason: 'Obsidian listing contains "archived" or "Plugin not found"' };
    }
    return { url, ok: true, status: result.status };
  } catch (err) {
    return { url, ok: false, reason: err?.message || String(err) };
  }
}

async function main() {
  const urlSources = collectUrls();
  const urls = [...urlSources.keys()].sort();
  console.log(`[check-live-links] Checking ${urls.length} external URL(s)...`);

  const failures = [];
  const concurrency = 6;
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((u) => checkUrl(u)));
    for (const r of results) {
      if (!r.ok) {
        failures.push({ ...r, files: [...urlSources.get(r.url)] });
      }
    }
  }

  if (failures.length > 0) {
    console.error(`[check-live-links] FAILED: ${failures.length} broken or stale URL(s):`);
    for (const f of failures) {
      console.error(`  - ${f.url} -> ${f.reason} (referenced in: ${f.files.join(', ')})`);
    }
    process.exit(1);
  }

  console.log(`[check-live-links] OK: all ${urls.length} external URL(s) passed.`);
}

main();
