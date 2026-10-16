import assert from 'node:assert';
import { describe, it, afterEach } from 'node:test';
import { createBus, createEffect, flushSync, clearPersistentState } from '../src/index.js';

// Anything a test opens is released after it, pass or fail: an open
// BroadcastChannel keeps Node alive, so a throwing test would otherwise hang.
const cleanups = [];
afterEach(() => { while (cleanups.length) { try { cleanups.pop()(); } catch { /* already closed */ } } });

let n = 0;
const uniq = (p) => `${p}-${process.pid}-${++n}`;

function bus(options = {}) {
  const b = createBus({ storage: fakeStorage(), ...options });
  cleanups.push(() => b.dispose());
  return b;
}
function raw(name) {
  const ch = new BroadcastChannel(name);
  cleanups.push(() => ch.close());
  return ch;
}
function fakeStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
    raw: m,
  };
}
async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition not met in ' + timeoutMs + 'ms');
    await new Promise((r) => setTimeout(r, 5));
  }
}
const settle = (ms = 100) => new Promise((r) => setTimeout(r, ms));
const isString = (p) => typeof p?.text === 'string';

describe('createBus: delivery', () => {
  it('delivers a repeated identical payload every time', () => {
    const b = bus();
    const got = [];
    b.on('ask', (p) => got.push(p));
    const payload = { id: 1 };
    b.emit('ask', payload);
    b.emit('ask', payload);
    assert.strictEqual(got.length, 2);
  });

  it('signal() updates on an identical payload, so effects re-run', () => {
    const b = bus();
    const ctx = b.signal('ask');
    const seen = [];
    createEffect(() => seen.push(ctx()));
    const payload = { id: 1 };
    b.emit('ask', payload); flushSync();
    b.emit('ask', payload); flushSync();
    assert.deepStrictEqual(seen, [undefined, payload, payload]);
  });

  it('off() stops delivery; a throwing handler does not block others', () => {
    const b = bus();
    const got = [];
    const off = b.on('t', () => got.push('a'));
    b.on('t', () => { throw new Error('boom'); });
    b.on('t', () => got.push('c'));
    const origError = console.error; console.error = () => {};
    try { b.emit('t', 1); } finally { console.error = origError; }
    off();
    b.emit('t', 2);
    assert.deepStrictEqual(got, ['a', 'c', 'c']);
  });

  it('a same-page emit of an unexposed type needs no validator', () => {
    const b = bus();
    let hit = false;
    b.on('internal', () => { hit = true; });
    assert.strictEqual(b.emit('internal', { anything: true }), true);
    assert.ok(hit);
  });
});

describe('createBus: construction invariants', () => {
  it('throws when a dom.in type has no validator', () => {
    assert.throws(() => createBus({ dom: { target: new EventTarget(), in: ['x'] } }), /no validator/);
  });
  it('throws when a broadcast type has no validator', () => {
    assert.throws(() => createBus({ broadcast: ['x'] }), /no validator/);
  });
  it('a per-type guard satisfies the invariant; a global guard alone does not', () => {
    const t = new EventTarget();
    const b = bus({ dom: { target: t, in: ['x'] }, guard: { x: () => true } });
    assert.ok(b);
    assert.throws(() => createBus({ dom: { target: t, in: ['x'] }, guard: () => true }), /no validator/);
  });
  it('validate: () => true is the deliberate way to accept unchecked', () => {
    assert.ok(bus({ dom: { target: new EventTarget(), in: ['x'] }, validate: { x: () => true } }));
  });
  it('throws when a type is in both dom.in and dom.out', () => {
    assert.throws(() => createBus({ dom: { target: new EventTarget(), in: ['x'], out: ['x'] }, validate: { x: () => true } }), /both dom.in and dom.out/);
  });
  it('sticky needs a positive ttlMs', () => {
    assert.throws(() => createBus({ sticky: { x: { store: 'memory' } } }), /ttlMs/);
    assert.throws(() => createBus({ sticky: { x: { store: 'memory', ttlMs: 0 } } }), /ttlMs/);
  });
  it('a session sticky store requires an explicit consume', () => {
    assert.throws(() => createBus({ sticky: { x: { store: 'session', ttlMs: 1000 } } }), /consume must be set/);
    assert.ok(bus({ sticky: { x: { store: 'session', ttlMs: 1000, consume: false } } }));
  });
});

