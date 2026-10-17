// Type declarations for @sola-air-ui/ui.
//
// Every export is a compiled .sola component: call it with a target element and
// props, and it returns a disposer that unmounts it.

import type { SolaComponent } from '@sola-air-ui/compiler';

export type { SolaComponent };

export interface CanvasProps {
  theme?: 'light' | 'dark';
  padding?: 'none' | 'compact' | 'comfortable';
  layout?: 'auto-grid' | 'stack' | 'none';
  maxWidth?: string;
  children?: (target: HTMLElement) => void;
}

export interface CardProps {
  title?: string;
  accentColor?: string;
  children?: (target: HTMLElement) => void;
}

export interface StackProps {
  direction?: 'row' | 'column';
  gap?: string;
  align?: string;
  children?: (target: HTMLElement) => void;
}

export interface DashboardNode {
  id: string;
  name: string;
  rps: number;
  load?: number;
  status: string;
}

export interface DashboardProps {
  title?: string;
  initialRps?: number;
  initialErrorRate?: number;
  initialNodes?: DashboardNode[];
}

export interface StatGridProps {
  columns?: number | string;
  gap?: string;
  children?: (target: HTMLElement) => void;
}

export interface DataCardProps {
  title?: string;
  value?: string | (() => string);
  trend?: string;
}

export interface TableColumn {
  key: string;
  label?: string;
}

export interface TableProps<T = Record<string, unknown>> {
  columns?: Array<string | TableColumn> | (() => Array<string | TableColumn>);
  rows?: T[] | (() => T[]);
  striped?: boolean;
  dark?: boolean;
  onRowClick?: (row: T, index: number) => void;
}

export interface ChartProps {
  title?: string;
  value?: string;
  delta?: string;
  data?: number[];
}

export interface GaugeCardProps {
  title?: string;
  value?: string;
  percentage?: number;
  subtext?: string;
  color?: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose';
}

export interface FlowWaterfallStep {
  name: string;
  value: number;
  type: 'positive' | 'negative' | 'total';
}

export interface FlowWaterfallProps {
  title?: string;
  steps?: FlowWaterfallStep[];
}

export interface IncidentItem {
  id: string;
  service: string;
  severity: 'P1' | 'P2' | 'P3' | string;
  status: string;
  latency: string;
}

export interface IncidentPlaybook {
  id: string;
  title: string;
  action: string;
}

export interface IncidentTriageMatrixProps {
  title?: string;
  description?: string;
  incidents?: IncidentItem[];
  playbooks?: IncidentPlaybook[];
}

export interface StreamEventItem {
  id?: string | number;
  message?: string;
  text?: string;
  timestamp?: string;
  type?: 'info' | 'success' | 'warning' | 'error' | string;
}

export interface StreamViewProps {
  title?: string;
  content?: string | (() => string);
  events?: StreamEventItem[] | (() => StreamEventItem[]) | null;
  streaming?: boolean;
}

export interface MarkdownViewerProps {
  content?: string | (() => string);
}

export interface HtmlViewerProps {
  content?: string | (() => string);
  height?: string;
  title?: string;
  allowScripts?: boolean;
}

export interface ButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children?: (target: HTMLElement) => void;
}

export interface TextInputProps {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  type?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
  errorText?: string;
  id?: string;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
}

export interface SelectOption {
  value: string;
  label?: string;
}

export interface SelectProps {
  label?: string;
  initialSelected?: string;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  options?: Array<string | SelectOption>;
  id?: string;
  onChange?: (value: string) => void;
  children?: (target: HTMLElement) => void;
}

