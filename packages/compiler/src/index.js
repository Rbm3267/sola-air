import * as acorn from 'acorn';
import * as htmlparser2 from 'htmlparser2';
import { readFileSync } from 'node:fs';

const { version: COMPILER_VERSION } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

// Names every compiled component imports from core under their own name. A
// script that imports one of these again is not given a second binding.
const CORE_PROVIDED = new Set([
  'createSignal', 'createDerived', 'createEffect', 'createIntent', 'createData',
  'createPersistentSignal', 'onMount', 'onDestroy', 'pushContext', 'popContext',
  '__flush_mounts', '__flush_destroys', '__untrack'
]);

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Escape a string that is emitted inside a backtick template literal. Without
// this, a single backtick anywhere in a <style> block (a CSS comment quoting a
// class name, say) closes the literal early and the rest of the stylesheet is
// parsed as JavaScript — which fails at runtime, not at compile time. `${` is
// escaped for the same reason.
function escapeTemplateLiteral(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'sola-' + Math.abs(hash).toString(36);
}

// Split on `sep` characters that are not inside (), [] or a string, so
// `:is(a, b)` and `:global(.x, .y)` are not torn apart at their commas.
function splitTopLevel(text, isSep) {
  const parts = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && isSep(c)) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts;
}

// Put the scope class on one compound selector, before any pseudo-class or
// pseudo-element (button:hover → button.hash:hover).
function addScopeToCompound(compound, scopeHash) {
  const pseudoIdx = compound.search(/::?[\w-]/);
  if (pseudoIdx > 0) {
    return `${compound.slice(0, pseudoIdx)}.${scopeHash}${compound.slice(pseudoIdx)}`;
  }
  return `${compound}.${scopeHash}`;
}

// `:global(sel)` opts a piece of a selector out of scoping, so a scoped
// component can style markup it did not create (e.g. the output of {@html}):
//   .msg :global(table)  →  .msg.hash table
//   :global(body)        →  body
// The scope class always goes on the last compound that is not global.
function scopeSelector(selector, scopeHash) {
  const tokens = [];       // alternating compounds and combinators
  let depth = 0, cur = '', comb = '';
  const flushCompound = () => { if (cur) { tokens.push({ compound: cur }); cur = ''; } };
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (depth === 0 && /[\s>+~]/.test(c)) {
      flushCompound();
      comb += c;
      continue;
    }
    if (comb) { tokens.push({ comb }); comb = ''; }
    cur += c;
  }
  flushCompound();
  if (comb) tokens.push({ comb });

  let last = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.compound === undefined) continue;
    const m = t.compound.match(/^:global\(([\s\S]*)\)$/);
    // A comma list must stay grouped, or `.a :global(.x, .y)` would turn into
    // two selectors and leave `.y` outside `.a`.
    const group = (inner) => (splitTopLevel(inner, c => c === ',').length > 1 ? `:is(${inner})` : inner);
    if (m) { t.compound = group(m[1]); t.global = true; }
    else if (t.compound.includes(':global(')) {
      t.compound = t.compound.replace(/:global\(([\s\S]*?)\)/g, (_, inner) => group(inner));
      t.global = true;
    } else { last = i; }
  }
  if (last >= 0) tokens[last].compound = addScopeToCompound(tokens[last].compound, scopeHash);
  return tokens.map(t => t.compound ?? t.comb).join('');
}

function scopeSelectorList(selector, scopeHash) {
  return splitTopLevel(selector, c => c === ',')
    .map(part => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      return scopeSelector(trimmed, scopeHash);
    })
    .join(', ');
}

// Scope every rule's selector to this component.
//
// Deliberately brace-depth aware rather than a single regex: a regex that treats
// any run of text before `{` as a selector also rewrites declaration values that
// happen to contain a brace (`content: "${x}"`, `grid-template-areas`, a data:
// URI), silently corrupting the stylesheet. Only text at depth 0 — or directly
// inside an at-rule block such as @media — is a selector.
function scopeStyles(css, scopeHash) {
  let out = '';
  let buf = '';           // pending selector text
  let depth = 0;          // brace nesting
  let inStr = null;       // quote char while inside a string
  let inComment = false;
  // Depths that hold declarations rather than nested rules; their contents are
  // copied through untouched.
  const ruleDepths = [];

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    const next = css[i + 1];

    if (inComment) {
      buf += ch;
      if (ch === '*' && next === '/') { buf += next; i++; inComment = false; }
      continue;
    }
    if (inStr) {
      buf += ch;
      if (ch === '\\') { if (next !== undefined) { buf += next; i++; } continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '/' && next === '*') { buf += ch + next; i++; inComment = true; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; buf += ch; continue; }

    if (ch === '{') {
      const isDeclarationBlock = depth > 0 && !ruleDepths.includes(depth);
      if (isDeclarationBlock) {
        // A brace inside a declaration value — not a rule. Pass it through.
        buf += ch;
        continue;
      }

      // Split the buffer into everything that is not the selector (comments and
      // whitespace) and the selector itself. A comment sitting above a rule —
      // `/* Dark mode */ @media ...` — must not be treated as part of it, or the
      // at-rule is misclassified and the scope hash lands inside the comment.
      const commentEnd = buf.lastIndexOf('*/');
      const selectorStart = commentEnd === -1 ? 0 : commentEnd + 2;
      const afterComments = buf.slice(selectorStart);
      const leadingLen = selectorStart + (afterComments.length - afterComments.trimStart().length);
      const leading = buf.slice(0, leadingLen);
      const selector = buf.slice(leadingLen);
      const trimmed = selector.trim();
      const isAtRule = trimmed.startsWith('@');
      const isKeyframeStop =
        trimmed.startsWith('from') || trimmed.startsWith('to') || /^\d+%/.test(trimmed);

      // @media/@supports wrap further rules; @keyframes stops and plain rules
      // wrap declarations.
      const wrapsRules = isAtRule && /^@(media|supports|container|layer|scope)\b/.test(trimmed);

      out += leading;
      out += (isAtRule || isKeyframeStop) ? selector : scopeSelectorList(selector, scopeHash);
      out += ch;
      buf = '';
      depth++;
      if (wrapsRules) ruleDepths.push(depth);
      continue;
    }

    if (ch === '}') {
      out += buf + ch;
      buf = '';
      const idx = ruleDepths.indexOf(depth);
      if (idx !== -1) ruleDepths.splice(idx, 1);
      depth = Math.max(0, depth - 1);
      continue;
    }

    buf += ch;
  }

  return out + buf;
}

