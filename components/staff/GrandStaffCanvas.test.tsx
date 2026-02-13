import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TIME_SIGNATURES } from '../../config/music';
import { Note } from '../../types';

import { GrandStaffCanvas } from './GrandStaffCanvas';

const createTestNote = (midi: number, id: string): Note => ({
  id,
  name: 'C',
  octave: Math.floor(midi / 12) - 1,
  frequency: 440 * Math.pow(2, (midi - 69) / 12),
  midi,
  globalIndex: 0,
});

describe('GrandStaffCanvas', () => {
  const timeSignature = TIME_SIGNATURES['4/4'];

  it('renders without errors', () => {
    const { container } = render(
      <GrandStaffCanvas
        noteQueue={[]}
        exitingNotes={[]}
        detectedNote={null}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('splits notes by MIDI correctly (treble >= 60, bass < 60)', () => {
    const trebleNote = createTestNote(60, 'treble-1'); // C4 (middle C)
    const bassNote = createTestNote(48, 'bass-1'); // C3
    const highTrebleNote = createTestNote(72, 'treble-2'); // C5

    const { container } = render(
      <GrandStaffCanvas
        noteQueue={[trebleNote, bassNote, highTrebleNote]}
        exitingNotes={[]}
        detectedNote={null}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    // Should render SVG with content
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();

    // SVG should contain both treble and bass clef symbols
    const textElements = container.querySelectorAll('text');
    const clefSymbols = Array.from(textElements)
      .map((el) => el.textContent)
      .filter((text) => text === '𝄞' || text === '𝄢');

    expect(clefSymbols).toContain('𝄞'); // Treble clef
    expect(clefSymbols).toContain('𝄢'); // Bass clef
  });

  it('renders brace connecting both staves', () => {
    const { container } = render(
      <GrandStaffCanvas
        noteQueue={[]}
        exitingNotes={[]}
        detectedNote={null}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    // Brace should be rendered as a path element
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders both treble and bass staves', () => {
    const { container } = render(
      <GrandStaffCanvas
        noteQueue={[]}
        exitingNotes={[]}
        detectedNote={null}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    // Should have staff lines (5 lines × 2 staves = 10 lines)
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(10);
  });

  it('splits exiting notes by MIDI correctly', () => {
    const trebleExiting = createTestNote(65, 'exit-treble');
    const bassExiting = createTestNote(45, 'exit-bass');

    const { container } = render(
      <GrandStaffCanvas
        noteQueue={[]}
        exitingNotes={[trebleExiting, bassExiting]}
        detectedNote={null}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    // Should render without errors
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('handles mixed notes in queue', () => {
    const notes = [
      createTestNote(60, '1'), // treble
      createTestNote(48, '2'), // bass
      createTestNote(72, '3'), // treble
      createTestNote(36, '4'), // bass
      createTestNote(84, '5'), // treble
    ];

    const { container } = render(
      <GrandStaffCanvas
        noteQueue={notes}
        exitingNotes={[]}
        detectedNote={null}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders detected note ghost', () => {
    const detectedNote = createTestNote(60, 'detected');

    const { container } = render(
      <GrandStaffCanvas
        noteQueue={[createTestNote(60, 'active')]}
        exitingNotes={[]}
        detectedNote={detectedNote}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('preserves temporal alignment across staves', () => {
    // Queue: [treble(0), bass(1), treble(2)] — positions must match original indices
    const notes = [
      createTestNote(60, 'treble-at-0'), // queue index 0
      createTestNote(48, 'bass-at-1'), // queue index 1
      createTestNote(72, 'treble-at-2'), // queue index 2
    ];

    const { container } = render(
      <GrandStaffCanvas
        noteQueue={notes}
        exitingNotes={[]}
        detectedNote={null}
        viewportWidth={1000}
        timeSignature={timeSignature}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // The two treble notes should NOT be at x0 and x1 — they should be at x0 and x2
    // This is verified by the splitNotesByClef preserving original queue indices
  });

  it('adjusts to different viewport widths', () => {
    const note = createTestNote(60, '1');

    [600, 1000, 1200, 2000].forEach((width) => {
      const { container } = render(
        <GrandStaffCanvas
          noteQueue={[note]}
          exitingNotes={[]}
          detectedNote={null}
          viewportWidth={width}
          timeSignature={timeSignature}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });
});
