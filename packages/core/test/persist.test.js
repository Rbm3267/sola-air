import assert from 'node:assert';
import { describe, it, afterEach } from 'node:test';
import { createPersistentSignal as createPersistent, clearPersistentState, createEffect, flushSync } from '../src/index.js';

function fakeStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
    raw: m,
  };
}
const envelope = (d, v = 1, t = Date.now()) => JSON.stringify({ v, t, d });
const tick = (ms = 100) => new Promise((r) => setTimeout(r, ms));
// An open BroadcastChannel keeps Node alive, so a test that throws before it
// closes one would hang the whole run instead of failing. Everything a test
// opens is registered here and released after it, pass or fail.
const cleanups = [];
afterEach(() => { while (cleanups.length) { try { cleanups.pop()(); } catch { /* already closed */ } } });

function createPersistentSignal(...args) {
  const result = createPersistent(...args);
  cleanups.push(result[2].dispose);
  return result;
}
function channel(name) {
  const ch = new BroadcastChannel(name);
  cleanups.push(() => ch.close());
  return ch;
}
// Poll instead of sleeping a fixed time: a slow runner must not turn a
// correct result into a failure.
async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition not met in ' + timeoutMs + 'ms');
    await new Promise((r) => setTimeout(r, 5));
  }
}