describe('createBus: validation, guards and rejections', () => {
  it('rejects an invalid payload, reports no payload, and delivers nothing', () => {
    const rejects = [];
    const b = bus({ validate: { toast: isString }, onReject: (i) => rejects.push(i) });
    let hit = false;
    b.on('toast', () => { hit = true; });
    assert.strictEqual(b.emit('toast', { text: 42, secret: 's3cret' }), false);
    assert.strictEqual(hit, false);
    assert.deepStrictEqual(rejects, [{ type: 'toast', reason: 'invalid', from: 'local', direction: 'out' }]);
    assert.ok(!JSON.stringify(rejects).includes('s3cret'), 'the payload is never in the report');
  });

  it('a guard can veto, and receives type, payload, from and direction', () => {
    const seen = [];
    const rejects = [];
    const b = bus({
      guard: (e) => { seen.push(e); return e.payload.ok === true; },
      onReject: (i) => rejects.push(i),
    });
    assert.strictEqual(b.emit('a', { ok: true }), true);
    assert.strictEqual(b.emit('a', { ok: false }), false);
    assert.deepStrictEqual(seen[0], { type: 'a', payload: { ok: true }, from: 'local', direction: 'out' });
    assert.strictEqual(rejects[0].reason, 'guard');
  });

  it('a throwing validator or guard rejects instead of throwing into the emitter', () => {
    const b = bus({ validate: { a: () => { throw new Error('x'); } }, onReject: () => {} });
    assert.strictEqual(b.emit('a', 1), false);
  });

  it('with no onReject, warns once per type', () => {
    const warns = [];
    const orig = console.warn; console.warn = (m) => warns.push(m);
    try {
      const b = bus({ validate: { a: () => false } });
      b.emit('a', 1); b.emit('a', 2); b.emit('a', 3);
    } finally { console.warn = orig; }
    assert.strictEqual(warns.length, 1);
  });

  it('rejections are never put on dom.out or the bus', () => {
    const target = new EventTarget();
    const outs = [];
    target.addEventListener('rejected', () => outs.push(1));
    const b = bus({ dom: { target, out: ['rejected'] }, validate: { a: () => false }, onReject: () => {} });
    let busHits = 0;
    b.on('rejected', () => busHits++);
    b.emit('a', 1);
    assert.deepStrictEqual([outs.length, busHits], [0, 0]);
  });
});

describe('createBus: DOM bridge', () => {
  it('forwards a host CustomEvent into the bus after validation', () => {
    const target = new EventTarget();
    const b = bus({ dom: { target, in: ['sola:context'] }, validate: { 'sola:context': (p) => typeof p?.title === 'string' }, onReject: () => {} });
    const got = [];
    b.on('sola:context', (p, meta) => got.push([p.title, meta.from]));
    target.dispatchEvent(new CustomEvent('sola:context', { detail: { title: 'INC1' } }));
    target.dispatchEvent(new CustomEvent('sola:context', { detail: { title: 99 } }));
    assert.deepStrictEqual(got, [['INC1', 'dom']]);
  });

  it('ignores DOM events for types that are not allowlisted', () => {
    const target = new EventTarget();
    const b = bus({ dom: { target, in: ['ok'] }, validate: { ok: () => true } });
    let hit = false;
    b.on('nope', () => { hit = true; });
    target.dispatchEvent(new CustomEvent('nope', { detail: 1 }));
    assert.strictEqual(hit, false);
  });

  it('re-dispatches only dom.out types, and never re-ingests its own output', () => {
    const target = new EventTarget();
    const outs = [];
    target.addEventListener('sola:navigate', (e) => outs.push(e.detail));
    target.addEventListener('sola:internal', () => outs.push('LEAK'));
    const b = bus({ dom: { target, out: ['sola:navigate'] } });
    b.emit('sola:navigate', { view: 'triage' });
    b.emit('sola:internal', { x: 1 });
    assert.deepStrictEqual(outs, [{ view: 'triage' }]);
  });

  it('removes its DOM listeners on dispose', () => {
    const target = new EventTarget();
    const b = createBus({ dom: { target, in: ['x'] }, validate: { x: () => true }, storage: fakeStorage() });
    let hits = 0;
    b.on('x', () => hits++);
    target.dispatchEvent(new CustomEvent('x', { detail: 1 }));
    b.dispose();
    target.dispatchEvent(new CustomEvent('x', { detail: 1 }));
    assert.strictEqual(hits, 1);
  });
});

