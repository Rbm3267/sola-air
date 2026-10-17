// @sola-air-ui/core — Reactivity Engine V4
// Milestone 1: Full reactivity primitives, lifecycle hooks, batched updates, configurable intents

import {
  flushSync,
  createSignal,
  createEffect,
  __untrack,
  createDerived,
  pushContext,
  popContext,
  onMount,
  onDestroy,
  __flush_mounts,
  __flush_destroys,
} from './signal.js';

export {
  flushSync,
  createSignal,
  createEffect,
  __untrack,
  createDerived,
  pushContext,
  popContext,
  onMount,
  onDestroy,
  __flush_mounts,
  __flush_destroys,
};

// ─── createIntent ───
// Configurable ambient intent resolver with streaming support.
const defaultIntentConfig = {
  provider: 'local',
  endpoint: '/api/intent',
  model: 'gemini-2.5-flash',
  stream: false
};

let globalIntentConfig = { ...defaultIntentConfig };

export function configureIntent(config) {
  globalIntentConfig = { ...globalIntentConfig, ...config };
}

async function _consumeSSE(response, onToken, onDone, onError) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const lines = buf.split('\n');
      buf = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(payload);
          const token = parsed.token ?? parsed.delta ?? parsed.content ?? '';
          if (token) onToken(token);
        } catch {
          if (payload) onToken(payload);
        }
      }
    }
    onDone();
  } catch (err) {
    if (err.name !== 'AbortError') onError(err);
  }
}

export function createIntent(promptFn, options = {}) {
  const config = { ...globalIntentConfig, ...options };
  const [read, write] = createSignal(options.initial ?? null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  let abortController = null;
  let timer = null;

  // options.transport is a fetch-compatible function (url, init) => Promise<Response>,
  // for hosts that must sign, proxy or route the request themselves.
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
    abortController = new AbortController();

    write(null);
    setError(null);
    setLoading(true);

    const body = JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model: config.model,
      provider: config.provider,
      stream: config.stream
    });

    Promise.resolve(send(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: abortController.signal
    })).then(res => {
      if (!res.ok) throw new Error(`Intent failed: ${res.status}`);

      if (config.stream) {
        let accumulated = '';
        return _consumeSSE(
          res,
          token => { accumulated += token; write(accumulated); },
          () => setLoading(false),
          err => { setError(err.message); setLoading(false); }
        );
      }

      return res.json().then(data => {
        if (data?.components?.length > 0) write(data.components[0]);
        else if (data?.result != null) write(data.result);
        else write(data);
        setLoading(false);
      });
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('[Sola Intent Error]', err);
        setError(err.message);
        setLoading(false);
      }
    });
  }

  const resolve = () => (typeof promptFn === 'function' ? promptFn() : promptFn);

  // trigger: 'manual' never runs on its own; call .run(input) instead.
  if (config.trigger !== 'manual') {
    createEffect(() => {
      const prompt = resolve();
      if (timer) clearTimeout(timer);
      timer = null;
      const wait = Number(config.debounceMs) || 0;
      if (wait > 0 && prompt) {
        // The prompt is read above, so the effect still tracks it; only the request waits.
        timer = setTimeout(() => { timer = null; request(prompt); }, wait);
      } else {
        request(prompt);
      }
    });
  }

  const accessor = read;
  accessor.loading = loading;
  accessor.error = error;
  // run(input) asks now, with input as the prompt, or with the current prompt when
  // called without one. It skips the debounce.
  accessor.run = (input) => {
    if (timer) clearTimeout(timer);
    timer = null;
    request(input !== undefined ? input : __untrack(resolve));
  };
  return accessor;
}

// ─── createData ───
// Reactive data connection through the Sola Relay.
const defaultDataConfig = {
  relayEndpoint: 'http://localhost:4040/api/query',
  refresh: null // e.g. '30s', '1m', '5m'
};