function extractScriptAndStyle(source) {
  let script = '';
  let style = '';
  let template = source;

  let isTypeScript = false;
  // Zero-based line in the original .sola file where the script body starts,
  // so generated output can be mapped back to it.
  let scriptStartLine = 0;
  const scriptMatch = template.match(/<script(?:\s+lang=["'](ts|js)["'])?>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    isTypeScript = scriptMatch[1] === 'ts';
    script = scriptMatch[2];
    const openTagEnd = scriptMatch.index + scriptMatch[0].indexOf('>') + 1;
    scriptStartLine = source.slice(0, openTagEnd).split('\n').length - 1;
    template = template.replace(scriptMatch[0], '');
  }

  const styleMatch = template.match(/<style(?:\s+scoped)?>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    style = styleMatch[1];
    template = template.replace(styleMatch[0], '');
  }

  return { script, style, template, isTypeScript, scriptStartLine };
}

// Returns the index of the closing } that matches the { at openPos,
// respecting string literals and nested braces. Returns -1 if unbalanced.
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

// Walk the template and resolve {expr} in attribute values using balanced-brace
// matching. Both dynamic attributes and event/bind handlers are lifted into side
// tables and replaced with brace-free markers (__soladyn_N__ / __solahandler_N__).
//
// Handlers must be lifted rather than written back as literal attribute text:
// extractExpressions runs over the whole template afterwards and has no notion
// of attribute boundaries, so a block-bodied handler like
// `on:click={() => { n = n() + 1; }}` had its braces eaten and turned into a
// <sola-expr> tag, which then shredded the rest of the tag into bogus
// attributes. Markers contain no braces, so nothing downstream can see inside.
function preprocessTemplate(template, dynAttrs, handlers) {
  const isHandlerAttr = (name) => /^on:?[\w]+$/.test(name) || /^bind:[\w]+$/.test(name);
  let result = '';
  let i = 0;
  while (i < template.length) {
    // Opening tag (not closing, not comment)
    if (template[i] === '<' && template[i + 1] !== '/' && template[i + 1] !== '!') {
      result += '<';
      i++;
      // Tag name
      while (i < template.length && /[^\s>\/]/.test(template[i])) result += template[i++];
      // Attributes
      while (i < template.length && template[i] !== '>' && !(template[i] === '/' && template[i + 1] === '>')) {
        if (/\s/.test(template[i])) { result += template[i++]; continue; }
        // Attribute name
        let attrName = '';
        while (i < template.length && /[^\s=\/>]/.test(template[i])) attrName += template[i++];
        if (!attrName) { result += template[i++]; continue; }
        if (template[i] !== '=') { result += attrName; continue; }
        i++; // skip =
        if (template[i] === '{') {
          // Unquoted brace expression: attr={expr}
          const closeIdx = matchBrace(template, i);
          if (closeIdx !== -1) {
            const expr = template.slice(i + 1, closeIdx).trim();
            if (!expr.startsWith('#') && !expr.startsWith('/') && !expr.startsWith(':')) {
              if (isHandlerAttr(attrName)) {
                handlers.push(expr);
                result += `${attrName}="__solahandler_${handlers.length - 1}__"`;
              } else {
                dynAttrs.push(expr);
                result += `${attrName}="__soladyn_${dynAttrs.length - 1}__"`;
              }
              i = closeIdx + 1;
              continue;
            }
          }
          result += `${attrName}={`; i++;
        } else if (template[i] === '"' || template[i] === "'") {
          // Quoted attribute value — scan for {expr} interpolations
          const quote = template[i++];
          const parts = [];
          let currentText = '';
          let hasDyn = false;
          while (i < template.length && template[i] !== quote) {
            if (template[i] === '{') {
              const closeIdx = matchBrace(template, i);
              if (closeIdx !== -1) {
                const expr = template.slice(i + 1, closeIdx).trim();
                if (!expr.startsWith('#') && !expr.startsWith('/') && !expr.startsWith(':')) {
                  hasDyn = true;
                  parts.push({ text: currentText });
                  currentText = '';
                  parts.push({ expr });
                  i = closeIdx + 1; continue;
                }
              }
            }
            currentText += template[i++];
          }
          parts.push({ text: currentText });
          if (i < template.length) i++; // skip closing quote
          if (hasDyn && isHandlerAttr(attrName)) {
            // A handler written in the quoted form, e.g. onclick="{() => go()}".
            // Concatenating it as a string would produce an attribute holding
            // source text rather than a wired listener.
            const exprPart = parts.find((p) => p.expr !== undefined);
            handlers.push(exprPart ? exprPart.expr : '() => {}');
            result += `${attrName}="__solahandler_${handlers.length - 1}__"`;
          } else if (hasDyn) {
            // Build a string-concatenation expression instead of a runtime backtick
            // template literal. Confirmed by driving a real browser against a live
            // enterprise portal instance: its widget-script delivery pipeline
            // silently mangles `${expr}` interpolation inside a template literal down
            // to bare, unevaluated expression text (e.g. `background: ${x}` becomes
            // the literal string "background: x" — the function reference itself,
            // never called). Every prior "the reactive binding doesn't do anything"
            // report came from this exact code path. Concatenation is semantically
            // identical and isn't affected by whatever that pipeline does to backticks.
            const combined = parts
              .filter((p) => p.expr !== undefined || p.text !== '')
              .map((p) => (p.expr !== undefined ? `(${p.expr})` : JSON.stringify(p.text)))
              .join(' + ');
            dynAttrs.push(combined || `''`);
            result += `${attrName}="__soladyn_${dynAttrs.length - 1}__"`;
          } else {
            result += `${attrName}="${currentText}"`;
          }
        } else {
          result += `${attrName}=`;
        }
        continue;
      }
      if (i < template.length && template[i] === '/') { result += '/'; i++; }
      if (i < template.length && template[i] === '>') { result += '>'; i++; }
      continue;
    }
    result += template[i++];
  }
  return result;
}

// Rewrite `{:else if C}` into `{:else}{#if C}` plus a matching `{/if}`, so an
// else-if chain becomes ordinary nested if/else blocks that the block handling
// below already understands. Without this the chain is never recognised and
// every branch's expression is evaluated regardless of the condition — an
// `{:else if x}{...x.y...}` chain throws on null the moment the first branch
// is false.
function desugarElseIf(template) {
  const OPEN = '{#if';
  const CLOSE = '{/if}';

  // Index of the {/if} matching the {#if} that starts at openIdx.
  function matchingClose(text, openIdx) {
    let depth = 0;
    let i = openIdx;
    while (i < text.length) {
      if (text.startsWith(OPEN, i)) { depth++; i += OPEN.length; continue; }
      if (text.startsWith(CLOSE, i)) {
        depth--;
        if (depth === 0) return i;
        i += CLOSE.length;
        continue;
      }
      i++;
    }
    return -1;
  }

  // First `{:else if ...}` that belongs to this block rather than a nested one.
  function findElseIf(text, from, to) {
    let depth = 0;
    let i = from;
    while (i < to) {
      if (text.startsWith(OPEN, i)) { depth++; i += OPEN.length; continue; }
      if (text.startsWith(CLOSE, i)) { depth--; i += CLOSE.length; continue; }
      if (depth === 0 && text.startsWith('{:else', i)) {
        const end = matchBrace(text, i);
        if (end === -1) return null;
        const inner = text.slice(i + '{:else'.length, end);
        if (/^\s+if\s+/.test(inner)) {
          return { start: i, end, condition: inner.replace(/^\s+if\s+/, '').trim() };
        }
      }
      i++;
    }
    return null;
  }

  let result = template;
  let searchFrom = 0;
  while (true) {
    const openIdx = result.indexOf(OPEN, searchFrom);
    if (openIdx === -1) break;

    const closeIdx = matchingClose(result, openIdx);
    if (closeIdx === -1) { searchFrom = openIdx + OPEN.length; continue; }

    const hit = findElseIf(result, openIdx + OPEN.length, closeIdx);
    if (!hit) { searchFrom = openIdx + OPEN.length; continue; }

    // {:else if C}  →  {:else}{#if C} ... {/if}, the extra close going just
    // before this block's own {/if}.
    result =
      result.slice(0, hit.start) +
      '{:else}{#if ' + hit.condition + '}' +
      result.slice(hit.end + 1, closeIdx) +
      CLOSE +
      result.slice(closeIdx);
    // Re-examine this same block: a chain may hold several else-ifs.
  }

  return result;
}

// Convert {#if}/{:else}/{/if} and {#each}/{/each} blocks into the sola-* tag
// form the DOM emitter understands.
//
// Written as a recursive scanner rather than the regexes this replaced: a
// non-greedy regex cannot count nesting, so `{#if a}…{:else}{#if b}…{/if}{/if}`
// captured an unbalanced fragment as the else branch and produced structurally
// wrong output. Anything deeper than two levels was silently corrupted.
function transformBlocks(template) {
  const attr = (s) => String(s).trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  // Index of the tag closing the block opened at `openIdx`, honouring nesting.
  function matchEnd(text, openIdx, openTag, closeTag) {
    let depth = 0;
    let i = openIdx;
    while (i < text.length) {
      if (text.startsWith(openTag, i)) { depth++; i += openTag.length; continue; }
      if (text.startsWith(closeTag, i)) {
        depth--;
        if (depth === 0) return i;
        i += closeTag.length;
        continue;
      }
      i++;
    }
    return -1;
  }

  // Position of this block's own {:else}, ignoring any belonging to nested blocks.
  function topLevelElse(text, from, to) {
    let depth = 0;
    let i = from;
    while (i < to) {
      if (text.startsWith('{#if', i)) { depth++; i += 4; continue; }
      if (text.startsWith('{/if}', i)) { depth--; i += 5; continue; }
      if (depth === 0 && text.startsWith('{:else}', i)) return i;
      i++;
    }
    return -1;
  }

  function walk(text) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      if (text.startsWith('{#if', i)) {
        const condEnd = matchBrace(text, i);
        if (condEnd === -1) { out += text[i++]; continue; }
        const condition = text.slice(i + 4, condEnd);
        const end = matchEnd(text, i, '{#if', '{/if}');
        if (end === -1) { out += text[i++]; continue; }

        const body = text.slice(condEnd + 1, end);
        const elseIdx = topLevelElse(body, 0, body.length);
        const thenPart = elseIdx === -1 ? body : body.slice(0, elseIdx);
        const elsePart = elseIdx === -1 ? null : body.slice(elseIdx + '{:else}'.length);

        out += `<sola-if condition="${attr(condition)}"><sola-then>${walk(thenPart)}</sola-then>`;
        if (elsePart !== null) out += `<sola-else>${walk(elsePart)}</sola-else>`;
        out += `</sola-if>`;
        i = end + '{/if}'.length;
        continue;
      }

      if (text.startsWith('{#each', i)) {
        const headEnd = matchBrace(text, i);
        if (headEnd === -1) { out += text[i++]; continue; }
        const head = text.slice(i, headEnd + 1);
        const parsed = /^{#each\s+([\s\S]*?)\s+as\s+([\w$]+)(?:\s*,\s*([\w$]+))?(?:\s*\(([\s\S]+)\))?}$/.exec(head);
        const end = matchEnd(text, i, '{#each', '{/each}');
        if (!parsed || end === -1) { out += text[i++]; continue; }

        const [, arr, item, index, key] = parsed;
        out += `<sola-each array="${attr(arr)}" item="${attr(item)}"`;
        if (index) out += ` index="${attr(index)}"`;
        if (key) out += ` key="${attr(key)}"`;
        out += `>${walk(text.slice(headEnd + 1, end))}</sola-each>`;
        i = end + '{/each}'.length;
        continue;
      }

      out += text[i++];
    }
    return out;
  }

  return walk(template);
}

// Replace {expr} in text content with <sola-expr> tags, using balanced-brace
// matching so expressions like {fn({key: val})} work correctly.
function extractExpressions(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{') {
      const closeIdx = matchBrace(text, i);
      if (closeIdx === -1) { result += text[i++]; continue; }
      const inner = text.slice(i + 1, closeIdx).trim();
      if (inner.startsWith('#') || inner.startsWith('/') || inner.startsWith(':')) {
        result += text.slice(i, closeIdx + 1); i = closeIdx + 1;
      } else if (inner.startsWith('@html')) {
        const htmlExpr = inner.slice('@html'.length).trim();
        result += `<sola-html expr="${htmlExpr.replace(/"/g, '&quot;')}"></sola-html>`;
        i = closeIdx + 1;
      } else {
        result += `<sola-expr expr="${inner.replace(/"/g, '&quot;')}"></sola-expr>`;
        i = closeIdx + 1;
      }
    } else {
      result += text[i++];
    }
  }
  return result;
}

