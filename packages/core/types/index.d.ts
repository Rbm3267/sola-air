// Type declarations for @sola-air-ui/core.
//
// Hand-written against src/index.js. The runtime is plain JavaScript, so these
// are the contract a TypeScript consumer sees; keep them in step with the
// implementation when either changes.

/** Reads a signal's current value, subscribing the running effect to it. */
export type Accessor<T> = () => T;

/**
 * Writes a signal. Passing a function applies it to the previous value
 * (`setCount(n => n + 1)`); to store a function as the value itself, wrap it:
 * `set(() => fn)`.
 */
export type Setter<T> = (value: T | ((previous: T) => T)) => void;

export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>];
export function createSignal<T = undefined>(): [Accessor<T | undefined>, Setter<T | undefined>];

/** Computed signal that re-evaluates lazily when its dependencies change. */
export function createDerived<T>(fn: () => T): Accessor<T>;

/** Runs `fn` immediately, then again whenever a signal it read changes. Returns a disposer. */
export function createEffect(fn: () => void): () => void;

/** Flushes all pending effects synchronously. */
export function flushSync(): void;

// ─── Lifecycle ───

export interface ComponentContext {
  mounts: Array<() => void>;
  destroys: Array<() => void>;
}

export function pushContext(): ComponentContext;
export function popContext(ctx: ComponentContext): void;
export function onMount(fn: () => void): void;
export function onDestroy(fn: () => void): void;

/** Called by compiled output; flushes the given context's mount callbacks. */
export function __flush_mounts(ctx?: ComponentContext): void;
/** Called by compiled output; flushes the given context's destroy callbacks. */
export function __flush_destroys(ctx?: ComponentContext): void;

// ─── Ambient intent ───

export interface IntentConfig {
  provider?: string;
  endpoint?: string;
  model?: string;
  stream?: boolean;
}

export function configureIntent(config: IntentConfig): void;

export interface IntentAccessor<T = unknown> {
  (): T | null;
  /** True while a request is in flight. */
  loading: Accessor<boolean>;
  /** Error message from the last failed request, or null. */
  error: Accessor<string | null>;
}

export function createIntent<T = unknown>(
  prompt: string | (() => string),
  options?: IntentConfig & { initial?: T }
): IntentAccessor<T>;

// ─── Relay-backed data ───

export interface DataConfig {
  relayEndpoint?: string;
  /** Poll interval such as '30s', '5m', '1h'. */
  refresh?: string | null;
  query?: unknown;
  filters?: unknown;
  sort?: unknown;
  limit?: number | null;
  offset?: number | null;
}

export interface DataState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
}

export interface DataAccessor<T = unknown> {
  (): DataState<T>;
  /** Re-runs the query immediately. */
  refetch: () => void;
  /** Stops polling and aborts any in-flight request. */
  stop: () => void;
}

export function configureData(config: DataConfig): void;
export function createData<T = unknown>(source: string, options?: DataConfig): DataAccessor<T>;

// ─── Cross-widget signal mesh ───

export interface TelemetryEvent<T = unknown> {
  topic: string;
  value: T;
  prevValue: T;
  timestamp: number;
  originWidgetId: string;
}

export type TopicSetter<T> = (next: T | ((previous: T) => T), originId?: string) => void;

export interface SignalMesh {
  topic<T>(name: string, initialValue?: T): [Accessor<T>, TopicSetter<T>];
  subscribe<T>(name: string, fn: (value: T, event: TelemetryEvent<T>) => void): () => void;
  onTelemetry(fn: (event: TelemetryEvent) => void): () => void;
}

export const signalMesh: SignalMesh;
export function createTopicSignal<T>(topic: string, initialValue?: T): [Accessor<T>, TopicSetter<T>];

// ─── Sentinel ───

export interface SentinelOptions {
  /** Window in which repeated clicks on one action count as a burst. Default 600ms. */
  thresholdMs?: number;
  /** Clicks within that window before a rage-click is reported. Default 3. */
  maxRageClicks?: number;
  /** Quiet period after activity before a suggestion may fire. Default 1500ms. */
  idleThresholdMs?: number;
  /** Minimum gap between two suggestions. Default 8000ms. */
  minSuggestIntervalMs?: number;
  /** Field events required before suggesting anything. Default 2. */
  minEventsForSuggestion?: number;
}

