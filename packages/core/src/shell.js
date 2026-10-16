// mountShell — mount a compiled Sola component as a persistent overlay.
//
// Creates (or reuses) a host element on the page, optionally attaches a Shadow
// DOM so the host page's CSS can't leak in or out, and mounts the component
// into it. Pair with createPersistentSignal for UI that should survive full
// page navigations: each new page runs the same bootstrap, the signals hydrate
// from storage, and the shell reappears in the state the user left it.

/**
 * @param {(target: Element|ShadowRoot, props?: object) => (() => void)} component
 *        A compiled .sola component (its default export is its mount function).
 * @param {object} [props]
 * @param {object} [options]
 * @param {string}  [options.id='sola-shell']  Host element id. Mounting twice with the
 *        same id returns the existing shell instead of duplicating it.
 * @param {'closed'|'open'|false} [options.shadow='closed']  Shadow DOM mode, or false
 *        to mount straight into the host element.
 * @param {Element} [options.parent=document.body]
 * @param {string}  [options.css]  Extra CSS injected into the shadow root (e.g.
 *        design tokens, which are CSS custom properties and inherit through the
 *        boundary only if defined on :host or an ancestor).
 * @param {Partial<CSSStyleDeclaration>} [options.hostStyle]  Inline styles for the host.
 * @returns {{ host: HTMLElement, root: Element|ShadowRoot, teardown: () => void }}
 */
export function mountShell(component, props = {}, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('mountShell requires a DOM');
  }
  const {
    id = 'sola-shell',
    shadow = 'closed',
    parent = document.body,
    css,
    hostStyle,
  } = options;

  const registry = (mountShell._shells ||= new Map());
  const existing = registry.get(id);
  if (existing && existing.host.isConnected) return existing.api;

  const host = document.createElement('div');
  host.id = id;
  host.setAttribute('data-sola-shell', '');
  if (hostStyle) Object.assign(host.style, hostStyle);

  // Attach to the page before mounting so the component can resolve its root
  // (a compiled component injects its styles into the root it lives in).
  parent.appendChild(host);

  const root = shadow ? host.attachShadow({ mode: shadow }) : host;

  if (css) {
    const style = document.createElement('style');
    style.textContent = css;
    root.appendChild(style);
  }

  // Components mount into an element, not a bare ShadowRoot, so give them a
  // container inside it.
  const container = document.createElement('div');
  container.setAttribute('data-sola-root', '');
  root.appendChild(container);

  const unmount = component(container, props);

  const api = {
    host,
    root,
    teardown() {
      try { unmount?.(); } finally {
        host.remove();
        registry.delete(id);
      }
    },
  };
  registry.set(id, { host, api });
  return api;
}