// Strip TypeScript type annotations so Acorn (plain JS parser) can handle
// script blocks written in TS. Covers the common patterns: type annotations,
// interface/type declarations, angle-bracket generics, and `as` casts.
function stripTypeScript(code) {
  const blankKeepNewlines = (str) => str.replace(/[^\n]/g, ' ');

  // 1. Remove interface declarations using balanced brace matching so statements
  // following an interface ($effect, onMount, etc.) are never swallowed.
  const ifaceRe = /^\s*(?:export\s+)?interface\s+[A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{/gm;
  let m;
  while ((m = ifaceRe.exec(code)) !== null) {
    const braceStart = m.index + m[0].lastIndexOf('{');
    const braceEnd = matchBrace(code, braceStart);
    if (braceEnd === -1) break;
    let end = braceEnd + 1;
    if (code[end] === ';') end++;
    code = code.slice(0, m.index) + blankKeepNewlines(code.slice(m.index, end)) + code.slice(end);
    ifaceRe.lastIndex = end;
  }

  // 2. Remove type alias declarations (respecting balanced {}, (), [], <>)
  const typeRe = /^\s*(?:export\s+)?type\s+[A-Za-z_$][\w$]*(?:\s*<[^>]*>)?\s*=\s*/gm;
  while ((m = typeRe.exec(code)) !== null) {
    let i = m.index + m[0].length;
    let depth = 0;
    let inStr = null;
    while (i < code.length) {
      const ch = code[i];
      if (inStr) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === inStr) inStr = null;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      else if (depth === 0 && ch === ';') { i++; break; }
      else if (depth === 0 && ch === '\n') {
        const rest = code.slice(i + 1).match(/^\s*([|&])/);
        if (!rest) break;
      }
      i++;
    }
    code = code.slice(0, m.index) + blankKeepNewlines(code.slice(m.index, i)) + code.slice(i);
    typeRe.lastIndex = i;
  }

  // Helper to scan a type expression until a top-level delimiter in stopChars
  function scanTypeEnd(str, start, stopChars) {
    let i = start;
    let depth = 0;
    let angleDepth = 0;
    let inStr = null;
    while (i < str.length) {
      const ch = str[i];
      if (inStr) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === inStr) inStr = null;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
      if (ch === '=' && str[i + 1] === '>') { i += 2; continue; }
      if (ch === '<') { angleDepth++; i++; continue; }
      if (ch === '>' && angleDepth > 0) { angleDepth--; i++; continue; }
      if (ch === '{' || ch === '(' || ch === '[') { depth++; i++; continue; }
      if (ch === '}' || ch === ')' || ch === ']') {
        if (depth === 0 && angleDepth === 0 && stopChars.has(ch)) return i;
        depth = Math.max(0, depth - 1);
        i++;
        continue;
      }
      if (depth === 0 && angleDepth === 0 && stopChars.has(ch)) return i;
      i++;
    }
    return i;
  }

  // 3. Remove variable declaration type annotations: (const|let|var) id: Type
  // Never touches object literals or ternaries on the RHS of '='.
  const varRe = /\b(const|let|var)(\s+[A-Za-z_$][\w$]*)(\??\s*:\s*)/g;
  const varStops = new Set(['=', ';', '\n']);
  while ((m = varRe.exec(code)) !== null) {
    const colonStart = m.index + m[1].length + m[2].length;
    const typeStart = colonStart + m[3].length;
    const typeEnd = scanTypeEnd(code, typeStart, varStops);
    code = code.slice(0, colonStart) + blankKeepNewlines(code.slice(colonStart, typeEnd)) + code.slice(typeEnd);
    varRe.lastIndex = colonStart;
  }

  // 4. Remove function / arrow parameter & return type annotations.
  // Walk delimiter stack so we only strip 'param?: Type' when the innermost
  // enclosing delimiter is '(' (never inside '{ a: 1, b: true }' object literals).
  let out = '';
  const delimStack = [];
  let i = 0;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;
  const paramStops = new Set([',', ')', '=']);

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (inLineComment) {
      out += ch;
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      out += ch;
      if (ch === '*' && next === '/') { out += '/'; i += 2; inBlockComment = false; continue; }
      i++;
      continue;
    }
    if (inStr) {
      out += ch;
      if (ch === '\\' && next !== undefined) { out += next; i += 2; continue; }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; out += '//'; i += 2; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; out += '/*'; i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; out += ch; i++; continue; }

    if (ch === '(' || ch === '{' || ch === '[') {
      delimStack.push(ch);
      out += ch;
      i++;
      continue;
    }
    if (ch === ')' || ch === '}' || ch === ']') {
      delimStack.pop();
      out += ch;
      i++;
      // Check for return type annotation after ')': '): ReturnType {' or '): ReturnType =>'
      if (ch === ')') {
        const retMatch = /^(\s*:\s*)/.exec(code.slice(i));
        if (retMatch) {
          const typeStart = i + retMatch[1].length;
          const typeEnd = scanTypeEnd(code, typeStart, new Set(['{', '=', ';', '\n']));
          const after = code.slice(typeEnd);
          // Only strip if followed by function body '{' or arrow '=>' (not a ternary branch)
          if (/^\s*(\{|=>)/.test(after) && code.slice(typeStart, typeEnd).trim().length > 0) {
            out += blankKeepNewlines(code.slice(i, typeEnd));
            i = typeEnd;
          }
        }
      }
      continue;
    }

    // Inside '(...)', check for parameter type annotation after '(' or ','
    if (delimStack[delimStack.length - 1] === '(') {
      const prevNonWs = out.trimEnd().slice(-1);
      if (prevNonWs === '(' || prevNonWs === ',') {
        const paramMatch = /^(\s*(?:\.\.\.)?[A-Za-z_$][\w$]*)(\??\s*:\s*)/.exec(code.slice(i));
        if (paramMatch) {
          out += paramMatch[1];
          const colonStart = i + paramMatch[1].length;
          const typeStart = colonStart + paramMatch[2].length;
          const typeEnd = scanTypeEnd(code, typeStart, paramStops);
          out += blankKeepNewlines(code.slice(colonStart, typeEnd));
          i = typeEnd;
          continue;
        }
      }
    }

    out += ch;
    i++;
  }
  code = out;

  // 5. Remove 'as Type' casts outside import/export specifiers
  code = code.replace(
    /(\b(?:import|export)\s*\{[^}]*\})|\s+as\s+(?:const\b|[A-Za-z_$][\w$.<>\[\]|&?]*(?:\s*[|&]\s*[A-Za-z_$][\w$.<>\[\]|&?]*)*)/g,
    (full, impExp) => impExp ? impExp : blankKeepNewlines(full)
  );

  // 6. Remove generic type parameters from function/class/call expressions: foo<T>(
  code = code.replace(/(?<=[\w$])<[^>()=;]+>(?=\s*\()/g, (m) => blankKeepNewlines(m));

  return code;
}

// ─── Reactive auto-call transform ───
// Makes the parenthesis-free syntax real: bare reads of $state/$derived vars
// compile to getter calls (count → count(), user.name → user().name), so
// `$derived(count * 2)` and `{doubled}` behave the way the docs show them.
// Explicit calls (count()) are left alone, keeping the README syntax valid.

function collectPatternNames(node, out) {
  if (!node) return;
  switch (node.type) {
    case 'Identifier': out.add(node.name); break;
    case 'ObjectPattern': node.properties.forEach(p => collectPatternNames(p.value || p.argument, out)); break;
    case 'ArrayPattern': node.elements.forEach(el => collectPatternNames(el, out)); break;
    case 'AssignmentPattern': collectPatternNames(node.left, out); break;
    case 'RestElement': collectPatternNames(node.argument, out); break;
  }
}