describe('createBus: broadcast', () => {
  it('sends only broadcast types to other tabs', async () => {
    const ch = uniq('bc-out');
    const other = raw(ch);
    const got = [];
    other.onmessage = (e) => got.push(e.data);
    const b = bus({ channel: ch, broadcast: ['sola:toast'], validate: { 'sola:toast': isString } });
    b.emit('sola:toast', { text: 'hi' });
    b.emit('local-only', { x: 1 });
    await waitFor(() => got.length >= 1);
    await settle();
    assert.strictEqual(got.length, 1);
    assert.strictEqual(got[0].type, 'sola:toast');
  });

  it('accepts a valid remote event, and rejects an invalid or unlisted one', async () => {
    const ch = uniq('bc-in');
    const other = raw(ch);
    const rejects = [];
    const b = bus({ channel: ch, broadcast: ['sola:toast'], validate: { 'sola:toast': isString }, onReject: (i) => rejects.push(i.reason) });
    const got = [];
    b.on('sola:toast', (p, m) => got.push([p.text, m.from]));
    other.postMessage({ bus: 1, type: 'sola:toast', payload: { text: 'hello' }, origin: 'x' });
    other.postMessage({ bus: 1, type: 'sola:toast', payload: { text: 5 }, origin: 'x' });
    other.postMessage({ bus: 1, type: 'sola:action', payload: {}, origin: 'x' });
    await waitFor(() => got.length >= 1 && rejects.length >= 2);
    assert.deepStrictEqual(got, [['hello', 'remote']]);
    assert.deepStrictEqual(rejects.sort(), ['invalid', 'unlisted']);
  });

  it('does not echo remote events back out', async () => {
    const ch = uniq('bc-echo');
    const other = raw(ch);
    const echoes = [];
    other.onmessage = (e) => { if (e.data?.origin !== 'x') echoes.push(e.data); };
    const b = bus({ channel: ch, broadcast: ['t'], validate: { t: () => true } });
    const got = [];
    b.on('t', (p) => got.push(p));
    other.postMessage({ bus: 1, type: 't', payload: 1, origin: 'x' });
    await waitFor(() => got.length === 1);
    await settle();
    assert.strictEqual(echoes.length, 0);
  });
});