let globalDataConfig = { ...defaultDataConfig };

export function configureData(config) {
  globalDataConfig = { ...globalDataConfig, ...config };
}

function parseInterval(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h)$/);
  if (!match) return null;
  const val = parseInt(match[1]);
  switch (match[2]) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 3600 * 1000;
  }
  return null;
}

export function createData(source, options = {}) {
  const config = { ...globalDataConfig, ...options };
  const [read, write] = createSignal({ loading: true, data: null, error: null });
  let abortController = null;
  let refreshTimer = null;

  function fetchData() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    write({ loading: true, data: read().data, error: null });

    fetch(config.relayEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        query: config.query || null,
        filters: config.filters || null,
        sort: config.sort || null,
        limit: config.limit || null,
        offset: config.offset || null
      }),
      signal: abortController.signal
    })
    .then(res => {
      if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`);
      return res.json();
    })
    .then(data => {
      write({ loading: false, data: data.rows || data, error: null });
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.error('[Sola Data Error]', err);
        write({ loading: false, data: null, error: err.message });
      }
    });
  }

  // Initial fetch
  fetchData();

  // Auto-refresh
  const interval = parseInterval(config.refresh);
  if (interval) {
    refreshTimer = setInterval(fetchData, interval);
  }

  // Return a signal that provides .loading, .data, .error
  const accessor = () => read();
  accessor.refetch = fetchData;
  accessor.stop = () => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (abortController) abortController.abort();
  };
  // Stop polling, and abandon any request still in flight, when the component
  // that asked for the data is destroyed. Without this a `refresh` interval kept
  // fetching for as long as the page stayed open.
  onDestroy(accessor.stop);

  return accessor;
}

// ─── Named Cross-Widget Signal Telemetry Mesh ───

class SignalMeshEngine {
  constructor() {
    this.topics = new Map();
    this.telemetrySubscribers = new Set();
    this.cycleStack = new Set();
  }

  topic(name, initialValue) {
    if (!this.topics.has(name)) {
      const [read, write] = createSignal(initialValue);
      this.topics.set(name, { read, write, value: initialValue, subscribers: new Set() });
    }

    const entry = this.topics.get(name);

    const read = () => entry.read();
    const write = (next, originId = 'signal') => {
      const nextVal = typeof next === 'function' ? next(entry.value) : next;
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
        timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        originWidgetId: originId
      };

      this.telemetrySubscribers.forEach(cb => {
        try { cb(event); } catch (e) { console.error(e); }
      });

      this.cycleStack.add(name);
      try {
        entry.subscribers.forEach(sub => {
          try { sub(nextVal, event); } catch (e) { console.error(e); }
        });
      } finally {
        this.cycleStack.delete(name);
      }
    };

    return [read, write];
  }

  subscribe(name, fn) {
    if (!this.topics.has(name)) {
      this.topic(name, undefined);
    }
    const entry = this.topics.get(name);
    entry.subscribers.add(fn);
    return () => entry.subscribers.delete(fn);
  }

  onTelemetry(fn) {
    this.telemetrySubscribers.add(fn);
    return () => this.telemetrySubscribers.delete(fn);
  }
}

export const signalMesh = new SignalMeshEngine();
export const createTopicSignal = (topic, initialVal) => signalMesh.topic(topic, initialVal);

// ─── Sola Sentinel & Ambient Intent Telemetry Observer ───
// Moved to sentinel.js — friction/rage-click detection, plus ambient
// field-behavior capture, significance gating, and prompt building.
export { SolaSentinel, createSentinel } from './sentinel.js';


// ─── Persistent / cross-page state ───
// Signals that hydrate from storage and mirror live across tabs, plus a
// Shadow-DOM shell mounter for UI that should survive full page navigations.
export { createPersistentSignal, clearPersistentState } from './persist.js';
export { mountShell } from './shell.js';
export { createBus, configureBus, bus } from './bus.js';