// Collect every name declared anywhere inside a function body. Deliberately
// conservative: a name declared in ANY nested scope suppresses auto-call for
// that name within the function, preferring a missed rewrite over a wrong one.
function collectDeclaredNames(node, out) {
  if (!node || typeof node !== 'object' || !node.type) return;
  if (node.type === 'VariableDeclaration') node.declarations.forEach(d => collectPatternNames(d.id, out));
  if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) out.add(node.id.name);
  if (node.type === 'CatchClause' && node.param) collectPatternNames(node.param, out);
  for (const key of Object.keys(node)) {
    if (key === 'type') continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach(c => collectDeclaredNames(c, out));
    else if (child && typeof child === 'object' && child.type) collectDeclaredNames(child, out);
  }
}

// Pre-pass: find every $state/$derived/$intent/$data declaration up front so
// reads that appear earlier in the source (hoisted functions) still rewrite.
function collectReactiveVars(ast) {
  const vars = { state: new Set(), derived: new Set(), intent: new Set(), data: new Set() };
  (function walk(node) {
    if (!node || typeof node !== 'object' || !node.type) return;
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.init && decl.init.type === 'CallExpression' &&
            decl.init.callee.type === 'Identifier' && decl.id.type === 'Identifier') {
          const macro = decl.init.callee.name;
          if (macro === '$state' || macro === '$persist') vars.state.add(decl.id.name);
          else if (macro === '$derived' || macro === '$lastEvent') vars.derived.add(decl.id.name);
          else if (macro === '$intent') vars.intent.add(decl.id.name);
          else if (macro === '$data') vars.data.add(decl.id.name);
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object' && child.type) walk(child);
    }
  })(ast);
  return vars;
}

const DATA_ACCESSOR_METHODS = new Set(['refetch', 'stop']);
const INTENT_SUB_SIGNALS = new Set(['loading', 'error']);

function reactiveKind(name, vars, shadowStack) {
  for (const scope of shadowStack) if (scope.has(name)) return null;
  if (vars.state.has(name)) return 'state';
  if (vars.derived.has(name)) return 'derived';
  if (vars.intent.has(name)) return 'intent';
  if (vars.data.has(name)) return 'data';
  return null;
}

// Walk an AST emitting position edits that implement the reactive rewrite:
//  - `count = v`  → `set_count(v)`     (bracket edits so children still walk)
//  - `count += v` → `set_count(count() + (v))`
//  - `count++`    → `set_count(count() + 1)`
//  - bare read    → `count()`; member-object read `user.name` → `user().name`
//  - `{count}` shorthand in object literals → `{count: count()}`
//  - $intent accessors: `x.loading` → `x.loading()` (sub-signals live on the fn)
//  - $data accessors: `x.data` → `x().data`, but `x.refetch`/`x.stop` untouched
function emitReactiveEdits(rootNode, src, vars, edits, initialShadows) {
  function walk(node, parent, shadows) {
    if (!node || typeof node !== 'object' || !node.type) return;

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const scope = new Set();
      if (node.id) scope.add(node.id.name);
      (node.params || []).forEach(p => collectPatternNames(p, scope));
      collectDeclaredNames(node.body, scope);
      shadows = [...shadows, scope];
    }

    if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' &&
        reactiveKind(node.left.name, vars, shadows) === 'state') {
      const name = node.left.name;
      if (node.operator === '=') {
        edits.push({ start: node.start, end: node.right.start, replacement: `set_${name}(` });
        edits.push({ start: node.end, end: node.end, replacement: `)` });
      } else {
        const rawOp = node.operator.slice(0, -1);
        edits.push({ start: node.start, end: node.right.start, replacement: `set_${name}(${name}() ${rawOp} (` });
        edits.push({ start: node.end, end: node.end, replacement: `))` });
      }
      walk(node.right, node, shadows);
      return;
    }

    if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier' &&
        reactiveKind(node.argument.name, vars, shadows) === 'state') {
      const name = node.argument.name;
      const op = node.operator === '++' ? '+' : '-';
      edits.push({ start: node.start, end: node.end, replacement: `set_${name}(${name}() ${op} 1)` });
      return;
    }

    // $intent sub-signals: x.loading / x.error are functions hung on the accessor
    if (node.type === 'MemberExpression' && !node.computed &&
        node.object.type === 'Identifier' && node.property.type === 'Identifier' &&
        reactiveKind(node.object.name, vars, shadows) === 'intent' &&
        INTENT_SUB_SIGNALS.has(node.property.name) &&
        !(parent && parent.type === 'CallExpression' && parent.callee === node)) {
      edits.push({ start: node.end, end: node.end, replacement: `()` });
      return; // children need no further rewriting
    }

    if (node.type === 'Identifier') {
      const kind = reactiveKind(node.name, vars, shadows);
      if (kind) {
        // A fragment root (e.g. the whole expression is just `count`) has no
        // parent — treat it as a plain read position.
        const p = parent || { type: '__fragment_root__' };
        const isDeclOrBinding =
          (p.type === 'VariableDeclarator' && p.id === node) ||
          ((p.type === 'FunctionDeclaration' || p.type === 'FunctionExpression' || p.type === 'ClassDeclaration') && p.id === node) ||
          (p.type === 'AssignmentPattern' && p.left === node) ||
          p.type === 'RestElement' ||
          p.type === 'ImportSpecifier' || p.type === 'ImportDefaultSpecifier' ||
          p.type === 'ExportSpecifier' || p.type === 'LabeledStatement' ||
          p.type === 'BreakStatement' || p.type === 'ContinueStatement';
        const isMemberProp = p.type === 'MemberExpression' && p.property === node && !p.computed;
        const isCallee = (p.type === 'CallExpression' || p.type === 'NewExpression') && p.callee === node;
        const isAssignTarget = (p.type === 'AssignmentExpression' && p.left === node) || p.type === 'UpdateExpression';
        const isPropertyKey =
          (p.type === 'Property' || p.type === 'MethodDefinition' || p.type === 'PropertyDefinition') &&
          p.key === node &&
          !p.computed;
        const isShorthand = p.type === 'Property' && p.shorthand && p.value === node;
        const isMemberObject = p.type === 'MemberExpression' && p.object === node;

        if (!isDeclOrBinding && !isMemberProp && !isCallee && !isAssignTarget && !isPropertyKey) {
          if (isShorthand) {
            edits.push({ start: node.start, end: node.end, replacement: `${node.name}: ${node.name}()` });
            return;
          }
          if (isMemberObject) {
            if (kind === 'state' || kind === 'derived' ||
                (kind === 'data' && !(p.property.type === 'Identifier' && !p.computed && DATA_ACCESSOR_METHODS.has(p.property.name)))) {
              edits.push({ start: node.end, end: node.end, replacement: `()` });
            }
            // intent accessors keep their function identity for member access
            return;
          }
          edits.push({ start: node.end, end: node.end, replacement: `()` });
          return;
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'type') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(c => walk(c, node, shadows));
      else if (child && typeof child === 'object' && child.type) walk(child, node, shadows);
    }
  }
  walk(rootNode, null, initialShadows || []);
}

function applyEdits(src, edits) {
  // Descending by start (then end) so earlier positions stay valid; zero-width
  // inserts at a shared position land before same-position range replacements.
  const sorted = [...edits].sort((a, b) => (b.start - a.start) || (b.end - a.end));
  let out = src;
  for (const edit of sorted) {
    out = out.slice(0, edit.start) + edit.replacement + out.slice(edit.end);
  }
  return out;
}

const NO_REACTIVE_VARS = { state: new Set(), derived: new Set(), intent: new Set(), data: new Set() };

function hasReactiveVars(vars) {
  return vars.state.size > 0 || vars.derived.size > 0 || vars.intent.size > 0 || vars.data.size > 0;
}

// Rewrite one template expression (text interpolation, dynamic attribute,
// if-condition, each-source, event handler) with the reactive auto-call rules.
// `locals` holds template-scope names (each-item, each-index) that shadow signals.
// Unparseable input is returned unchanged — the emitter will surface it as-is.
function transformTemplateExpression(src, vars, locals) {
  if (!hasReactiveVars(vars) || !src || !src.trim()) return src;
  let ast;
  try {
    ast = acorn.parseExpressionAt(src, 0, { ecmaVersion: 'latest' });
  } catch {
    return src;
  }
  const edits = [];
  emitReactiveEdits(ast, src, vars, edits, locals && locals.size ? [locals] : []);
  return edits.length > 0 ? applyEdits(src, edits) : src;
}

// ─── Source maps ───
// The generated module inlines the user's script verbatim (indented by two
// spaces) into the mount function, so every line of that block maps 1:1 back to
// its line in the .sola file. That covers the case that matters: a runtime error
// or breakpoint inside user code pointing at user code rather than at generated
// output. Emitted DOM instructions have no user-authored counterpart and are
// deliberately left unmapped.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeVlq(value) {
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let out = '';
  do {
    let digit = vlq & 0b11111;
    vlq >>>= 5;
    if (vlq > 0) digit |= 0b100000;
    out += B64[digit];
  } while (vlq > 0);
  return out;
}

/**
 * Build a v3 source map from a list of {generatedLine, sourceLine} pairs
 * (both zero-based), each mapping column 0 to column 0 of the source line.
 */
