import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createSignal,
  createDerived,
  createEffect,
  flushSync,
  onMount,
  onDestroy,
  pushContext,
  popContext,
  __flush_mounts,
  __flush_destroys,
  __untrack
} from '../src/index.js';

describe('@sola/core reactivity engine', () => {
  it('should create reactive signals and update values', () => {
    const [count, setCount] = createSignal(10);
    assert.strictEqual(count(), 10);
    setCount(25);
    assert.strictEqual(count(), 25);
  });

  it('should support function updaters in the setter', () => {
    const [count, setCount] = createSignal(0);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    assert.strictEqual(count(), 2);
    // Storing an actual function requires the wrap form
    const fn = () => 'stored';
    const [f, setF] = createSignal(null);
    setF(() => fn);
    assert.strictEqual(f(), fn);
  });

  it('should compute derived values reactively', () => {
    const [a, setA] = createSignal(2);
    const [b, setB] = createSignal(3);
    const sum = createDerived(() => a() + b());
    
    assert.strictEqual(sum(), 5);
    setA(10);
    flushSync();
    assert.strictEqual(sum(), 13);
    setB(20);
    flushSync();
    assert.strictEqual(sum(), 30);
  });

  it('should run effects when dependency signals change', () => {
    const [name, setName] = createSignal('Sola');
    let effectRan = 0;
    let observedName = '';

    const cleanup = createEffect(() => {
      effectRan++;
      observedName = name();
    });

    assert.strictEqual(effectRan, 1);
    assert.strictEqual(observedName, 'Sola');

    setName('Zero-VDOM');
    flushSync();
    assert.strictEqual(effectRan, 2);
    assert.strictEqual(observedName, 'Zero-VDOM');

    cleanup();
    setName('Ignored');
    flushSync();
    assert.strictEqual(effectRan, 2);
  });

  it('should isolate component lifecycle contextStack without leaking', () => {
    const ctx1 = pushContext();
    let mounted1 = false;
    onMount(() => { mounted1 = true; });

    const ctx2 = pushContext();
    let mounted2 = false;
    onMount(() => { mounted2 = true; });

    popContext(ctx2);
    popContext(ctx1);

    assert.strictEqual(ctx1.mounts.length, 1);
    assert.strictEqual(ctx2.mounts.length, 1);
    ctx1.mounts[0]();
    ctx2.mounts[0]();
    assert.strictEqual(mounted1, true);
    assert.strictEqual(mounted2, true);
  });

  it('should fire a parent component\'s onMount even when a nested child mounts during its own construction and stays on the context stack', () => {
    // Mirrors exactly what compiled mount() output does: pushContext(), run
    // the component's own script/DOM construction (which may mount nested
    // children), then flush THIS component's own onMount callbacks using
    // the specific context pushContext() returned — not whatever happens
    // to be "active" afterward.
    const parentCtx = pushContext();
    let parentMounted = false;
    onMount(() => { parentMounted = true; });

    // Simulate a nested child component mounting while the parent's DOM is
    // being built. A real mounted child never calls popContext() until it
    // unmounts, so this reassigns the module-global activeContext to the
    // child and leaves it there.
    const childCtx = pushContext();
    let childMounted = false;
    onMount(() => { childMounted = true; });
    __flush_mounts(childCtx);
    assert.strictEqual(childMounted, true, 'child onMount should fire when flushed with its own context');
    // Child stays mounted — no popContext(childCtx) here, matching real usage.

    // Parent flushes its own mounts using the context IT was given, exactly
    // like the compiler's `__flush_mounts(__ctx)` call site.
    __flush_mounts(parentCtx);
    assert.strictEqual(parentMounted, true, 'parent onMount must fire even though a child is still on the context stack');

    // Teardown, again using the explicit context rather than relying on
    // whatever activeContext happens to be (still childCtx at this point,
    // since neither context has been popped yet).
    let parentDestroyed = false;
    parentCtx.destroys.push(() => { parentDestroyed = true; });
    __flush_destroys(parentCtx);
    assert.strictEqual(parentDestroyed, true);

    popContext(childCtx);
    popContext(parentCtx);
  });
});

describe('effect ownership', () => {
  it('stops an effect when the context that created it is destroyed', () => {
    const [n, setN] = createSignal(0);
    let runs = 0;
    const ctx = pushContext();
    createEffect(() => { n(); runs += 1; });
    popContext(ctx);
    assert.strictEqual(runs, 1);

    setN(1);
    flushSync();
    assert.strictEqual(runs, 2, 'still reacting while the owner is alive');

    __flush_destroys(ctx);
    setN(2);
    flushSync();
    assert.strictEqual(runs, 2, 'no longer reacting after the owner is destroyed');
  });

  it('does not run an effect that was queued and then disposed before the flush', () => {
    const [n, setN] = createSignal(0);
    let runs = 0;
    const ctx = pushContext();
    createEffect(() => { n(); runs += 1; });
    popContext(ctx);

    setN(1);            // queues the effect
    __flush_destroys(ctx); // disposes it before the microtask flush
    flushSync();
    assert.strictEqual(runs, 1, 'the queued run was dropped');
  });

  it('createEffect returns a function that stops the effect', () => {
    const [n, setN] = createSignal(0);
    let runs = 0;
    const stop = createEffect(() => { n(); runs += 1; });
    stop();
    setN(1);
    flushSync();
    assert.strictEqual(runs, 1);
  });

  it('an effect created with no active context is not owned by anything', () => {
    const [n, setN] = createSignal(0);
    let runs = 0;
    createEffect(() => { n(); runs += 1; });
    setN(1);
    flushSync();
    assert.strictEqual(runs, 2);
  });
});

describe('__untrack', () => {
  it('reads inside untrack do not subscribe the surrounding effect', () => {
    const [a, setA] = createSignal(1);
    const [b, setB] = createSignal(1);
    let runs = 0;
    createEffect(() => {
      a();
      __untrack(() => b());
      runs += 1;
    });
    setB(2);
    flushSync();
    assert.strictEqual(runs, 1, 'a change to b alone did not re-run it');
    setA(2);
    flushSync();
    assert.strictEqual(runs, 2, 'a change to a still did');
  });

  it('returns the value and restores tracking even if fn throws', () => {
    assert.strictEqual(__untrack(() => 42), 42);
    const [a, setA] = createSignal(0);
    let runs = 0;
    createEffect(() => {
      try { __untrack(() => { throw new Error('x'); }); } catch {}
      a();
      runs += 1;
    });
    setA(1);
    flushSync();
    assert.strictEqual(runs, 2, 'tracking works after a throw inside untrack');
  });
});
