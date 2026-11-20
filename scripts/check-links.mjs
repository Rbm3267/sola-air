#!/usr/bin/env node
// Build-time link and asset checker for sola-air.dev (zero dependencies).
//
// Scans built HTML output in app/.svelte-kit/output/prerendered/pages for broken
// internal links/assets and fails with exit code 1 on any 404.
// Pass --external to also check external http(s) URLs over the network.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appDir = path.join(repoRoot, 'app');
const outputDir = path.join(appDir, '.svelte-kit', 'output');
const prerenderDir = path.join(outputDir, 'prerendered', 'pages');
const clientDir = path.join(outputDir, 'client');
const routesDir = path.join(appDir, 'src', 'routes');

const checkExternal = process.argv.includes('--external');

// Vercel platform-injected runtime scripts that only exist in Vercel hosting.
const PLATFORM_PREFIXES = ['/_vercel/'];

// Dead URLs that must never reappear in built output.
const FORBIDDEN_URLS = [
  'github.com/Rbm3267/sola-air',
  'github.com/rbm3267/sola-air',
  'github.com/Rbm3267/sola-ui-skill'
];

function walkFiles(dir, predicate = () => true) {
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

function collectKnownRoutes() {
  const routes = new Set(['/']);
  const pageFiles = walkFiles(
    routesDir,
    (f) => f.endsWith('+page.svelte') || f.endsWith('+server.ts') || f.endsWith('+server.js')
  );
  for (const file of pageFiles) {
    const relDir = path.relative(routesDir, path.dirname(file)).replace(/\\/g, '/');
    if (!relDir || relDir === '.') {
      routes.add('/');
    } else {
      // Strip SvelteKit route groups like (marketing)
      const cleaned = relDir
        .split('/')
        .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
        .join('/');
      routes.add('/' + cleaned);
    }
  }
  return routes;
}

function extractRefs(html) {
  const refs = [];
  const attrRe = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    refs.push(m[1].trim());
  }
  return refs;
}

function resolveInternalPath(ref, htmlFile) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean.startsWith('/')) return clean;
  // Relative path resolved against the HTML file's route directory
  const relHtml = path.relative(prerenderDir, htmlFile).replace(/\\/g, '/');
  const baseDir = '/' + path.posix.dirname(relHtml).replace(/^\.$/, '');
  return path.posix.resolve(baseDir, clean);
}

function internalTargetExists(urlPath, knownRoutes) {
  if (PLATFORM_PREFIXES.some((p) => urlPath.startsWith(p))) return true;

  const normalized = urlPath.length > 1 ? urlPath.replace(/\/+$/, '') : urlPath;
  if (knownRoutes.has(normalized)) return true;

  const rel = normalized.replace(/^\/+/, '');
  const candidates = [
    path.join(clientDir, rel),
    path.join(prerenderDir, rel),
    path.join(prerenderDir, rel + '.html'),
    path.join(prerenderDir, rel, 'index.html')
  ];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

async function checkExternalUrl(url) {
  const headers = {
    'User-Agent': 'sola-air-link-checker/1.0 (+https://sola-air.dev)'
  };
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers, signal: ctrl.signal });
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let status = await attempt('HEAD');
    if (status >= 400) {
      status = await attempt('GET');
    }
    return { url, status, ok: status >= 200 && status < 400 };
  } catch (err) {
    return { url, status: 0, ok: false, error: err?.message || String(err) };
  }
}

async function main() {
  if (!existsSync(outputDir)) {
    console.error(`[check-links] Build output not found at ${outputDir}. Run "npm run build" first.`);
    process.exit(1);
  }

  const htmlFiles = walkFiles(prerenderDir, (f) => f.endsWith('.html'));
  if (htmlFiles.length === 0) {
    console.error(`[check-links] No built HTML files found under ${prerenderDir}.`);
    process.exit(1);
  }

  const knownRoutes = collectKnownRoutes();
  const brokenInternal = [];
  const forbiddenHits = [];
  const externalUrls = new Set();

  for (const file of htmlFiles) {
    const relFile = path.relative(repoRoot, file).replace(/\\/g, '/');
    const html = readFileSync(file, 'utf-8');

    for (const bad of FORBIDDEN_URLS) {
      if (html.includes(bad)) {
        forbiddenHits.push({ file: relFile, url: bad });
      }
    }

    for (const ref of extractRefs(html)) {
      if (
        !ref ||
        ref.startsWith('#') ||
        ref.startsWith('mailto:') ||
        ref.startsWith('tel:') ||
        ref.startsWith('javascript:') ||
        ref.startsWith('data:')
      ) {
        continue;
      }

      if (/^https?:\/\//i.test(ref)) {
        externalUrls.add(ref);
        continue;
      }

      const resolved = resolveInternalPath(ref, file);
      if (!resolved) continue;
      if (!internalTargetExists(resolved, knownRoutes)) {
        brokenInternal.push({ file: relFile, ref, resolved });
      }
    }
  }

  let externalFailures = [];
  if (checkExternal && externalUrls.size > 0) {
    console.log(`[check-links] Checking ${externalUrls.size} external URL(s)...`);
    const results = await Promise.all([...externalUrls].map((u) => checkExternalUrl(u)));
    externalFailures = results.filter((r) => !r.ok);
  }

  if (brokenInternal.length > 0) {
    console.error(`[check-links] Found ${brokenInternal.length} broken internal link(s)/asset(s):`);
    for (const item of brokenInternal) {
      console.error(`  - ${item.file}: "${item.ref}" -> ${item.resolved} (404)`);
    }
  }

  if (forbiddenHits.length > 0) {
    console.error(`[check-links] Found ${forbiddenHits.length} dead repository link(s) in built HTML:`);
    for (const item of forbiddenHits) {
      console.error(`  - ${item.file}: ${item.url}`);
    }
  }

  if (externalFailures.length > 0) {
    console.error(`[check-links] Found ${externalFailures.length} broken external URL(s):`);
    for (const item of externalFailures) {
      console.error(`  - ${item.url} (${item.status || item.error})`);
    }
  }

  if (brokenInternal.length > 0 || forbiddenHits.length > 0 || externalFailures.length > 0) {
    process.exit(1);
  }

  console.log(
    `[check-links] OK: scanned ${htmlFiles.length} HTML file(s), ${knownRoutes.size} routes, ${externalUrls.size} external URL(s)${checkExternal ? ' (checked live)' : ''}. 0 broken links.`
  );
}

main();