function buildSourceMap(segments, filename, sourceContent, generatedLineCount) {
  const byLine = new Map();
  for (const seg of segments) byLine.set(seg.generatedLine, seg.sourceLine);

  let prevSourceLine = 0;
  const lines = [];
  for (let line = 0; line < generatedLineCount; line++) {
    if (!byLine.has(line)) { lines.push(''); continue; }
    const sourceLine = byLine.get(line);
    // [generatedColumn, sourceIndex, sourceLine, sourceColumn], all relative
    // except generatedColumn which resets each line.
    lines.push(
      encodeVlq(0) + encodeVlq(0) + encodeVlq(sourceLine - prevSourceLine) + encodeVlq(0)
    );
    prevSourceLine = sourceLine;
  }

  return {
    version: 3,
    file: filename ? filename.replace(/\.sola$/, '.js') : undefined,
    sources: [filename || 'component.sola'],
    sourcesContent: [sourceContent],
    names: [],
    mappings: lines.join(';')
  };
}

export function compile(source, options = {}) {
  const target = options.target || 'esm'; // 'esm' | 'iife'
  const { script: scriptContent, style: styleContent, template: rawTemplateSource, isTypeScript, scriptStartLine } = extractScriptAndStyle(source);
  const scopeHash = hashString(styleContent || rawTemplateSource);
  const hasStyles = styleContent.trim().length > 0;
  const scopedCss = hasStyles ? scopeStyles(styleContent, scopeHash) : '';

  // Strip HTML comments first so commented-out blocks or literal braces inside
  // comments never trigger block transforms or expression errors.
  let rawTemplate = rawTemplateSource.replace(/<!--[\s\S]*?-->/g, '');

  // Flatten else-if chains into nested if/else before anything else looks at
  // the template, so the block handling below only ever sees the simple form.
  rawTemplate = desugarElseIf(rawTemplate);

  // Pre-process attribute-bound expressions BEFORE extractExpressions using
  // balanced-brace matching (handles nested object literals, ternaries, etc.)
  const dynAttrs = [];
  const handlers = [];
  rawTemplate = preprocessTemplate(rawTemplate, dynAttrs, handlers);

  // Resolve a __solahandler_N__ marker back to its expression. Anything else is
  // passed through, so a handler written as a bare identifier still works.
  const resolveHandler = (val) => {
    const m = /^__solahandler_(\d+)__$/.exec(val);
    return m ? handlers[parseInt(m[1], 10)] : val;
  };
  rawTemplate = extractExpressions(rawTemplate);

  // Convert {#if}/{:else}/{/if} and {#each}/{/each} into the sola-* tag form
  // the emitter walks.
  rawTemplate = transformBlocks(rawTemplate);

  // Parse HTML AST
  const templateNodes = [];
  let root = { type: 'element', name: '__root__', attribs: {}, children: [] };
  templateNodes.push(root);

  const parser = new htmlparser2.Parser({
    onopentag(name, attribs) {
      const node = { type: 'element', name, attribs, children: [] };
      templateNodes[templateNodes.length - 1].children.push(node);
      if (!VOID_ELEMENTS.has(name)) {
        templateNodes.push(node);
      }
    },
    ontext(text) {
      if (text.trim().length > 0 && templateNodes.length > 0) {
        templateNodes[templateNodes.length - 1].children.push({ type: 'text', data: text });
      }
    },
    onclosetag(name) {
      if (templateNodes.length > 1 && !VOID_ELEMENTS.has(name)) {
        templateNodes.pop();
      }
    }
  }, { recognizeSelfClosing: true, lowerCaseTags: false, lowerCaseAttributeNames: false });

  parser.write(rawTemplate.trim() || '<div></div>');
  parser.end();

  // Parse JS AST with Acorn
  // Strip TS first — AST positions and all slice() calls operate on the stripped source.
  // Only run on <script lang="ts"> — the strip regex can't reliably distinguish a type
  // annotation's `:` from a ternary's `: falsyBranch` or an object literal's `key: value`,
  // so applying it to plain JS risks corrupting valid code. Scripts that don't opt into TS
  // are left untouched.
  const strippedScript = scriptContent.trim() && isTypeScript ? stripTypeScript(scriptContent) : scriptContent;
  let jsOutput = strippedScript;
  const stateVars = new Set();
  const exportedProps = [];
  const componentImports = [];
  // Every other import in the script. They used to be deleted, so a package
  // import (`import DataCard from '@sola-air-ui/ui/data-card'`, or anything from
  // '@sola-air-ui/core' that the compiler does not already provide) was gone from
  // the output and left an undefined name behind.
  const otherImports = [];
  const coreImportExtras = [];

  let reactiveVars = NO_REACTIVE_VARS;
  if (strippedScript.trim()) {
    try {
      const ast = acorn.parse(strippedScript, { ecmaVersion: 'latest', sourceType: 'module' });
      const edits = [];
      // Whole-node removals (imports, exported props): any rewrite edit that
      // falls inside one of these spans must be dropped, not applied on top.
      const removedRanges = [];

      // Pre-pass so reads that appear before their $state declaration
      // (hoisted handler functions) still rewrite correctly.
      reactiveVars = collectReactiveVars(ast);
      for (const name of reactiveVars.state) stateVars.add(name);

      function walkAST(node, parent) {
        if (!node || typeof node !== 'object') return;

        // Track component imports
        if (node.type === 'ImportDeclaration') {
          const src = node.source.value;
          if (src.endsWith('.sola')) {
            node.specifiers.forEach(spec => {
              componentImports.push({ localName: spec.local.name, path: src });
            });
          } else if (src === '@sola-air-ui/core' || src === '@sola/core') {
            // The compiler already imports these names under their own names.
            // Importing one again would be a duplicate binding, so keep only the
            // rest: names it does not provide, and aliased ones.
            node.specifiers.forEach(spec => {
              if (spec.type !== 'ImportSpecifier') return;
              const imported = spec.imported.name ?? spec.imported.value;
              if (spec.local.name === imported && CORE_PROVIDED.has(imported)) return;
              coreImportExtras.push({ imported, local: spec.local.name });
            });
          } else {
            otherImports.push({
              code: strippedScript.slice(node.start, node.end).trim().replace(/;?$/, ';'),
              locals: node.specifiers.map(spec => spec.local.name)
            });
          }
          edits.push({
            start: node.start,
            end: node.end,
            replacement: `// import hoisted: ${node.source.value}`
          });
          removedRanges.push([node.start, node.end]);
        }

        // Exported props
        if (node.type === 'ExportNamedDeclaration' && node.declaration &&
            node.declaration.type === 'VariableDeclaration') {
          node.declaration.declarations.forEach(decl => {
            const name = decl.id.name;
            const defaultVal = decl.init
              ? strippedScript.slice(decl.init.start, decl.init.end)
              : 'undefined';
            exportedProps.push({ name, default: defaultVal });
          });
          edits.push({ start: node.start, end: node.end, replacement: '' });
          removedRanges.push([node.start, node.end]);
        }

        // $on('type', handler): subscribe to a bus event for the life of the
        // component. Compiles to onDestroy(__solaBus.on(type, handler)). The handler
        // stays in place so signals read inside it are rewritten like any other.
        if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' &&
            node.expression.callee.type === 'Identifier' && node.expression.callee.name === '$on') {
          const call = node.expression;
          edits.push({ start: call.callee.start, end: call.callee.end, replacement: 'onDestroy(__solaBus.on' });
          edits.push({ start: call.end, end: call.end, replacement: ')' });
        }

        // $effect(fn) as a bare statement: the form the docs show. It compiles to
        // createEffect(fn); the declaration form (const stop = $effect(fn)) is below.
        if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' &&
            node.expression.callee.type === 'Identifier' && node.expression.callee.name === '$effect') {
          const callee = node.expression.callee;
          edits.push({ start: callee.start, end: callee.end, replacement: 'createEffect' });
        }

        // $state()/$derived()/$effect()/$intent()/$data() macro declarations.
        // Bracket edits (head + tail) leave the argument expression in place so
        // the reactive rewrite pass below can still auto-call signals inside it.
        if (node.type === 'VariableDeclaration' && node.declarations.length === 1) {
          const decl = node.declarations[0];
          if (decl.init && decl.init.type === 'CallExpression' && decl.init.callee.type === 'Identifier') {
            const macro = decl.init.callee.name;
            const arg = decl.init.arguments[0];
            const lastArg = decl.init.arguments[decl.init.arguments.length - 1];
            if (macro === '$state' || macro === '$persist') {
              // $persist(key, initial, options) is $state backed by storage and
              // synced across tabs/pages; it reads and assigns exactly like $state.
              const varName = decl.id.name;
              const factory = macro === '$persist' ? 'createPersistentSignal' : 'createSignal';
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `const [${varName}, set_${varName}] = ${factory}(` });
                edits.push({ start: lastArg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const [${varName}, set_${varName}] = createSignal(undefined);` });
              }
            } else if (macro === '$derived') {
              const varName = decl.id.name;
              if (arg) {
                const isFn = arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression';
                edits.push({
                  start: node.start,
                  end: arg.start,
                  replacement: isFn ? `const ${varName} = createDerived(` : `const ${varName} = createDerived(() => `
                });
                edits.push({ start: arg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const ${varName} = createDerived(() => undefined);` });
              }
            } else if (macro === '$lastEvent') {
              // let ctx = $lastEvent('type'): the latest payload of a bus event as a
              // reactive accessor, released when the component is destroyed.
              const varName = decl.id.name;
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `const ${varName} = __solaBus.signal(` });
                edits.push({ start: lastArg.end, end: node.end, replacement: `); onDestroy(${varName}.dispose);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const ${varName} = () => undefined;` });
              }
            } else if (macro === '$effect') {
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `createEffect(` });
                edits.push({ start: arg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `createEffect(() => {});` });
              }
            } else if (macro === '$intent') {
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `const ${decl.id.name} = createIntent(` });
                edits.push({ start: lastArg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const ${decl.id.name} = createIntent('');` });
              }
            } else if (macro === '$data') {
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `const ${decl.id.name} = createData(` });
                edits.push({ start: lastArg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const ${decl.id.name} = createData('');` });
              }
            }
          }
        }

        for (const key of Object.keys(node)) {
          if (key === 'type') continue;
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(c => walkAST(c, node));
          } else if (child && typeof child === 'object' && child.type) {
            walkAST(child, node);
          }
        }
      }

      walkAST(ast, null);

      // Reactive rewrite pass: assignments/updates to signals become setter
      // calls, bare signal reads become getter calls. Edits landing inside a
      // removed import/export span are dropped.
      const rewriteEdits = [];
      emitReactiveEdits(ast, strippedScript, reactiveVars, rewriteEdits, []);
      for (const edit of rewriteEdits) {
        if (removedRanges.some(([s, e]) => edit.start >= s && edit.end <= e)) continue;
        edits.push(edit);
      }

      jsOutput = applyEdits(strippedScript, edits);
    } catch (err) {
      const loc = err.loc ? ` (line ${err.loc.line}, col ${err.loc.column})` : '';
      const filePath = typeof options === 'string' ? options : (options.filename || '<script>');
      throw new Error(`[sola compiler] Parse error in ${filePath}${loc}:\n  ${err.message}`);
    }
  }

  // Generate DOM creation instructions
  let uid = 0;
  let domCode = '';
  const importedComponentSet = new Set(componentImports.map(i => i.localName));
  // A capitalised tag that matches a name imported from a package is a component
  // too (`import DataCard from '@sola-air-ui/ui/data-card'`), not only a `.sola` path.
  for (const imp of otherImports) {
    for (const name of imp.locals) if (/^[A-Z]/.test(name)) importedComponentSet.add(name);
  }

  const sourceFile = options.filename || '<component>';

  // Reject a template expression that is not valid JavaScript, instead of
  // emitting it and letting the bundler report a syntax error inside generated
  // code the author never wrote. The usual cause is a literal brace in markup —
  // a code sample containing `setInterval(() => {` — where `{` opens an
  // expression, so everything up to the next `}` is swallowed.
  function checkExpression(expr, whatFor) {
    try {
      const trimmed = expr.trim();
      const node = acorn.parseExpressionAt(trimmed, 0, { ecmaVersion: 'latest' });
      // parseExpressionAt stops at the first complete expression and ignores
      // whatever follows, so `{<span>…}` only fails once the whole string has
      // to be consumed.
      if (node.end !== trimmed.length) throw new Error('trailing content');
    } catch {
      const preview = expr.length > 80 ? expr.slice(0, 80) + '…' : expr;
      throw new Error(
        `[sola compiler] Invalid ${whatFor} in ${sourceFile}:\n` +
        `  {${preview}}\n` +
        `  This is not a valid JavaScript expression. If you meant a literal ` +
        `brace in your markup, escape it as &#123; and &#125;.`
      );
    }
  }

  function emitNode(node, parentVar, locals = new Set()) {
    if (!node) return;
    // Template-expression rewrite with the current template scope (each-item /
    // each-index names shadow signals of the same name).
    const rewrite = (expr) => transformTemplateExpression(expr, reactiveVars, locals);

    if (node.type === 'text') {
      const text = escapeTemplateLiteral(node.data);
      if (text.trim().length > 0) {
        const id = `t${uid++}`;
        domCode += `  const ${id} = document.createTextNode(\`${text}\`);\n`;
        domCode += `  ${parentVar}.appendChild(${id});\n`;
      }
      return;
    }

    if (node.name === 'sola-expr') {
      const raw = (node.attribs.expr || '').replace(/&quot;/g, '"');
      checkExpression(raw, 'template expression');
      const expr = rewrite(raw);
      const id = `e${uid++}`;
      domCode += `  const ${id} = document.createTextNode('');\n`;
      domCode += `  ${parentVar}.appendChild(${id});\n`;
      // Parenthesize expr before `?? ''`: JS forbids mixing ?? with || or && at the
      // same level without explicit grouping (e.g. `col.label || col ?? ''` is a
      // SyntaxError), and any {a || b}-style fallback expression — an extremely
      // common pattern — would otherwise produce invalid generated code.
      domCode += `  createEffect(() => { ${id}.textContent = String((${expr}) ?? ''); });\n`;
      return;
    }

    // {@html expr} — renders expr as raw HTML via innerHTML, unlike {expr} which always
    // goes through textContent. Wrapped in its own element so setting innerHTML can't
    // clobber unrelated sibling nodes. Callers are responsible for trusting/sanitizing
    // whatever markup they pass — same contract as innerHTML anywhere else.
    if (node.name === 'sola-html') {
      const expr = rewrite((node.attribs.expr || '').replace(/&quot;/g, '"'));
      const id = `h${uid++}`;
      domCode += `  const ${id} = document.createElement('div');\n`;
      domCode += `  ${id}.style.display = 'contents';\n`;
      domCode += `  ${parentVar}.appendChild(${id});\n`;
      domCode += `  createEffect(() => { ${id}.innerHTML = String((${expr}) ?? ''); });\n`;
      return;
    }

    // Nested custom component
    if (importedComponentSet.has(node.name)) {
      const cid = `comp${uid++}`;
      domCode += `  const ${cid}_target = document.createElement('div');\n`;
      domCode += `  ${cid}_target.className = 'sola-component-root';\n`;
      domCode += `  ${parentVar}.appendChild(${cid}_target);\n`;

      // Dynamically-bound props (rows={items}) arrive here as __soladyn_N__ placeholders —
      // resolve them back to the real expression from dynAttrs.
      //
      // `onXxx`-named props (e.g. onChange={handler}) arrive as a
      // __solahandler_N__ marker, because preprocessTemplate cannot tell a
      // component apart from a native element and lifts both the same way.
      // Either way the expression is passed through as a live function.
      //
      // Three kinds of dynamic prop:
      //  - a bare name (rows={items}) is passed as-is. For a $state that is the
      //    signal accessor, which is how a child receives live data (the shipped
      //    components accept either an accessor or a plain value);
      //  - an expression that reads a signal (title={ctx.title}) is evaluated
      //    with the signal reads rewritten, and the child is re-mounted when
      //    the value changes;
      //  - an expression that reads no signal (text={msg.text} in an {#each})
      //    is evaluated once, when the child is mounted.
      const propEntries = [];
      let reactiveProps = false;
      for (const [key, val] of Object.entries(node.attribs || {})) {
        const dynMatch = /^__soladyn_(\d+)__$/.exec(val);
        const handlerMatch = /^__solahandler_(\d+)__$/.exec(val);
        let propValue;
        if (dynMatch) {
          const raw = dynAttrs[parseInt(dynMatch[1], 10)];
          if (/^\s*[A-Za-z_$][\w$]*\s*$/.test(raw)) {
            propValue = `(${raw})`;
          } else {
            checkExpression(raw, 'component prop');
            const rewritten = rewrite(raw);
            if (rewritten !== raw) reactiveProps = true;
            propValue = `(${rewritten})`;
          }
        } else if (handlerMatch) {
          propValue = `(${rewrite(handlers[parseInt(handlerMatch[1], 10)])})`;
        } else {
          propValue = JSON.stringify(val);
        }
        propEntries.push(`${JSON.stringify(key)}: ${propValue}`);
      }

      // Slot content: compile the tag's children into a function the child component can
      // call to project them wherever it renders a <slot> in its own template.
      if (node.children && node.children.length > 0) {
        const slotVar = `${cid}_slot`;
        domCode += `  const ${slotVar} = (__slot_target) => {\n`;
        node.children.forEach(child => emitNode(child, '__slot_target', locals));
        domCode += `  };\n`;
        propEntries.push(`children: ${slotVar}`);
      }

      // The child mounts untracked, so nothing it reads while building itself
      // can re-run the parent's effect. Its teardown is kept and registered with
      // whatever scope is being built, so it runs when that scope is destroyed.
      domCode += `  let ${cid}_unmount = null;\n`;
      domCode += `  onDestroy(() => { if (typeof ${cid}_unmount === 'function') ${cid}_unmount(); ${cid}_unmount = null; });\n`;
      if (reactiveProps) {
        domCode += `  createEffect(() => {\n`;
        domCode += `    const ${cid}_props = { ${propEntries.join(', ')} };\n`;
        domCode += `    if (typeof ${cid}_unmount === 'function') __untrack(${cid}_unmount);\n`;
        domCode += `    ${cid}_target.textContent = '';\n`;
        domCode += `    ${cid}_unmount = __untrack(() => ${node.name}(${cid}_target, ${cid}_props));\n`;
        domCode += `  });\n`;
      } else {
        domCode += `  ${cid}_unmount = __untrack(() => ${node.name}(${cid}_target, { ${propEntries.join(', ')} }));\n`;
      }
      return;
    }

    // Slot placeholder: projects the children passed by a parent component, if any.
    if (node.name === 'slot') {
      domCode += `  if (typeof props.children === 'function') { props.children(${parentVar}); }\n`;
      return;
    }

    // {#if ...} {:else} ... {/if}
    //
    // Each time a branch is built it gets its own scope (pushContext). Effects,
    // onDestroy callbacks and child components created inside register with that
    // scope, and switching or removing the branch destroys it, so nothing built
    // for a branch that is no longer on the page keeps running.
    if (node.name === 'sola-if') {
      const cid = `c${uid++}`;
      domCode += `  const ${cid}_a = document.createComment('if');\n`;
      domCode += `  ${parentVar}.appendChild(${cid}_a);\n`;
      domCode += `  let ${cid}_els = [];\n`;
      domCode += `  let ${cid}_ctx = null;\n`;
      domCode += `  onDestroy(() => { if (${cid}_ctx) { __flush_destroys(${cid}_ctx); ${cid}_ctx = null; } });\n`;

      const thenChild = node.children.find(c => c.name === 'sola-then');
      const elseChild = node.children.find(c => c.name === 'sola-else');

      const emitBranch = (branch) => {
        if (!branch) return;
        domCode += `      ${cid}_ctx = pushContext();\n`;
        domCode += `      try {\n`;
        domCode += `      const f = document.createDocumentFragment();\n`;
        branch.children.forEach(child => emitNode(child, 'f', locals));
        domCode += `      Array.from(f.childNodes).forEach(n => ${cid}_els.push(n));\n`;
        domCode += `      ${cid}_a.parentNode.insertBefore(f, ${cid}_a.nextSibling);\n`;
        domCode += `      } finally { popContext(${cid}_ctx); }\n`;
      };

      domCode += `  createEffect(() => {\n`;
      domCode += `    if (${cid}_ctx) { __flush_destroys(${cid}_ctx); ${cid}_ctx = null; }\n`;
      domCode += `    ${cid}_els.forEach(e => e.remove()); ${cid}_els = [];\n`;
      domCode += `    if (${rewrite(node.attribs.condition)}) {\n`;
      emitBranch(thenChild);
      domCode += `    } else {\n`;
      emitBranch(elseChild);
      domCode += `    }\n`;
      domCode += `  });\n`;
      return;
    }

    // {#each} with optional keyed diffing: {#each items as item (item.id)}
    //
    // Like {#if}, what is built for the list gets its own scope so it can be
    // destroyed: the whole list for an unkeyed each, one scope per key for a
    // keyed one (so removing an item stops that item's effects and children).
    if (node.name === 'sola-each') {
      const eid = `e${uid++}`;
      // Item/index names shadow signals inside the loop body and key expression
      const eachLocals = new Set(locals);
      eachLocals.add(node.attribs.item);
      if (node.attribs.index) eachLocals.add(node.attribs.index);
      const arrayExpr = rewrite(node.attribs.array);
      const keyExpr = node.attribs.key
        ? transformTemplateExpression(node.attribs.key, reactiveVars, eachLocals)
        : null;
      domCode += `  const ${eid}_a = document.createComment('each');\n`;
      domCode += `  ${parentVar}.appendChild(${eid}_a);\n`;
      if (keyExpr) {
        // Keyed: maintain a Map<key, { nodes, ctx }> and reconcile on each run
        // Reconcile by walking the new order and moving each key's nodes into
        // place against a cursor. The previous version only ever inserted, and
        // against an anchor it never advanced — so reordering a keyed list (a
        // sort, a drag, a reverse) left the DOM in its original order, silently.
        domCode += `  let ${eid}_keyMap = new Map();\n`;
        domCode += `  onDestroy(() => { for (const _e of ${eid}_keyMap.values()) __flush_destroys(_e.ctx); ${eid}_keyMap.clear(); });\n`;
        domCode += `  createEffect(() => {\n`;
        domCode += `    const _items = ${arrayExpr} || [];\n`;
        domCode += `    const _parent = ${eid}_a.parentNode;\n`;
        domCode += `    const _seen = new Set();\n`;
        domCode += `    let _cursor = ${eid}_a.nextSibling;\n`;
        domCode += `    for (let _i = 0; _i < _items.length; _i++) {\n`;
        domCode += `      const ${node.attribs.item} = _items[_i];\n`;
        if (node.attribs.index) domCode += `      const ${node.attribs.index} = _i;\n`;
        domCode += `      const _key = String(${keyExpr});\n`;
        domCode += `      _seen.add(_key);\n`;
        domCode += `      let _entry = ${eid}_keyMap.get(_key);\n`;
        domCode += `      if (!_entry) {\n`;
        domCode += `        const _kctx = pushContext();\n`;
        domCode += `        try {\n`;
        domCode += `        const f = document.createDocumentFragment();\n`;
        node.children.forEach(child => emitNode(child, 'f', eachLocals));
        domCode += `        _entry = { nodes: Array.from(f.childNodes), ctx: _kctx };\n`;
        domCode += `        } finally { popContext(_kctx); }\n`;
        domCode += `        ${eid}_keyMap.set(_key, _entry);\n`;
        domCode += `      }\n`;
        domCode += `      for (const _n of _entry.nodes) {\n`;
        domCode += `        if (_n === _cursor) { _cursor = _cursor.nextSibling; }\n`;
        domCode += `        else { _parent.insertBefore(_n, _cursor); }\n`;
        domCode += `      }\n`;
        domCode += `    }\n`;
        domCode += `    for (const [_k, _stale] of ${eid}_keyMap) {\n`;
        domCode += `      if (!_seen.has(_k)) { __flush_destroys(_stale.ctx); _stale.nodes.forEach(n => n.remove()); ${eid}_keyMap.delete(_k); }\n`;
        domCode += `    }\n`;
        domCode += `  });\n`;
      } else {
        // Unkeyed: full teardown + rebuild
        domCode += `  let ${eid}_els = [];\n`;
        domCode += `  let ${eid}_ctx = null;\n`;
        domCode += `  onDestroy(() => { if (${eid}_ctx) { __flush_destroys(${eid}_ctx); ${eid}_ctx = null; } });\n`;
        domCode += `  createEffect(() => {\n`;
        domCode += `    if (${eid}_ctx) { __flush_destroys(${eid}_ctx); ${eid}_ctx = null; }\n`;
        domCode += `    ${eid}_els.forEach(e => e.remove()); ${eid}_els = [];\n`;
        domCode += `    const _items = ${arrayExpr} || [];\n`;
        domCode += `    ${eid}_ctx = pushContext();\n`;
        domCode += `    try {\n`;
        domCode += `    const f = document.createDocumentFragment();\n`;
        domCode += `    for (let _i = 0; _i < _items.length; _i++) {\n`;
        domCode += `      const ${node.attribs.item} = _items[_i];\n`;
        if (node.attribs.index) domCode += `      const ${node.attribs.index} = _i;\n`;
        node.children.forEach(child => emitNode(child, 'f', eachLocals));
        domCode += `    }\n`;
        domCode += `    Array.from(f.childNodes).forEach(n => ${eid}_els.push(n));\n`;
        domCode += `    ${eid}_a.parentNode.insertBefore(f, ${eid}_a.nextSibling);\n`;
        domCode += `    } finally { popContext(${eid}_ctx); }\n`;
        domCode += `  });\n`;
      }
      return;
    }

    // Normal element
    const id = `n${uid++}`;
    domCode += `  const ${id} = document.createElement('${node.name}');\n`;

    if (hasStyles) {
      domCode += `  ${id}.classList.add('${scopeHash}');\n`;
    }

    const BOOLEAN_ATTRS = new Set(['disabled', 'checked', 'selected', 'readonly', 'required', 'multiple', 'open']);
    for (const [key, val] of Object.entries(node.attribs || {})) {
      // Dynamic attribute pre-processed from {expr} in attribute values
      const dynMatch = /^__soladyn_(\d+)__$/.exec(val);
      if (dynMatch) {
        const expr = rewrite(dynAttrs[parseInt(dynMatch[1])]);
        if (BOOLEAN_ATTRS.has(key)) {
          domCode += `  createEffect(() => { const _v = !!(${expr}); if (_v) ${id}.setAttribute('${key}', ''); else ${id}.removeAttribute('${key}'); });\n`;
        } else if (key === 'class' || key === 'className') {
          const suffix = hasStyles ? ` + ' ${scopeHash}'` : '';
          domCode += `  createEffect(() => { ${id}.className = (${expr})${suffix}; });\n`;
        } else {
          domCode += `  createEffect(() => { ${id}.setAttribute('${key}', String(${expr})); });\n`;
        }
        continue;
      }
      if (key.startsWith('on:')) {
        const eventName = key.slice(3);
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(eventName)) continue;
        domCode += `  ${id}.addEventListener('${eventName}', ${rewrite(resolveHandler(val))});\n`;
      } else if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(eventName)) continue;
        domCode += `  ${id}.addEventListener('${eventName}', ${rewrite(resolveHandler(val))});\n`;
      } else if (key.startsWith('bind:')) {
        const prop = key.slice(5);
        // bind:value={name} names a signal; the marker resolves back to it.
        const bound = resolveHandler(val).replace(/^\{|\}$/g, '').trim();
        if (prop === 'value') {
          domCode += `  ${id}.addEventListener('input', (e) => { set_${bound}(e.target.value); });\n`;
          domCode += `  createEffect(() => { ${id}.value = ${bound}() ?? ''; });\n`;
        } else if (prop === 'this') {
          if (stateVars.has(bound)) {
            domCode += `  set_${bound}(${id});\n`;
          } else {
            domCode += `  ${bound} = ${id};\n`;
          }
        }
      } else if (key === 'class' || key === 'className') {
        // Static values: emit as a plain string literal. A template literal here
        // would let a backtick or ${ in the markup break out into expression
        // position; JSON.stringify cannot.
        domCode += `  ${id}.className += ' ' + ${JSON.stringify(val)};\n`;
      } else {
        domCode += `  ${id}.setAttribute(${JSON.stringify(key)}, ${JSON.stringify(val)});\n`;
      }
    }

    domCode += `  ${parentVar}.appendChild(${id});\n`;

    if (node.children && !VOID_ELEMENTS.has(node.name)) {
      for (const child of node.children) {
        emitNode(child, id, locals);
      }
    }
  }

  root.children.forEach(child => emitNode(child, '__target'));

  // Assemble final output module
  const CORE_EXPORTS = [...CORE_PROVIDED].join(', ');
  // The default bus is imported under an alias so a user variable named `bus`
  // cannot shadow what $on / $lastEvent compile to.
  const ESM_CORE_IMPORTS = CORE_EXPORTS + ', bus as __solaBus';
  const IIFE_CORE_PULL = CORE_EXPORTS + ', bus: __solaBus';
  let output = '';
  output += `// Compiled by @sola-air-ui/compiler v${COMPILER_VERSION}\n`;

  if (target === 'iife') {
    // No-bundler mode: pull from window.SolaCore global
    output += `(function() {\n`;
    const iifeExtras = coreImportExtras.map(e => (e.local === e.imported ? e.imported : `${e.imported}: ${e.local}`));
    output += `const { ${[IIFE_CORE_PULL, ...iifeExtras].join(', ')} } = window.SolaCore;\n`;
    for (const imp of componentImports) {
      output += `// Note: sub-component ${imp.localName} must be pre-loaded before this script\n`;
    }
    for (const imp of otherImports) {
      output += `// Note: ${imp.locals.join(', ')} must be loaded before this script (no-bundler output cannot import)\n`;
    }
    output += `\n`;
    output += `window['${options.exportName || 'SolaComponent'}'] = function mount(__target, props = {}) {\n`;
  } else {
    output += `import { ${ESM_CORE_IMPORTS} } from '@sola-air-ui/core';\n`;
    if (coreImportExtras.length) {
      const names = coreImportExtras.map(e => (e.local === e.imported ? e.imported : `${e.imported} as ${e.local}`));
      output += `import { ${names.join(', ')} } from '@sola-air-ui/core';\n`;
    }
    for (const imp of componentImports) {
      output += `import ${imp.localName} from '${imp.path}';\n`;
    }
    for (const imp of otherImports) {
      output += `${imp.code}\n`;
    }
    output += `\n`;
    output += `export default function mount(__target, props = {}) {\n`;
  }
  output += `  const __ctx = pushContext();\n\n`;

  if (hasStyles) {
    // Styles go into whichever root the component actually lives in: the
    // ShadowRoot when mounted inside one (document.head styles can't cross a
    // shadow boundary), otherwise document.head. De-duplicated per root.
    output += `  if (typeof document !== 'undefined') {\n`;
    output += `    const __rootNode = __target && __target.getRootNode ? __target.getRootNode() : document;\n`;
    output += `    const __styleHost = (typeof ShadowRoot !== 'undefined' && __rootNode instanceof ShadowRoot) ? __rootNode : document.head;\n`;
    output += `    const __seen = __styleHost.__solaStyles || (__styleHost.__solaStyles = new Set());\n`;
    output += `    if (!__seen.has('${scopeHash}')) {\n`;
    output += `      __seen.add('${scopeHash}');\n`;
    output += `      const styleEl = document.createElement('style');\n`;
    output += `      styleEl.textContent = \`${escapeTemplateLiteral(scopedCss)}\`;\n`;
    output += `      __styleHost.appendChild(styleEl);\n`;
    output += `    }\n`;
    output += `  }\n\n`;
  }

  for (const prop of exportedProps) {
    output += `  let ${prop.name} = props.${prop.name} !== undefined ? props.${prop.name} : ${prop.default};\n`;
  }

  output += `\n  // User script\n`;
  // Record where the user's script lands in the output so each of its lines can
  // be mapped back to the same line of the .sola file.
  const userScriptGeneratedStart = output.split('\n').length - 1;
  const userScriptLines = jsOutput.split('\n');
  output += userScriptLines.map(l => '  ' + l).join('\n') + '\n\n';

  output += `  // Reactive DOM graph\n`;
  output += domCode;

  output += `\n  __flush_mounts(__ctx);\n`;
  output += `\n  return () => {\n`;
  output += `    __flush_destroys(__ctx);\n`;
  output += `    popContext(__ctx);\n`;
  output += `    __target.innerHTML = '';\n`;
  output += `  };\n`;
  output += `};\n`;
  if (target === 'iife') {
    output += `})();\n`;
  } else if (options.exportStyles) {
    // Opt-in: the stylesheet and its scope class as module exports, for hosts
    // that mount into a Shadow Root and adopt the CSS themselves (e.g. via
    // adoptedStyleSheets). Off by default so existing build scripts that append
    // their own `css` / `scopeHash` exports, or strip exports, keep working.
    output += `\nexport const scopeHash = ${JSON.stringify(scopeHash)};\n`;
    output += `export const css = \`${escapeTemplateLiteral(scopedCss || '')}\`;\n`;
  }

  // The reactive rewrite can add or remove characters within a line but never
  // splits one, so the user script's line count is preserved and each line maps
  // straight back to its origin.
  let map = null;
  if (options.sourcemap !== false) {
    const filename = options.filename || 'component.sola';
    const segments = userScriptLines.map((_, i) => ({
      generatedLine: userScriptGeneratedStart + i,
      sourceLine: scriptStartLine + i
    }));
    map = buildSourceMap(segments, filename, source, output.split('\n').length);
  }

  return {
    code: output,
    scopeHash,
    css: scopedCss,
    map,
    dts: buildDeclarations(exportedProps, !!options.exportStyles)
  };
}

