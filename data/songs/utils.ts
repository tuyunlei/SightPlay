import { Duration } from '../../types';

import type { SongFrame } from './types';

export const createSongFrame = (
  pitches: readonly [number, ...number[]],
  index: number,
  duration: Duration = 'quarter'
): SongFrame => ({
  id: `song-frame:${index}:${pitches.join('+')}`,
  index,
  pitches,
  duration,
});
