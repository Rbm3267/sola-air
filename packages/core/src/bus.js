// createBus — typed events across components, pages and tabs.
//
// Events are not state. The signal primitives in this package keep a last value
// and drop a write equal to it, which is right for state and wrong for an event:
// "Ask Scout" fired twice with the same context must be delivered twice. See
// docs/rfcs/0001-bus.md for the design and the reasons behind each rule.
//
//   - Local by default. Only `broadcast` types reach other tabs.
//   - Every boundary is untrusted. A type exposed through `dom.in` or
//     `broadcast` must have a validator (or a per-type guard), enforced when the
//     bus is created, so accepting a payload unchecked is a visible decision.
//   - `dom.in` / `dom.out` are explicit, disjoint allowlists.
//   - `sticky` replays the last payload to a handler that registers late.

import { createSignal } from './signal.js';
import { onClearPersistentState } from './persist.js';

const STICKY_PREFIX = 'sola:bus:sticky:';
const DEFAULT_CHANNEL = 'sola-bus';

// Events this module dispatched onto the DOM, so the inbound listener never
// treats its own output as input.
const ownDomEvents = new WeakSet();

// Type names can come from outside the page (a message from another tab), so look
// them up as own properties only: `validate['constructor']` must not find
// Object.prototype.constructor and mistake it for a validator.
const own = (obj, key) => (obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined);

// Without an onReject, warn once per type, but never track more than this many
// names: a hostile script could otherwise invent a new type per message.
const MAX_WARNED_TYPES = 50;

function sessionStorageOrNull() {
  try {
    const s = typeof window !== 'undefined' ? window.sessionStorage : undefined;
    if (!s) return null;
    s.setItem('__sola_probe__', '1');
    s.removeItem('__sola_probe__');
    return s;
  } catch {
    return null;
  }
}

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

