/**
 * @sola-air-ui/tokens
 *
 * JavaScript representation of the Sola AIR design token system.
 * Import the CSS for actual browser use; use this object for tooling,
 * tests, or generating platform-specific token files.
 *
 *   import '@sola-air-ui/tokens/css';             // CSS custom properties
 *   import { tokens } from '@sola-air-ui/tokens'; // JS values
 */

export const tokens = {
  space: {
    xxs:  '2px',
    xs:   '4px',
    sm:   '8px',
    md:   '12px',
    lg:   '16px',
    xl:   '24px',
    '2xl': '32px',
    '3xl': '40px',
  },

  radius: {
    sm:    '2px',
    md:    '6px',
    lg:    '8px',
    xl:    '12px',
    '2xl': '16px',
    full:  '9999px',
  },

  fontSize: {
    sm:    '12px',
    md:    '16px',
    lg:    '20px',
    xl:    '24px',
    '2xl': '32px',
  },

  fontWeight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  leading: {
    tight:   1.25,
    normal:  1.5,
    relaxed: 1.75,
  },

  color: {
    primary: {
      50:  '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    neutral: {
      0:   '#ffffff',
      50:  '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },

  /**
   * Semantic severity scale — 7 roles from informational to critical.
   * Useful for AI interfaces where output certainty and action urgency
   * need clear, consistent visual encoding.
   */
  alert: {
    low:      { fg: '#64748b', bg: '#f8fafc' },
    positive: { fg: '#059669', bg: '#ecfdf5' },
    info:     { fg: '#0284c7', bg: '#f0f9ff' },
    moderate: { fg: '#ca8a04', bg: '#fefce8' },
    warning:  { fg: '#ea580c', bg: '#fff7ed' },
    high:     { fg: '#dc2626', bg: '#fef2f2' },
    critical: { fg: '#9333ea', bg: '#faf5ff' },
  },

  /**
   * Stacking order. nav < dropdown < overlay-scrim < modal/sheet (same tier
   * — mutually exclusive, focused overlays) < toast (always topmost).
   */
  zIndex: {
    nav:      40,
    dropdown: 100,
    overlay:  800,
    modal:    900,
    sheet:    900,
    toast:    1000,
  },

  /** One easing curve, two durations — see tokens.css for the rationale. */
  motion: {
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
    duration: {
      fast: '160ms',
      base: '240ms',
    },
  },

  /** Built-in token presets, selected with `data-preset` on <html>. */
  presets: ['sola', 'zinc', 'compact', 'graphite'],
};

export default tokens;
