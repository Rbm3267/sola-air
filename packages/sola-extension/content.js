// Sola AIR — Content Script (Live Page Component Preview & DOM Insertion Engine)

(function () {
  if (window.__SOLA_INITIALIZED__) return;
  window.__SOLA_INITIALIZED__ = true;

  // Code generation and escaping live in codegen.js, which the side panel injects
  // first. Keeping them there lets Node test that "Copy code" output works.
  const { escapeHtml, generateCode, summarize, isMetricValue, startsWithNumber, metricNumber } = globalThis.SolaCodegen || {};
  const SolaCodegen = globalThis.SolaCodegen;
  if (!generateCode) {
    console.error('[Sola] codegen.js did not load; cannot build code snippets.');
    return;
  }

  let hostDiv = null;
  let isTargetMode = false;
  let targetOverlay = null;
  let elementHighlight = null;
  let currentPreview = null;
  let dragCleanup = null;

  function cleanupDragListeners() {
    if (dragCleanup) {
      dragCleanup();
      dragCleanup = null;
    }
  }

  // Walk shadow roots recursively
  function walkShadows(root, depth, collect) {
    if (depth > 8) return;
    const els = root.querySelectorAll('*');
    for (const el of els) {
      collect(el);
      if (el.shadowRoot) walkShadows(el.shadowRoot, depth + 1, collect);
    }
  }

  // Scrape a specific element's subtree for label+value pairs
  function scrapeElement(root) {
    const metrics = [];
    const seenLabels = new Set();
    const seenValues = new Set();

    function addMetric(label, value, variant) {
      label = label.replace(/[:\-]+$/, '').trim();
      value = value.trim();
      if (!label || !value || label.length < 2 || label.length > 50) return;
      if (seenLabels.has(label.toLowerCase()) || seenValues.has(value)) return;
      seenLabels.add(label.toLowerCase());
      seenValues.add(value);
      metrics.push({ label, value, variant: variant || 'neutral' });
    }

    // Strategy 1: find heading + big-number sibling pairs within the element
    // Covers plain HTML structures like task status cards
    const allText = [];
    walkShadows(root, 0, (el) => {
      const tag = el.tagName || '';
      const text = (el.shadowRoot?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 200 || el.children.length > 4) return;

      // Pure number leaf node — pair with nearest label sibling
      if (isMetricValue(text) && el.children.length === 0) {
        // Look for a label in siblings or parent's first child
        const parent = el.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter(c => c !== el);
          const labelEl = siblings.find(s => s.textContent && !startsWithNumber(s.textContent) && s.textContent.trim().length > 1);
          if (labelEl) {
            const label = labelEl.textContent.trim();
            const numVal = metricNumber(text);
            const variant = numVal > 10000 ? 'warn' : numVal > 0 ? 'ok' : 'neutral';
            addMetric(label, text, variant);
            return;
          }
        }
        allText.push({ type: 'value', text });
      } else if (el.children.length === 0 && text.length > 1 && !startsWithNumber(text) && !/^\s*$/.test(text)) {
        allText.push({ type: 'label', text });
      }
    });

    // Strategy 2: consecutive label/value pairs from the collected text list
    for (let i = 0; i < allText.length - 1; i++) {
      if (allText[i].type === 'label' && allText[i + 1].type === 'value') {
        const numVal = metricNumber(allText[i + 1].text);
        const variant = numVal > 10000 ? 'warn' : numVal > 0 ? 'ok' : 'neutral';
        addMetric(allText[i].text, allText[i + 1].text, variant);
      }
    }

    // Strategy 3: card-header elements that read "Label123 description"
    walkShadows(root, 0, (el) => {
      if (!(el.tagName || '').includes('CARD-HEADER')) return;
      const text = (el.shadowRoot?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim();
      const m = text.match(/^([A-Za-z][A-Za-z\s\-\/]+?)\s*([$€£¥]?[\d,]+(?:\.\d+)?[KMBk]?)\s/);
      if (!m) return;
      const numVal = metricNumber(m[2]);
      addMetric(m[1], m[2], numVal > 10000 ? 'warn' : 'ok');
    });

    // Strategy 4: label/value elements whose text runs together, "LabelValue"
    walkShadows(root, 0, (el) => {
      if (!(el.tagName || '').includes('LABEL') && !(el.tagName || '').includes('VALUE')) return;
      const text = (el.shadowRoot?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length > 80) return;
      const m = text.match(/^([A-Za-z][A-Za-z\s]+?)\s*([$€£¥]?[\d,]+(?:\.\d+)?[KMBk%]?)$/);
      if (!m) return;
      const numVal = metricNumber(m[2]);
      addMetric(m[1], m[2], numVal > 10000 ? 'warn' : numVal > 0 ? 'ok' : 'neutral');
    });

    return metrics.slice(0, 8);
  }

  // Scrape the full page (used when no target element selected)
  function scrapePageData() {
    return scrapeElement(document);
  }

  function getPageSummary() {
    return {
      title: document.title.replace(/\s*[|\-–]\s*.+$/, '').trim() || 'Page Overview',
      host: location.hostname.replace('www.', '')
    };
  }

  function buildCardHTML(metrics, contextLabel) {
    const page = getPageSummary();
    const heading = escapeHtml(contextLabel || page.title);
    const host = escapeHtml(page.host);

    if (metrics.length === 0) {
      return `
        <div style="background:#0c1222;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;width:290px;">
          <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">${host}</div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:6px;">${heading}</div>
          <div style="font-size:11px;color:#475569;">No structured metrics detected in this element.</div>
        </div>`;
    }

    if (metrics.length === 1) {
      const m = metrics[0];
      const color = m.variant === 'warn' ? '#f59e0b' : m.variant === 'ok' ? '#10b981' : '#94a3b8';
      return `
        <div style="background:#0c1222;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;width:200px;text-align:center;">
          <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">${escapeHtml(m.label)}</div>
          <div style="font-size:40px;font-weight:800;font-family:monospace;color:${color};line-height:1;">${escapeHtml(m.value)}</div>
          <div style="font-size:10px;color:#475569;margin-top:6px;">${host}</div>
        </div>`;
    }

    const rows = metrics.map(m => {
      const color = m.variant === 'warn' ? '#f59e0b' : m.variant === 'ok' ? '#10b981' : '#94a3b8';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:11px;color:#94a3b8;max-width:185px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.label)}</span>
        <span style="font-size:12px;font-weight:700;font-family:monospace;color:${color};">${escapeHtml(m.value)}</span>
      </div>`;
    }).join('');

    return `
      <div style="background:#0c1222;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:18px;width:290px;">
        <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${host}</div>
        <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:10px;">${heading}</div>
        ${rows}
      </div>`;
  }

  function createHost(x, y) {
    cleanupDragListeners();
    if (hostDiv) { hostDiv.remove(); hostDiv = null; }
    hostDiv = document.createElement('div');
    hostDiv.id = 'sola-preview-root';
    Object.assign(hostDiv.style, {
      position: 'fixed',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      left: x != null ? `${x}px` : 'auto',
      top: y != null ? `${y}px` : 'auto',
      right: x != null ? 'auto' : '24px',
      bottom: x != null ? 'auto' : '24px',
    });
    document.documentElement.appendChild(hostDiv);
  }

  // Position card next to a target element (right side, then below if no room)
  function positionNextTo(targetRect) {
    const CARD_W = 310;
    const CARD_H = 260;
    const PAD = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x, y;

    if (targetRect.right + PAD + CARD_W < vw) {
      // Right side fits
      x = targetRect.right + PAD;
      y = Math.max(PAD, Math.min(targetRect.top, vh - CARD_H - PAD));
    } else if (targetRect.left - PAD - CARD_W > 0) {
      // Left side fits
      x = targetRect.left - PAD - CARD_W;
      y = Math.max(PAD, Math.min(targetRect.top, vh - CARD_H - PAD));
    } else {
      // Below
      x = Math.max(PAD, Math.min(targetRect.left, vw - CARD_W - PAD));
      y = Math.min(targetRect.bottom + PAD, vh - CARD_H - PAD);
    }

    return { x, y };
  }

  function highlightTarget(el) {
    clearHighlight();
    elementHighlight = document.createElement('div');
    const rect = el.getBoundingClientRect();
    Object.assign(elementHighlight.style, {
      position: 'fixed',
      left: `${rect.left - 3}px`,
      top: `${rect.top - 3}px`,
      width: `${rect.width + 6}px`,
      height: `${rect.height + 6}px`,
      border: '2px solid #10b981',
      borderRadius: '10px',
      pointerEvents: 'none',
      zIndex: '2147483646',
      boxShadow: '0 0 0 4px rgba(16,185,129,0.12)',
      transition: 'all 0.15s ease-out'
    });
    document.documentElement.appendChild(elementHighlight);
  }

  function clearHighlight() {
    if (elementHighlight) { elementHighlight.remove(); elementHighlight = null; }
  }

  const DATA_COMPONENTS = new Set(['datacard','gauge','waterfall','dial']);

  function showComponent(componentId, targetEl) {
    // Ids come from the side panel or from a page message. Only known ones count,
    // so a made-up id (or an object property name) cannot reach the lookup tables.
    if (!Object.prototype.hasOwnProperty.call(SolaCodegen.COMPONENTS, componentId)) return;
    const isStatic = !DATA_COMPONENTS.has(componentId) && !!STATIC_RENDERS[componentId];

    let metrics = [], contextLabel = null, cardHTML;

    if (isStatic) {
      cardHTML = STATIC_RENDERS[componentId]();
    } else {
      metrics = targetEl ? scrapeElement(targetEl) : scrapePageData();
      contextLabel = targetEl
        ? (targetEl.querySelector('h1,h2,h3,[class*="title"],[class*="heading"]')?.textContent?.trim()
           || targetEl.getAttribute('aria-label')
           || targetEl.textContent?.trim().split('\n')[0].trim().slice(0, 40))
        : null;
      cardHTML = buildCardHTML(metrics, contextLabel);
    }

    let x = null, y = null;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      highlightTarget(targetEl);
      const pos = positionNextTo(rect);
      x = pos.x;
      y = pos.y;
    }

    createHost(x, y);

    const shadow = hostDiv.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @keyframes slideIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
      .wrap { animation: slideIn 0.2s cubic-bezier(0.16,1,0.3,1); }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 6px 10px; margin-bottom: 8px;
        background: #090d19; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; cursor: grab; user-select: none;
      }
      .header:active { cursor: grabbing; }
      .label { font-size: 10px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
      .controls { display: flex; align-items: center; gap: 4px; }
      .btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; padding: 3px 6px; border-radius: 6px; font-size: 10px; transition: all 0.15s; }
      .btn:hover { color: #fff; background: rgba(255,255,255,0.15); }
      .close { background: none; border: none; color: #64748b; cursor: pointer; padding: 3px 5px; border-radius: 4px; font-size: 12px; }
      .close:hover { color: #f43f5e; }
      .code-bar { margin-top: 8px; background: #030712; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 10px; font-family: monospace; font-size: 10px; color: #38bdf8; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .copy { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; cursor: pointer; white-space: nowrap; }
      .copy:hover { background: rgba(16,185,129,0.25); }
    `;
    shadow.appendChild(style);

    const fullCode = generateCode(componentId, metrics);
    const codeSummary = escapeHtml(summarize(componentId, metrics));

    const wrapper = document.createElement('div');
    wrapper.className = 'wrap';
    wrapper.innerHTML = `
      <div class="header" id="drag-hdr">
        <span class="label"><span class="dot"></span>Sola Shadow DOM</span>
        <div class="controls">
          <button class="btn" id="target-btn">🎯 Target Element</button>
          <button class="btn" id="snap-btn">📍 Snap</button>
          <button class="close" id="close-btn">✕</button>
        </div>
      </div>
      ${cardHTML}
      <div class="code-bar">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#38bdf8;">${codeSummary}</span>
        <button class="copy" id="copy-btn">Copy</button>
      </div>
    `;
    shadow.appendChild(wrapper);

    // Drag
    let dragging = false, sx = 0, sy = 0, il = 0, it = 0;
    shadow.getElementById('drag-hdr').addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = hostDiv.getBoundingClientRect();
      il = r.left; it = r.top;
      Object.assign(hostDiv.style, { bottom: 'auto', right: 'auto', left: il + 'px', top: it + 'px' });
    });
    const onMouseMove = e => {
      if (!dragging || !hostDiv) return;
      hostDiv.style.left = (il + e.clientX - sx) + 'px';
      hostDiv.style.top = (it + e.clientY - sy) + 'px';
    };
    const onMouseUp = () => { dragging = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dragCleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    // Snap
    let snapIdx = 0;
    const snaps = [
      { bottom:'24px', right:'24px', top:'auto', left:'auto' },
      { bottom:'24px', left:'24px', top:'auto', right:'auto' },
      { top:'24px', right:'24px', bottom:'auto', left:'auto' },
      { top:'24px', left:'24px', bottom:'auto', right:'auto' }
    ];
    shadow.getElementById('snap-btn').addEventListener('click', () => {
      clearHighlight();
      snapIdx = (snapIdx + 1) % snaps.length;
      Object.assign(hostDiv.style, snaps[snapIdx]);
    });

    shadow.getElementById('target-btn').addEventListener('click', () => startTargetPicker(componentId));

    // Close
    shadow.getElementById('close-btn').addEventListener('click', removePreview);

    // Copy
    const copyBtn = shadow.getElementById('copy-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(fullCode);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 1500);
    });

    currentPreview = componentId;
  }

  // Static renders for UI primitive components (no page data to scrape)
  function staticRender(html, label) {
    return `<div style="background:#0c1222;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;width:290px;">
      <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">${label}</div>
      ${html}
    </div>`;
  }

  const STATIC_RENDERS = {
    toggle: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;color:#94a3b8;">Notifications</span>
          <div style="width:40px;height:22px;background:#3b82f6;border-radius:11px;position:relative;cursor:pointer;">
            <div style="width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;right:2px;top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;color:#94a3b8;">Dark mode</span>
          <div style="width:40px;height:22px;background:rgba(255,255,255,0.1);border-radius:11px;position:relative;cursor:pointer;">
            <div style="width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;left:2px;top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;color:#94a3b8;">Auto-sync</span>
          <div style="width:40px;height:22px;background:#3b82f6;border-radius:11px;position:relative;cursor:pointer;">
            <div style="width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;right:2px;top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        </div>
      </div>`, 'Toggle Switch'),

    slider: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:11px;color:#94a3b8;">Threshold</span>
            <span style="font-size:11px;font-weight:700;color:#3b82f6;font-family:monospace;">74%</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;position:relative;">
            <div style="width:74%;height:100%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:3px;"></div>
            <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;left:74%;top:-4px;transform:translateX(-50%);box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;"></div>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:11px;color:#94a3b8;">Range</span>
            <span style="font-size:11px;font-weight:700;color:#8b5cf6;font-family:monospace;">20 – 80</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;position:relative;">
            <div style="position:absolute;left:20%;width:60%;height:100%;background:linear-gradient(90deg,#8b5cf6,#6366f1);border-radius:3px;"></div>
            <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;left:20%;top:-4px;transform:translateX(-50%);box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;"></div>
            <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;left:80%;top:-4px;transform:translateX(-50%);box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;"></div>
          </div>
        </div>
      </div>`, 'Range Slider'),

    button: () => staticRender(`
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Primary</button>
        <button style="padding:8px 16px;background:rgba(255,255,255,0.05);color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Secondary</button>
        <button style="padding:8px 16px;background:transparent;color:#94a3b8;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Ghost</button>
        <button style="padding:8px 16px;background:#f43f5e;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Danger</button>
        <button style="padding:8px 16px;background:rgba(255,255,255,0.05);color:#64748b;border:1px solid rgba(255,255,255,0.05);border-radius:8px;font-size:12px;font-weight:600;cursor:not-allowed;opacity:0.5;" disabled>Disabled</button>
      </div>`, 'Button · 5 Variants'),

    tabs: () => staticRender(`
      <div>
        <div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:14px;">
          <div style="padding:8px 14px;font-size:12px;font-weight:700;color:#3b82f6;border-bottom:2px solid #3b82f6;margin-bottom:-1px;cursor:pointer;">Overview</div>
          <div style="padding:8px 14px;font-size:12px;color:#64748b;cursor:pointer;">Activity</div>
          <div style="padding:8px 14px;font-size:12px;color:#64748b;cursor:pointer;">Settings</div>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          <div style="padding:5px 12px;background:#3b82f6;color:#fff;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;">All</div>
          <div style="padding:5px 12px;background:rgba(255,255,255,0.05);color:#64748b;border-radius:20px;font-size:11px;cursor:pointer;">Active</div>
          <div style="padding:5px 12px;background:rgba(255,255,255,0.05);color:#64748b;border-radius:20px;font-size:11px;cursor:pointer;">Archived</div>
        </div>
      </div>`, 'Tabs · Underline & Pill'),

    avatar: () => staticRender(`
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="position:relative;display:inline-block;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">BM</div>
          <div style="width:10px;height:10px;background:#10b981;border-radius:50%;border:2px solid #0c1222;position:absolute;bottom:1px;right:1px;"></div>
        </div>
        <div style="position:relative;display:inline-block;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f43f5e);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">SA</div>
          <div style="width:10px;height:10px;background:#f59e0b;border-radius:50%;border:2px solid #0c1222;position:absolute;bottom:1px;right:1px;"></div>
        </div>
        <div style="position:relative;display:inline-block;">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#64748b;">+4</div>
        </div>
        <div style="margin-left:4px;">
          <div style="font-size:12px;font-weight:600;color:#e2e8f0;">Bennett M.</div>
          <div style="font-size:10px;color:#10b981;margin-top:1px;">● Online</div>
        </div>
      </div>`, 'Avatar · Status Ring'),

    listblock: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:0;">
        ${[
          { label: 'CMDBTASK0001001', status: 'Open', color: '#f59e0b' },
          { label: 'CMDBTASK0001012', status: 'In Progress', color: '#3b82f6' },
          { label: 'CMDBTASK0001023', status: 'Open', color: '#f59e0b' },
          { label: 'CMDBTASK0001034', status: 'Closed', color: '#10b981' },
        ].map(r => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:11px;color:#94a3b8;font-family:monospace;">${r.label}</span>
          <span style="font-size:10px;font-weight:700;color:${r.color};">${r.status}</span>
        </div>`).join('')}
      </div>`, 'ListBlock · Data Feed'),

    stream: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:6px;font-family:monospace;font-size:10px;">
        <div style="color:#10b981;">→ CMDB sync complete <span style="color:#475569;">09:51:02</span></div>
        <div style="color:#3b82f6;">→ Task assigned to CW Group <span style="color:#475569;">09:50:47</span></div>
        <div style="color:#f59e0b;">⚠ 139 duplicates flagged <span style="color:#475569;">09:49:33</span></div>
        <div style="color:#94a3b8;">→ Health check passed <span style="color:#475569;">09:48:11</span></div>
        <div style="color:#f43f5e;">✕ Stale CI threshold exceeded <span style="color:#475569;">09:47:58</span></div>
      </div>`, 'StreamView · Live Log'),

    card: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;">
          <div style="font-size:14px;font-weight:600;color:#e2e8f0;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.06);">Weekly summary</div>
          <div style="font-size:12px;color:#94a3b8;line-height:1.5;">Card body content goes in the slot.</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-top:3px solid #3b82f6;border-radius:12px;padding:14px 16px;">
          <div style="font-size:14px;font-weight:600;color:#e2e8f0;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.06);">With accentColor</div>
          <div style="font-size:12px;color:#94a3b8;line-height:1.5;">A 3px top border in the color you pass.</div>
        </div>
      </div>`, 'Card · Title & Accent'),

    table: () => staticRender(`
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr>
            ${['Service', 'Region', 'Status'].map(h => `<th scope="col" style="text-align:left;padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.1);">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${[
            { name: 'api-gateway', region: 'us-east', status: 'Healthy', color: '#10b981', bg: 'rgba(16,185,129,0.12)', stripe: false },
            { name: 'billing', region: 'eu-west', status: 'Slow', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', stripe: true },
            { name: 'search', region: 'us-west', status: 'Healthy', color: '#10b981', bg: 'rgba(16,185,129,0.12)', stripe: false },
            { name: 'reports', region: 'ap-south', status: 'Idle', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', stripe: true },
          ].map(r => `<tr style="background:${r.stripe ? 'rgba(255,255,255,0.03)' : 'transparent'};">
            <th scope="row" style="text-align:left;padding:7px 8px;font-weight:600;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.05);">${r.name}</th>
            <td style="padding:7px 8px;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.05);">${r.region}</td>
            <td style="padding:7px 8px;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;color:${r.color};background:${r.bg};">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`, 'Table · Rows & Pills'),

    chart: () => staticRender(`
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
          <div>
            <div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-family:monospace;">Signal telemetry</div>
            <div style="font-size:24px;font-weight:700;color:#f8fafc;margin-top:4px;letter-spacing:-0.02em;">94.2 req/s</div>
          </div>
          <span style="background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.25);font-size:11px;font-weight:600;font-family:monospace;padding:2px 7px;border-radius:6px;">+14.8%</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:5px;height:60px;padding-top:6px;">
          ${[35, 55, 40, 80, 65, 95, 70, 88].map(v => `<div style="flex:1;height:${v}%;background:rgba(16,185,129,0.4);border-radius:3px 3px 0 0;"></div>`).join('')}
        </div>
      </div>`, 'Chart · Bars & Delta'),

    badge: () => staticRender(`
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${[
          { label: 'Default', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
          { label: 'Success', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
          { label: 'Warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
          { label: 'Error', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
        ].map(b => `<span style="display:inline-block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;font-family:monospace;padding:3px 8px;border-radius:6px;color:${b.color};background:${b.bg};">${b.label}</span>`).join('')}
      </div>`, 'Badge · 4 Variants'),

    alert: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${[
          { msg: 'A new version is available.', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
          { msg: 'Changes saved.', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
          { msg: 'Storage is almost full.', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
          { msg: 'The request failed.', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)' },
        ].map(a => `<div style="padding:10px 12px;border-radius:10px;font-size:12px;font-weight:500;line-height:1.5;color:${a.color};background:${a.bg};border:1px solid ${a.border};">${a.msg}</div>`).join('')}
      </div>`, 'Alert · Info, Success, Warning, Error'),

    spinner: () => staticRender(`
      <div style="display:flex;align-items:center;gap:18px;">
        <style>@keyframes sola-ext-spin{to{transform:rotate(360deg);}}</style>
        ${[16, 24, 40].map(px => `<div style="width:${px}px;height:${px}px;border:2.5px solid rgba(255,255,255,0.1);border-top-color:#0ea5e9;border-radius:50%;animation:sola-ext-spin 0.6s linear infinite;"></div>`).join('')}
        <span style="font-size:12px;color:#94a3b8;">Loading</span>
      </div>`, 'Spinner · Sizes'),

    textinput: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:0.02em;">Project name</span>
          <div style="padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;font-size:13px;color:#e2e8f0;">Quarterly report</div>
          <span style="font-size:11px;color:#64748b;">Shown on the dashboard.</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:0.02em;">Contact email</span>
          <div style="padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid #f43f5e;border-radius:12px;font-size:13px;color:#e2e8f0;">name@</div>
          <span style="font-size:11px;color:#f43f5e;">Enter a valid email address.</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;opacity:0.5;">
          <span style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:0.02em;">Disabled</span>
          <div style="padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;font-size:13px;color:#64748b;">Enter value...</div>
        </div>
      </div>`, 'TextInput · Help, Error, Disabled'),

    select: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:0.02em;">Region</span>
          <div style="position:relative;padding:8px 34px 8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;font-weight:500;color:#e2e8f0;">US East
            <svg style="position:absolute;right:11px;top:11px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:0.02em;">Plan</span>
          <div style="position:relative;padding:8px 34px 8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;font-weight:500;color:#64748b;">Choose an option...
            <svg style="position:absolute;right:11px;top:11px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>`, 'Select · Selected & Placeholder'),

    datepicker: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;font-family:monospace;">Start date</span>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;font-size:13px;color:#e2e8f0;">
            <span>2026-03-14</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;font-family:monospace;">End date</span>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;font-size:13px;color:#64748b;">
            <span>Pick a date...</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
        </div>
      </div>`, 'DatePicker · Value & Placeholder'),

    sentinel: () => staticRender(`
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${[
          { label: 'CMDB Sync', ok: true },
          { label: 'Health Score', ok: true },
          { label: 'Duplicate Check', ok: false },
          { label: 'Stale CI Monitor', ok: false },
        ].map(s => `<div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:#94a3b8;">${s.label}</span>
          <div style="display:flex;align-items:center;gap:5px;">
            <div style="width:6px;height:6px;border-radius:50%;background:${s.ok ? '#10b981' : '#f43f5e'};${s.ok ? '' : 'animation:pulse 1.5s infinite;'}"></div>
            <span style="font-size:10px;font-weight:700;color:${s.ok ? '#10b981' : '#f43f5e'};">${s.ok ? 'OK' : 'ALERT'}</span>
          </div>
        </div>`).join('')}
      </div>`, 'SentinelCapsule · Health HUD'),
  };



  function startTargetPicker(componentId) {
    if (isTargetMode) return;
    isTargetMode = true;

    // Full-screen drag-to-select overlay
    const screen = document.createElement('div');
    Object.assign(screen.style, {
      position: 'fixed', inset: '0', zIndex: '2147483646',
      cursor: 'crosshair'
    });

    // Instruction badge
    const badge = document.createElement('div');
    Object.assign(badge.style, {
      position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
      background: '#090d19', border: '1px solid #10b981', borderRadius: '8px',
      color: '#10b981', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace',
      padding: '6px 14px', pointerEvents: 'none', zIndex: '2147483647',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    });
    badge.textContent = 'Drag to select a region  •  Esc to cancel';
    screen.appendChild(badge);

    // Selection rectangle
    const selBox = document.createElement('div');
    Object.assign(selBox.style, {
      position: 'fixed', border: '2px solid #10b981',
      background: 'rgba(16,185,129,0.08)', borderRadius: '4px',
      pointerEvents: 'none', display: 'none'
    });
    screen.appendChild(selBox);

    document.documentElement.appendChild(screen);

    let startX = 0, startY = 0, dragging = false;

    function updateBox(x1, y1, x2, y2) {
      const left = Math.min(x1, x2), top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
      Object.assign(selBox.style, {
        display: 'block',
        left: left + 'px', top: top + 'px',
        width: width + 'px', height: height + 'px'
      });
    }

    // Collect all text nodes within a viewport rect, walking shadow roots
    function scrapeRegion(x1, y1, x2, y2) {
      const left = Math.min(x1, x2), top = Math.min(y1, y2);
      const right = Math.max(x1, x2), bottom = Math.max(y1, y2);

      const metrics = [];
      const seenLabels = new Set(), seenValues = new Set();

      function addMetric(label, value, variant) {
        label = label.replace(/[:\-]+$/, '').trim();
        value = value.trim();
        if (!label || !value || label.length < 2 || label.length > 50) return;
        if (seenLabels.has(label.toLowerCase())) return; // dedupe by label only — same value can appear on different metrics
        seenLabels.add(label.toLowerCase());
        seenValues.add(value);
        metrics.push({ label, value, variant: variant || 'neutral' });
      }

      const collected = []; // { type: 'label'|'value', text }

      walkShadows(document, 0, (el) => {
        if (el.children?.length > 0) return; // leaf nodes only
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        // Check if this element's center is within the drag region
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (cx < left || cx > right || cy < top || cy > bottom) return;

        const text = el.textContent?.trim().replace(/\s+/g, ' ');
        if (!text || text.length === 0 || text.length > 80) return;

        if (isMetricValue(text)) {
          collected.push({ type: 'value', text });
        } else if (!startsWithNumber(text) && text.length > 1) {
          collected.push({ type: 'label', text });
        }
      });

      // Pair consecutive label → value
      for (let i = 0; i < collected.length - 1; i++) {
        if (collected[i].type === 'label' && collected[i + 1].type === 'value') {
          const numVal = metricNumber(collected[i + 1].text);
          const variant = numVal > 10000 ? 'warn' : numVal > 0 ? 'ok' : 'neutral';
          addMetric(collected[i].text, collected[i + 1].text, variant);
          i++; // skip the value we just consumed
        }
      }

      // Also try unpaired values with labels from nearby text
      for (let i = 0; i < collected.length; i++) {
        if (collected[i].type === 'value' && !seenValues.has(collected[i].text)) {
          // look backwards for nearest unused label
          for (let j = i - 1; j >= 0; j--) {
            if (collected[j].type === 'label' && !seenLabels.has(collected[j].text.toLowerCase())) {
              const numVal = metricNumber(collected[i].text);
              addMetric(collected[j].text, collected[i].text, numVal > 10000 ? 'warn' : 'ok');
              break;
            }
          }
        }
      }

      return metrics.slice(0, 8);
    }

    screen.addEventListener('mousedown', e => {
      startX = e.clientX; startY = e.clientY;
      dragging = true;
    });

    screen.addEventListener('mousemove', e => {
      if (!dragging) return;
      updateBox(startX, startY, e.clientX, e.clientY);
    });

    function onEsc(e) {
      if (e.key === 'Escape') {
        isTargetMode = false;
        screen.remove();
        document.removeEventListener('keydown', onEsc);
      }
    }

    screen.addEventListener('mouseup', e => {
      if (!dragging) return;
      dragging = false;
      isTargetMode = false;
      screen.remove();
      document.removeEventListener('keydown', onEsc);

      const endX = e.clientX, endY = e.clientY;
      // If it was just a click (tiny drag), expand to a reasonable hit area
      const minSize = 20;
      const x1 = Math.abs(endX - startX) < minSize ? startX - 40 : Math.min(startX, endX);
      const y1 = Math.abs(endY - startY) < minSize ? startY - 30 : Math.min(startY, endY);
      const x2 = Math.abs(endX - startX) < minSize ? startX + 40 : Math.max(startX, endX);
      const y2 = Math.abs(endY - startY) < minSize ? startY + 30 : Math.max(startY, endY);

      const metrics = scrapeRegion(x1, y1, x2, y2);
      showComponentFromRegion(componentId, metrics, { x: x2, y: (y1 + y2) / 2 }, { x1, y1, x2, y2 });
    });

    document.addEventListener('keydown', onEsc);
  }

  function showComponentFromRegion(componentId, metrics, anchor, region) {
    // Highlight the selected region
    clearHighlight();
    elementHighlight = document.createElement('div');
    Object.assign(elementHighlight.style, {
      position: 'fixed',
      left: `${region.x1}px`, top: `${region.y1}px`,
      width: `${region.x2 - region.x1}px`, height: `${region.y2 - region.y1}px`,
      border: '2px solid #10b981', borderRadius: '6px',
      boxShadow: '0 0 0 4px rgba(16,185,129,0.1)',
      pointerEvents: 'none', zIndex: '2147483645'
    });
    document.documentElement.appendChild(elementHighlight);

    const pos = positionNextTo({
      left: region.x1, top: region.y1,
      right: region.x2, bottom: region.y2
    });
    createHost(pos.x, pos.y);

    const shadow = hostDiv.attachShadow({ mode: 'closed' });
    const fullCode = generateCode(componentId, metrics);
    const codeSummary = escapeHtml(summarize(componentId, metrics));

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @keyframes slideIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
      .wrap { animation: slideIn 0.2s cubic-bezier(0.16,1,0.3,1); }
      .header { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; margin-bottom:8px; background:#090d19; border:1px solid rgba(255,255,255,0.08); border-radius:12px; cursor:grab; user-select:none; }
      .header:active { cursor:grabbing; }
      .label { font-size:10px; font-weight:700; color:#10b981; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:6px; }
      .dot { width:6px; height:6px; border-radius:50%; background:#10b981; }
      .controls { display:flex; align-items:center; gap:4px; }
      .btn { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; cursor:pointer; padding:3px 6px; border-radius:6px; font-size:10px; transition:all 0.15s; }
      .btn:hover { color:#fff; background:rgba(255,255,255,0.15); }
      .close { background:none; border:none; color:#64748b; cursor:pointer; padding:3px 5px; border-radius:4px; font-size:12px; }
      .close:hover { color:#f43f5e; }
      .code-bar { margin-top:8px; background:#030712; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:8px 10px; font-family:monospace; font-size:10px; color:#38bdf8; display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .copy { background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:3px 8px; border-radius:6px; font-size:9px; font-weight:700; cursor:pointer; white-space:nowrap; }
      .copy:hover { background:rgba(16,185,129,0.25); }
    `;
    shadow.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.className = 'wrap';
    wrapper.innerHTML = `
      <div class="header" id="drag-hdr">
        <span class="label"><span class="dot"></span>Sola Shadow DOM</span>
        <div class="controls">
          <button class="btn" id="target-btn">🎯 Target</button>
          <button class="btn" id="snap-btn">📍 Snap</button>
          <button class="close" id="close-btn">✕</button>
        </div>
      </div>
      ${buildCardHTML(metrics, null)}
      <div class="code-bar">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${codeSummary}</span>
        <button class="copy" id="copy-btn">Copy</button>
      </div>
    `;
    shadow.appendChild(wrapper);

    // Drag
    let drag = false, sx = 0, sy = 0, il = 0, it = 0;
    shadow.getElementById('drag-hdr').addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = hostDiv.getBoundingClientRect(); il = r.left; it = r.top;
      Object.assign(hostDiv.style, { bottom:'auto', right:'auto', left:il+'px', top:it+'px' });
    });
    const onRegionMouseMove = e => { if (drag && hostDiv) { hostDiv.style.left=(il+e.clientX-sx)+'px'; hostDiv.style.top=(it+e.clientY-sy)+'px'; } };
    const onRegionMouseUp = () => { drag = false; };
    window.addEventListener('mousemove', onRegionMouseMove);
    window.addEventListener('mouseup', onRegionMouseUp);
    dragCleanup = () => {
      window.removeEventListener('mousemove', onRegionMouseMove);
      window.removeEventListener('mouseup', onRegionMouseUp);
    };

    // Snap
    let snapIdx = 0;
    const snaps = [
      {bottom:'24px',right:'24px',top:'auto',left:'auto'},
      {bottom:'24px',left:'24px',top:'auto',right:'auto'},
      {top:'24px',right:'24px',bottom:'auto',left:'auto'},
      {top:'24px',left:'24px',bottom:'auto',right:'auto'}
    ];
    shadow.getElementById('snap-btn').addEventListener('click', () => {
      clearHighlight();
      snapIdx = (snapIdx + 1) % snaps.length;
      Object.assign(hostDiv.style, snaps[snapIdx]);
    });

    shadow.getElementById('target-btn').addEventListener('click', () => startTargetPicker(componentId));
    shadow.getElementById('close-btn').addEventListener('click', removePreview);

    const copyBtn = shadow.getElementById('copy-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(fullCode);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 1500);
    });

    currentPreview = componentId;
  }

  function removePreview() {
    cleanupDragListeners();
    if (hostDiv) { hostDiv.remove(); hostDiv = null; }
    clearHighlight();
    currentPreview = null;
  }

  // Extension message listener
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SOLA_SHOW_COMPONENT') {
        showComponent(message.component);
        sendResponse({ status: 'ok' });
      } else if (message.type === 'SOLA_REMOVE_PREVIEW') {
        removePreview();
        sendResponse({ status: 'removed' });
      }
      return true;
    });
  }

  // postMessage from Sola web pages
  const SOLA_ALLOWED_ORIGINS = [
    'https://sola-air.dev',
    'https://www.sola-air.dev',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173'
  ];
  window.addEventListener('message', (event) => {
    if (!SOLA_ALLOWED_ORIGINS.includes(event.origin)) return;
    if (event.data?.type === 'SOLA_MOUNT_IN_SITU' && event.data.component) {
      showComponent(event.data.component);
    }
  });
})();
