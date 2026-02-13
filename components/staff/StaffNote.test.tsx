import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TIME_SIGNATURES } from '../../config/music';
import { Note } from '../../types';

import { createStaffLayout } from './staffLayout';
import { StaffNote } from './StaffNote';

const layout = createStaffLayout(1000);

const createNote = (duration?: Note['duration']): Note => ({
  id: `note-${duration ?? 'default'}`,
  name: 'B',
  octave: 4,
  frequency: 493.88,
  midi: 71,
  globalIndex: 0,
  duration,
});

const renderStaffNote = (note: Note) =>
  render(
    <svg>
      <StaffNote
        note={note}
        index={0}
        x={100}
        isExiting={false}
        detectedNote={null}
        activeNote={undefined}
        centerMidi={71}
        layout={layout}
        noteQueue={[note]}
        timeSignature={TIME_SIGNATURES['4/4']}
      />
    </svg>
  );

describe('StaffNote duration rendering', () => {
  it('renders whole note as hollow head without stem', () => {
    const { container } = renderStaffNote(createNote('whole'));
    const ellipse = container.querySelector('ellipse');
    expect(ellipse?.getAttribute('fill')).toBe('#ffffff');
    expect(container.querySelectorAll('line')).toHaveLength(0);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('renders half note as hollow head with stem', () => {
    const { container } = renderStaffNote(createNote('half'));
    const ellipse = container.querySelector('ellipse');
    expect(ellipse?.getAttribute('fill')).toBe('#ffffff');
    expect(container.querySelectorAll('line')).toHaveLength(1);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('renders quarter note as filled head with stem and no flags', () => {
    const { container } = renderStaffNote(createNote('quarter'));
    const ellipse = container.querySelector('ellipse');
    expect(ellipse?.getAttribute('fill')).not.toBe('#ffffff');
    expect(container.querySelectorAll('line')).toHaveLength(1);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('renders eighth note with one flag', () => {
    const { container } = renderStaffNote(createNote('eighth'));
    expect(container.querySelectorAll('line')).toHaveLength(1);
    expect(container.querySelectorAll('path')).toHaveLength(1);
  });

  it('renders sixteenth note with two flags', () => {
    const { container } = renderStaffNote(createNote('sixteenth'));
    expect(container.querySelectorAll('line')).toHaveLength(1);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('defaults to quarter rendering when duration is undefined', () => {
    const { container } = renderStaffNote(createNote(undefined));
    const ellipse = container.querySelector('ellipse');
    expect(ellipse?.getAttribute('fill')).not.toBe('#ffffff');
    expect(container.querySelectorAll('line')).toHaveLength(1);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });
});
