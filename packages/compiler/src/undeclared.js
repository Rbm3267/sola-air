// Find names a compiled component reads but never declares.
//
// The compiler turns `{activeId}` into a read of `activeId` without checking
// that the script declares it, so the file compiles and then throws
// "activeId is not defined" the moment it mounts. This walks the compiled
// JavaScript, tracks every scope's declarations, and reports any identifier
// that resolves to no declaration and is not a JavaScript or browser global.

import * as acorn from 'acorn';

// Globals a component may use without declaring them. Anything else can be
// reached through `window.name` or `globalThis.name`.
const GLOBALS = new Set(`
  undefined NaN Infinity globalThis window self document navigator location history screen
  console performance crypto localStorage sessionStorage indexedDB caches
  Object Function Array Number String Boolean Symbol BigInt Math JSON Date RegExp Intl Reflect Proxy
  Error TypeError RangeError SyntaxError ReferenceError EvalError URIError AggregateError
  Map Set WeakMap WeakSet WeakRef FinalizationRegistry Promise
  ArrayBuffer SharedArrayBuffer DataView Atomics
  Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array
  Float32Array Float64Array BigInt64Array BigUint64Array
  parseInt parseFloat isNaN isFinite encodeURI encodeURIComponent decodeURI decodeURIComponent escape unescape
  setTimeout clearTimeout setInterval clearInterval queueMicrotask structuredClone
  requestAnimationFrame cancelAnimationFrame requestIdleCallback cancelIdleCallback
  fetch Request Response Headers FormData URL URLSearchParams AbortController AbortSignal
  Blob File FileReader FileList TextEncoder TextDecoder atob btoa
  WebSocket EventSource BroadcastChannel MessageChannel MessagePort Worker XMLHttpRequest
  Event CustomEvent EventTarget KeyboardEvent MouseEvent PointerEvent TouchEvent FocusEvent InputEvent
  WheelEvent DragEvent ClipboardEvent SubmitEvent ErrorEvent ProgressEvent AnimationEvent TransitionEvent
  Node Element HTMLElement SVGElement HTMLInputElement HTMLTextAreaElement HTMLSelectElement
  HTMLButtonElement HTMLFormElement HTMLCanvasElement HTMLImageElement HTMLVideoElement HTMLAudioElement
  DocumentFragment ShadowRoot Text Comment Range Selection NodeFilter DOMParser XMLSerializer
  CSS CSSStyleSheet getComputedStyle matchMedia getSelection
  MutationObserver ResizeObserver IntersectionObserver PerformanceObserver
  Image Audio Option Path2D ImageData OffscreenCanvas
  Notification alert confirm prompt print open close scrollTo scrollBy
  innerWidth innerHeight outerWidth outerHeight devicePixelRatio scrollX scrollY pageXOffset pageYOffset
  customElements visualViewport origin isSecureContext
  arguments
`.trim().split(/\s+/));

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

class Scope {
  constructor(parent, isFunction) {
    this.parent = parent;
    this.isFunction = isFunction;
    this.names = new Set();
  }
  functionScope() {
    let s = this;
    while (!s.isFunction && s.parent) s = s.parent;
    return s;
  }
  has(name) {
    for (let s = this; s; s = s.parent) if (s.names.has(name)) return true;
    return false;
  }
}

function patternNames(pattern, out = []) {
  if (!pattern) return out;
  switch (pattern.type) {
    case 'Identifier': out.push(pattern.name); break;
    case 'ObjectPattern':
      for (const p of pattern.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
      break;
    case 'ArrayPattern': for (const el of pattern.elements) patternNames(el, out); break;
    case 'RestElement': patternNames(pattern.argument, out); break;
    case 'AssignmentPattern': patternNames(pattern.left, out); break;
  }
  return out;
}

// Child nodes of an ESTree node, in source order.
function children(node) {
  const out = [];
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') out.push(c); }
    else if (v && typeof v.type === 'string') out.push(v);
  }
  return out;
}