export function createBus(options = {}) {
  const {
    channel: channelName = DEFAULT_CHANNEL,
    broadcast = [],
    dom,
    sticky = {},
    validate = {},
    guard,
    onReject,
    storage: storageOption,
    now = () => Date.now(),
  } = options;

  const domIn = dom?.in ?? [];
  const domOut = dom?.out ?? [];
  const guardMap = guard && typeof guard === 'object' ? guard : null;
  const guardFn = typeof guard === 'function' ? guard : null;

  // ── Invariants, checked once, at construction ──────────────────────────────
  // A boundary type with no validator is the mistake this API exists to prevent,
  // so it is an error rather than a warning.
  const covered = (type) => typeof own(validate, type) === 'function' || typeof own(guardMap, type) === 'function';
  for (const type of new Set([...domIn, ...broadcast])) {
    if (!covered(type)) {
      throw new Error(
        `createBus: "${type}" crosses a boundary (dom.in or broadcast) but has no validator. ` +
        `Add validate["${type}"], or a per-type guard. To accept it unchecked on purpose, ` +
        `write validate["${type}"] = () => true so the decision is visible.`
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
    if (cfg.store !== 'memory' && cfg.store !== 'session') {
      throw new Error(`createBus: sticky["${type}"].store must be 'memory' or 'session'.`);
    }
    if (cfg.store === 'session' && typeof cfg.consume !== 'boolean') {
      throw new Error(
        `createBus: sticky["${type}"] uses the session store, so consume must be set to true or false. ` +
        `true = one-shot handoff (a reload does not repeat it); false = shared context that stays available.`
      );
    }
  }

  const store = storageOption || sessionStorageOrNull() || memoryStorage();
  const originId = Math.random().toString(36).slice(2);
  let seq = 0;
  let disposed = false;

  const handlers = new Map();   // type -> Set<fn>
  const stickyMem = new Map();  // type -> { payload, t, from, hydrated }
  const cleanups = [];

  // ── Rejections stay in-page ───────────────────────────────────────────────
  // The report carries no payload: a rejected event often failed because its
  // data was malformed or unauthorised, and that data must not be passed on.
  const warned = new Set();
  function reject(type, reason, from, direction) {
    const info = { type, reason, from, direction };
    if (typeof onReject === 'function') {
      try { onReject(info); } catch (e) { console.error(e); }
      return;
    }
    if (!warned.has(type) && warned.size < MAX_WARNED_TYPES) {
      warned.add(type);
      console.warn(`[sola bus] rejected "${String(type).slice(0, 64)}" (${reason}, from ${from}, ${direction})`);
    }
  }

  function check(type, payload, from, direction) {
    const v = own(validate, type);
    if (typeof v === 'function') {
      let ok = false;
      try { ok = !!v(payload); } catch { ok = false; }
      if (!ok) { reject(type, 'invalid', from, direction); return false; }
    }
    const perType = own(guardMap, type);
    for (const g of [guardFn, perType]) {
      if (typeof g !== 'function') continue;
      let ok = false;
      try { ok = !!g({ type, payload, from, direction }); } catch { ok = false; }
      if (!ok) { reject(type, 'guard', from, direction); return false; }
    }
    return true;
  }

  // ── Sticky storage ────────────────────────────────────────────────────────
  const stickyKey = (type) => STICKY_PREFIX + type;

  function writeSticky(type, payload, from) {
    const cfg = own(sticky, type);
    if (!cfg) return;
    const t = now();
    stickyMem.set(type, { payload, t, from, hydrated: false });
    if (cfg.store === 'session') {
      try { store.setItem(stickyKey(type), JSON.stringify({ v: 1, t, d: payload })); } catch { /* blocked / not serialisable */ }
    }
  }

  // A navigation hands events over through storage. Read them back now, so a
  // handler registered a moment later still finds them.
  for (const [type, cfg] of Object.entries(sticky)) {
    if (cfg.store !== 'session') continue;
    try {
      const raw = store.getItem(stickyKey(type));
      if (raw == null) continue;
      const env = JSON.parse(raw);
      if (!env || env.v !== 1 || now() - env.t > cfg.ttlMs) { store.removeItem(stickyKey(type)); continue; }
      // Stored events came from this app earlier, but storage is writable by any
      // script on the origin, so they pass the same checks as any other input.
      if (check(type, env.d, 'local', 'in')) {
        stickyMem.set(type, { payload: env.d, t: env.t, from: 'local', hydrated: true });
      } else {
        store.removeItem(stickyKey(type));
      }
    } catch { /* corrupt entry: ignore */ }
  }

  function liveSticky(type) {
    const cfg = own(sticky, type);
    const entry = stickyMem.get(type);
    if (!cfg || !entry) return null;
    if (now() - entry.t > cfg.ttlMs) { stickyMem.delete(type); return null; }
    return entry;
  }

  // ── Delivery ──────────────────────────────────────────────────────────────
  function deliver(type, payload, from, replayed = false) {
    const set = handlers.get(type);
    if (!set || set.size === 0) return;
    const meta = { type, from, id: `${originId}:${++seq}`, time: now(), replayed };
    for (const h of [...set]) {
      try { h(payload, meta); } catch (e) { console.error(e); }
    }
  }

  function accept(type, payload, from) {
    writeSticky(type, payload, from);
    deliver(type, payload, from);
  }

  // ── Channel (other tabs) ──────────────────────────────────────────────────
  let channel = null;
  if (broadcast.length || Object.keys(sticky).length) {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (e) => {
        const msg = e.data;
        if (!msg) return;
        if (msg.clearAll) { clearSticky(); return; }
        if (msg.bus !== 1 || msg.origin === originId || typeof msg.type !== 'string') return;
        if (!broadcast.includes(msg.type)) { reject(msg.type, 'unlisted', 'remote', 'in'); return; }
        if (!check(msg.type, msg.payload, 'remote', 'in')) return;
        accept(msg.type, msg.payload, 'remote');
      };
      cleanups.push(() => channel.close());
    } else if (broadcast.length) {
      console.warn('[sola bus] BroadcastChannel is unavailable; broadcast types stay in this page.');
    }
  }

  // ── DOM bridge ────────────────────────────────────────────────────────────
  const domTarget = dom ? (dom.target ?? (typeof window !== 'undefined' ? window : undefined)) : undefined;
  if (dom && !domTarget) throw new Error('createBus: dom needs a target (no window in this environment).');
  for (const type of domIn) {
    const listener = (e) => {
      if (ownDomEvents.has(e)) return;
      if (!check(type, e.detail, 'dom', 'in')) return;
      accept(type, e.detail, 'dom');
    };
    domTarget.addEventListener(type, listener);
    cleanups.push(() => domTarget.removeEventListener(type, listener));
  }

  function clearSticky() {
    stickyMem.clear();
    for (const type of Object.keys(sticky)) {
      try { store.removeItem(stickyKey(type)); } catch { /* ignore */ }
    }
  }
  cleanups.push(onClearPersistentState(clearSticky));

  // ── Public API ────────────────────────────────────────────────────────────
  function emit(type, payload) {
    if (disposed) return false;
    if (!check(type, payload, 'local', 'out')) return false;
    accept(type, payload, 'local');

    if (broadcast.includes(type) && channel) {
      try { channel.postMessage({ bus: 1, type, payload, origin: originId }); }
      catch { reject(type, 'invalid', 'local', 'out'); } // not structured-cloneable
    }
    if (domOut.includes(type)) {
      const ev = typeof CustomEvent === 'function'
        ? new CustomEvent(type, { detail: payload })
        : Object.assign(new Event(type), { detail: payload });
      ownDomEvents.add(ev);
      domTarget.dispatchEvent(ev);
    }
    return true;
  }

  function on(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('bus.on: handler must be a function');
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(handler);

    const entry = liveSticky(type);
    if (entry) {
      const meta = { type, from: entry.from, id: `${originId}:${++seq}`, time: now(), replayed: true };
      try { handler(entry.payload, meta); } catch (e) { console.error(e); }
      // `consume` retires the copy that came through storage, so a reload cannot
      // repeat it. The in-memory copy stays until its ttl, so a sibling island
      // mounting a moment later in this page still receives it.
      if (entry.hydrated && own(sticky, type)?.consume) {
        try { store.removeItem(stickyKey(type)); } catch { /* ignore */ }
        entry.hydrated = false;
      }
    }
    return () => { handlers.get(type)?.delete(handler); };
  }

  function signal(type) {
    // Each event is wrapped, so an identical payload still counts as a change and
    // effects that read this accessor re-run.
    const [wrapped, setWrapped] = createSignal(undefined);
    const off = on(type, (payload) => setWrapped({ payload }));
    const read = () => wrapped()?.payload;
    read.dispose = off;
    return read;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanups.length) { try { cleanups.pop()(); } catch { /* already gone */ } }
    handlers.clear();
  }

  return { emit, on, signal, dispose, _handlerCount: () => [...handlers.values()].reduce((n, s) => n + s.size, 0) };
}

// ── Default instance ────────────────────────────────────────────────────────
// Components use `bus` without wiring anything. An app that needs the DOM bridge,
// broadcast or sticky events configures it once, before any component subscribes.

let current = null;
const ensure = () => (current ||= createBus());

export const bus = {
  emit: (type, payload) => ensure().emit(type, payload),
  on: (type, handler) => ensure().on(type, handler),
  signal: (type) => ensure().signal(type),
  dispose: () => { current?.dispose(); current = null; },
};

export function configureBus(options) {
  if (current && current._handlerCount() > 0) {
    throw new Error('configureBus must run before any component subscribes to the bus.');
  }
  current?.dispose();
  current = createBus(options);
  return bus;
}
