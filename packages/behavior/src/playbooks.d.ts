// Type declarations for @sola-air-ui/behavior/src/playbooks.
// Structurally compatible with @sola-air-ui/core's ActionContract, restated
// locally since core does not currently export that type from its package
// entry point.

import type { BehavioralMetrics } from './index';

export interface PlaybookIntentRecord<TData = any, TPayload = any> {
  id: string;
  actionId: string;
  recordId: string;
  data: TData;
  payload: TPayload;
  status: 'pending' | 'committed' | 'rolled_back' | 'failed';
  tier: 0 | 1 | 2;
  timestamp: number;
  expiresAt?: number;
}

export interface PlaybookResult<TOutput = any> {
  success: boolean;
  actionId: string;
  transactionId?: string;
  timestamp: number;
  output?: TOutput;
  message?: string;
}

export interface PlaybookContract<TData = any, TPayload = any> {
  id: string;
  title: string;
  description: string;
  category: 'mitigation' | 'mutation' | 'diagnostic' | 'export';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  tier: 1 | 2;
  capability: 'idempotent' | 'transactional' | 'fire_and_forget';
  blastRadiusMessage?: string;
  isSurfaced: (data: TData, behavior: BehavioralMetrics) => boolean;
  computeUrgency: (data: TData, behavior: BehavioralMetrics) => number;
  resolveAffordance: (data: TData, behavior: BehavioralMetrics) => 'hidden' | 'calm' | 'expanded_preview' | 'urgent_override';
  stage: (payload: TPayload, ctx: { sourceId: string; recordId: string; data: TData }) => Promise<PlaybookIntentRecord<TData, TPayload>>;
  commit: (intentId: string) => Promise<PlaybookResult>;
  rollback?: (intentId: string) => Promise<PlaybookResult>;
}

export const MajorIncidentContract: PlaybookContract;
export const AwsDrainNodeContract: PlaybookContract;
export const StripeDunningNoticeContract: PlaybookContract;
export const PostgresKillLocksContract: PlaybookContract;
