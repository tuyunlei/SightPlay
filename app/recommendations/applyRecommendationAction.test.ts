import { describe, expect, it, vi } from 'vitest';

import {
  applyRecommendationAction,
  type RecommendationActionPorts,
} from './applyRecommendationAction';

function createPorts(): RecommendationActionPorts {
  return { selectClef: vi.fn(), setPracticeRange: vi.fn(), navigate: vi.fn() };
}

describe('recommendation action interpreter', () => {
  it('preserves navigation payloads in typed routes', () => {
    const ports = createPorts();

    applyRecommendationAction({ kind: 'navigateDifficulty', difficulty: 'intermediate' }, ports);
    applyRecommendationAction({ kind: 'navigateSong', songId: 'ode-to-joy' }, ports);

    expect(ports.navigate).toHaveBeenNthCalledWith(1, {
      kind: 'library',
      difficulty: 'intermediate',
    });
    expect(ports.navigate).toHaveBeenNthCalledWith(2, {
      kind: 'songPractice',
      songId: 'ode-to-joy',
    });
  });
});
