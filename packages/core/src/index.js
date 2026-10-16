// @sola-air-ui/core — Reactivity Engine V4
// Milestone 1: Full reactivity primitives, lifecycle hooks, batched updates, configurable intents

// ─── Effect Stack ───
let effectStack = [];
let pendingEffects = new Set();
let isFlushing = false;

export function flushSync() {
  while (pendingEffects.size > 0) {
    const effects = [...pendingEffects];
    pendingEffects.clear();
    for (const effect of effects) {
      effect.execute();
    }
  }
  isFlushing = false;
}

// ─── Batched Updates ───
function scheduleFlush() {
  if (!isFlushing) {
    isFlushing = true;
    queueMicrotask(flushSync);
  }
}

// ─── createSignal ───
export function createSignal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  const read = () => {
    const currentEffect = effectStack[effectStack.length - 1];
    if (currentEffect) {
      subscribers.add(currentEffect);
      currentEffect.dependencies.add(subscribers);
    }
    return value;
  };

  const write = (newValue) => {
    // Function updater form: setCount(prev => prev + 1). Matches Solid/React
    // semantics — to store a function as the value itself, wrap it: set(() => fn).
    const next = typeof newValue === 'function' ? newValue(value) : newValue;
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

// ─── createEffect ───
//
// An effect belongs to whichever component (or {#if}/{#each} branch) was being
// built when it was created. Tearing that owner down disposes the effect, so a
// removed branch or an unmounted child stops reacting instead of leaking a live
// subscription to nodes that are no longer on the page.
export function createEffect(fn) {
  let disposed = false;
  const effect = {
    execute() {
      // An effect can be queued and then disposed before the flush reaches it.
      if (disposed) return;
      cleanup();
      effectStack.push(effect);
      try {
        fn();
      } finally {
        effectStack.pop();
      }
    },
    dependencies: new Set(),
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

  // Run immediately (synchronous initial execution)
  effectStack.push(effect);
  try {
    fn();
  } finally {
    effectStack.pop();
  }

  return dispose;
}

// Run fn without the surrounding effect tracking what it reads. Compiled
// components mount children through this, so a child's own reads cannot make
// the parent's effect re-run.
export function __untrack(fn) {
  effectStack.push(null);
  try {
    return fn();
  } finally {
    effectStack.pop();
  }
}

// ─── createDerived ───
// Computed signal that auto-tracks dependencies and lazily recomputes.
export function createDerived(fn) {
  let cachedValue;
  let dirty = true;
  const subscribers = new Set();
  let innerDependencies = new Set();

  // Track when our dependencies change
  const markDirty = {
    execute() {
      if (!dirty) {
        dirty = true;
        // Propagate to our own subscribers
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
    // Subscribe the current running effect to us
    const currentEffect = effectStack[effectStack.length - 1];
    if (currentEffect) {
      subscribers.add(currentEffect);
      currentEffect.dependencies.add(subscribers);
    }

    if (dirty) {
      // Clean up old deps
      markDirty.cleanup();
      innerDependencies = new Set();
      markDirty.dependencies = innerDependencies;

      // Track which signals fn() reads
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

// ─── Component Lifecycle Scope Context Stack ───
const contextStack = [];
let activeContext = null;

export function pushContext() {
  const ctx = { mounts: [], destroys: [] };
  contextStack.push(ctx);
  activeContext = ctx;
  return ctx;
}

export function popContext(ctx) {
  const idx = contextStack.lastIndexOf(ctx);
  if (idx !== -1) {
    contextStack.splice(idx, 1);
  }
  activeContext = contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
}

export function onMount(fn) {
  if (activeContext) {
    activeContext.mounts.push(fn);
  } else {
    fn();
  }
}

export function onDestroy(fn) {
  if (activeContext) {
    activeContext.destroys.push(fn);
  }
}

// Called by compiled mount() function to flush instance mounts.
//
// Takes the specific context to flush (the one `pushContext()` returned for
// THIS component instance) rather than trusting the module-global
// `activeContext`. If a nested child component mounts during this
// component's own DOM construction, the child's own pushContext() call
// reassigns `activeContext` to the child's context and never pops it back
// (a mounted child stays on the stack until it unmounts) — so by the time
// the parent reaches its own flush call, `activeContext` no longer points
// at the parent. Falls back to `activeContext` when called with no
// argument, for compiled bundles built before this fix.
export function __flush_mounts(ctx = activeContext) {
  if (ctx && ctx.mounts.length > 0) {
    const cbs = [...ctx.mounts];
    ctx.mounts = [];
    for (const cb of cbs) {
      cb();
    }
  }
}

// Called when a component is torn down. Same explicit-context fix as
// __flush_mounts above — see that comment for why activeContext alone
// isn't reliable once nested components are involved.
export function __flush_destroys(ctx = activeContext) {
  if (ctx && ctx.destroys.length > 0) {
    const cbs = [...ctx.destroys];
    ctx.destroys = [];
    for (const cb of cbs) {
      cb();
    }
  }
}

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

  onDestroy(() => {
    if (abortController) abortController.abort();
  });

  createEffect(() => {
    const prompt = typeof promptFn === 'function' ? promptFn() : promptFn;
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

    fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: abortController.signal
    }).then(res => {
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
  });

  const accessor = read;
  accessor.loading = loading;
  accessor.error = error;
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
