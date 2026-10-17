// Type declarations for @sola-air-ui/ui.
//
// Every export is a compiled .sola component: call it with a target element and
// props, and it returns a disposer that unmounts it.

import type { SolaComponent } from '@sola-air-ui/compiler';

export type { SolaComponent };

// ─── Layout ───
export const Canvas: SolaComponent;
export const Card: SolaComponent;
export const Stack: SolaComponent;

// ─── Data display ───
export const StatGrid: SolaComponent;
export const DataCard: SolaComponent;
export const Table: SolaComponent;
export const GaugeCard: SolaComponent;
export const FlowWaterfall: SolaComponent;
export const IncidentTriageMatrix: SolaComponent;
export const StreamView: SolaComponent;

// ─── Inputs ───
export const TextInput: SolaComponent;
export const Select: SolaComponent;
export const Toggle: SolaComponent;
export const TactileDialCard: SolaComponent;

// ─── Feedback ───
export const Badge: SolaComponent;
export const Spinner: SolaComponent;
export const Alert: SolaComponent;
export const Modal: SolaComponent;
export const Toast: SolaComponent;

// ─── Shell (see docs/rfcs/0002-shell-primitives.md) ───
export const LauncherDock: SolaComponent;
export const CommandPalette: SolaComponent;
export const CompanionDrawer: SolaComponent;
export const ToastHost: SolaComponent;

// ─── Raw HTML ───
export const SolaSafeHTML: SolaComponent;

// ─── Ambient intent ───
export const IntentCard: SolaComponent;
export const IntentList: SolaComponent;
export const ConversationThread: SolaComponent;
export const ActionStrip: SolaComponent;
export const ConfidenceBadge: SolaComponent;
export const IntentSheet: SolaComponent;