describe('createPersistentSignal', () => {
  it('hydrates synchronously from storage', () => {
    const storage = fakeStorage({ 'sola:drawer': envelope({ open: true }) });
    const [read, , c] = createPersistentSignal('drawer', { open: false }, { storage, sync: false });
    assert.deepStrictEqual(read(), { open: true });
    c.dispose();
  });

  it('falls back to the initial value when nothing is stored', () => {
    const [read, , c] = createPersistentSignal('empty', 'dflt', { storage: fakeStorage(), sync: false });
    assert.strictEqual(read(), 'dflt');
    c.dispose();
  });

  it('writes through to storage on change, including function updaters', () => {
    const storage = fakeStorage();
    const [read, write, c] = createPersistentSignal('count', 1, { storage, sync: false });
    write((n) => n + 1);
    assert.strictEqual(read(), 2);
    assert.strictEqual(JSON.parse(storage.raw.get('sola:count')).d, 2);
    c.dispose();
  });

  it('is reactive like a normal signal', () => {
    const [read, write, c] = createPersistentSignal('reactive', 0, { storage: fakeStorage(), sync: false });
    const seen = [];
    createEffect(() => seen.push(read()));
    write(5);
    flushSync();
    assert.deepStrictEqual(seen, [0, 5]);
    c.dispose();
  });

  it('discards values from a different schema version', () => {
    const storage = fakeStorage({ 'sola:v': envelope('old', 1) });
    const [read, , c] = createPersistentSignal('v', 'fresh', { storage, sync: false, version: 2 });
    assert.strictEqual(read(), 'fresh');
    c.dispose();
  });

  it('discards values that fail validation', () => {
    const storage = fakeStorage({ 'sola:val': envelope({ nope: 1 }) });
    const [read, , c] = createPersistentSignal('val', { ok: true }, {
      storage, sync: false, validate: (v) => v && v.ok === true,
    });
    assert.deepStrictEqual(read(), { ok: true });
    c.dispose();
  });

  it('discards expired values (ttlMs)', () => {
    const storage = fakeStorage({ 'sola:ttl': envelope('stale', 1, Date.now() - 10_000) });
    const [read, , c] = createPersistentSignal('ttl', 'fresh', { storage, sync: false, ttlMs: 1000 });
    assert.strictEqual(read(), 'fresh');
    c.dispose();
  });

  it('survives corrupt stored JSON', () => {
    const storage = fakeStorage({ 'sola:bad': '{not json' });
    const [read, , c] = createPersistentSignal('bad', 'ok', { storage, sync: false });
    assert.strictEqual(read(), 'ok');
    c.dispose();
  });

  it('keeps working when storage throws', () => {
    const storage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    };
    const [read, write, c] = createPersistentSignal('blocked', 1, { storage, sync: false });
    write(2);
    assert.strictEqual(read(), 2);
    c.clear();
    assert.strictEqual(read(), 1);
    c.dispose();
  });

  it('clear() removes the stored value and resets to initial', () => {
    const storage = fakeStorage();
    const [read, write, c] = createPersistentSignal('clr', 'a', { storage, sync: false });
    write('b');
    c.clear();
    assert.strictEqual(read(), 'a');
    assert.strictEqual(storage.raw.has('sola:clr'), false);
    c.dispose();
  });

  it('applies updates broadcast from another context', async () => {
    const [read, , c] = createPersistentSignal('bus-in', 'a', { storage: fakeStorage(), channel: 't-in' });
    const other = channel('t-in');
    other.postMessage({ key: 'sola:bus-in', v: 1, d: 'from-elsewhere', origin: 'other' });
    await waitFor(() => read() === 'from-elsewhere');
    assert.strictEqual(read(), 'from-elsewhere');
    other.close();
    c.dispose();
  });

  it('ignores broadcasts with a mismatched version or failing validation', async () => {
    const [read, , c] = createPersistentSignal('bus-bad', 'a', {
      storage: fakeStorage(), channel: 't-bad', version: 2, validate: (v) => typeof v === 'string',
    });
    const other = channel('t-bad');
    other.postMessage({ key: 'sola:bus-bad', v: 1, d: 'old-shape', origin: 'other' });
    other.postMessage({ key: 'sola:bus-bad', v: 2, d: 42, origin: 'other' });
    await tick();
    assert.strictEqual(read(), 'a');
    other.close();
    c.dispose();
  });

  it('broadcasts local writes to other contexts, and does not echo remote ones', async () => {
    const [read, write, c] = createPersistentSignal('bus-out', 'a', { storage: fakeStorage(), channel: 't-out' });
    const other = channel('t-out');
    const got = [];
    other.onmessage = (e) => got.push(e.data);
    write('local');
    await waitFor(() => got.length >= 1);
    assert.strictEqual(got.length, 1);
    assert.strictEqual(got[0].d, 'local');

    other.postMessage({ key: 'sola:bus-out', v: 1, d: 'remote', origin: 'other' });
    await waitFor(() => read() === 'remote');
    await tick(); // give a wrongful re-broadcast time to appear
    assert.strictEqual(got.length, 1, 'applying a remote value must not re-broadcast');
    other.close();
    c.dispose();
  });

  it('stops listening after dispose()', async () => {
    const [read, , c] = createPersistentSignal('bus-disp', 'a', { storage: fakeStorage(), channel: 't-disp' });
    c.dispose();
    const other = channel('t-disp');
    other.postMessage({ key: 'sola:bus-disp', v: 1, d: 'late', origin: 'other' });
    await tick();
    assert.strictEqual(read(), 'a');
    other.close();
  });

  it('rejects an empty key', () => {
    assert.throws(() => createPersistentSignal('', 1), TypeError);
  });

  it('clearPersistentState resets live signals here and in other contexts', async () => {
    const [read, write, c] = createPersistentSignal('wipe', 'a', { storage: fakeStorage(), channel: 't-wipe' });
    write('b');
    const other = channel('t-wipe');
    const got = [];
    other.onmessage = (e) => got.push(e.data);
    clearPersistentState({ channel: 't-wipe' });
    assert.strictEqual(read(), 'a', 'local signal reset synchronously');
    await waitFor(() => got.some((m) => m.clearAll));
    other.close();
    c.dispose();
  });

  it('a clearAll broadcast resets signals in this context', async () => {
    const [read, write, c] = createPersistentSignal('wipe-in', 'a', { storage: fakeStorage(), channel: 't-wipe-in' });
    write('b');
    const other = channel('t-wipe-in');
    other.postMessage({ clearAll: true, origin: 'elsewhere' });
    await waitFor(() => read() === 'a');
    other.close();
    c.dispose();
  });

  it('clearPersistentState resets sync:false and custom/memory storage signals', () => {
    const customStore = fakeStorage();
    const [readNoSync, writeNoSync, c1] = createPersistentSignal('nosync', 'init-1', {
      storage: customStore,
      sync: false
    });
    const [readMem, writeMem, c2] = createPersistentSignal('mem', 'init-2', {
      storage: 'memory',
      sync: false
    });
    writeNoSync('updated-1');
    writeMem('updated-2');
    assert.strictEqual(readNoSync(), 'updated-1');
    assert.strictEqual(readMem(), 'updated-2');
    assert.strictEqual(customStore.raw.has('sola:nosync'), true);

    clearPersistentState();
    assert.strictEqual(readNoSync(), 'init-1');
    assert.strictEqual(readMem(), 'init-2');
    assert.strictEqual(customStore.raw.has('sola:nosync'), false);

    c1.dispose();
    c2.dispose();
  });
});