describe('createBus: sticky events', () => {
  it('replays the last payload to a late handler, marked replayed', () => {
    const b = bus({ sticky: { ctx: { store: 'memory', ttlMs: 1000 } } });
    b.emit('ctx', { title: 'A' });
    const got = [];
    b.on('ctx', (p, m) => got.push([p.title, m.replayed]));
    assert.deepStrictEqual(got, [['A', true]]);
  });

  it('does not mark a live delivery as replayed', () => {
    const b = bus({ sticky: { ctx: { store: 'memory', ttlMs: 1000 } } });
    const got = [];
    b.on('ctx', (p, m) => got.push(m.replayed));
    b.emit('ctx', 1);
    assert.deepStrictEqual(got, [false]);
  });

  it('expires after ttlMs', () => {
    let t = 1000;
    const b = bus({ now: () => t, sticky: { ctx: { store: 'memory', ttlMs: 500 } } });
    b.emit('ctx', 1);
    t += 501;
    const got = [];
    b.on('ctx', (p) => got.push(p));
    assert.deepStrictEqual(got, []);
  });

  it('session sticky survives a "navigation" through storage', () => {
    const storage = fakeStorage();
    const a = bus({ storage, sticky: { ctx: { store: 'session', ttlMs: 30000, consume: false } } });
    a.emit('ctx', { title: 'handoff' });
    const page2 = bus({ storage, sticky: { ctx: { store: 'session', ttlMs: 30000, consume: false } } });
    const got = [];
    page2.on('ctx', (p, m) => got.push([p.title, m.replayed]));
    assert.deepStrictEqual(got, [['handoff', true]]);
  });

  it('drops a stored event that has expired or fails validation', () => {
    const storage = fakeStorage({
      'sola:bus:sticky:old': JSON.stringify({ v: 1, t: 0, d: { text: 'stale' } }),
      'sola:bus:sticky:bad': JSON.stringify({ v: 1, t: Date.now(), d: { text: 7 } }),
    });
    const b = bus({
      storage,
      validate: { bad: isString },
      onReject: () => {},
      sticky: { old: { store: 'session', ttlMs: 1000, consume: false }, bad: { store: 'session', ttlMs: 60000, consume: false } },
    });
    const got = [];
    b.on('old', () => got.push('old'));
    b.on('bad', () => got.push('bad'));
    assert.deepStrictEqual(got, []);
    assert.strictEqual(storage.raw.size, 0, 'bad entries are removed from storage');
  });

  it('consume:true retires the stored copy on first replay, but siblings in the same page still get it', () => {
    const storage = fakeStorage();
    const cfg = { ctx: { store: 'session', ttlMs: 30000, consume: true } };
    bus({ storage, sticky: cfg }).emit('ctx', { title: 'once' });
    assert.ok(storage.raw.has('sola:bus:sticky:ctx'));

    const page2 = bus({ storage, sticky: cfg });
    const first = []; const sibling = [];
    page2.on('ctx', (p) => first.push(p.title));
    assert.strictEqual(storage.raw.has('sola:bus:sticky:ctx'), false, 'storage copy consumed');
    page2.on('ctx', (p) => sibling.push(p.title));
    assert.deepStrictEqual([first, sibling], [['once'], ['once']]);

    // a reload (new bus, same storage) no longer sees it
    const reload = bus({ storage, sticky: cfg });
    const again = [];
    reload.on('ctx', (p) => again.push(p));
    assert.deepStrictEqual(again, []);
  });

  it('consume:false keeps the stored copy for other islands and later pages', () => {
    const storage = fakeStorage();
    const cfg = { ctx: { store: 'session', ttlMs: 30000, consume: false } };
    bus({ storage, sticky: cfg }).emit('ctx', 'shared');
    const page2 = bus({ storage, sticky: cfg });
    page2.on('ctx', () => {});
    assert.ok(storage.raw.has('sola:bus:sticky:ctx'));
  });

  it('a late handler on the emitting page does not consume the handoff copy', () => {
    const storage = fakeStorage();
    const b = bus({ storage, sticky: { ctx: { store: 'session', ttlMs: 30000, consume: true } } });
    b.emit('ctx', 'for-next-page');
    b.on('ctx', () => {});   // replay within the page that emitted it
    assert.ok(storage.raw.has('sola:bus:sticky:ctx'), 'still there for the next page');
  });

  it('clearPersistentState wipes sticky events (sign-out)', () => {
    const storage = fakeStorage();
    const b = bus({ storage, sticky: { ctx: { store: 'session', ttlMs: 30000, consume: false } } });
    b.emit('ctx', 'secret-ish');
    clearPersistentState({ channel: uniq('clear') });
    const got = [];
    b.on('ctx', (p) => got.push(p));
    assert.deepStrictEqual(got, []);
    assert.strictEqual(storage.raw.has('sola:bus:sticky:ctx'), false);
  });
});

describe('createBus: lifecycle', () => {
  it('dispose stops delivery and releases the channel', () => {
    const b = createBus({ channel: uniq('life'), broadcast: ['t'], validate: { t: () => true }, storage: fakeStorage() });
    let hits = 0;
    b.on('t', () => hits++);
    b.dispose();
    assert.strictEqual(b.emit('t', 1), false);
    assert.strictEqual(hits, 0);
  });
});

describe('createBus: hostile type names', () => {
  it('an inherited property name is not mistaken for a validator or guard', () => {
    // 'constructor' resolves to Object on a plain object; it must not count as a validator.
    assert.throws(() => createBus({ broadcast: ['constructor'], storage: fakeStorage() }), /no validator/);
    assert.throws(() => createBus({ dom: { target: new EventTarget(), in: ['toString'] }, storage: fakeStorage() }), /no validator/);
  });

  it('a remote message with a non-string or unlisted type cannot grow the warn set or flood the console', async () => {
    const ch = uniq('hostile');
    const other = raw(ch);
    const warns = [];
    const orig = console.warn; console.warn = (m) => warns.push(m);
    try {
      const b = bus({ channel: ch, broadcast: ['ok'], validate: { ok: () => true } });
      let hits = 0;
      b.on('ok', () => hits++);
      for (let i = 0; i < 300; i++) other.postMessage({ bus: 1, type: `junk-${i}`, payload: 1, origin: 'x' });
      other.postMessage({ bus: 1, type: { not: 'a string' }, payload: 1, origin: 'x' });
      other.postMessage({ bus: 1, type: 'ok', payload: 1, origin: 'x' });
      await waitFor(() => hits === 1);
      await settle();
    } finally { console.warn = orig; }
    assert.ok(warns.length <= 50, `warned ${warns.length} times`);
  });
});
