// Static checks for .sola files.
//
// The compiler accepts an unbalanced block (an unclosed `{#if}`, a stray
// `{/each}` or `{:else}`) without an error and emits it as literal text, so a
// file can compile and then show `{#if ...}` on the page. These checks catch
// that before it ships.

import fs from 'node:fs';
import path from 'node:path';
import { compile } from './index.js';
import { findUndeclared } from './undeclared.js';

export const RULES = {
  SOLA000: 'compile error',
  SOLA001: 'unbalanced block',
  SOLA002: 'state written with .set() or .update()',
  SOLA003: 'name used but never declared'
};

// Text of every <script> body. Plain index search, so `</script >` and odd
// casing are handled the same way the browser would end the element.
function scriptBodies(source) {
  const lower = source.toLowerCase();
  const bodies = [];
  let from = 0;
  for (;;) {
    const open = lower.indexOf('<script', from);
    if (open < 0) break;
    const start = lower.indexOf('>', open);
    if (start < 0) break;
    const end = lower.indexOf('</script', start);
    bodies.push(source.slice(start + 1, end < 0 ? source.length : end));
    if (end < 0) break;
    from = end + 8;
  }
  return bodies.join('\n');
}

// A `$state` / `$persist` name is its signal getter, so `count.set(1)` compiles
// to `count().set(1)` and throws when it runs. State is written by assignment.
function checkSetterCalls(source, add) {
  const scripts = scriptBodies(source);
  const names = new Set();
  for (const m of scripts.matchAll(/\b(?:let|var|const)\s+([\w$]+)\s*=\s*\$(?:state|persist)\s*\(/g)) names.add(m[1]);
  if (!names.size) return;
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  const code = source
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + blank(m.slice(pre.length)));
  const call = /(?<![\w$.])([\w$]+)(\(\))?\s*\.\s*(set|update)\s*\(/g;
  let m;
  while ((m = call.exec(code))) {
    const [, name, , method] = m;
    if (!names.has(name)) continue;
    const fix = method === 'set' ? `${name} = value` : `${name} = fn(${name})`;
    add(m.index, 'error', 'SOLA002', `\`${name}.${method}()\` throws at runtime: \`${name}\` is state, which is written by assignment. Use \`${fix}\`.`);
  }
}

// A name the component reads but never declares compiles fine and then throws
// "x is not defined" when it mounts. Find those in the compiled output and point
// at the first place the source uses the name.
function checkUndeclared(source, compiled, add, alreadyReported = new Set(), reportParseError = true) {
  let names;
  try {
    names = findUndeclared(compiled).filter(({ name }) => !alreadyReported.has(name));
  } catch (err) {
    // Output that doesn't parse is a compiler bug, but the file still won't
    // mount, so say so instead of passing it. Skipped when another error (an
    // unbalanced block, say) already explains the broken output.
    if (reportParseError) add(0, 'error', 'SOLA000', `The compiled output is not valid JavaScript (${err.message}), so the component won't mount. This is a compiler bug; please report it with this file.`);
    return;
  }
  if (!names.length) return;
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  const code = source.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank).replace(/<!--[\s\S]*?-->/g, blank);
  for (const { name } of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const at = new RegExp(`(?<![\\w$.])${escaped}(?![\\w$])`).exec(code);
    const hint = name.startsWith('$')
      ? `\`${name}\` is only a macro as a declaration's value (\`let x = ${name}(...)\`).`
      : `Declare it in <script> (\`let ${name} = ...\` or \`export let ${name}\`), or use \`window.${name}\` for a global.`;
    add(at ? at.index : 0, 'error', 'SOLA003', `\`${name}\` is used but never declared, so the component throws "${name} is not defined" when it mounts. ${hint}`);
  }
}

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

  let compiled = null;
  try {
    compiled = compile(source, { filename, sourcemap: false }).code;
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

  checkSetterCalls(source, add);
  // Names bound by an `{#each ... as [a, b]}` pattern. SOLA001 already reports
  // the pattern, so SOLA003 doesn't repeat each name as undeclared.
  const destructured = new Set();

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
        const pattern = /^\{#each\s+([\s\S]*?)\s+as\s*(\[[^\]]*\]|\{[^}]*\})/.exec(head);
        if (!parsed && pattern) {
          const [, list, bound] = pattern;
          const names = bound.match(/[A-Za-z_$][\w$]*/g) || [];
          for (const n of names) destructured.add(n);
          const part = bound[0] === '[' ? 'entry[0]' : `entry.${names[0] || 'id'}`;
          add(at, 'error', 'SOLA001', `\`{#each}\` can't destructure its item (\`as ${bound.replace(/\s+/g, ' ')}\`). Name the item and read its parts: \`{#each ${list.trim()} as entry}\` ... \`{${part}}\`. It renders as literal text.`);
        } else if (!parsed || !parsed[1].trim()) {
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
            add(at, 'error', 'SOLA001', '`{:else}` has extra text after it (use `{:else}` or `{:else if <condition>}`). It renders as literal text.');
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

  // An unbalanced block can also break the output; SOLA001 already explains that.
  if (compiled) checkUndeclared(source, compiled, add, destructured, diagnostics.length === 0);

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
