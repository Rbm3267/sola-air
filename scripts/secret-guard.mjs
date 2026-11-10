#!/usr/bin/env node
// Fails when a file holds something shaped like a real API key.
//
//   node scripts/secret-guard.mjs            scan every git-tracked file
//   node scripts/secret-guard.mjs <dir>...   scan those folders (the built site)
//
// A match prints the file, line and kind, never the value, so a leaked key
// does not also end up in the CI log.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const PATTERNS = [
  { kind: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { kind: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { kind: 'OpenAI API key', re: /sk-(?:proj-)?[A-Za-z0-9_-]{40,}/ },
  { kind: 'GitHub token', re: /(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/ },
  { kind: 'npm token', re: /npm_[A-Za-z0-9]{36}/ },
  { kind: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
  { kind: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY/ }
];

// Lockfiles hold long base64 integrity hashes that can look like keys by chance.
const SKIP_NAMES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);
const SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|otf|zip|gz|vsix|pdf|mp4|webm|wasm)$/i;

/** Returns [{ line, kind }] for every key-shaped string in the text. */
export function scanText(text) {
  const found = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const { kind, re } of PATTERNS) {
      if (re.test(lines[i])) found.push({ line: i + 1, kind });
    }
  }
  return found;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function filesToScan(args) {
  if (args.length) return args.flatMap((d) => walk(d));
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
}

export function scanFiles(files) {
  const hits = [];
  for (const f of files) {
    const base = f.split('/').pop();
    if (SKIP_NAMES.has(base) || SKIP_EXT.test(f)) continue;
    let text;
    try {
      text = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\0')) continue;
    for (const h of scanText(text)) hits.push({ file: relative(process.cwd(), f), ...h });
  }
  return hits;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = filesToScan(process.argv.slice(2));
  const hits = scanFiles(files);
  if (hits.length) {
    for (const h of hits) console.error(`::error file=${h.file},line=${h.line}::Looks like a ${h.kind}. Remove it and rotate the key.`);
    console.error(`${hits.length} key-shaped string(s) found. Values are not printed.`);
    process.exit(1);
  }
  console.log(`No key-shaped strings in ${files.length} files.`);
}
