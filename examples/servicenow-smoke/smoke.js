/*
 * Sola AIR smoke harness for a real ServiceNow instance (or any multi-page host).
 *
 * Load this file AFTER @sola-air-ui/core's IIFE build (it needs window.SolaCore,
 * version 1.3.0 or newer) on every page you want to test. It mounts a small shell
 * inside a closed Shadow DOM, wires the event bus the way a production shell would,
 * and exposes window.solaSmoke:
 *
 *   solaSmoke.run()        run the checks that fit in one page; resolves to a list
 *   solaSmoke.handoff(n)   set a one-shot sticky handoff, for the cross-page checks
 *   solaSmoke.signOut()    clearPersistentState(), as your sign-out would
 *
 * It contains no credentials, no network calls and no instance-specific code.
 */
(function () {
  'use strict';

  var core = window.SolaCore;
  if (!core || !core.configureBus || !core.mountShell) {
    console.error('[sola smoke] window.SolaCore with createBus (core >= 1.3.0) is required.');
    return;
  }
  if (window.solaSmoke) return; // a second load on the same page is a no-op

  var rejections = [];
  var state = { context: '', toast: '', handoff: '', handoffReplayed: '' };

  var bus = core.configureBus({
    dom: { target: window, in: ['sola:context'], out: ['sola:navigate'] },
    broadcast: ['sola:toast'],
    validate: {
      'sola:context': function (p) { return !!p && typeof p.title === 'string'; },
      'sola:toast': function (p) { return !!p && typeof p.text === 'string'; },
      'sola:handoff': function (p) { return !!p && typeof p.note === 'string'; },
    },
    sticky: { 'sola:handoff': { store: 'session', ttlMs: 60000, consume: true } },
    onReject: function (info) { rejections.push(info); render(); },
  });

  // ── The shell: plain DOM in a closed shadow root (no compiler needed) ──────
  var els = {};
  function mount(target) {
    var style = document.createElement('style');
    style.textContent =
      '.panel{font:13px/1.4 system-ui,sans-serif;position:fixed;right:12px;bottom:12px;width:300px;' +
      'background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;padding:10px;z-index:2147483000}' +
      '.panel b{color:#6ee7b7}.row{display:flex;justify-content:space-between;gap:8px;margin:2px 0}' +
      '.k{color:#94a3b8}.v{font-family:ui-monospace,monospace;word-break:break-all;text-align:right}';
    target.appendChild(style);
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = '<b>Sola smoke</b><div id="rows"></div>';
    target.appendChild(panel);
    els.rows = panel.querySelector('#rows');
    render();
    return function () { panel.remove(); style.remove(); };
  }

  function render() {
    if (!els.rows) return;
    var rows = [
      ['context', state.context || '-'],
      ['toast', state.toast || '-'],
      ['handoff', state.handoff ? state.handoff + (state.handoffReplayed ? ' (replayed)' : '') : '-'],
      ['rejections', String(rejections.length)],
    ];
    els.rows.innerHTML = rows.map(function (r) {
      return '<div class="row"><span class="k">' + r[0] + '</span><span class="v">' + esc(r[1]) + '</span></div>';
    }).join('');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  bus.on('sola:context', function (p) { state.context = p.title; render(); });
  bus.on('sola:toast', function (p) { state.toast = p.text; render(); });
  bus.on('sola:handoff', function (p, meta) { state.handoff = p.note; state.handoffReplayed = meta.replayed ? 'yes' : ''; render(); });

  var shell = core.mountShell(mount, {}, { id: 'sola-smoke', shadow: 'closed' });

  // ── Checks that fit in one page ────────────────────────────────────────────
  function waitFor(fn, ms) {
    return new Promise(function (resolve) {
      var end = Date.now() + (ms || 1500);
      (function tick() { if (fn()) return resolve(true); if (Date.now() > end) return resolve(false); setTimeout(tick, 20); })();
    });
  }

  async function run() {
    var out = [];
    function check(name, ok, detail) { out.push({ name: name, pass: !!ok, detail: detail || '' }); }

    // 1. The shell is in a closed root: page scripts cannot read inside it.
    check('shell is in a closed shadow root',
      document.getElementById('sola-smoke').shadowRoot === null);

    // 2. A host script with no Sola import can talk to the shell.
    window.dispatchEvent(new CustomEvent('sola:context', { detail: { title: 'SMOKE-' + Date.now() } }));
    check('host CustomEvent reaches the shell', await waitFor(function () { return state.context.indexOf('SMOKE-') === 0; }));

    // 3. Malformed input is dropped and reported without its payload.
    var before = rejections.length, ctxBefore = state.context;
    window.dispatchEvent(new CustomEvent('sola:context', { detail: { title: 42, secret: 'hunter2' } }));
    await new Promise(function (r) { setTimeout(r, 60); });
    check('malformed context is rejected', rejections.length === before + 1 && state.context === ctxBefore);
    check('rejection report carries no payload', JSON.stringify(rejections).indexOf('hunter2') === -1);

    // 4. Only dom.out types reach the host.
    var got = [], leak = [];
    function onNav(e) { got.push(e.detail); }
    function onLeak() { leak.push(1); }
    window.addEventListener('sola:navigate', onNav);
    window.addEventListener('sola:internal', onLeak);
    bus.emit('sola:navigate', { view: 'smoke' });
    bus.emit('sola:internal', { x: 1 });
    window.removeEventListener('sola:navigate', onNav);
    window.removeEventListener('sola:internal', onLeak);
    check('dom.out reaches a host listener', got.length === 1 && got[0].view === 'smoke');
    check('unlisted bus events do not leak onto window', leak.length === 0);

    // 5. Host CSS cannot restyle the shell (the point of the closed root).
    var hostRule = document.createElement('style');
    hostRule.textContent = 'div, span { border: 7px solid red !important; }';
    document.head.appendChild(hostRule);
    var probe = document.createElement('div');
    document.body.appendChild(probe);
    var hostSeesRule = getComputedStyle(probe).borderTopWidth === '7px';
    probe.remove();
    var shellRoot = shell.root;
    var inner = shellRoot.querySelector('.panel');
    var shellBorder = inner ? getComputedStyle(inner).borderTopWidth : '?';
    hostRule.remove();
    check('host CSS cannot restyle the shell', hostSeesRule && shellBorder === '1px', 'panel border = ' + shellBorder);

    // 6. Sign-out wipes stored state.
    bus.emit('sola:handoff', { note: 'wipe-me' });
    var stored = Object.keys(sessionStorage).some(function (k) { return k.indexOf('sola:bus:sticky:') === 0; });
    core.clearPersistentState();
    var left = Object.keys(sessionStorage).filter(function (k) { return k.indexOf('sola:') === 0; });
    check('sticky handoff was stored', stored);
    check('clearPersistentState removes every sola: key', left.length === 0, left.join(','));

    var failed = out.filter(function (c) { return !c.pass; });
    console.table(out);
    console.log(failed.length ? '[sola smoke] ' + failed.length + ' FAILED' : '[sola smoke] all ' + out.length + ' checks passed');
    return out;
  }

  window.solaSmoke = {
    run: run,
    handoff: function (note) { return bus.emit('sola:handoff', { note: note || 'handoff-' + Date.now() }); },
    toast: function (text) { return bus.emit('sola:toast', { text: text || 'toast-' + Date.now() }); },
    signOut: function () { core.clearPersistentState(); },
    rejections: function () { return rejections.slice(); },
    teardown: function () { shell.teardown(); bus.dispose(); delete window.solaSmoke; },
  };
  console.log('[sola smoke] ready. Try: solaSmoke.run()');
})();
