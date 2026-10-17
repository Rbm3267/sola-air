// Sola AIR — Content Script (Live Page Component Preview & DOM Insertion Engine)

(function () {
  if (window.__SOLA_INITIALIZED__) return;
  window.__SOLA_INITIALIZED__ = true;

  // Code generation and escaping live in codegen.js, which the side panel injects
  // first. Keeping them there lets Node test that "Copy code" output works.
  const { escapeHtml, generateCode, summarize } = globalThis.SolaCodegen || {};
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
      if (/^\d[\d,\.]*[KMBk%]?$/.test(text) && el.children.length === 0) {
        // Look for a label in siblings or parent's first child
        const parent = el.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter(c => c !== el);
          const labelEl = siblings.find(s => s.textContent && !/^\d/.test(s.textContent.trim()) && s.textContent.trim().length > 1);
          if (labelEl) {
            const label = labelEl.textContent.trim();
            const numVal = parseFloat(text.replace(/[,KMBk%]/g, ''));
            const variant = numVal > 10000 ? 'warn' : numVal > 0 ? 'ok' : 'neutral';
            addMetric(label, text, variant);
            return;
          }
        }
        allText.push({ type: 'value', text });
      } else if (el.children.length === 0 && text.length > 1 && !/^\d/.test(text) && !/^\s*$/.test(text)) {
        allText.push({ type: 'label', text });
      }
    });

    // Strategy 2: consecutive label/value pairs from the collected text list
    for (let i = 0; i < allText.length - 1; i++) {
      if (allText[i].type === 'label' && allText[i + 1].type === 'value') {
        const numVal = parseFloat(allText[i + 1].text.replace(/[,KMBk%]/g, ''));
        const variant = numVal > 10000 ? 'warn' : numVal > 0 ? 'ok' : 'neutral';
        addMetric(allText[i].text, allText[i + 1].text, variant);
      }
    }

    // Strategy 3: card-header elements that read "Label123 description"
    walkShadows(root, 0, (el) => {
      if (!(el.tagName || '').includes('CARD-HEADER')) return;
      const text = (el.shadowRoot?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim();
      const m = text.match(/^([A-Za-z][A-Za-z\s\-\/]+?)\s*([\d,]+(?:\.\d+)?[KMBk]?)\s/);
      if (!m) return;
      const numVal = parseFloat(m[2].replace(/[,KMBk]/g, ''));
      addMetric(m[1], m[2], numVal > 10000 ? 'warn' : 'ok');
    });

    // Strategy 4: label/value elements whose text runs together, "LabelValue"
    walkShadows(root, 0, (el) => {
      if (!(el.tagName || '').includes('LABEL') && !(el.tagName || '').includes('VALUE')) return;
      const text = (el.shadowRoot?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length > 80) return;
      const m = text.match(/^([A-Za-z][A-Za-z\s]+?)\s*([\d,]+(?:\.\d+)?[KMBk%]?)$/);
      if (!m) return;
      const numVal = parseFloat(m[2].replace(/[,KMBk%]/g, ''));
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

        if (/^\d[\d,\.]*[KMBk%]?$/.test(text)) {
          collected.push({ type: 'value', text });
        } else if (!/^\d/.test(text) && text.length > 1) {
          collected.push({ type: 'label', text });
        }
      });

      // Pair consecutive label → value
      for (let i = 0; i < collected.length - 1; i++) {
        if (collected[i].type === 'label' && collected[i + 1].type === 'value') {
          const numVal = parseFloat(collected[i + 1].text.replace(/[,KMBk%]/g, ''));
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
              const numVal = parseFloat(collected[i].text.replace(/[,KMBk%]/g, ''));
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
