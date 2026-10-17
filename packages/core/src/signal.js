// @sola-air-ui/core — Core Reactivity & Lifecycle Primitives
// Extracted from index.js so internal siblings (persist.js, bus.js) can import
// createSignal without creating circular dependencies through the package barrel.

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
export function __flush_mounts(ctx = activeContext) {
  if (ctx && ctx.mounts.length > 0) {
    const cbs = [...ctx.mounts];
    ctx.mounts = [];
    for (const cb of cbs) {
      cb();
    }
  }
}

// Called when a component is torn down.
export function __flush_destroys(ctx = activeContext) {
  if (ctx && ctx.destroys.length > 0) {
    const cbs = [...ctx.destroys];
    ctx.destroys = [];
    for (const cb of cbs) {
      cb();
    }
  }
}
