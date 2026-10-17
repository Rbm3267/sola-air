// Static checks for .sola files.
//
// The compiler accepts an unbalanced block (an unclosed `{#if}`, a stray
// `{/each}` or `{:else}`) without an error and emits it as literal text, so a
// file can compile and then show `{#if ...}` on the page. These checks catch
// that before it ships.

import fs from 'node:fs';
import path from 'node:path';
import { compile } from './index.js';

export const RULES = {
  SOLA000: 'compile error',
  SOLA001: 'unbalanced block'
};

// Blank out <script> and <style> bodies and HTML comments, keeping newlines so
// line numbers hold. A commented-out block is not a block.
function maskNonTemplate(source) {
  return source
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
}

function position(source, index) {
  const before = source.slice(0, index);
  const line = before.split('\n').length;
  return { line, column: index - before.lastIndexOf('\n') };
}

function matchBrace(text, openPos) {
  let depth = 0;
  let inStr = null;
  for (let i = openPos; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { if (--depth === 0) return i; }
  }
  return -1;
}

/**
 * Check one component's source. Returns diagnostics:
 * `{ file, line, column, severity: 'error' | 'warning', code, message }`.
 */
export function checkSource(source, filename = 'component.sola') {
  const diagnostics = [];
  const add = (index, severity, code, message) =>
    diagnostics.push({ file: filename, ...position(source, index), severity, code, message });

  try {
    compile(source, { filename, sourcemap: false });
  } catch (err) {
    const m = /\(line (\d+), col (\d+)\)/.exec(err.message);
    diagnostics.push({
      file: filename,
      line: m ? Number(m[1]) : 1,
      column: m ? Number(m[2]) : 1,
      severity: 'error',
      code: 'SOLA000',
      message: err.message.replace(/^\[sola compiler\]\s*/, '').split('\n').map((s) => s.trim()).filter(Boolean).join(' ')
    });
  }

  const template = maskNonTemplate(source);
  const tag = /\{(#if|#each|\/if|\/each|:else)(?![\w])/g;
  const stack = [];
  let match;
  while ((match = tag.exec(template))) {
    const kind = match[1];
    const at = match.index;
    const closeIdx = matchBrace(template, at);
    if (kind === '#if') {
      stack.push({ kind: 'if', at });
      if (closeIdx !== -1) {
        const cond = template.slice(at + 4, closeIdx).trim();
        if (!cond) {
          add(at, 'error', 'SOLA001', '`{#if}` is missing a condition. It renders as literal text.');
        }
      }
    } else if (kind === '#each') {
      stack.push({ kind: 'each', at });
      if (closeIdx !== -1) {
        const head = template.slice(at, closeIdx + 1);
        const parsed = /^\{#each\s+([\s\S]*?)\s+as\s+([\w$]+)(?:\s*,\s*([\w$]+))?(?:\s*\(([\s\S]+)\))?\}$/.exec(head);
        if (!parsed || !parsed[1].trim()) {
          add(at, 'error', 'SOLA001', '`{#each}` is missing `as <item>` (expected `{#each list as item}`). It renders as literal text.');
        }
      }
    } else if (kind === ':else') {
      if (stack.at(-1)?.kind !== 'if') {
        add(at, 'error', 'SOLA001', '`{:else}` outside an `{#if}` block. It renders as literal text.');
      } else if (closeIdx !== -1) {
        const inner = template.slice(at + 6, closeIdx);
        if (inner.trim() !== '') {
          if (/^\s+if\b/.test(inner)) {
            const cond = inner.replace(/^\s+if\b/, '').trim();
            if (!cond) {
              add(at, 'error', 'SOLA001', '`{:else if}` is missing a condition. It renders as literal text.');
            }
          } else {
            add(at, 'error', 'SOLA001', '`{:else}` unexpected token (use `{:else}` or `{:else if <condition>}`). It renders as literal text.');
          }
        }
      }
    } else {
      const want = kind.slice(1);
      const open = stack.pop();
      if (!open) add(at, 'error', 'SOLA001', `\`{/${want}}\` has no matching \`{#${want}}\`. It renders as literal text.`);
      else if (open.kind !== want) add(at, 'error', 'SOLA001', `\`{/${want}}\` closes \`{#${open.kind}}\` from line ${position(source, open.at).line}.`);
    }
  }
  for (const open of stack) add(open.at, 'error', 'SOLA001', `\`{#${open.kind}}\` is never closed. It renders as literal text.`);

  return diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.svelte-kit', '.vercel']);

/** Find every .sola file under the given files or directories. */
export function findSolaFiles(targets) {
  const files = [];
  const walk = (p) => {
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      if (p.endsWith('.sola')) files.push(p);
      return;
    }
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(p, entry.name));
      } else if (entry.name.endsWith('.sola')) {
        files.push(path.join(p, entry.name));
      }
    }
  };
  for (const t of targets) walk(t);
  return files.sort();
}

/** Check files on disk. Returns `{ files, diagnostics }`. */
export function checkFiles(targets) {
  const files = findSolaFiles(targets);
  const diagnostics = files.flatMap((f) => checkSource(fs.readFileSync(f, 'utf8'), f));
  return { files, diagnostics };
}
