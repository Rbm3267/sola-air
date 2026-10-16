// Persistent, cross-context signals.
//
// A multi-page app (server-rendered pages, separate .html/.do endpoints, a
// portal that does full navigations) throws away the DOM on every page change,
// so any UI that should *feel* continuous — an open drawer, a chat thread, a
// theme, a persona — has to be rebuilt from stored state. createPersistentSignal
// is a createSignal whose value:
//
//   1. is hydrated synchronously from storage when created (first paint is
//      already correct, no flash of default state),
//   2. is written back to storage on every change, and
//   3. is mirrored live to every other same-origin context (tabs, iframes,
//      workers) over a BroadcastChannel.
//
// Everything degrades gracefully: with storage blocked (private mode, sandboxed
// frames) it behaves like a plain signal; without BroadcastChannel it falls back
// to the `storage` event when the backend is localStorage.

import { createSignal } from './index.js';

const KEY_PREFIX = 'sola:';
const DEFAULT_CHANNEL = 'sola-bus';

// ─── Storage backends ───

function webStorage(kind) {
  try {
    const s = typeof window !== 'undefined' ? window[kind] : undefined;
    if (!s) return null;
    // Accessing the property can succeed while writes still throw (Safari
    // private mode, quota). Probe once.
    const probe = '__sola_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
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

function resolveStorage(option) {
  if (option && typeof option === 'object') return option; // custom backend
  if (option === 'memory') return memoryStorage();
  const kind = option === 'local' ? 'localStorage' : 'sessionStorage';
  return webStorage(kind) || memoryStorage();
}

// ─── Shared bus ───
// One BroadcastChannel per channel name, shared by every persistent signal in
// the page, with per-key handlers. Reference-counted so the channel closes when
// the last signal is disposed.

const buses = new Map();

function getBus(name) {
  let bus = buses.get(name);
  if (bus) return bus;

  const handlers = new Map(); // storage key → Set<(msg) => void>
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(name) : null;
  if (channel) {
    channel.onmessage = (e) => {
      const msg = e.data;
      if (!msg || typeof msg.key !== 'string') return;
      const set = handlers.get(msg.key);
      if (set) for (const h of [...set]) h(msg);
    };
  }
  bus = { name, handlers, channel, refs: 0 };
  buses.set(name, bus);
  return bus;
}

function releaseBus(bus) {
  if (--bus.refs > 0) return;
  bus.channel?.close();
  buses.delete(bus.name);
}

// ─── createPersistentSignal ───

/**
 * @param {string} key  Unique name for this piece of state. Namespaced as `sola:<key>`.
 * @param {*} initialValue  Used when nothing valid is stored.
 * @param {object} [options]
 * @param {'session'|'local'|'memory'|{getItem,setItem,removeItem}} [options.storage='session']
 *        'session' survives navigation within a tab; 'local' also survives new
 *        tabs and restarts. Live sync across open tabs works with either.
 * @param {boolean} [options.sync=true]  Mirror changes to other contexts.
 * @param {string}  [options.channel='sola-bus']  BroadcastChannel name.
 * @param {number}  [options.version=1]  Bump to discard values stored by an
 *        older shape of this state.
 * @param {(value:*)=>boolean} [options.validate]  Reject stored/received values
 *        that don't match the expected shape.
 * @param {number}  [options.ttlMs]  Discard stored values older than this.
 * @returns {[read, write, controls]}  A createSignal pair plus
 *          `{ clear(), dispose() }`.
 */
export function createPersistentSignal(key, initialValue, options = {}) {
  if (typeof key !== 'string' || !key) {
    throw new TypeError('createPersistentSignal: key must be a non-empty string');
  }

  const {
    storage: storageOption = 'session',
    sync = true,
    channel: channelName = DEFAULT_CHANNEL,
    version = 1,
    validate,
    ttlMs,
  } = options;

  const storageKey = KEY_PREFIX + key;
  const store = resolveStorage(storageOption);
  const accept = (v) => {
    if (!validate) return true;
    try { return !!validate(v); } catch { return false; }
  };

  // Each context gets a unique id so a tab ignores its own broadcasts.
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
    } catch { /* quota / blocked — the in-memory signal still works */ }
  }

  const hydrated = readStored();
  const [read, rawWrite] = createSignal(hydrated.found ? hydrated.value : initialValue);

  let bus = null;
  let disposed = false;

  const onMessage = (msg) => {
    if (msg.origin === originId) return;
    if (msg.cleared) { rawWrite(() => initialValue); return; }
    if (msg.v !== version || !accept(msg.d)) return;
    // Straight to the raw setter: applying a remote value must not re-broadcast.
    rawWrite(() => msg.d);
  };

  const onStorageEvent = (e) => {
    // Fallback transport when BroadcastChannel is missing: localStorage fires
    // `storage` in other contexts. (sessionStorage never does.)
    if (e.key !== storageKey || e.storageArea !== store) return;
    const next = readStored();
    rawWrite(() => (next.found ? next.value : initialValue));
  };

  if (sync) {
    bus = getBus(channelName);
    bus.refs++;
    if (!bus.handlers.has(storageKey)) bus.handlers.set(storageKey, new Set());
    bus.handlers.get(storageKey).add(onMessage);
    if (!bus.channel && typeof window !== 'undefined' && storageOption === 'local') {
      window.addEventListener('storage', onStorageEvent);
    }
  }

  const write = (next) => {
    if (disposed) return;
    const value = typeof next === 'function' ? next(read()) : next;
    if (value === read()) return;
    rawWrite(() => value);
    writeStored(value);
    if (bus?.channel) {
      try {
        bus.channel.postMessage({ key: storageKey, v: version, d: value, origin: originId });
      } catch { /* value not structured-cloneable — storage copy still written */ }
    }
  };

  const clear = () => {
    try { store.removeItem(storageKey); } catch { /* ignore */ }
    rawWrite(() => initialValue);
    bus?.channel?.postMessage({ key: storageKey, cleared: true, origin: originId });
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (bus) {
      bus.handlers.get(storageKey)?.delete(onMessage);
      if (!bus.handlers.get(storageKey)?.size) bus.handlers.delete(storageKey);
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorageEvent);
      releaseBus(bus);
    }
  };

  return [read, write, { clear, dispose }];
}
