import { describe, expect, it, vi } from 'vitest';

import { ClefType } from '../../types';

import {
  applyRecommendationAction,
  type RecommendationActionPorts,
} from './applyRecommendationAction';

function createPorts(): RecommendationActionPorts {
  return { selectClef: vi.fn(), setPracticeRange: vi.fn(), navigate: vi.fn() };
}

describe('recommendation action interpreter', () => {
  it('applies the exact requested practice target', () => {
    const ports = createPorts();

    applyRecommendationAction({ kind: 'setClef', clef: ClefType.BASS }, ports);
    applyRecommendationAction({ kind: 'setPracticeRange', range: 'combined' }, ports);

    expect(ports.selectClef).toHaveBeenCalledWith(ClefType.BASS);
    expect(ports.setPracticeRange).toHaveBeenCalledWith('combined');
  });

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