export interface ToggleProps {
  label?: string;
  checked?: boolean;
  initialChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

export interface DatePickerProps {
  label?: string;
  value?: string;
  initialValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export interface TactileDialCardProps {
  title?: string;
  metric?: string;
  unit?: string;
  min?: number;
  max?: number;
  currentValue?: number;
  color?: 'amber' | 'emerald' | 'sky';
  onChange?: (value: number) => void;
}

export interface BadgeProps {
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export interface SpinnerProps {
  size?: string;
  label?: string;
}

export interface AlertProps {
  message?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export interface ModalProps {
  title?: string | (() => string);
  initialOpen?: boolean;
  isOpen?: boolean | (() => boolean) | null;
  onClose?: () => void;
  children?: (target: HTMLElement) => void;
}

export interface ToastProps {
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  initialVisible?: boolean;
  duration?: number;
  onDismiss?: () => void;
}

export interface SolaSafeHTMLProps {
  content?: string | (() => string);
  maxHeight?: string;
  title?: string;
}

export interface LauncherDockItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
}

export interface LauncherDockProps {
  items?: LauncherDockItem[] | (() => LauncherDockItem[]);
  active?: string | null | (() => string | null);
  position?: 'bottom' | 'left' | 'right';
  label?: string;
  onSelect?: (item: LauncherDockItem) => void;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  hint?: string;
}

export interface CommandPaletteProps {
  commands?: CommandPaletteItem[] | (() => CommandPaletteItem[]);
  isOpen?: boolean | null | (() => boolean | null);
  hotkey?: string;
  placeholder?: string;
  label?: string;
  onSelect?: (command: CommandPaletteItem) => void;
  onClose?: () => void;
}

export interface CompanionDrawerProps {
  title?: string | (() => string);
  initialOpen?: boolean;
  isOpen?: boolean | null | (() => boolean | null);
  side?: 'left' | 'right';
  width?: string;
  onClose?: () => void;
  children?: (target: HTMLElement) => void;
}

export interface ToastHostItem {
  id: number;
  kind: 'info' | 'success' | 'warning' | 'error' | string;
  text: string;
}

export interface ToastHostProps {
  listen?: string;
  duration?: number;
  max?: number;
  onDismiss?: (toast: ToastHostItem) => void;
}

export interface IntentCardData {
  title?: string;
  value?: string | number;
  trend?: string;
  [key: string]: unknown;
}

export interface IntentCardProps {
  data?: IntentCardData | (() => IntentCardData | string | null) | null;
  loading?: boolean;
}

export interface IntentListItem {
  label?: string;
  name?: string;
  description?: string;
  status?: string;
}

export interface IntentListProps {
  data?:
    | Array<IntentListItem | string>
    | { items?: Array<IntentListItem | string> }
    | (() => Array<IntentListItem | string> | { items?: Array<IntentListItem | string> } | string | null)
    | null;
  title?: string;
}

export interface AmbientSuggestionItem {
  label: string;
  action?: string;
  confidence?: number;
}

export interface AmbientSuggestionProps {
  suggestion?: AmbientSuggestionItem | (() => AmbientSuggestionItem | null) | null;
  onDismiss?: (suggestion: AmbientSuggestionItem | null) => void;
}

export interface ConversationThreadProps {
  endpoint?: string;
  model?: string | null;
  provider?: string | null;
  placeholder?: string;
  systemLabel?: string;
  userLabel?: string;
  onmessage?: (messages: Array<{ role: string; content: string; error?: boolean }>) => void;
}

export interface ActionStripItem {
  label: string;
  description?: string;
  icon?: string;
  badge?: string | number;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  href?: string;
  onclick?: () => void;
}

export interface ActionStripProps {
  actions?: ActionStripItem[];
  onaction?: (action: ActionStripItem) => void;
  label?: string;
  variant?: 'default' | 'compact';
}

export interface ConfidenceBadgeProps {
  score?: number | null | (() => number | null);
  label?: string | null | (() => string | null);
  size?: 'sm' | 'md' | 'lg';
}

export interface IntentSheetAction {
  label: string;
  variant?: 'default' | 'primary';
  disabled?: boolean;
  onclick?: () => void;
}

export interface IntentSheetProps {
  open?: boolean | (() => boolean);
  title?: string;
  intent?: unknown;
  actions?: IntentSheetAction[];
  onclose?: () => void;
  onaction?: (action: IntentSheetAction) => void;
  side?: 'right' | 'bottom';
}

// ─── Layout ───
export const Canvas: SolaComponent<CanvasProps>;
export const Card: SolaComponent<CardProps>;
export const Stack: SolaComponent<StackProps>;
export const Dashboard: SolaComponent<DashboardProps>;

// ─── Data display ───
export const StatGrid: SolaComponent<StatGridProps>;
export const DataCard: SolaComponent<DataCardProps>;
export const Table: SolaComponent<TableProps>;
export const Chart: SolaComponent<ChartProps>;
export const GaugeCard: SolaComponent<GaugeCardProps>;
export const FlowWaterfall: SolaComponent<FlowWaterfallProps>;
export const IncidentTriageMatrix: SolaComponent<IncidentTriageMatrixProps>;
export const StreamView: SolaComponent<StreamViewProps>;
export const MarkdownViewer: SolaComponent<MarkdownViewerProps>;
export const HtmlViewer: SolaComponent<HtmlViewerProps>;

// ─── Inputs ───
export const Button: SolaComponent<ButtonProps>;
export const TextInput: SolaComponent<TextInputProps>;
export const Select: SolaComponent<SelectProps>;
export const Toggle: SolaComponent<ToggleProps>;
export const DatePicker: SolaComponent<DatePickerProps>;
export const TactileDialCard: SolaComponent<TactileDialCardProps>;

// ─── Feedback ───
export const Badge: SolaComponent<BadgeProps>;
export const Spinner: SolaComponent<SpinnerProps>;
export const Alert: SolaComponent<AlertProps>;
export const Modal: SolaComponent<ModalProps>;
export const Toast: SolaComponent<ToastProps>;

// ─── Shell (see docs/rfcs/0002-shell-primitives.md) ───
export const LauncherDock: SolaComponent<LauncherDockProps>;
export const CommandPalette: SolaComponent<CommandPaletteProps>;
export const CompanionDrawer: SolaComponent<CompanionDrawerProps>;
export const ToastHost: SolaComponent<ToastHostProps>;

// ─── Raw HTML ───
export const SolaSafeHTML: SolaComponent<SolaSafeHTMLProps>;

// ─── Ambient intent ───
export const IntentCard: SolaComponent<IntentCardProps>;
export const IntentList: SolaComponent<IntentListProps>;
export const AmbientSuggestion: SolaComponent<AmbientSuggestionProps>;
export const ConversationThread: SolaComponent<ConversationThreadProps>;
export const ActionStrip: SolaComponent<ActionStripProps>;
export const ConfidenceBadge: SolaComponent<ConfidenceBadgeProps>;
export const IntentSheet: SolaComponent<IntentSheetProps>;
