// Pure helpers for the Sola AIR extension: the "Copy code" output and HTML
// escaping. Kept free of DOM and extension APIs so the content script can load
// it and Node can test it. The generated code must work when pasted, so the
// component table below is checked against the real @sola-air-ui/ui exports in
// test/codegen.test.js.

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SolaCodegen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // `subpath` is the component's entry in @sola-air-ui/ui's `exports` map. null
  // means the extension can preview it, but it is not in the package yet.
  const COMPONENTS = {
    datacard:  { name: 'DataCard',        subpath: 'data-card' },
    gauge:     { name: 'GaugeCard',       subpath: 'gauge-card' },
    waterfall: { name: 'FlowWaterfall',   subpath: 'flow-waterfall' },
    dial:      { name: 'TactileDialCard', subpath: 'tactile-dial-card' },
    toggle:    { name: 'Toggle',          subpath: 'toggle' },
    button:    { name: 'Button',          subpath: 'button' },
    stream:    { name: 'StreamView',      subpath: 'stream-view' },
    slider:    { name: 'RangeSlider',     subpath: null },
    tabs:      { name: 'Tabs',            subpath: null },
    avatar:    { name: 'Avatar',          subpath: null },
    listblock: { name: 'ListBlock',       subpath: null },
    sentinel:  { name: 'SentinelCapsule', subpath: null },
  };

  const SUBPATH = { DataCard: 'data-card', StatGrid: 'stat-grid' };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // One import line. Every published component is imported by its subpath, which
  // works for all of them (not every one is re-exported from the package root).
  function importLine(componentId) {
    const c = COMPONENTS[componentId];
    if (!c) return '';
    if (!c.subpath) {
      return `// ${c.name} is a Sola Studio preview and is not in @sola-air-ui/ui yet.`;
    }
    return `import ${c.name} from '@sola-air-ui/ui/${c.subpath}';`;
  }

  // A prop value. Plain text becomes a quoted attribute; anything with a quote,
  // brace, backslash or line break goes through JSON.stringify so scraped text
  // cannot break the generated markup.
  function attr(name, text) {
    const s = String(text ?? '');
    if (/^[^"'{}\\\n\r<>]*$/.test(s)) return `${name}="${s}"`;
    return `${name}={${JSON.stringify(s)}}`;
  }

  function card(m, indent) {
    return `${indent}<DataCard ${attr('title', m.label)} ${attr('value', m.value)} />`;
  }

  // Code for what the extension is showing. Scraped metrics always become
  // DataCards (one, or several in a StatGrid), whichever data component was
  // picked, because that is what the extension draws for them. With nothing
  // scraped it is just the picked component's import.
  function generateCode(componentId, metrics) {
    const list = Array.isArray(metrics) ? metrics : [];
    if (list.length === 0) return importLine(componentId);

    if (list.length === 1) {
      return [
        `import DataCard from '@sola-air-ui/ui/${SUBPATH.DataCard}';`,
        '',
        card(list[0], '')
      ].join('\n');
    }

    return [
      `import DataCard from '@sola-air-ui/ui/${SUBPATH.DataCard}';`,
      `import StatGrid from '@sola-air-ui/ui/${SUBPATH.StatGrid}';`,
      '',
      `<StatGrid columns="2">`,
      ...list.map((m) => card(m, '  ')),
      `</StatGrid>`
    ].join('\n');
  }

  // One short line for the preview's code bar. Not escaped: callers escape it.
  function summarize(componentId, metrics) {
    const list = Array.isArray(metrics) ? metrics : [];
    if (list.length === 0) return importLine(componentId);
    if (list.length === 1) return card(list[0], '').trim();
    return `<StatGrid> of ${list.length} DataCards`;
  }

  return { COMPONENTS, escapeHtml, importLine, generateCode, summarize };
});
