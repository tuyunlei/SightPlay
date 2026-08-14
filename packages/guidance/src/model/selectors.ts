import type { GuidanceHint, GuidanceMessage, GuidanceRecommendation, GuidanceState } from './types';

export interface GuidanceView {
  readonly messages: readonly GuidanceMessage[];
  readonly isLoading: boolean;
  readonly hint: GuidanceHint | null;
  readonly recommendations: readonly GuidanceRecommendation[];
}

export const selectGuidanceView = (state: GuidanceState): GuidanceView => ({
  messages: state.messages,
  isLoading: state.pendingConversation !== null,
  hint: state.hint,
  recommendations: state.recommendations,
});