// Best-effort TypeScript type for a prop, from the literal its default is
// declared with. Anything it cannot read confidently is `unknown`, which stays
// safe for callers rather than claiming a precision it does not have.
function inferPropType(defaultSrc) {
  const d = String(defaultSrc ?? '').trim();
  if (/^(['"`])[\s\S]*\1$/.test(d)) return 'string';
  if (/^-?\d[\d_]*(\.\d+)?([eE][+-]?\d+)?$/.test(d)) return 'number';
  if (d === 'true' || d === 'false') return 'boolean';
  // A null or undefined default says nothing about the type. `unknown` would stop a
  // TypeScript host from reading or calling the prop; `any` lets it.
  if (d === 'null' || d === 'undefined') return 'any';
  if (d.startsWith('[')) return 'unknown[]';
  if (d.startsWith('{')) return 'Record<string, unknown>';
  if (/^(\(.*\)|\w+)\s*=>|^function\b/.test(d)) return '(...args: any[]) => any';
  return 'unknown';
}

// A `.d.ts` for a compiled component, so a TypeScript host can import the
// compiled module with its props checked. Every prop is optional because each
// has a default.
function buildDeclarations(props, exportStyles) {
  const fields = props
    .map(p => `  ${/^[A-Za-z_$][\w$]*$/.test(p.name) ? p.name : JSON.stringify(p.name)}?: ${inferPropType(p.default)};`)
    .join('\n');
  return [
    `export interface Props {${fields ? '\n' + fields + '\n' : ''}}`,
    `/** Mounts the component into \`target\` and returns a teardown function. */`,
    `declare function mount(target: Element | ShadowRoot, props?: Props): () => void;`,
    `export default mount;`,
    ...(exportStyles ? [`export declare const scopeHash: string;`, `export declare const css: string;`] : []),
    ``
  ].join('\n');
}