export type FrictionSeverity = 'LOW' | 'HIGH' | 'CRITICAL';

export interface FrictionEvent {
  type: 'RAGE_CLICK' | 'SIGNAL_TIMEOUT';
  timestamp: number;
  severity: FrictionSeverity;
  message: string;
  actionId?: string;
  target?: string;
  count?: number;
  topic?: string;
  error?: string;
}

export type FieldEvent =
  | { type: 'focus'; fieldId: string; revisit: boolean; timestamp: number }
  | { type: 'blur'; fieldId: string; valuePreview: string; valueLength: number; timestamp: number };

export class SolaSentinel {
  constructor(name?: string, options?: SentinelOptions);

  readonly name: string;
  /** 0–99.8, recomputed from friction severity, backtracking, and pacing. */
  readonly flowIndex: number;
  readonly frictionEvents: FrictionEvent[];
  readonly fieldHistory: FieldEvent[];

  recordClick(actionId: string, target?: string): void;
  recordSignalDrop(topic: string, error: Error | string): void;
  triggerFrictionAlert(event: FrictionEvent): void;
  /** Subscribes to friction events. Returns an unsubscribe function. */
  onFriction(cb: (event: FrictionEvent, sentinel: SolaSentinel) => void): () => void;

  /** Records focus on a field; returns true when the user is returning to it. */
  recordFieldFocus(fieldId: string, ts?: number): boolean;
  recordFieldBlur(fieldId: string, value: unknown, ts?: number): void;

  /** True at most once per `minSuggestIntervalMs`, after a quiet period. */
  checkSignificance(ts?: number): boolean;
  /** Natural-language prompt describing recent activity, or null if there is none. */
  buildPrompt(): string | null;
}

export function createSentinel(name?: string, options?: SentinelOptions): SolaSentinel;

// ─── Persistent / cross-page state ───

export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistentSignalOptions<T> {
  /** 'session' (default) survives navigation in a tab; 'local' also survives new tabs and restarts. */
  storage?: 'session' | 'local' | 'memory' | WebStorageLike;
  /** Mirror changes to other same-origin contexts over BroadcastChannel. Default true. */
  sync?: boolean;
  /** BroadcastChannel name. Default 'sola-bus'. */
  channel?: string;
  /** Bump to discard values stored by an older shape of this state. Default 1. */
  version?: number;
  /** Reject stored or received values that don't match the expected shape. */
  validate?: (value: unknown) => boolean;
  /** Discard stored values older than this many milliseconds. */
  ttlMs?: number;
}

export interface PersistentSignalControls {
  /** Remove the stored value everywhere and reset to the initial value. */
  clear(): void;
  /** Stop syncing and release the channel. */
  dispose(): void;
}

/**
 * A signal hydrated synchronously from storage, written back on change, and
 * mirrored live to other tabs/frames. Degrades to a plain signal when storage
 * or BroadcastChannel is unavailable.
 */
export function createPersistentSignal<T>(
  key: string,
  initialValue: T,
  options?: PersistentSignalOptions<T>
): [Accessor<T>, Setter<T>, PersistentSignalControls];

export interface ShellOptions {
  /** Host element id; mounting twice with the same id returns the existing shell. Default 'sola-shell'. */
  id?: string;
  /** Shadow DOM mode, or false to mount directly into the host. Default 'closed'. */
  shadow?: 'closed' | 'open' | false;
  /** Where to attach the host. Default document.body. */
  parent?: Element;
  /** Extra CSS injected into the shadow root. */
  css?: string;
  hostStyle?: Partial<CSSStyleDeclaration>;
}

export interface Shell {
  host: HTMLElement;
  root: Element | ShadowRoot;
  teardown(): void;
}

/** Mount a compiled component as a persistent, style-isolated overlay. */
export function mountShell(
  component: (target: Element, props?: Record<string, unknown>) => () => void,
  props?: Record<string, unknown>,
  options?: ShellOptions
): Shell;
