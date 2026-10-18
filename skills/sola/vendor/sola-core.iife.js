/* @sola-air-ui/core v1.5.2 — IIFE build for no-bundler environments */
var SolaCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/core/src/index.js
  var src_exports = {};
  __export(src_exports, {
    SolaSentinel: () => SolaSentinel,
    __flush_destroys: () => __flush_destroys,
    __flush_mounts: () => __flush_mounts,
    __untrack: () => __untrack,
    bus: () => bus,
    clearPersistentState: () => clearPersistentState,
    configureBus: () => configureBus,
    configureData: () => configureData,
    configureIntent: () => configureIntent,
    createBus: () => createBus,
    createData: () => createData,
    createDerived: () => createDerived,
    createEffect: () => createEffect,
    createIntent: () => createIntent,
    createPersistentSignal: () => createPersistentSignal,
    createSentinel: () => createSentinel,
    createSignal: () => createSignal,
    createTopicSignal: () => createTopicSignal,
    flushSync: () => flushSync,
    mountShell: () => mountShell,
    onDestroy: () => onDestroy,
    onMount: () => onMount,
    popContext: () => popContext,
    pushContext: () => pushContext,
    signalMesh: () => signalMesh
  });

  // packages/core/src/signal.js
  var effectStack = [];
  var pendingEffects = /* @__PURE__ */ new Set();
  var isFlushing = false;
  function flushSync() {
    try {
      while (pendingEffects.size > 0) {
        const effects = [...pendingEffects];
        pendingEffects.clear();
        for (const effect of effects) {
          effect.execute();
        }
      }
    } finally {
      isFlushing = false;
    }
  }
  function scheduleFlush() {
    if (!isFlushing) {
      isFlushing = true;
      queueMicrotask(flushSync);
    }
  }
  function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = /* @__PURE__ */ new Set();
    const read = () => {
      const currentEffect = effectStack[effectStack.length - 1];
      if (currentEffect) {
        subscribers.add(currentEffect);
        currentEffect.dependencies.add(subscribers);
      }
      return value;
    };
    const write = (newValue) => {
      const next = typeof newValue === "function" ? newValue(value) : newValue;
      if (value !== next) {
        value = next;
        for (const sub of [...subscribers]) {
          pendingEffects.add(sub);
        }
        scheduleFlush();
      }
    };
    return [read, write];
  }
  function createEffect(fn) {
    let disposed = false;
    const effect = {
      execute() {
        if (disposed) return;
        cleanup();
        effectStack.push(effect);
        try {
          fn();
        } finally {
          effectStack.pop();
        }
      },
      dependencies: /* @__PURE__ */ new Set(),
      cleanup
    };
    function cleanup() {
      for (const dep of effect.dependencies) {
        dep.delete(effect);
      }
      effect.dependencies.clear();
    }
    function dispose() {
      disposed = true;
      pendingEffects.delete(effect);
      cleanup();
    }
    if (activeContext) activeContext.destroys.push(dispose);
    effectStack.push(effect);
    try {
      fn();
    } finally {
      effectStack.pop();
    }
    return dispose;
  }
  function __untrack(fn) {
    effectStack.push(null);
    try {
      return fn();
    } finally {
      effectStack.pop();
    }
  }
  function createDerived(fn) {
    let cachedValue;
    let dirty = true;
    const subscribers = /* @__PURE__ */ new Set();
    let innerDependencies = /* @__PURE__ */ new Set();
    const markDirty = {
      execute() {
        if (!dirty) {
          dirty = true;
          for (const sub of [...subscribers]) {
            pendingEffects.add(sub);
          }
          scheduleFlush();
        }
      },
      dependencies: innerDependencies,
      cleanup() {
        for (const dep of innerDependencies) {
          dep.delete(markDirty);
        }
        innerDependencies.clear();
      }
    };
    const read = () => {
      const currentEffect = effectStack[effectStack.length - 1];
      if (currentEffect) {
        subscribers.add(currentEffect);
        currentEffect.dependencies.add(subscribers);
      }
      if (dirty) {
        markDirty.cleanup();
        innerDependencies = /* @__PURE__ */ new Set();
        markDirty.dependencies = innerDependencies;
        effectStack.push(markDirty);
        try {
          cachedValue = fn();
        } finally {
          effectStack.pop();
        }
        dirty = false;
      }
      return cachedValue;
    };
    return read;
  }
  var contextStack = [];
  var activeContext = null;
  function pushContext() {
    const ctx = { mounts: [], destroys: [] };
    contextStack.push(ctx);
    activeContext = ctx;
    return ctx;
  }
  function popContext(ctx) {
    const idx = contextStack.lastIndexOf(ctx);
    if (idx !== -1) {
      contextStack.splice(idx, 1);
    }
    activeContext = contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
  }
  function onMount(fn) {
    if (activeContext) {
      activeContext.mounts.push(fn);
    } else {
      fn();
    }
  }
  function onDestroy(fn) {
    if (activeContext) {
      activeContext.destroys.push(fn);
    }
  }
  function __flush_mounts(ctx = activeContext) {
    if (ctx && ctx.mounts.length > 0) {
      const cbs = [...ctx.mounts];
      ctx.mounts = [];
      for (const cb of cbs) {
        cb();
      }
    }
  }
  function __flush_destroys(ctx = activeContext) {
    if (ctx && ctx.destroys.length > 0) {
      const cbs = [...ctx.destroys];
      ctx.destroys = [];
      for (const cb of cbs) {
        cb();
      }
    }
  }

  // packages/sentinel/src/sentinel.js
  var FIELD_BUFFER_MAX_EVENTS = 50;
  var FIELD_BUFFER_WINDOW_MS = 6e4;
  var FIELD_TEXT_PREVIEW_MAX_CHARS = 200;
  function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }
  var SolaSentinel = class {
    constructor(name = "default", options = {}) {
      this.name = name;
      this.thresholdMs = options.thresholdMs || 600;
      this.maxRageClicks = options.maxRageClicks || 3;
      this.clickHistory = [];
      this.subscribers = /* @__PURE__ */ new Set();
      this.frictionEvents = [];
      this.flowIndex = 99.8;
      this.fieldHistory = [];
      this.lastActivityAt = 0;
      this.lastSuggestedAt = -Infinity;
      this.idleThresholdMs = options.idleThresholdMs ?? 1500;
      this.minSuggestIntervalMs = options.minSuggestIntervalMs ?? 8e3;
      this.minEventsForSuggestion = options.minEventsForSuggestion ?? 2;
    }
    recordClick(actionId, target = "button") {
      const ts = now();
      this.clickHistory.push({ actionId, target, timestamp: ts });
      this.clickHistory = this.clickHistory.filter((c) => ts - c.timestamp < 2e3);
      const recent = this.clickHistory.filter((c) => c.actionId === actionId && ts - c.timestamp < this.thresholdMs);
      if (recent.length >= this.maxRageClicks) {
        this.triggerFrictionAlert({
          type: "RAGE_CLICK",
          actionId,
          target,
          count: recent.length,
          timestamp: ts,
          severity: "HIGH",
          message: `Rage-click burst: ${recent.length} taps in ${Math.round(ts - recent[0].timestamp)}ms`
        });
      }
    }
    recordSignalDrop(topic, error) {
      this.triggerFrictionAlert({
        type: "SIGNAL_TIMEOUT",
        topic,
        error: error?.message || String(error),
        timestamp: now(),
        severity: "CRITICAL",
        message: `Signal channel "${topic}" breached SLA timeout (504 Gateway Stall)`
      });
    }
    triggerFrictionAlert(event) {
      this.frictionEvents.unshift(event);
      if (this.frictionEvents.length > 50) this.frictionEvents.pop();
      this._recomputeFlowIndex(event.timestamp);
      this.subscribers.forEach((cb) => {
        try {
          cb(event, this);
        } catch (e) {
          console.error(e);
        }
      });
    }
    onFriction(cb) {
      this.subscribers.add(cb);
      return () => this.subscribers.delete(cb);
    }
    // ─── Flow index ───
    // A real computed score, not a fixed decrement: severity- and recency-weighted
    // friction events, the share of field visits that were backtracks, plus how
    // erratic the pacing between field events is (a proxy for hesitation).
    _recomputeFlowIndex(ts = now()) {
      let score = 99.8;
      const recentFriction = this.frictionEvents.filter((e) => ts - e.timestamp < 12e4);
      score -= recentFriction.reduce((sum, e) => {
        const severityWeight = e.severity === "CRITICAL" ? 6 : e.severity === "HIGH" ? 3.8 : 2;
        const recencyWeight = Math.max(0.3, 1 - (ts - e.timestamp) / 12e4);
        return sum + severityWeight * recencyWeight;
      }, 0);
      const focusEvents = this.fieldHistory.filter((e) => e.type === "focus");
      if (focusEvents.length > 0) {
        const revisitRatio = focusEvents.filter((e) => e.revisit).length / focusEvents.length;
        score -= revisitRatio * 15;
      }
      if (this.fieldHistory.length >= 3) {
        const gaps = [];
        for (let i = 1; i < this.fieldHistory.length; i++) {
          gaps.push(this.fieldHistory[i].timestamp - this.fieldHistory[i - 1].timestamp);
        }
        const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const variance = gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length;
        score -= Math.min(10, Math.sqrt(variance) / 500);
      }
      this.flowIndex = Math.max(0, Math.min(99.8, Number(score.toFixed(1))));
      return this.flowIndex;
    }
    // ─── Ambient field observation ───
    _pushFieldEvent(event) {
      this.fieldHistory.push(event);
      this.fieldHistory = this.fieldHistory.filter((e) => event.timestamp - e.timestamp < FIELD_BUFFER_WINDOW_MS).slice(-FIELD_BUFFER_MAX_EVENTS);
      this.lastActivityAt = event.timestamp;
      this._recomputeFlowIndex(event.timestamp);
    }
    recordFieldFocus(fieldId, ts = now()) {
      const revisit = this.fieldHistory.some((e) => e.type === "blur" && e.fieldId === fieldId);
      this._pushFieldEvent({ type: "focus", fieldId, revisit, timestamp: ts });
      return revisit;
    }
    // Typing is the signal the ambient-intent story is actually about — noticing
    // hesitation mid-thought, not after the user has moved on. Until this existed
    // the observer only saw focus and blur, so "type, then stop for a moment"
    // could never fire: typing produced no events at all.
    recordFieldInput(fieldId, value, ts = now()) {
      const text = String(value ?? "");
      const preview = text.length > FIELD_TEXT_PREVIEW_MAX_CHARS ? text.slice(-FIELD_TEXT_PREVIEW_MAX_CHARS) : text;
      const last = this.fieldHistory[this.fieldHistory.length - 1];
      if (last && last.type === "input" && last.fieldId === fieldId) {
        last.valuePreview = preview;
        last.valueLength = text.length;
        last.timestamp = ts;
        this.lastActivityAt = ts;
        this._recomputeFlowIndex(ts);
        return;
      }
      this._pushFieldEvent({ type: "input", fieldId, valuePreview: preview, valueLength: text.length, timestamp: ts });
    }
    recordFieldBlur(fieldId, value, ts = now()) {
      const text = String(value ?? "");
      const preview = text.length > FIELD_TEXT_PREVIEW_MAX_CHARS ? text.slice(-FIELD_TEXT_PREVIEW_MAX_CHARS) : text;
      this._pushFieldEvent({ type: "blur", fieldId, valuePreview: preview, valueLength: text.length, timestamp: ts });
    }
    // ─── Significance gate ───
    // Fires at most once per `minSuggestIntervalMs`, only after `idleThresholdMs`
    // of inactivity following new activity — never on every keystroke.
    checkSignificance(ts = now()) {
      if (this.fieldHistory.length < this.minEventsForSuggestion) return false;
      if (this.lastActivityAt <= this.lastSuggestedAt) return false;
      if (ts - this.lastActivityAt < this.idleThresholdMs) return false;
      if (ts - this.lastSuggestedAt < this.minSuggestIntervalMs) return false;
      this.lastSuggestedAt = ts;
      return true;
    }
    // ─── Prompt builder ───
    // Compact natural-language description of recent field activity, oldest first.
    buildPrompt() {
      if (this.fieldHistory.length === 0) return null;
      const lines = this.fieldHistory.map((e) => {
        if (e.type === "focus") {
          return e.revisit ? `User returned to field "${e.fieldId}".` : `User focused field "${e.fieldId}".`;
        }
        if (e.type === "input") {
          return e.valueLength === 0 ? `User cleared field "${e.fieldId}".` : `User is typing in "${e.fieldId}": "${e.valuePreview}"`;
        }
        if (e.valueLength === 0) return `User left field "${e.fieldId}" empty.`;
        return `Field "${e.fieldId}" now contains: "${e.valuePreview}"`;
      });
      return [
        "You are an ambient UX assistant embedded in a form.",
        "Recent user activity, oldest first:",
        ...lines,
        "",
        "Based only on this activity, suggest exactly one concise, specific next-step action the user might want.",
        'Respond as compact JSON only: {"label": string (<=60 chars), "action": string (<=140 chars), "confidence": number 0-1}.',
        'If nothing useful can be suggested, respond {"label": null}.'
      ].join("\n");
    }
  };
  function createSentinel(name, options) {
    return new SolaSentinel(name, options);
  }

  // packages/core/src/persist.js
  var KEY_PREFIX = "sola:";
  var DEFAULT_CHANNEL = "sola-bus";
  function webStorage(kind) {
    try {
      const s = typeof window !== "undefined" ? window[kind] : void 0;
      if (!s) return null;
      const probe = "__sola_probe__";
      s.setItem(probe, "1");
      s.removeItem(probe);
      return s;
    } catch {
      return null;
    }
  }
  function memoryStorage() {
    const m = /* @__PURE__ */ new Map();
    return {
      getItem: (k) => m.has(k) ? m.get(k) : null,
      setItem: (k, v) => {
        m.set(k, String(v));
      },
      removeItem: (k) => {
        m.delete(k);
      }
    };
  }
  function resolveStorage(option) {
    if (option && typeof option === "object") return option;
    if (option === "memory") return memoryStorage();
    const kind = option === "local" ? "localStorage" : "sessionStorage";
    return webStorage(kind) || memoryStorage();
  }
  var buses = /* @__PURE__ */ new Map();
  function getBus(name) {
    let bus2 = buses.get(name);
    if (bus2) return bus2;
    const handlers = /* @__PURE__ */ new Map();
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(name) : null;
    if (channel) {
      channel.onmessage = (e) => {
        const msg = e.data;
        if (msg && msg.clearAll) {
          for (const set2 of handlers.values()) {
            for (const h of [...set2]) h({ cleared: true, origin: msg.origin });
          }
          return;
        }
        if (!msg || typeof msg.key !== "string") return;
        const set = handlers.get(msg.key);
        if (set) for (const h of [...set]) h(msg);
      };
    }
    bus2 = { name, handlers, channel, refs: 0 };
    buses.set(name, bus2);
    return bus2;
  }
  function releaseBus(bus2) {
    if (--bus2.refs > 0) return;
    bus2.channel?.close();
    buses.delete(bus2.name);
  }
  function createPersistentSignal(key, initialValue, options = {}) {
    if (typeof key !== "string" || !key) {
      throw new TypeError("createPersistentSignal: key must be a non-empty string");
    }
    const {
      storage: storageOption = "session",
      sync = true,
      channel: channelName = DEFAULT_CHANNEL,
      version = 1,
      validate,
      ttlMs
    } = options;
    const storageKey = KEY_PREFIX + key;
    const store = resolveStorage(storageOption);
    const accept = (v) => {
      if (!validate) return true;
      try {
        return !!validate(v);
      } catch {
        return false;
      }
    };
    const originId = Math.random().toString(36).slice(2);
    function readStored() {
      try {
        const raw = store.getItem(storageKey);
        if (raw == null) return { found: false };
        const env = JSON.parse(raw);
        if (!env || env.v !== version) return { found: false };
        if (ttlMs != null && Date.now() - env.t > ttlMs) return { found: false };
        if (!accept(env.d)) return { found: false };
        return { found: true, value: env.d };
      } catch {
        return { found: false };
      }
    }
    function writeStored(value) {
      try {
        store.setItem(storageKey, JSON.stringify({ v: version, t: Date.now(), d: value }));
      } catch {
      }
    }
    const hydrated = readStored();
    const [read, rawWrite] = createSignal(hydrated.found ? hydrated.value : initialValue);
    let bus2 = null;
    let disposed = false;
    const onMessage = (msg) => {
      if (msg.origin === originId) return;
      if (msg.cleared) {
        rawWrite(() => initialValue);
        return;
      }
      if (msg.v !== version || !accept(msg.d)) return;
      rawWrite(() => msg.d);
    };
    const onStorageEvent = (e) => {
      if (e.key !== storageKey || e.storageArea !== store) return;
      const next = readStored();
      rawWrite(() => next.found ? next.value : initialValue);
    };
    if (sync) {
      bus2 = getBus(channelName);
      bus2.refs++;
      if (!bus2.handlers.has(storageKey)) bus2.handlers.set(storageKey, /* @__PURE__ */ new Set());
      bus2.handlers.get(storageKey).add(onMessage);
      if (!bus2.channel && typeof window !== "undefined" && storageOption === "local") {
        window.addEventListener("storage", onStorageEvent);
      }
    }
    const write = (next) => {
      if (disposed) return;
      const value = typeof next === "function" ? next(read()) : next;
      if (value === read()) return;
      rawWrite(() => value);
      writeStored(value);
      if (bus2?.channel) {
        try {
          bus2.channel.postMessage({ key: storageKey, v: version, d: value, origin: originId });
        } catch {
        }
      }
    };
    const offClear = onClearPersistentState(() => {
      try {
        store.removeItem(storageKey);
      } catch {
      }
      rawWrite(() => initialValue);
    });
    const clear = () => {
      try {
        store.removeItem(storageKey);
      } catch {
      }
      rawWrite(() => initialValue);
      bus2?.channel?.postMessage({ key: storageKey, cleared: true, origin: originId });
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      offClear();
      if (bus2) {
        bus2.handlers.get(storageKey)?.delete(onMessage);
        if (!bus2.handlers.get(storageKey)?.size) bus2.handlers.delete(storageKey);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorageEvent);
        releaseBus(bus2);
      }
    };
    return [read, write, { clear, dispose }];
  }
  var clearHooks = /* @__PURE__ */ new Set();
  function onClearPersistentState(fn) {
    clearHooks.add(fn);
    return () => clearHooks.delete(fn);
  }
  function clearPersistentState(options = {}) {
    const { storage = ["session", "local"], channel: channelName = DEFAULT_CHANNEL } = options;
    const kinds = Array.isArray(storage) ? storage : [storage];
    for (const kind of kinds) {
      const s = webStorage(kind === "local" ? "localStorage" : "sessionStorage");
      if (!s) continue;
      try {
        const doomed = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k && k.startsWith(KEY_PREFIX)) doomed.push(k);
        }
        doomed.forEach((k) => s.removeItem(k));
      } catch {
      }
    }
    for (const hook of [...clearHooks]) {
      try {
        hook();
      } catch (e) {
        console.error(e);
      }
    }
    const local = buses.get(channelName);
    if (local) {
      for (const set of local.handlers.values()) {
        for (const h of [...set]) h({ cleared: true, origin: "clear-all" });
      }
    }
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(channelName);
      ch.postMessage({ clearAll: true, origin: "clear-all" });
      ch.close();
    }
  }

  // packages/core/src/shell.js
  function mountShell(component, props = {}, options = {}) {
    if (typeof document === "undefined") {
      throw new Error("mountShell requires a DOM");
    }
    const {
      id = "sola-shell",
      shadow = "closed",
      parent = document.body,
      css,
      hostStyle
    } = options;
    const registry = mountShell._shells || (mountShell._shells = /* @__PURE__ */ new Map());
    const existing = registry.get(id);
    if (existing && existing.host.isConnected) return existing.api;
    const host = document.createElement("div");
    host.id = id;
    host.setAttribute("data-sola-shell", "");
    if (hostStyle) Object.assign(host.style, hostStyle);
    parent.appendChild(host);
    const root = shadow ? host.attachShadow({ mode: shadow }) : host;
    if (css) {
      const style = document.createElement("style");
      style.textContent = css;
      root.appendChild(style);
    }
    const container = document.createElement("div");
    container.setAttribute("data-sola-root", "");
    root.appendChild(container);
    const unmount = component(container, props);
    const api = {
      host,
      root,
      teardown() {
        try {
          unmount?.();
        } finally {
          host.remove();
          registry.delete(id);
        }
      }
    };
    registry.set(id, { host, api });
    return api;
  }

  // packages/core/src/bus.js
  var STICKY_PREFIX = "sola:bus:sticky:";
  var DEFAULT_CHANNEL2 = "sola-bus";
  var ownDomEvents = /* @__PURE__ */ new WeakSet();
  var own = (obj, key) => obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : void 0;
  var MAX_WARNED_TYPES = 50;
  function sessionStorageOrNull() {
    try {
      const s = typeof window !== "undefined" ? window.sessionStorage : void 0;
      if (!s) return null;
      s.setItem("__sola_probe__", "1");
      s.removeItem("__sola_probe__");
      return s;
    } catch {
      return null;
    }
  }
  function memoryStorage2() {
    const m = /* @__PURE__ */ new Map();
    return {
      getItem: (k) => m.has(k) ? m.get(k) : null,
      setItem: (k, v) => {
        m.set(k, String(v));
      },
      removeItem: (k) => {
        m.delete(k);
      }
    };
  }
  function createBus(options = {}) {
    const {
      channel: channelName = DEFAULT_CHANNEL2,
      broadcast = [],
      dom,
      sticky = {},
      validate = {},
      guard,
      onReject,
      storage: storageOption,
      now: now2 = () => Date.now()
    } = options;
    const domIn = dom?.in ?? [];
    const domOut = dom?.out ?? [];
    const guardMap = guard && typeof guard === "object" ? guard : null;
    const guardFn = typeof guard === "function" ? guard : null;
    const covered = (type) => typeof own(validate, type) === "function" || typeof own(guardMap, type) === "function";
    for (const type of /* @__PURE__ */ new Set([...domIn, ...broadcast])) {
      if (!covered(type)) {
        throw new Error(
          `createBus: "${type}" crosses a boundary (dom.in or broadcast) but has no validator. Add validate["${type}"], or a per-type guard. To accept it unchecked on purpose, write validate["${type}"] = () => true so the decision is visible.`
        );
      }
    }
    for (const type of domIn) {
      if (domOut.includes(type)) {
        throw new Error(`createBus: "${type}" is in both dom.in and dom.out; a type may only cross the DOM in one direction.`);
      }
    }
    for (const [type, cfg] of Object.entries(sticky)) {
      if (!(cfg && Number.isFinite(cfg.ttlMs) && cfg.ttlMs > 0)) {
        throw new Error(`createBus: sticky["${type}"] needs a positive ttlMs.`);
      }
      if (cfg.store !== "memory" && cfg.store !== "session") {
        throw new Error(`createBus: sticky["${type}"].store must be 'memory' or 'session'.`);
      }
      if (cfg.store === "session" && typeof cfg.consume !== "boolean") {
        throw new Error(
          `createBus: sticky["${type}"] uses the session store, so consume must be set to true or false. true = one-shot handoff (a reload does not repeat it); false = shared context that stays available.`
        );
      }
    }
    const store = storageOption || sessionStorageOrNull() || memoryStorage2();
    const originId = Math.random().toString(36).slice(2);
    let seq = 0;
    let disposed = false;
    const handlers = /* @__PURE__ */ new Map();
    const stickyMem = /* @__PURE__ */ new Map();
    const cleanups = [];
    const warned = /* @__PURE__ */ new Set();
    function reject(type, reason, from, direction) {
      const info = { type, reason, from, direction };
      if (typeof onReject === "function") {
        try {
          onReject(info);
        } catch (e) {
          console.error(e);
        }
        return;
      }
      if (!warned.has(type) && warned.size < MAX_WARNED_TYPES) {
        warned.add(type);
        console.warn(`[sola bus] rejected "${String(type).slice(0, 64)}" (${reason}, from ${from}, ${direction})`);
      }
    }
    function check(type, payload, from, direction) {
      const v = own(validate, type);
      if (typeof v === "function") {
        let ok = false;
        try {
          ok = !!v(payload);
        } catch {
          ok = false;
        }
        if (!ok) {
          reject(type, "invalid", from, direction);
          return false;
        }
      }
      const perType = own(guardMap, type);
      for (const g of [guardFn, perType]) {
        if (typeof g !== "function") continue;
        let ok = false;
        try {
          ok = !!g({ type, payload, from, direction });
        } catch {
          ok = false;
        }
        if (!ok) {
          reject(type, "guard", from, direction);
          return false;
        }
      }
      return true;
    }
    const stickyKey = (type) => STICKY_PREFIX + type;
    function writeSticky(type, payload, from) {
      const cfg = own(sticky, type);
      if (!cfg) return;
      const t = now2();
      stickyMem.set(type, { payload, t, from, hydrated: false });
      if (cfg.store === "session") {
        try {
          store.setItem(stickyKey(type), JSON.stringify({ v: 1, t, d: payload }));
        } catch {
        }
      }
    }
    for (const [type, cfg] of Object.entries(sticky)) {
      if (cfg.store !== "session") continue;
      try {
        const raw = store.getItem(stickyKey(type));
        if (raw == null) continue;
        const env = JSON.parse(raw);
        if (!env || env.v !== 1 || now2() - env.t > cfg.ttlMs) {
          store.removeItem(stickyKey(type));
          continue;
        }
        if (check(type, env.d, "local", "in")) {
          stickyMem.set(type, { payload: env.d, t: env.t, from: "local", hydrated: true });
        } else {
          store.removeItem(stickyKey(type));
        }
      } catch {
      }
    }
    function liveSticky(type) {
      const cfg = own(sticky, type);
      const entry = stickyMem.get(type);
      if (!cfg || !entry) return null;
      if (now2() - entry.t > cfg.ttlMs) {
        stickyMem.delete(type);
        return null;
      }
      return entry;
    }
    function deliver(type, payload, from, replayed = false) {
      const set = handlers.get(type);
      if (!set || set.size === 0) return;
      const meta = { type, from, id: `${originId}:${++seq}`, time: now2(), replayed };
      for (const h of [...set]) {
        try {
          h(payload, meta);
        } catch (e) {
          console.error(e);
        }
      }
    }
    function accept(type, payload, from) {
      writeSticky(type, payload, from);
      deliver(type, payload, from);
    }
    let channel = null;
    if (broadcast.length || Object.keys(sticky).length) {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(channelName);
        channel.onmessage = (e) => {
          const msg = e.data;
          if (!msg) return;
          if (msg.clearAll) {
            clearSticky();
            return;
          }
          if (msg.bus !== 1 || msg.origin === originId || typeof msg.type !== "string") return;
          if (!broadcast.includes(msg.type)) {
            reject(msg.type, "unlisted", "remote", "in");
            return;
          }
          if (!check(msg.type, msg.payload, "remote", "in")) return;
          accept(msg.type, msg.payload, "remote");
        };
        cleanups.push(() => channel.close());
      } else if (broadcast.length) {
        console.warn("[sola bus] BroadcastChannel is unavailable; broadcast types stay in this page.");
      }
    }
    const domTarget = dom ? dom.target ?? (typeof window !== "undefined" ? window : void 0) : void 0;
    if (dom && !domTarget) throw new Error("createBus: dom needs a target (no window in this environment).");
    for (const type of domIn) {
      const listener = (e) => {
        if (ownDomEvents.has(e)) return;
        if (!check(type, e.detail, "dom", "in")) return;
        accept(type, e.detail, "dom");
      };
      domTarget.addEventListener(type, listener);
      cleanups.push(() => domTarget.removeEventListener(type, listener));
    }
    function clearSticky() {
      stickyMem.clear();
      for (const type of Object.keys(sticky)) {
        try {
          store.removeItem(stickyKey(type));
        } catch {
        }
      }
    }
    cleanups.push(onClearPersistentState(clearSticky));
    function emit(type, payload) {
      if (disposed) return false;
      if (!check(type, payload, "local", "out")) return false;
      accept(type, payload, "local");
      if (broadcast.includes(type) && channel) {
        try {
          channel.postMessage({ bus: 1, type, payload, origin: originId });
        } catch {
          reject(type, "invalid", "local", "out");
        }
      }
      if (domOut.includes(type)) {
        const ev = typeof CustomEvent === "function" ? new CustomEvent(type, { detail: payload }) : Object.assign(new Event(type), { detail: payload });
        ownDomEvents.add(ev);
        domTarget.dispatchEvent(ev);
      }
      return true;
    }
    function on(type, handler) {
      if (typeof handler !== "function") throw new TypeError("bus.on: handler must be a function");
      if (!handlers.has(type)) handlers.set(type, /* @__PURE__ */ new Set());
      handlers.get(type).add(handler);
      const entry = liveSticky(type);
      if (entry) {
        const meta = { type, from: entry.from, id: `${originId}:${++seq}`, time: now2(), replayed: true };
        try {
          handler(entry.payload, meta);
        } catch (e) {
          console.error(e);
        }
        if (entry.hydrated && own(sticky, type)?.consume) {
          try {
            store.removeItem(stickyKey(type));
          } catch {
          }
          entry.hydrated = false;
        }
      }
      return () => {
        handlers.get(type)?.delete(handler);
      };
    }
    function signal(type) {
      const [wrapped, setWrapped] = createSignal(void 0);
      const off = on(type, (payload) => setWrapped({ payload }));
      const read = () => wrapped()?.payload;
      read.dispose = off;
      return read;
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      while (cleanups.length) {
        try {
          cleanups.pop()();
        } catch {
        }
      }
      handlers.clear();
    }
    return { emit, on, signal, dispose, _handlerCount: () => [...handlers.values()].reduce((n, s) => n + s.size, 0) };
  }
  var current = null;
  var ensure = () => current || (current = createBus());
  var bus = {
    emit: (type, payload) => ensure().emit(type, payload),
    on: (type, handler) => ensure().on(type, handler),
    signal: (type) => ensure().signal(type),
    dispose: () => {
      current?.dispose();
      current = null;
    }
  };
  function configureBus(options) {
    if (current && current._handlerCount() > 0) {
      throw new Error("configureBus must run before any component subscribes to the bus.");
    }
    current?.dispose();
    current = createBus(options);
    return bus;
  }

  // packages/core/src/index.js
  var defaultIntentConfig = {
    provider: "local",
    endpoint: "/api/intent",
    model: "gemini-2.5-flash",
    stream: false
  };
  var globalIntentConfig = { ...defaultIntentConfig };
  function configureIntent(config) {
    globalIntentConfig = { ...globalIntentConfig, ...config };
  }
  async function _consumeSSE(response, onToken, onDone, onError) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            const token = parsed.token ?? parsed.delta ?? parsed.content ?? "";
            if (token) onToken(token);
          } catch {
            if (payload) onToken(payload);
          }
        }
      }
      onDone();
    } catch (err) {
      if (err.name !== "AbortError") onError(err);
    }
  }
  function createIntent(promptFn, options = {}) {
    const config = { ...globalIntentConfig, ...options };
    const [read, write] = createSignal(options.initial ?? null);
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal(null);
    let abortController = null;
    let timer = null;
    const send = config.transport || ((url, init) => fetch(url, init));
    function cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      if (abortController) abortController.abort();
    }
    onDestroy(cancel);
    function request(prompt) {
      if (!prompt) return;
      if (abortController) abortController.abort();
      const ctrl = new AbortController();
      abortController = ctrl;
      write(null);
      setError(null);
      setLoading(true);
      const body = JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: config.model,
        provider: config.provider,
        stream: config.stream
      });
      Promise.resolve(send(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: ctrl.signal
      })).then((res) => {
        if (ctrl.signal.aborted) return;
        if (!res.ok) throw new Error(`Intent failed: ${res.status}`);
        if (config.stream) {
          let accumulated = "";
          return _consumeSSE(
            res,
            (token) => {
              if (ctrl.signal.aborted) return;
              accumulated += token;
              write(accumulated);
            },
            () => {
              if (!ctrl.signal.aborted) setLoading(false);
            },
            (err) => {
              if (!ctrl.signal.aborted) {
                setError(err.message);
                setLoading(false);
              }
            }
          );
        }
        return res.json().then((data) => {
          if (ctrl.signal.aborted) return;
          if (data?.components?.length > 0) write(data.components[0]);
          else if (data?.result != null) write(data.result);
          else write(data);
          setLoading(false);
        });
      }).catch((err) => {
        if (ctrl.signal.aborted) return;
        if (err.name !== "AbortError") {
          console.error("[Sola Intent Error]", err);
          setError(err.message);
          setLoading(false);
        }
      });
    }
    const resolve = () => typeof promptFn === "function" ? promptFn() : promptFn;
    if (config.trigger !== "manual") {
      createEffect(() => {
        const prompt = resolve();
        if (timer) clearTimeout(timer);
        timer = null;
        const wait = Number(config.debounceMs) || 0;
        if (wait > 0 && prompt) {
          timer = setTimeout(() => {
            timer = null;
            request(prompt);
          }, wait);
        } else {
          request(prompt);
        }
      });
    }
    const accessor = read;
    accessor.loading = loading;
    accessor.error = error;
    accessor.run = (input) => {
      if (timer) clearTimeout(timer);
      timer = null;
      request(input !== void 0 ? input : __untrack(resolve));
    };
    return accessor;
  }
  var defaultDataConfig = {
    relayEndpoint: "http://localhost:4040/api/query",
    refresh: null
    // e.g. '30s', '1m', '5m'
  };
  var globalDataConfig = { ...defaultDataConfig };
  function configureData(config) {
    globalDataConfig = { ...globalDataConfig, ...config };
  }
  function parseInterval(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)(s|m|h)$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    switch (match[2]) {
      case "s":
        return val * 1e3;
      case "m":
        return val * 60 * 1e3;
      case "h":
        return val * 3600 * 1e3;
    }
    return null;
  }
  function createData(source, options = {}) {
    const config = { ...globalDataConfig, ...options };
    const [read, write] = createSignal({ loading: true, data: null, error: null });
    let abortController = null;
    let refreshTimer = null;
    function fetchData() {
      if (abortController) abortController.abort();
      const ctrl = new AbortController();
      abortController = ctrl;
      write({ loading: true, data: read().data, error: null });
      fetch(config.relayEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          query: config.query || null,
          filters: config.filters || null,
          sort: config.sort || null,
          limit: config.limit || null,
          offset: config.offset || null
        }),
        signal: ctrl.signal
      }).then((res) => {
        if (ctrl.signal.aborted) return;
        if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`);
        return res.json();
      }).then((data) => {
        if (ctrl.signal.aborted) return;
        write({ loading: false, data: data.rows || data, error: null });
      }).catch((err) => {
        if (ctrl.signal.aborted) return;
        if (err.name !== "AbortError") {
          console.error("[Sola Data Error]", err);
          write({ loading: false, data: null, error: err.message });
        }
      });
    }
    fetchData();
    const interval = parseInterval(config.refresh);
    if (interval) {
      refreshTimer = setInterval(fetchData, interval);
    }
    const accessor = () => read();
    accessor.refetch = fetchData;
    accessor.stop = () => {
      if (refreshTimer) clearInterval(refreshTimer);
      if (abortController) abortController.abort();
    };
    onDestroy(accessor.stop);
    return accessor;
  }
  var SignalMeshEngine = class {
    constructor() {
      this.topics = /* @__PURE__ */ new Map();
      this.telemetrySubscribers = /* @__PURE__ */ new Set();
      this.cycleStack = /* @__PURE__ */ new Set();
    }
    topic(name, initialValue) {
      if (!this.topics.has(name)) {
        const [read2, write2] = createSignal(initialValue);
        this.topics.set(name, { read: read2, write: write2, value: initialValue, subscribers: /* @__PURE__ */ new Set() });
      }
      const entry = this.topics.get(name);
      const read = () => entry.read();
      const write = (next, originId = "signal") => {
        const nextVal = typeof next === "function" ? next(entry.value) : next;
        if (entry.value === nextVal) return;
        if (this.cycleStack.has(name)) {
          console.warn(`[Sola Signal Mesh] Cycle detected on topic "${name}". Aborting cyclic dispatch.`);
          return;
        }
        const prev = entry.value;
        entry.value = nextVal;
        entry.write(nextVal);
        const event = {
          topic: name,
          value: nextVal,
          prevValue: prev,
          timestamp: typeof performance !== "undefined" ? performance.now() : Date.now(),
          originWidgetId: originId
        };
        this.telemetrySubscribers.forEach((cb) => {
          try {
            cb(event);
          } catch (e) {
            console.error(e);
          }
        });
        this.cycleStack.add(name);
        try {
          entry.subscribers.forEach((sub) => {
            try {
              sub(nextVal, event);
            } catch (e) {
              console.error(e);
            }
          });
        } finally {
          this.cycleStack.delete(name);
        }
      };
      return [read, write];
    }
    subscribe(name, fn) {
      if (!this.topics.has(name)) {
        this.topic(name, void 0);
      }
      const entry = this.topics.get(name);
      entry.subscribers.add(fn);
      return () => entry.subscribers.delete(fn);
    }
    onTelemetry(fn) {
      this.telemetrySubscribers.add(fn);
      return () => this.telemetrySubscribers.delete(fn);
    }
  };
  var signalMesh = new SignalMeshEngine();
  var createTopicSignal = (topic, initialVal) => signalMesh.topic(topic, initialVal);
  return __toCommonJS(src_exports);
})();
