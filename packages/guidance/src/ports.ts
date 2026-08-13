import type { GuidanceChatResult, GuidanceContext } from './model/types';

export interface GuidanceChatRequest {
  readonly message: string;
  readonly context: GuidanceContext;
}

export interface GuidanceChatPort {
  request(request: GuidanceChatRequest, signal: AbortSignal): Promise<GuidanceChatResult>;
}

export interface GuidanceClockPort {
  now(): number;
}

export interface GuidanceSchedulerPort {
  schedule(delayMs: number, task: () => void): () => void;
}

export interface GuidancePorts {
  readonly chat: GuidanceChatPort;
  readonly clock: GuidanceClockPort;
  readonly scheduler: GuidanceSchedulerPort;
}
