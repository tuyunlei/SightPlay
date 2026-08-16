import { createContext } from 'react';

import type { GuidanceView } from '../model/selectors';
import type { GuidanceContext as ModelContext, PracticeGuidanceObservation } from '../model/types';
import type { GuidanceOutput } from '../runtime/guidanceRuntime';

export interface GuidanceActions {
  changeContext(context: ModelContext): void;
  sendMessage(text: string): void;
  observePractice(observation: PracticeGuidanceObservation): void;
  dismissHint(): void;
  dismissRecommendation(id: string): void;
  applyRecommendation(id: string): void;
  onOutput(listener: (output: GuidanceOutput) => void): () => void;
}

export interface GuidanceClient extends GuidanceActions {
  readonly view: GuidanceView;
}

export const GuidanceContext = createContext<GuidanceClient | null>(null);