// Record a block's own declarations before walking it, since they are hoisted:
// let/const/class/function/import at its top level, and every `var` inside it
// that isn't inside a nested function (those belong to the enclosing function).
function declare(scope, block) {
  for (let stmt of block.body) {
    if ((stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportDefaultDeclaration') && stmt.declaration) stmt = stmt.declaration;
    if (stmt.type === 'VariableDeclaration' && stmt.kind !== 'var') {
      for (const d of stmt.declarations) for (const name of patternNames(d.id)) scope.names.add(name);
    } else if ((stmt.type === 'FunctionDeclaration' || stmt.type === 'ClassDeclaration') && stmt.id) {
      scope.names.add(stmt.id.name);
    } else if (stmt.type === 'ImportDeclaration') {
      for (const sp of stmt.specifiers) scope.names.add(sp.local.name);
    }
  }
  const fnScope = scope.functionScope();
  const hoistVars = (n) => {
    if (!n || typeof n.type !== 'string' || FUNCTION_TYPES.has(n.type)) return;
    if (n.type === 'VariableDeclaration' && n.kind === 'var') {
      for (const d of n.declarations) for (const name of patternNames(d.id)) fnScope.names.add(name);
    }
    for (const c of children(n)) hoistVars(c);
  };
  for (const stmt of block.body) hoistVars(stmt);
}

/** Names `code` (compiled ES module) reads without declaring. Returns [{ name }] in order, each once. */
export function findUndeclared(code) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  const found = new Map();

  const walk = (node, scope, parent, key) => {
    if (!node || typeof node.type !== 'string') return;

    if (node.type === 'Identifier') {
      // Property names, object keys and labels are not variable reads.
      if (parent) {
        if ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed)) return;
        if ((parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && key === 'key' && !parent.computed) return;
        if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') return;
        if (parent.type === 'ExportSpecifier' || parent.type === 'ImportSpecifier' || parent.type === 'ImportDefaultSpecifier' || parent.type === 'ImportNamespaceSpecifier') return;
        if (parent.type === 'MetaProperty') return;
        // `typeof x` is safe for an undeclared x.
        if (parent.type === 'UnaryExpression' && parent.operator === 'typeof') return;
      }
      if (!scope.has(node.name) && !GLOBALS.has(node.name) && !found.has(node.name)) {
        found.set(node.name, { name: node.name });
      }
      return;
    }

    if (FUNCTION_TYPES.has(node.type)) {
      const fnScope = new Scope(scope, true);
      if (node.type === 'FunctionExpression' && node.id) fnScope.names.add(node.id.name);
      for (const p of node.params) for (const name of patternNames(p)) fnScope.names.add(name);
      for (const p of node.params) walkPattern(p, fnScope);
      if (node.body.type === 'BlockStatement') {
        declare(fnScope, node.body);
        for (const s of node.body.body) walk(s, fnScope, node.body, 'body');
      } else {
        walk(node.body, fnScope, node, 'body');
      }
      return;
    }

    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      const classScope = new Scope(scope, false);
      if (node.id) classScope.names.add(node.id.name);
      if (node.superClass) walk(node.superClass, scope, node, 'superClass');
      walk(node.body, classScope, node, 'body');
      return;
    }

    if (node.type === 'BlockStatement' || node.type === 'StaticBlock') {
      const block = new Scope(scope, false);
      declare(block, node);
      for (const s of node.body) walk(s, block, node, 'body');
      return;
    }

    if (node.type === 'ForStatement' || node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
      const loop = new Scope(scope, false);
      const init = node.init || node.left;
      if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') {
        for (const d of init.declarations) for (const name of patternNames(d.id)) loop.names.add(name);
      }
      for (const c of children(node)) walk(c, loop, node, null);
      return;
    }

    if (node.type === 'SwitchStatement') {
      walk(node.discriminant, scope, node, 'discriminant');
      const block = new Scope(scope, false);
      declare(block, { body: node.cases.flatMap((c) => c.consequent) });
      for (const c of node.cases) walk(c, block, node, 'cases');
      return;
    }

    if (node.type === 'CatchClause') {
      const catchScope = new Scope(scope, false);
      for (const name of patternNames(node.param)) catchScope.names.add(name);
      walk(node.body, catchScope, node, 'body');
      return;
    }

    if (node.type === 'VariableDeclarator') {
      walkPattern(node.id, scope);
      walk(node.init, scope, node, 'init');
      return;
    }

    if (node.type === 'ImportDeclaration') return;

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      const v = node[key];
      if (Array.isArray(v)) { for (const c of v) walk(c, scope, node, key); }
      else if (v && typeof v.type === 'string') walk(v, scope, node, key);
    }
  };

  // In a declaration pattern only default values and computed keys are reads.
  const walkPattern = (p, scope) => {
    if (!p) return;
    if (p.type === 'AssignmentPattern') { walkPattern(p.left, scope); walk(p.right, scope, p, 'right'); }
    else if (p.type === 'ObjectPattern') {
      for (const prop of p.properties) {
        if (prop.type === 'RestElement') walkPattern(prop.argument, scope);
        else { if (prop.computed) walk(prop.key, scope, prop, 'key'); walkPattern(prop.value, scope); }
      }
    } else if (p.type === 'ArrayPattern') { for (const el of p.elements) walkPattern(el, scope); }
    else if (p.type === 'RestElement') walkPattern(p.argument, scope);
    else if (p.type === 'MemberExpression') walk(p, scope, null, null);
  };

  const top = new Scope(null, true);
  declare(top, ast);
  for (const s of ast.body) walk(s, top, ast, 'body');
  return [...found.values()];
}
