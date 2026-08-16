import { createNoteFromMidi } from '@sightplay/music-domain';

import { Duration, Note } from '../../types';

export const createSongNote = (
  midi: number,
  globalIndex: number,
  duration: Duration = 'quarter'
): Note => {
  const note = createNoteFromMidi(midi);
  return {
    id: `song-note:${globalIndex}:${midi}`,
    ...note,
    globalIndex,
    duration,
  };
};
