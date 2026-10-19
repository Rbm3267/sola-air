// @sola-air-ui/compiler 1.5.3, bundled for scripts/preview.mjs (acorn and htmlparser2 are the files next to it). Generated; do not edit.

// packages/compiler/src/index.js
import * as acorn from "./acorn.mjs";
import * as htmlparser2 from "./htmlparser2.mjs";
import { readFileSync } from "node:fs";
var { version: COMPILER_VERSION } = JSON.parse(
  "{\"version\":\"1.5.3\"}"
);
var CORE_PROVIDED = /* @__PURE__ */ new Set([
  "createSignal",
  "createDerived",
  "createEffect",
  "createIntent",
  "createData",
  "createPersistentSignal",
  "onMount",
  "onDestroy",
  "pushContext",
  "popContext",
  "__flush_mounts",
  "__flush_destroys",
  "__untrack"
]);
var VOID_ELEMENTS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
function escapeTemplateLiteral(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "sola-" + Math.abs(hash).toString(36);
}
function splitTopLevel(text, isSep) {
  const parts = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && isSep(c)) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}
function addScopeToCompound(compound, scopeHash) {
  const pseudoIdx = compound.search(/::?[\w-]/);
  if (pseudoIdx > 0) {
    return `${compound.slice(0, pseudoIdx)}.${scopeHash}${compound.slice(pseudoIdx)}`;
  }
  return `${compound}.${scopeHash}`;
}
function scopeSelector(selector, scopeHash) {
  const tokens = [];
  let depth = 0, cur = "", comb = "";
  const flushCompound = () => {
    if (cur) {
      tokens.push({ compound: cur });
      cur = "";
    }
  };
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    if (depth === 0 && /[\s>+~]/.test(c)) {
      flushCompound();
      comb += c;
      continue;
    }
    if (comb) {
      tokens.push({ comb });
      comb = "";
    }
    cur += c;
  }
  flushCompound();
  if (comb) tokens.push({ comb });
  let last = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.compound === void 0) continue;
    const m = t.compound.match(/^:global\(([\s\S]*)\)$/);
    const group = (inner) => splitTopLevel(inner, (c) => c === ",").length > 1 ? `:is(${inner})` : inner;
    if (m) {
      t.compound = group(m[1]);
      t.global = true;
    } else if (t.compound.includes(":global(")) {
      t.compound = t.compound.replace(/:global\(([\s\S]*?)\)/g, (_, inner) => group(inner));
      t.global = true;
    } else {
      last = i;
    }
  }
  if (last >= 0) tokens[last].compound = addScopeToCompound(tokens[last].compound, scopeHash);
  return tokens.map((t) => t.compound ?? t.comb).join("");
}
function scopeSelectorList(selector, scopeHash) {
  return splitTopLevel(selector, (c) => c === ",").map((part) => {
    const trimmed = part.trim();
    if (!trimmed) return part;
    return scopeSelector(trimmed, scopeHash);
  }).join(", ");
}
function scopeStyles(css, scopeHash) {
  let out = "";
  let buf = "";
  let depth = 0;
  let inStr = null;
  let inComment = false;
  const ruleDepths = [];
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    const next = css[i + 1];
    if (inComment) {
      buf += ch;
      if (ch === "*" && next === "/") {
        buf += next;
        i++;
        inComment = false;
      }
      continue;
    }
    if (inStr) {
      buf += ch;
      if (ch === "\\") {
        if (next !== void 0) {
          buf += next;
          i++;
        }
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "/" && next === "*") {
      buf += ch + next;
      i++;
      inComment = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === "{") {
      const isDeclarationBlock = depth > 0 && !ruleDepths.includes(depth);
      if (isDeclarationBlock) {
        buf += ch;
        continue;
      }
      const commentEnd = buf.lastIndexOf("*/");
      const selectorStart = commentEnd === -1 ? 0 : commentEnd + 2;
      const afterComments = buf.slice(selectorStart);
      const leadingLen = selectorStart + (afterComments.length - afterComments.trimStart().length);
      const leading = buf.slice(0, leadingLen);
      const selector = buf.slice(leadingLen);
      const trimmed = selector.trim();
      const isAtRule = trimmed.startsWith("@");
      const isKeyframeStop = trimmed.startsWith("from") || trimmed.startsWith("to") || /^\d+%/.test(trimmed);
      const wrapsRules = isAtRule && /^@(media|supports|container|layer|scope)\b/.test(trimmed);
      out += leading;
      out += isAtRule || isKeyframeStop ? selector : scopeSelectorList(selector, scopeHash);
      out += ch;
      buf = "";
      depth++;
      if (wrapsRules) ruleDepths.push(depth);
      continue;
    }
    if (ch === "}") {
      out += buf + ch;
      buf = "";
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
  let script = "";
  let style = "";
  let template = source;
  let isTypeScript = false;
  let scriptStartLine = 0;
  const scriptMatch = template.match(/<script(?:\s+lang=["'](ts|js)["'])?>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    isTypeScript = scriptMatch[1] === "ts";
    script = scriptMatch[2];
    const openTagEnd = scriptMatch.index + scriptMatch[0].indexOf(">") + 1;
    scriptStartLine = source.slice(0, openTagEnd).split("\n").length - 1;
    template = template.replace(scriptMatch[0], "");
  }
  const styleMatch = template.match(/<style(?:\s+scoped)?>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    style = styleMatch[1];
    template = template.replace(styleMatch[0], "");
  }
  return { script, style, template, isTypeScript, scriptStartLine };
}
function matchBrace(text, openPos) {
  let depth = 0;
  let inStr = null;
  for (let i = openPos; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      if (--depth === 0) return i;
    }
  }
  return -1;
}
function preprocessTemplate(template, dynAttrs, handlers) {
  const isHandlerAttr = (name) => /^on:?[\w]+$/.test(name) || /^bind:[\w]+$/.test(name);
  let result = "";
  let i = 0;
  while (i < template.length) {
    if (template[i] === "<" && template[i + 1] !== "/" && template[i + 1] !== "!") {
      result += "<";
      i++;
      while (i < template.length && /[^\s>\/]/.test(template[i])) result += template[i++];
      while (i < template.length && template[i] !== ">" && !(template[i] === "/" && template[i + 1] === ">")) {
        if (/\s/.test(template[i])) {
          result += template[i++];
          continue;
        }
        let attrName = "";
        while (i < template.length && /[^\s=\/>]/.test(template[i])) attrName += template[i++];
        if (!attrName) {
          result += template[i++];
          continue;
        }
        if (template[i] !== "=") {
          result += attrName;
          continue;
        }
        i++;
        if (template[i] === "{") {
          const closeIdx = matchBrace(template, i);
          if (closeIdx !== -1) {
            const expr = template.slice(i + 1, closeIdx).trim();
            if (!expr.startsWith("#") && !expr.startsWith("/") && !expr.startsWith(":")) {
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
          result += `${attrName}={`;
          i++;
        } else if (template[i] === '"' || template[i] === "'") {
          const quote = template[i++];
          const parts = [];
          let currentText = "";
          let hasDyn = false;
          while (i < template.length && template[i] !== quote) {
            if (template[i] === "{") {
              const closeIdx = matchBrace(template, i);
              if (closeIdx !== -1) {
                const expr = template.slice(i + 1, closeIdx).trim();
                if (!expr.startsWith("#") && !expr.startsWith("/") && !expr.startsWith(":")) {
                  hasDyn = true;
                  parts.push({ text: currentText });
                  currentText = "";
                  parts.push({ expr });
                  i = closeIdx + 1;
                  continue;
                }
              }
            }
            currentText += template[i++];
          }
          parts.push({ text: currentText });
          if (i < template.length) i++;
          if (hasDyn && isHandlerAttr(attrName)) {
            const exprPart = parts.find((p) => p.expr !== void 0);
            handlers.push(exprPart ? exprPart.expr : "() => {}");
            result += `${attrName}="__solahandler_${handlers.length - 1}__"`;
          } else if (hasDyn) {
            const combined = parts.filter((p) => p.expr !== void 0 || p.text !== "").map((p) => p.expr !== void 0 ? `(${p.expr})` : JSON.stringify(p.text)).join(" + ");
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
      if (i < template.length && template[i] === "/") {
        result += "/";
        i++;
      }
      if (i < template.length && template[i] === ">") {
        result += ">";
        i++;
      }
      continue;
    }
    result += template[i++];
  }
  return result;
}
function desugarElseIf(template) {
  const OPEN = "{#if";
  const CLOSE = "{/if}";
  function matchingClose(text, openIdx) {
    let depth = 0;
    let i = openIdx;
    while (i < text.length) {
      if (text.startsWith(OPEN, i)) {
        depth++;
        i += OPEN.length;
        continue;
      }
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
  function findElseIf(text, from, to) {
    let depth = 0;
    let i = from;
    while (i < to) {
      if (text.startsWith(OPEN, i)) {
        depth++;
        i += OPEN.length;
        continue;
      }
      if (text.startsWith(CLOSE, i)) {
        depth--;
        i += CLOSE.length;
        continue;
      }
      if (depth === 0 && text.startsWith("{:else", i)) {
        const end = matchBrace(text, i);
        if (end === -1) return null;
        const inner = text.slice(i + "{:else".length, end);
        if (/^\s+if\s+/.test(inner)) {
          return { start: i, end, condition: inner.replace(/^\s+if\s+/, "").trim() };
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
    if (closeIdx === -1) {
      searchFrom = openIdx + OPEN.length;
      continue;
    }
    const hit = findElseIf(result, openIdx + OPEN.length, closeIdx);
    if (!hit) {
      searchFrom = openIdx + OPEN.length;
      continue;
    }
    result = result.slice(0, hit.start) + "{:else}{#if " + hit.condition + "}" + result.slice(hit.end + 1, closeIdx) + CLOSE + result.slice(closeIdx);
  }
  return result;
}
function transformBlocks(template) {
  const attr = (s) => String(s).trim().replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  function matchEnd(text, openIdx, openTag, closeTag) {
    let depth = 0;
    let i = openIdx;
    while (i < text.length) {
      if (text.startsWith(openTag, i)) {
        depth++;
        i += openTag.length;
        continue;
      }
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
  function topLevelElse(text, from, to) {
    let depth = 0;
    let i = from;
    while (i < to) {
      if (text.startsWith("{#if", i)) {
        depth++;
        i += 4;
        continue;
      }
      if (text.startsWith("{/if}", i)) {
        depth--;
        i += 5;
        continue;
      }
      if (depth === 0 && text.startsWith("{:else}", i)) return i;
      i++;
    }
    return -1;
  }
  function walk(text) {
    let out = "";
    let i = 0;
    while (i < text.length) {
      if (text.startsWith("{#if", i)) {
        const condEnd = matchBrace(text, i);
        if (condEnd === -1) {
          out += text[i++];
          continue;
        }
        const condition = text.slice(i + 4, condEnd);
        const end = matchEnd(text, i, "{#if", "{/if}");
        if (end === -1) {
          out += text[i++];
          continue;
        }
        const body = text.slice(condEnd + 1, end);
        const elseIdx = topLevelElse(body, 0, body.length);
        const thenPart = elseIdx === -1 ? body : body.slice(0, elseIdx);
        const elsePart = elseIdx === -1 ? null : body.slice(elseIdx + "{:else}".length);
        out += `<sola-if condition="${attr(condition)}"><sola-then>${walk(thenPart)}</sola-then>`;
        if (elsePart !== null) out += `<sola-else>${walk(elsePart)}</sola-else>`;
        out += `</sola-if>`;
        i = end + "{/if}".length;
        continue;
      }
      if (text.startsWith("{#each", i)) {
        const headEnd = matchBrace(text, i);
        if (headEnd === -1) {
          out += text[i++];
          continue;
        }
        const head = text.slice(i, headEnd + 1);
        const parsed = /^{#each\s+([\s\S]*?)\s+as\s+([\w$]+)(?:\s*,\s*([\w$]+))?(?:\s*\(([\s\S]+)\))?}$/.exec(head);
        const end = matchEnd(text, i, "{#each", "{/each}");
        if (!parsed || end === -1) {
          out += text[i++];
          continue;
        }
        const [, arr, item, index, key] = parsed;
        out += `<sola-each array="${attr(arr)}" item="${attr(item)}"`;
        if (index) out += ` index="${attr(index)}"`;
        if (key) out += ` key="${attr(key)}"`;
        out += `>${walk(text.slice(headEnd + 1, end))}</sola-each>`;
        i = end + "{/each}".length;
        continue;
      }
      out += text[i++];
    }
    return out;
  }
  return walk(template);
}
function extractExpressions(text) {
  let result = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "{") {
      const closeIdx = matchBrace(text, i);
      if (closeIdx === -1) {
        result += text[i++];
        continue;
      }
      const inner = text.slice(i + 1, closeIdx).trim();
      if (inner.startsWith("#") || inner.startsWith("/") || inner.startsWith(":")) {
        result += text.slice(i, closeIdx + 1);
        i = closeIdx + 1;
      } else if (inner.startsWith("@html")) {
        const htmlExpr = inner.slice("@html".length).trim();
        result += `<sola-html expr="${htmlExpr.replace(/"/g, "&quot;")}"></sola-html>`;
        i = closeIdx + 1;
      } else {
        result += `<sola-expr expr="${inner.replace(/"/g, "&quot;")}"></sola-expr>`;
        i = closeIdx + 1;
      }
    } else {
      result += text[i++];
    }
  }
  return result;
}
function stripTypeScript(code) {
  const blankKeepNewlines = (str) => str.replace(/[^\n]/g, " ");
  const ifaceRe = /^\s*(?:export\s+)?interface\s+[A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{/gm;
  let m;
  while ((m = ifaceRe.exec(code)) !== null) {
    const braceStart = m.index + m[0].lastIndexOf("{");
    const braceEnd = matchBrace(code, braceStart);
    if (braceEnd === -1) break;
    let end = braceEnd + 1;
    if (code[end] === ";") end++;
    code = code.slice(0, m.index) + blankKeepNewlines(code.slice(m.index, end)) + code.slice(end);
    ifaceRe.lastIndex = end;
  }
  const typeRe = /^\s*(?:export\s+)?type\s+[A-Za-z_$][\w$]*(?:\s*<[^>]*>)?\s*=\s*/gm;
  while ((m = typeRe.exec(code)) !== null) {
    let i2 = m.index + m[0].length;
    let depth = 0;
    let inStr2 = null;
    while (i2 < code.length) {
      const ch = code[i2];
      if (inStr2) {
        if (ch === "\\") {
          i2 += 2;
          continue;
        }
        if (ch === inStr2) inStr2 = null;
        i2++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr2 = ch;
        i2++;
        continue;
      }
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      else if (ch === "}" || ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
      else if (depth === 0 && ch === ";") {
        i2++;
        break;
      } else if (depth === 0 && ch === "\n") {
        const rest = code.slice(i2 + 1).match(/^\s*([|&])/);
        if (!rest) break;
      }
      i2++;
    }
    code = code.slice(0, m.index) + blankKeepNewlines(code.slice(m.index, i2)) + code.slice(i2);
    typeRe.lastIndex = i2;
  }
  function scanTypeEnd(str, start, stopChars) {
    let i2 = start;
    let depth = 0;
    let angleDepth = 0;
    let inStr2 = null;
    while (i2 < str.length) {
      const ch = str[i2];
      if (inStr2) {
        if (ch === "\\") {
          i2 += 2;
          continue;
        }
        if (ch === inStr2) inStr2 = null;
        i2++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr2 = ch;
        i2++;
        continue;
      }
      if (ch === "=" && str[i2 + 1] === ">") {
        i2 += 2;
        continue;
      }
      if (ch === "<") {
        angleDepth++;
        i2++;
        continue;
      }
      if (ch === ">" && angleDepth > 0) {
        angleDepth--;
        i2++;
        continue;
      }
      if (ch === "{" || ch === "(" || ch === "[") {
        depth++;
        i2++;
        continue;
      }
      if (ch === "}" || ch === ")" || ch === "]") {
        if (depth === 0 && angleDepth === 0 && stopChars.has(ch)) return i2;
        depth = Math.max(0, depth - 1);
        i2++;
        continue;
      }
      if (depth === 0 && angleDepth === 0 && stopChars.has(ch)) return i2;
      i2++;
    }
    return i2;
  }
  const varRe = /\b(const|let|var)(\s+[A-Za-z_$][\w$]*)(\??\s*:\s*)/g;
  const varStops = /* @__PURE__ */ new Set(["=", ";", "\n"]);
  while ((m = varRe.exec(code)) !== null) {
    const colonStart = m.index + m[1].length + m[2].length;
    const typeStart = colonStart + m[3].length;
    const typeEnd = scanTypeEnd(code, typeStart, varStops);
    code = code.slice(0, colonStart) + blankKeepNewlines(code.slice(colonStart, typeEnd)) + code.slice(typeEnd);
    varRe.lastIndex = colonStart;
  }
  let out = "";
  const delimStack = [];
  let i = 0;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;
  const paramStops = /* @__PURE__ */ new Set([",", ")", "="]);
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];
    if (inLineComment) {
      out += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      out += ch;
      if (ch === "*" && next === "/") {
        out += "/";
        i += 2;
        inBlockComment = false;
        continue;
      }
      i++;
      continue;
    }
    if (inStr) {
      out += ch;
      if (ch === "\\" && next !== void 0) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      out += "//";
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      out += "/*";
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") {
      delimStack.push(ch);
      out += ch;
      i++;
      continue;
    }
    if (ch === ")" || ch === "}" || ch === "]") {
      delimStack.pop();
      out += ch;
      i++;
      if (ch === ")") {
        const retMatch = /^(\s*:\s*)/.exec(code.slice(i));
        if (retMatch) {
          const typeStart = i + retMatch[1].length;
          const typeEnd = scanTypeEnd(code, typeStart, /* @__PURE__ */ new Set(["{", "=", ";", "\n"]));
          const after = code.slice(typeEnd);
          if (/^\s*(\{|=>)/.test(after) && code.slice(typeStart, typeEnd).trim().length > 0) {
            out += blankKeepNewlines(code.slice(i, typeEnd));
            i = typeEnd;
          }
        }
      }
      continue;
    }
    if (delimStack[delimStack.length - 1] === "(") {
      const prevNonWs = out.trimEnd().slice(-1);
      if (prevNonWs === "(" || prevNonWs === ",") {
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
  code = code.replace(
    /(\b(?:import|export)\s*\{[^}]*\})|\s+as\s+(?:const\b|[A-Za-z_$][\w$.<>\[\]|&?]*(?:\s*[|&]\s*[A-Za-z_$][\w$.<>\[\]|&?]*)*)/g,
    (full, impExp) => impExp ? impExp : blankKeepNewlines(full)
  );
  code = code.replace(/(?<=[\w$])<[^>()=;]+>(?=\s*\()/g, (m2) => blankKeepNewlines(m2));
  return code;
}
function collectPatternNames(node, out) {
  if (!node) return;
  switch (node.type) {
    case "Identifier":
      out.add(node.name);
      break;
    case "ObjectPattern":
      node.properties.forEach((p) => collectPatternNames(p.value || p.argument, out));
      break;
    case "ArrayPattern":
      node.elements.forEach((el) => collectPatternNames(el, out));
      break;
    case "AssignmentPattern":
      collectPatternNames(node.left, out);
      break;
    case "RestElement":
      collectPatternNames(node.argument, out);
      break;
  }
}
function collectDeclaredNames(node, out) {
  if (!node || typeof node !== "object" || !node.type) return;
  if (node.type === "VariableDeclaration") node.declarations.forEach((d) => collectPatternNames(d.id, out));
  if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && node.id) out.add(node.id.name);
  if (node.type === "CatchClause" && node.param) collectPatternNames(node.param, out);
  for (const key of Object.keys(node)) {
    if (key === "type") continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => collectDeclaredNames(c, out));
    else if (child && typeof child === "object" && child.type) collectDeclaredNames(child, out);
  }
}
function collectReactiveVars(ast) {
  const vars = { state: /* @__PURE__ */ new Set(), derived: /* @__PURE__ */ new Set(), intent: /* @__PURE__ */ new Set(), data: /* @__PURE__ */ new Set() };
  (function walk(node) {
    if (!node || typeof node !== "object" || !node.type) return;
    if (node.type === "VariableDeclaration") {
      for (const decl of node.declarations) {
        if (decl.init && decl.init.type === "CallExpression" && decl.init.callee.type === "Identifier" && decl.id.type === "Identifier") {
          const macro = decl.init.callee.name;
          if (macro === "$state" || macro === "$persist") vars.state.add(decl.id.name);
          else if (macro === "$derived" || macro === "$lastEvent") vars.derived.add(decl.id.name);
          else if (macro === "$intent") vars.intent.add(decl.id.name);
          else if (macro === "$data") vars.data.add(decl.id.name);
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "type") continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === "object" && child.type) walk(child);
    }
  })(ast);
  return vars;
}
var DATA_ACCESSOR_METHODS = /* @__PURE__ */ new Set(["refetch", "stop"]);
var INTENT_SUB_SIGNALS = /* @__PURE__ */ new Set(["loading", "error"]);
function reactiveKind(name, vars, shadowStack) {
  for (const scope of shadowStack) if (scope.has(name)) return null;
  if (vars.state.has(name)) return "state";
  if (vars.derived.has(name)) return "derived";
  if (vars.intent.has(name)) return "intent";
  if (vars.data.has(name)) return "data";
  return null;
}
function emitReactiveEdits(rootNode, src, vars, edits, initialShadows) {
  function walk(node, parent, shadows) {
    if (!node || typeof node !== "object" || !node.type) return;
    if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
      const scope = /* @__PURE__ */ new Set();
      if (node.id) scope.add(node.id.name);
      (node.params || []).forEach((p) => collectPatternNames(p, scope));
      collectDeclaredNames(node.body, scope);
      shadows = [...shadows, scope];
    }
    if (node.type === "AssignmentExpression" && node.left.type === "Identifier" && reactiveKind(node.left.name, vars, shadows) === "state") {
      const name = node.left.name;
      if (node.operator === "=") {
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
    if (node.type === "UpdateExpression" && node.argument.type === "Identifier" && reactiveKind(node.argument.name, vars, shadows) === "state") {
      const name = node.argument.name;
      const op = node.operator === "++" ? "+" : "-";
      edits.push({ start: node.start, end: node.end, replacement: `set_${name}(${name}() ${op} 1)` });
      return;
    }
    if (node.type === "MemberExpression" && !node.computed && node.object.type === "Identifier" && node.property.type === "Identifier" && reactiveKind(node.object.name, vars, shadows) === "intent" && INTENT_SUB_SIGNALS.has(node.property.name) && !(parent && parent.type === "CallExpression" && parent.callee === node)) {
      edits.push({ start: node.end, end: node.end, replacement: `()` });
      return;
    }
    if (node.type === "Identifier") {
      const kind = reactiveKind(node.name, vars, shadows);
      if (kind) {
        const p = parent || { type: "__fragment_root__" };
        const isDeclOrBinding = p.type === "VariableDeclarator" && p.id === node || (p.type === "FunctionDeclaration" || p.type === "FunctionExpression" || p.type === "ClassDeclaration") && p.id === node || p.type === "AssignmentPattern" && p.left === node || p.type === "RestElement" || p.type === "ImportSpecifier" || p.type === "ImportDefaultSpecifier" || p.type === "ExportSpecifier" || p.type === "LabeledStatement" || p.type === "BreakStatement" || p.type === "ContinueStatement";
        const isMemberProp = p.type === "MemberExpression" && p.property === node && !p.computed;
        const isCallee = (p.type === "CallExpression" || p.type === "NewExpression") && p.callee === node;
        const isAssignTarget = p.type === "AssignmentExpression" && p.left === node || p.type === "UpdateExpression";
        const isPropertyKey = (p.type === "Property" || p.type === "MethodDefinition" || p.type === "PropertyDefinition") && p.key === node && !p.computed;
        const isShorthand = p.type === "Property" && p.shorthand && p.value === node;
        const isMemberObject = p.type === "MemberExpression" && p.object === node;
        if (!isDeclOrBinding && !isMemberProp && !isCallee && !isAssignTarget && !isPropertyKey) {
          if (isShorthand) {
            edits.push({ start: node.start, end: node.end, replacement: `${node.name}: ${node.name}()` });
            return;
          }
          if (isMemberObject) {
            if (kind === "state" || kind === "derived" || kind === "data" && !(p.property.type === "Identifier" && !p.computed && DATA_ACCESSOR_METHODS.has(p.property.name))) {
              edits.push({ start: node.end, end: node.end, replacement: `()` });
            }
            return;
          }
          edits.push({ start: node.end, end: node.end, replacement: `()` });
          return;
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "type") continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach((c) => walk(c, node, shadows));
      else if (child && typeof child === "object" && child.type) walk(child, node, shadows);
    }
  }
  walk(rootNode, null, initialShadows || []);
}
function applyEdits(src, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  for (const edit of sorted) {
    out = out.slice(0, edit.start) + edit.replacement + out.slice(edit.end);
  }
  return out;
}
var NO_REACTIVE_VARS = { state: /* @__PURE__ */ new Set(), derived: /* @__PURE__ */ new Set(), intent: /* @__PURE__ */ new Set(), data: /* @__PURE__ */ new Set() };
function hasReactiveVars(vars) {
  return vars.state.size > 0 || vars.derived.size > 0 || vars.intent.size > 0 || vars.data.size > 0;
}
function transformTemplateExpression(src, vars, locals) {
  if (!hasReactiveVars(vars) || !src || !src.trim()) return src;
  let ast;
  try {
    ast = acorn.parseExpressionAt(src, 0, { ecmaVersion: "latest" });
  } catch {
    return src;
  }
  const edits = [];
  emitReactiveEdits(ast, src, vars, edits, locals && locals.size ? [locals] : []);
  return edits.length > 0 ? applyEdits(src, edits) : src;
}
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function encodeVlq(value) {
  let vlq = value < 0 ? -value << 1 | 1 : value << 1;
  let out = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    out += B64[digit];
  } while (vlq > 0);
  return out;
}
function buildSourceMap(segments, filename, sourceContent, generatedLineCount) {
  const byLine = /* @__PURE__ */ new Map();
  for (const seg of segments) byLine.set(seg.generatedLine, seg.sourceLine);
  let prevSourceLine = 0;
  const lines = [];
  for (let line = 0; line < generatedLineCount; line++) {
    if (!byLine.has(line)) {
      lines.push("");
      continue;
    }
    const sourceLine = byLine.get(line);
    lines.push(
      encodeVlq(0) + encodeVlq(0) + encodeVlq(sourceLine - prevSourceLine) + encodeVlq(0)
    );
    prevSourceLine = sourceLine;
  }
  return {
    version: 3,
    file: filename ? filename.replace(/\.sola$/, ".js") : void 0,
    sources: [filename || "component.sola"],
    sourcesContent: [sourceContent],
    names: [],
    mappings: lines.join(";")
  };
}
function compile(source, options = {}) {
  const target = options.target || "esm";
  const { script: scriptContent, style: styleContent, template: rawTemplateSource, isTypeScript, scriptStartLine } = extractScriptAndStyle(source);
  const scopeHash = hashString(styleContent || rawTemplateSource);
  const hasStyles = styleContent.trim().length > 0;
  const scopedCss = hasStyles ? scopeStyles(styleContent, scopeHash) : "";
  let rawTemplate = rawTemplateSource.replace(/<!--[\s\S]*?-->/g, "");
  rawTemplate = desugarElseIf(rawTemplate);
  const dynAttrs = [];
  const handlers = [];
  rawTemplate = preprocessTemplate(rawTemplate, dynAttrs, handlers);
  const resolveHandler = (val) => {
    const m = /^__solahandler_(\d+)__$/.exec(val);
    return m ? handlers[parseInt(m[1], 10)] : val;
  };
  rawTemplate = extractExpressions(rawTemplate);
  rawTemplate = transformBlocks(rawTemplate);
  const templateNodes = [];
  let root = { type: "element", name: "__root__", attribs: {}, children: [] };
  templateNodes.push(root);
  const parser = new htmlparser2.Parser({
    onopentag(name, attribs) {
      const node = { type: "element", name, attribs, children: [] };
      templateNodes[templateNodes.length - 1].children.push(node);
      if (!VOID_ELEMENTS.has(name)) {
        templateNodes.push(node);
      }
    },
    ontext(text) {
      if (text.trim().length > 0 && templateNodes.length > 0) {
        templateNodes[templateNodes.length - 1].children.push({ type: "text", data: text });
      }
    },
    onclosetag(name) {
      if (templateNodes.length > 1 && !VOID_ELEMENTS.has(name)) {
        templateNodes.pop();
      }
    }
  }, { recognizeSelfClosing: true, lowerCaseTags: false, lowerCaseAttributeNames: false });
  parser.write(rawTemplate.trim() || "<div></div>");
  parser.end();
  const strippedScript = scriptContent.trim() && isTypeScript ? stripTypeScript(scriptContent) : scriptContent;
  let jsOutput = strippedScript;
  const stateVars = /* @__PURE__ */ new Set();
  const exportedProps = [];
  const componentImports = [];
  const otherImports = [];
  const coreImportExtras = [];
  let reactiveVars = NO_REACTIVE_VARS;
  if (strippedScript.trim()) {
    try {
      let walkAST = function(node, parent) {
        if (!node || typeof node !== "object") return;
        if (node.type === "ImportDeclaration") {
          const src = node.source.value;
          if (src.endsWith(".sola")) {
            node.specifiers.forEach((spec) => {
              componentImports.push({ localName: spec.local.name, path: src });
            });
          } else if (src === "@sola-air-ui/core" || src === "@sola/core") {
            node.specifiers.forEach((spec) => {
              if (spec.type !== "ImportSpecifier") return;
              const imported = spec.imported.name ?? spec.imported.value;
              if (spec.local.name === imported && CORE_PROVIDED.has(imported)) return;
              coreImportExtras.push({ imported, local: spec.local.name });
            });
          } else {
            otherImports.push({
              code: strippedScript.slice(node.start, node.end).trim().replace(/;?$/, ";"),
              locals: node.specifiers.map((spec) => spec.local.name)
            });
          }
          edits.push({
            start: node.start,
            end: node.end,
            replacement: `// import hoisted: ${node.source.value}`
          });
          removedRanges.push([node.start, node.end]);
        }
        if (node.type === "ExportNamedDeclaration" && node.declaration && node.declaration.type === "VariableDeclaration") {
          node.declaration.declarations.forEach((decl) => {
            const name = decl.id.name;
            const defaultVal = decl.init ? strippedScript.slice(decl.init.start, decl.init.end) : "undefined";
            exportedProps.push({ name, default: defaultVal });
          });
          edits.push({ start: node.start, end: node.end, replacement: "" });
          removedRanges.push([node.start, node.end]);
        }
        if (node.type === "ExpressionStatement" && node.expression.type === "CallExpression" && node.expression.callee.type === "Identifier" && node.expression.callee.name === "$on") {
          const call = node.expression;
          edits.push({ start: call.callee.start, end: call.callee.end, replacement: "onDestroy(__solaBus.on" });
          edits.push({ start: call.end, end: call.end, replacement: ")" });
        }
        if (node.type === "ExpressionStatement" && node.expression.type === "CallExpression" && node.expression.callee.type === "Identifier" && node.expression.callee.name === "$effect") {
          const callee = node.expression.callee;
          edits.push({ start: callee.start, end: callee.end, replacement: "createEffect" });
        }
        if (node.type === "VariableDeclaration" && node.declarations.length === 1) {
          const decl = node.declarations[0];
          if (decl.init && decl.init.type === "CallExpression" && decl.init.callee.type === "Identifier") {
            const macro = decl.init.callee.name;
            const arg = decl.init.arguments[0];
            const lastArg = decl.init.arguments[decl.init.arguments.length - 1];
            if (macro === "$state" || macro === "$persist") {
              const varName = decl.id.name;
              const factory = macro === "$persist" ? "createPersistentSignal" : "createSignal";
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `const [${varName}, set_${varName}] = ${factory}(` });
                edits.push({ start: lastArg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const [${varName}, set_${varName}] = createSignal(undefined);` });
              }
            } else if (macro === "$derived") {
              const varName = decl.id.name;
              if (arg) {
                const isFn = arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression";
                edits.push({
                  start: node.start,
                  end: arg.start,
                  replacement: isFn ? `const ${varName} = createDerived(` : `const ${varName} = createDerived(() => `
                });
                edits.push({ start: arg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const ${varName} = createDerived(() => undefined);` });
              }
            } else if (macro === "$lastEvent") {
              const varName = decl.id.name;
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `const ${varName} = __solaBus.signal(` });
                edits.push({ start: lastArg.end, end: node.end, replacement: `); onDestroy(${varName}.dispose);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const ${varName} = () => undefined;` });
              }
            } else if (macro === "$effect") {
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `createEffect(` });
                edits.push({ start: arg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `createEffect(() => {});` });
              }
            } else if (macro === "$intent") {
              if (arg) {
                edits.push({ start: node.start, end: arg.start, replacement: `const ${decl.id.name} = createIntent(` });
                edits.push({ start: lastArg.end, end: node.end, replacement: `);` });
              } else {
                edits.push({ start: node.start, end: node.end, replacement: `const ${decl.id.name} = createIntent('');` });
              }
            } else if (macro === "$data") {
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
          if (key === "type") continue;
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach((c) => walkAST(c, node));
          } else if (child && typeof child === "object" && child.type) {
            walkAST(child, node);
          }
        }
      };
      const ast = acorn.parse(strippedScript, { ecmaVersion: "latest", sourceType: "module" });
      const edits = [];
      const removedRanges = [];
      reactiveVars = collectReactiveVars(ast);
      for (const name of reactiveVars.state) stateVars.add(name);
      walkAST(ast, null);
      const rewriteEdits = [];
      emitReactiveEdits(ast, strippedScript, reactiveVars, rewriteEdits, []);
      for (const edit of rewriteEdits) {
        if (removedRanges.some(([s, e]) => edit.start >= s && edit.end <= e)) continue;
        edits.push(edit);
      }
      jsOutput = applyEdits(strippedScript, edits);
    } catch (err) {
      const loc = err.loc ? ` (line ${err.loc.line}, col ${err.loc.column})` : "";
      const filePath = typeof options === "string" ? options : options.filename || "<script>";
      throw new Error(`[sola compiler] Parse error in ${filePath}${loc}:
  ${err.message}`);
    }
  }
  let uid = 0;
  let domCode = "";
  const importedComponentSet = new Set(componentImports.map((i) => i.localName));
  for (const imp of otherImports) {
    for (const name of imp.locals) if (/^[A-Z]/.test(name)) importedComponentSet.add(name);
  }
  const sourceFile = options.filename || "<component>";
  function checkExpression(expr, whatFor) {
    try {
      const trimmed = expr.trim();
      const node = acorn.parseExpressionAt(trimmed, 0, { ecmaVersion: "latest" });
      if (node.end !== trimmed.length) throw new Error("trailing content");
    } catch {
      const preview = expr.length > 80 ? expr.slice(0, 80) + "\u2026" : expr;
      throw new Error(
        `[sola compiler] Invalid ${whatFor} in ${sourceFile}:
  {${preview}}
  This is not a valid JavaScript expression. If you meant a literal brace in your markup, escape it as &#123; and &#125;.`
      );
    }
  }
  function emitNode(node, parentVar, locals = /* @__PURE__ */ new Set(), inSvg = false) {
    if (!node) return;
    const rewrite = (expr) => transformTemplateExpression(expr, reactiveVars, locals);
    if (node.type === "text") {
      const text = escapeTemplateLiteral(node.data);
      if (text.trim().length > 0) {
        const id2 = `t${uid++}`;
        domCode += `  const ${id2} = document.createTextNode(\`${text}\`);
`;
        domCode += `  ${parentVar}.appendChild(${id2});
`;
      }
      return;
    }
    if (node.name === "sola-expr") {
      const raw = (node.attribs.expr || "").replace(/&quot;/g, '"');
      checkExpression(raw, "template expression");
      const expr = rewrite(raw);
      const id2 = `e${uid++}`;
      domCode += `  const ${id2} = document.createTextNode('');
`;
      domCode += `  ${parentVar}.appendChild(${id2});
`;
      domCode += `  createEffect(() => { ${id2}.textContent = String((${expr}) ?? ''); });
`;
      return;
    }
    if (node.name === "sola-html") {
      const expr = rewrite((node.attribs.expr || "").replace(/&quot;/g, '"'));
      const id2 = `h${uid++}`;
      domCode += `  const ${id2} = document.createElement('div');
`;
      domCode += `  ${id2}.style.display = 'contents';
`;
      domCode += `  ${parentVar}.appendChild(${id2});
`;
      domCode += `  createEffect(() => { ${id2}.innerHTML = String((${expr}) ?? ''); });
`;
      return;
    }
    if (importedComponentSet.has(node.name)) {
      const cid = `comp${uid++}`;
      domCode += `  const ${cid}_target = document.createElement('div');
`;
      domCode += `  ${cid}_target.className = 'sola-component-root';
`;
      domCode += `  ${parentVar}.appendChild(${cid}_target);
`;
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
            checkExpression(raw, "component prop");
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
      if (node.children && node.children.length > 0) {
        const slotVar = `${cid}_slot`;
        domCode += `  const ${slotVar} = (__slot_target) => {
`;
        node.children.forEach((child) => emitNode(child, "__slot_target", locals));
        domCode += `  };
`;
        propEntries.push(`children: ${slotVar}`);
      }
      domCode += `  let ${cid}_unmount = null;
`;
      domCode += `  onDestroy(() => { if (typeof ${cid}_unmount === 'function') ${cid}_unmount(); ${cid}_unmount = null; });
`;
      if (reactiveProps) {
        domCode += `  createEffect(() => {
`;
        domCode += `    const ${cid}_props = { ${propEntries.join(", ")} };
`;
        domCode += `    if (typeof ${cid}_unmount === 'function') __untrack(${cid}_unmount);
`;
        domCode += `    ${cid}_target.textContent = '';
`;
        domCode += `    ${cid}_unmount = __untrack(() => ${node.name}(${cid}_target, ${cid}_props));
`;
        domCode += `  });
`;
      } else {
        domCode += `  ${cid}_unmount = __untrack(() => ${node.name}(${cid}_target, { ${propEntries.join(", ")} }));
`;
      }
      return;
    }
    if (node.name === "slot") {
      domCode += `  if (typeof props.children === 'function') { props.children(${parentVar}); }
`;
      return;
    }
    if (node.name === "sola-if") {
      const cid = `c${uid++}`;
      domCode += `  const ${cid}_a = document.createComment('if');
`;
      domCode += `  ${parentVar}.appendChild(${cid}_a);
`;
      domCode += `  let ${cid}_els = [];
`;
      domCode += `  let ${cid}_ctx = null;
`;
      domCode += `  onDestroy(() => { if (${cid}_ctx) { __flush_destroys(${cid}_ctx); ${cid}_ctx = null; } });
`;
      const thenChild = node.children.find((c) => c.name === "sola-then");
      const elseChild = node.children.find((c) => c.name === "sola-else");
      const emitBranch = (branch) => {
        if (!branch) return;
        domCode += `      ${cid}_ctx = pushContext();
`;
        domCode += `      try {
`;
        domCode += `      const f = document.createDocumentFragment();
`;
        branch.children.forEach((child) => emitNode(child, "f", locals, inSvg));
        domCode += `      Array.from(f.childNodes).forEach(n => ${cid}_els.push(n));
`;
        domCode += `      ${cid}_a.parentNode.insertBefore(f, ${cid}_a.nextSibling);
`;
        domCode += `      } finally { popContext(${cid}_ctx); }
`;
      };
      domCode += `  createEffect(() => {
`;
      domCode += `    if (${cid}_ctx) { __flush_destroys(${cid}_ctx); ${cid}_ctx = null; }
`;
      domCode += `    ${cid}_els.forEach(e => e.remove()); ${cid}_els = [];
`;
      domCode += `    if (${rewrite(node.attribs.condition)}) {
`;
      emitBranch(thenChild);
      domCode += `    } else {
`;
      emitBranch(elseChild);
      domCode += `    }
`;
      domCode += `  });
`;
      return;
    }
    if (node.name === "sola-each") {
      const eid = `e${uid++}`;
      const eachLocals = new Set(locals);
      eachLocals.add(node.attribs.item);
      if (node.attribs.index) eachLocals.add(node.attribs.index);
      const arrayExpr = rewrite(node.attribs.array);
      const keyExpr = node.attribs.key ? transformTemplateExpression(node.attribs.key, reactiveVars, eachLocals) : null;
      domCode += `  const ${eid}_a = document.createComment('each');
`;
      domCode += `  ${parentVar}.appendChild(${eid}_a);
`;
      if (keyExpr) {
        domCode += `  let ${eid}_keyMap = new Map();
`;
        domCode += `  onDestroy(() => { for (const _e of ${eid}_keyMap.values()) __flush_destroys(_e.ctx); ${eid}_keyMap.clear(); });
`;
        domCode += `  createEffect(() => {
`;
        domCode += `    const _items = ${arrayExpr} || [];
`;
        domCode += `    const _parent = ${eid}_a.parentNode;
`;
        domCode += `    const _seen = new Set();
`;
        domCode += `    let _cursor = ${eid}_a.nextSibling;
`;
        domCode += `    for (let _i = 0; _i < _items.length; _i++) {
`;
        domCode += `      const ${node.attribs.item} = _items[_i];
`;
        if (node.attribs.index) domCode += `      const ${node.attribs.index} = _i;
`;
        domCode += `      const _key = String(${keyExpr});
`;
        domCode += `      _seen.add(_key);
`;
        domCode += `      let _entry = ${eid}_keyMap.get(_key);
`;
        domCode += `      if (_entry && (_entry.item !== ${node.attribs.item}${node.attribs.index ? ` || _entry.index !== _i` : ""})) {
`;
        domCode += `        __flush_destroys(_entry.ctx);
`;
        domCode += `        const _old = _entry.nodes;
`;
        domCode += `        if (_old.includes(_cursor)) _cursor = _old[_old.length - 1].nextSibling;
`;
        domCode += `        _old.forEach(n => n.remove());
`;
        domCode += `        _entry = null;
`;
        domCode += `      }
`;
        domCode += `      if (!_entry) {
`;
        domCode += `        const _kctx = pushContext();
`;
        domCode += `        try {
`;
        domCode += `        const f = document.createDocumentFragment();
`;
        node.children.forEach((child) => emitNode(child, "f", eachLocals, inSvg));
        domCode += `        _entry = { nodes: Array.from(f.childNodes), ctx: _kctx, item: ${node.attribs.item}${node.attribs.index ? ", index: _i" : ""} };
`;
        domCode += `        } finally { popContext(_kctx); }
`;
        domCode += `        ${eid}_keyMap.set(_key, _entry);
`;
        domCode += `      }
`;
        domCode += `      for (const _n of _entry.nodes) {
`;
        domCode += `        if (_n === _cursor) { _cursor = _cursor.nextSibling; }
`;
        domCode += `        else { _parent.insertBefore(_n, _cursor); }
`;
        domCode += `      }
`;
        domCode += `    }
`;
        domCode += `    for (const [_k, _stale] of ${eid}_keyMap) {
`;
        domCode += `      if (!_seen.has(_k)) { __flush_destroys(_stale.ctx); _stale.nodes.forEach(n => n.remove()); ${eid}_keyMap.delete(_k); }
`;
        domCode += `    }
`;
        domCode += `  });
`;
      } else {
        domCode += `  let ${eid}_els = [];
`;
        domCode += `  let ${eid}_ctx = null;
`;
        domCode += `  onDestroy(() => { if (${eid}_ctx) { __flush_destroys(${eid}_ctx); ${eid}_ctx = null; } });
`;
        domCode += `  createEffect(() => {
`;
        domCode += `    if (${eid}_ctx) { __flush_destroys(${eid}_ctx); ${eid}_ctx = null; }
`;
        domCode += `    ${eid}_els.forEach(e => e.remove()); ${eid}_els = [];
`;
        domCode += `    const _items = ${arrayExpr} || [];
`;
        domCode += `    ${eid}_ctx = pushContext();
`;
        domCode += `    try {
`;
        domCode += `    const f = document.createDocumentFragment();
`;
        domCode += `    for (let _i = 0; _i < _items.length; _i++) {
`;
        domCode += `      const ${node.attribs.item} = _items[_i];
`;
        if (node.attribs.index) domCode += `      const ${node.attribs.index} = _i;
`;
        node.children.forEach((child) => emitNode(child, "f", eachLocals, inSvg));
        domCode += `    }
`;
        domCode += `    Array.from(f.childNodes).forEach(n => ${eid}_els.push(n));
`;
        domCode += `    ${eid}_a.parentNode.insertBefore(f, ${eid}_a.nextSibling);
`;
        domCode += `    } finally { popContext(${eid}_ctx); }
`;
        domCode += `  });
`;
      }
      return;
    }
    const isSvg = inSvg || node.name === "svg";
    const childSvg = isSvg && node.name !== "foreignObject";
    const id = `n${uid++}`;
    if (isSvg) {
      domCode += `  const ${id} = document.createElementNS('http://www.w3.org/2000/svg', '${node.name}');
`;
    } else {
      domCode += `  const ${id} = document.createElement('${node.name}');
`;
    }
    if (hasStyles) {
      domCode += `  ${id}.classList.add('${scopeHash}');
`;
    }
    const BOOLEAN_ATTRS = /* @__PURE__ */ new Set(["disabled", "checked", "selected", "readonly", "required", "multiple", "open"]);
    for (const [key, val] of Object.entries(node.attribs || {})) {
      const dynMatch = /^__soladyn_(\d+)__$/.exec(val);
      if (dynMatch) {
        const expr = rewrite(dynAttrs[parseInt(dynMatch[1])]);
        if (BOOLEAN_ATTRS.has(key)) {
          domCode += `  createEffect(() => { const _v = !!(${expr}); if (_v) ${id}.setAttribute('${key}', ''); else ${id}.removeAttribute('${key}'); });
`;
        } else if (key === "class" || key === "className") {
          const suffix = hasStyles ? ` + ' ${scopeHash}'` : "";
          if (isSvg) {
            domCode += `  createEffect(() => { ${id}.setAttribute('class', (${expr})${suffix}); });
`;
          } else {
            domCode += `  createEffect(() => { ${id}.className = (${expr})${suffix}; });
`;
          }
        } else {
          domCode += `  createEffect(() => { ${id}.setAttribute('${key}', String(${expr})); });
`;
        }
        continue;
      }
      if (key.startsWith("on:")) {
        const eventName = key.slice(3);
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(eventName)) continue;
        domCode += `  ${id}.addEventListener('${eventName}', ${rewrite(resolveHandler(val))});
`;
      } else if (key.startsWith("on")) {
        const eventName = key.slice(2).toLowerCase();
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(eventName)) continue;
        domCode += `  ${id}.addEventListener('${eventName}', ${rewrite(resolveHandler(val))});
`;
      } else if (key.startsWith("bind:")) {
        const prop = key.slice(5);
        const bound = resolveHandler(val).replace(/^\{|\}$/g, "").trim();
        if (prop === "value") {
          domCode += `  ${id}.addEventListener('input', (e) => { set_${bound}(e.target.value); });
`;
          domCode += `  createEffect(() => { ${id}.value = ${bound}() ?? ''; });
`;
        } else if (prop === "this") {
          if (stateVars.has(bound)) {
            domCode += `  set_${bound}(${id});
`;
          } else {
            domCode += `  ${bound} = ${id};
`;
          }
        }
      } else if (key === "class" || key === "className") {
        if (isSvg) {
          const clsVal = hasStyles ? `${scopeHash} ${val}` : val;
          domCode += `  ${id}.setAttribute('class', ${JSON.stringify(clsVal)});
`;
        } else {
          domCode += `  ${id}.className += ' ' + ${JSON.stringify(val)};
`;
        }
      } else {
        domCode += `  ${id}.setAttribute(${JSON.stringify(key)}, ${JSON.stringify(val)});
`;
      }
    }
    domCode += `  ${parentVar}.appendChild(${id});
`;
    if (node.children && !VOID_ELEMENTS.has(node.name)) {
      for (const child of node.children) {
        emitNode(child, id, locals, childSvg);
      }
    }
  }
  root.children.forEach((child) => emitNode(child, "__target"));
  const CORE_EXPORTS = [...CORE_PROVIDED].join(", ");
  const ESM_CORE_IMPORTS = CORE_EXPORTS + ", bus as __solaBus";
  const IIFE_CORE_PULL = CORE_EXPORTS + ", bus: __solaBus";
  let output = "";
  output += `// Compiled by @sola-air-ui/compiler v${COMPILER_VERSION}
`;
  if (target === "iife") {
    output += `(function() {
`;
    const iifeExtras = coreImportExtras.map((e) => e.local === e.imported ? e.imported : `${e.imported}: ${e.local}`);
    output += `const { ${[IIFE_CORE_PULL, ...iifeExtras].join(", ")} } = window.SolaCore;
`;
    for (const imp of componentImports) {
      output += `// Note: sub-component ${imp.localName} must be pre-loaded before this script
`;
    }
    for (const imp of otherImports) {
      output += `// Note: ${imp.locals.join(", ")} must be loaded before this script (no-bundler output cannot import)
`;
    }
    output += `
`;
    output += `window['${options.exportName || "SolaComponent"}'] = function mount(__target, props = {}) {
`;
  } else {
    output += `import { ${ESM_CORE_IMPORTS} } from '@sola-air-ui/core';
`;
    if (coreImportExtras.length) {
      const names = coreImportExtras.map((e) => e.local === e.imported ? e.imported : `${e.imported} as ${e.local}`);
      output += `import { ${names.join(", ")} } from '@sola-air-ui/core';
`;
    }
    for (const imp of componentImports) {
      output += `import ${imp.localName} from '${imp.path}';
`;
    }
    for (const imp of otherImports) {
      output += `${imp.code}
`;
    }
    output += `
`;
    output += `export default function mount(__target, props = {}) {
`;
  }
  output += `  const __ctx = pushContext();
`;
  output += `  try {

`;
  if (hasStyles) {
    output += `  if (typeof document !== 'undefined') {
`;
    output += `    const __rootNode = __target && __target.getRootNode ? __target.getRootNode() : document;
`;
    output += `    const __styleHost = (typeof ShadowRoot !== 'undefined' && __rootNode instanceof ShadowRoot) ? __rootNode : document.head;
`;
    output += `    const __seen = __styleHost.__solaStyles || (__styleHost.__solaStyles = new Set());
`;
    output += `    if (!__seen.has('${scopeHash}')) {
`;
    output += `      __seen.add('${scopeHash}');
`;
    output += `      const styleEl = document.createElement('style');
`;
    output += `      styleEl.textContent = \`${escapeTemplateLiteral(scopedCss)}\`;
`;
    output += `      __styleHost.appendChild(styleEl);
`;
    output += `    }
`;
    output += `  }

`;
  }
  for (const prop of exportedProps) {
    output += `  let ${prop.name} = props.${prop.name} !== undefined ? props.${prop.name} : ${prop.default};
`;
  }
  output += `
  // User script
`;
  const userScriptGeneratedStart = output.split("\n").length - 1;
  const userScriptLines = jsOutput.split("\n");
  output += userScriptLines.map((l) => "  " + l).join("\n") + "\n\n";
  output += `  // Reactive DOM graph
`;
  output += domCode;
  output += `
  __flush_mounts(__ctx);
`;
  output += `  } finally {
`;
  output += `    popContext(__ctx);
`;
  output += `  }
`;
  output += `
  return () => {
`;
  output += `    __flush_destroys(__ctx);
`;
  output += `    __target.innerHTML = '';
`;
  output += `  };
`;
  output += `};
`;
  if (target === "iife") {
    output += `})();
`;
  } else if (options.exportStyles) {
    output += `
export const scopeHash = ${JSON.stringify(scopeHash)};
`;
    output += `export const css = \`${escapeTemplateLiteral(scopedCss || "")}\`;
`;
  }
  let map = null;
  if (options.sourcemap !== false) {
    const filename = options.filename || "component.sola";
    const segments = userScriptLines.map((_, i) => ({
      generatedLine: userScriptGeneratedStart + i,
      sourceLine: scriptStartLine + i
    }));
    map = buildSourceMap(segments, filename, source, output.split("\n").length);
  }
  return {
    code: output,
    scopeHash,
    css: scopedCss,
    map,
    dts: buildDeclarations(exportedProps, !!options.exportStyles)
  };
}
function inferPropType(defaultSrc) {
  const d = String(defaultSrc ?? "").trim();
  if (/^(['"`])[\s\S]*\1$/.test(d)) return "string";
  if (/^-?\d[\d_]*(\.\d+)?([eE][+-]?\d+)?$/.test(d)) return "number";
  if (d === "true" || d === "false") return "boolean";
  if (d === "null" || d === "undefined") return "any";
  if (d.startsWith("[")) return "unknown[]";
  if (d.startsWith("{")) return "Record<string, unknown>";
  if (/^(\(.*\)|\w+)\s*=>|^function\b/.test(d)) return "(...args: any[]) => any";
  return "unknown";
}
function buildDeclarations(props, exportStyles) {
  const fields = props.map((p) => `  ${/^[A-Za-z_$][\w$]*$/.test(p.name) ? p.name : JSON.stringify(p.name)}?: ${inferPropType(p.default)};`).join("\n");
  return [
    `export interface Props {${fields ? "\n" + fields + "\n" : ""}}`,
    `/** Mounts the component into \`target\` and returns a teardown function. */`,
    `declare function mount(target: Element | ShadowRoot, props?: Props): () => void;`,
    `export default mount;`,
    ...exportStyles ? [`export declare const scopeHash: string;`, `export declare const css: string;`] : [],
    ``
  ].join("\n");
}

// packages/compiler/src/check.js
function maskNonTemplate(source) {
  return source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, " ")).replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}
function position(source, index) {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  return { line, column: index - before.lastIndexOf("\n") };
}
function matchBrace2(text, openPos) {
  let depth = 0;
  let inStr = null;
  for (let i = openPos; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      if (--depth === 0) return i;
    }
  }
  return -1;
}
function checkSource(source, filename = "component.sola") {
  const diagnostics = [];
  const add = (index, severity, code, message) => diagnostics.push({ file: filename, ...position(source, index), severity, code, message });
  try {
    compile(source, { filename, sourcemap: false });
  } catch (err) {
    const m = /\(line (\d+), col (\d+)\)/.exec(err.message);
    diagnostics.push({
      file: filename,
      line: m ? Number(m[1]) : 1,
      column: m ? Number(m[2]) : 1,
      severity: "error",
      code: "SOLA000",
      message: err.message.replace(/^\[sola compiler\]\s*/, "").split("\n").map((s) => s.trim()).filter(Boolean).join(" ")
    });
  }
  const template = maskNonTemplate(source);
  const tag = /\{(#if|#each|\/if|\/each|:else)(?![\w])/g;
  const stack = [];
  let match;
  while (match = tag.exec(template)) {
    const kind = match[1];
    const at = match.index;
    const closeIdx = matchBrace2(template, at);
    if (kind === "#if") {
      stack.push({ kind: "if", at });
      if (closeIdx !== -1) {
        const cond = template.slice(at + 4, closeIdx).trim();
        if (!cond) {
          add(at, "error", "SOLA001", "`{#if}` is missing a condition. It renders as literal text.");
        }
      }
    } else if (kind === "#each") {
      stack.push({ kind: "each", at });
      if (closeIdx !== -1) {
        const head = template.slice(at, closeIdx + 1);
        const parsed = /^\{#each\s+([\s\S]*?)\s+as\s+([\w$]+)(?:\s*,\s*([\w$]+))?(?:\s*\(([\s\S]+)\))?\}$/.exec(head);
        if (!parsed || !parsed[1].trim()) {
          add(at, "error", "SOLA001", "`{#each}` is missing `as <item>` (expected `{#each list as item}`). It renders as literal text.");
        }
      }
    } else if (kind === ":else") {
      if (stack.at(-1)?.kind !== "if") {
        add(at, "error", "SOLA001", "`{:else}` outside an `{#if}` block. It renders as literal text.");
      } else if (closeIdx !== -1) {
        const inner = template.slice(at + 6, closeIdx);
        if (inner.trim() !== "") {
          if (/^\s+if\b/.test(inner)) {
            const cond = inner.replace(/^\s+if\b/, "").trim();
            if (!cond) {
              add(at, "error", "SOLA001", "`{:else if}` is missing a condition. It renders as literal text.");
            }
          } else {
            add(at, "error", "SOLA001", "`{:else}` unexpected token (use `{:else}` or `{:else if <condition>}`). It renders as literal text.");
          }
        }
      }
    } else {
      const want = kind.slice(1);
      const open = stack.pop();
      if (!open) add(at, "error", "SOLA001", `\`{/${want}}\` has no matching \`{#${want}}\`. It renders as literal text.`);
      else if (open.kind !== want) add(at, "error", "SOLA001", `\`{/${want}}\` closes \`{#${open.kind}}\` from line ${position(source, open.at).line}.`);
    }
  }
  for (const open of stack) add(open.at, "error", "SOLA001", `\`{#${open.kind}}\` is never closed. It renders as literal text.`);
  return diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
}
export {
  checkSource,
  compile
};
