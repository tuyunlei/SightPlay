import { describe, expect, it } from 'vitest';

import { getNoteLabels } from './music';

describe('getNoteLabels', () => {
  it('returns solfege and number for C', () => {
    expect(getNoteLabels('C')).toEqual({ solfege: 'Do', number: '1' });
  });

  it('returns solfege and number for sharps', () => {
    expect(getNoteLabels('F#')).toEqual({ solfege: 'Fa♯', number: '4♯' });
  });

  it('returns empty strings for invalid note name', () => {
    expect(getNoteLabels('X' as any)).toEqual({ solfege: '', number: '' });
  });
});
