import React, { useMemo } from 'react';

import { CLEF_CENTER_MIDI } from '../../config/music';
import { ClefType, Note, TimeSignature } from '../../types';

import { DetectedGhost } from './DetectedGhost';
import { ExitingNotes } from './ExitingNotes';
import { StaffHeader } from './StaffHeader';
import { createGrandStaffLayout, GrandStaffLayout } from './staffLayout';
import { StaffLines } from './StaffLines';
import { NoteLayout, StaffNotes } from './StaffNotes';

interface GrandStaffCanvasProps {
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  viewportWidth: number;
  timeSignature: TimeSignature;
}

const splitNotesByClef = (notes: Note[]) => {
  const treble: Note[] = [];
  const bass: Note[] = [];
  notes.forEach((note) => {
    if (note.midi >= 60) {
      treble.push(note);
    } else {
      bass.push(note);
    }
  });
  return { treble, bass };
};

const createLayoutNotes = (
  notes: Note[],
  maxFit: number,
  startX: number,
  spacing: number
): NoteLayout[] =>
  notes.slice(0, maxFit).map((note, index) => ({
    note,
    index,
    x: startX + index * spacing,
  }));

const createBracePath = (layout: GrandStaffLayout): string =>
  `M ${layout.BRACE_X} ${layout.BRACE_TOP_Y} 
    Q ${layout.BRACE_X - layout.treble.STAFF_SPACE * 0.5} ${layout.BRACE_TOP_Y + layout.treble.STAFF_SPACE * 2} 
    ${layout.BRACE_X} ${layout.BRACE_TOP_Y + layout.treble.STAFF_SPACE * 4}
    Q ${layout.BRACE_X + layout.treble.STAFF_SPACE * 0.3} ${(layout.BRACE_TOP_Y + layout.BRACE_BOTTOM_Y) / 2} 
    ${layout.BRACE_X} ${layout.BRACE_BOTTOM_Y - layout.treble.STAFF_SPACE * 4}
    Q ${layout.BRACE_X - layout.treble.STAFF_SPACE * 0.5} ${layout.BRACE_BOTTOM_Y - layout.treble.STAFF_SPACE * 2} 
    ${layout.BRACE_X} ${layout.BRACE_BOTTOM_Y}`;

interface SingleStaffContentProps {
  clef: ClefType;
  layout: GrandStaffLayout['treble'];
  layoutNotes: NoteLayout[];
  notes: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  centerMidi: number;
  contentWidth: number;
  timeSignature: TimeSignature;
}

const SingleStaffContent: React.FC<SingleStaffContentProps> = ({
  clef,
  layout,
  layoutNotes,
  notes,
  exitingNotes,
  detectedNote,
  centerMidi,
  contentWidth,
  timeSignature,
}) => (
  <>
    <StaffHeader clef={clef} layout={layout} timeSignature={timeSignature} />
    <StaffLines layout={layout} contentWidth={contentWidth} />
    <StaffNotes
      layoutNotes={layoutNotes}
      noteQueue={notes}
      detectedNote={detectedNote}
      activeNote={notes[0]}
      centerMidi={centerMidi}
      layout={layout}
      timeSignature={timeSignature}
    />
    <ExitingNotes
      exitingNotes={exitingNotes}
      centerMidi={centerMidi}
      layout={layout}
      timeSignature={timeSignature}
    />
    <DetectedGhost
      detectedNote={detectedNote}
      activeNote={notes[0]}
      centerMidi={centerMidi}
      layout={layout}
    />
  </>
);

const computeMaxFitNotes = (layout: GrandStaffLayout) => {
  const availableWidth = Math.max(
    0,
    layout.treble.VIEWPORT_WIDTH - layout.treble.START_X - layout.treble.RIGHT_PADDING
  );
  return Math.max(1, Math.floor(availableWidth / layout.treble.NOTE_SPACING) + 1);
};

const computeContentWidth = (layout: GrandStaffLayout, noteCount: number, maxFit: number) => {
  const visibleCount = Math.min(noteCount, maxFit);
  return (
    layout.treble.START_X +
    Math.max(visibleCount - 1, 0) * layout.treble.NOTE_SPACING +
    layout.treble.RIGHT_PADDING
  );
};

export const GrandStaffCanvas: React.FC<GrandStaffCanvasProps> = ({
  noteQueue,
  exitingNotes,
  detectedNote,
  viewportWidth,
  timeSignature,
}) => {
  const layout = useMemo(() => createGrandStaffLayout(viewportWidth), [viewportWidth]);
  const maxFitNotes = computeMaxFitNotes(layout);
  const contentWidth = computeContentWidth(layout, noteQueue.length, maxFitNotes);

  const { treble: trebleNotes, bass: bassNotes } = useMemo(
    () => splitNotesByClef(noteQueue),
    [noteQueue]
  );
  const { treble: trebleExiting, bass: bassExiting } = useMemo(
    () => splitNotesByClef(exitingNotes),
    [exitingNotes]
  );

  const trebleLayoutNotes = useMemo(
    () =>
      createLayoutNotes(
        trebleNotes,
        maxFitNotes,
        layout.treble.START_X,
        layout.treble.NOTE_SPACING
      ),
    [trebleNotes, maxFitNotes, layout.treble.START_X, layout.treble.NOTE_SPACING]
  );
  const bassLayoutNotes = useMemo(
    () => createLayoutNotes(bassNotes, maxFitNotes, layout.bass.START_X, layout.bass.NOTE_SPACING),
    [bassNotes, maxFitNotes, layout.bass.START_X, layout.bass.NOTE_SPACING]
  );

  return (
    <svg
      width={contentWidth}
      height={layout.TOTAL_HEIGHT}
      viewBox={`0 0 ${contentWidth} ${layout.TOTAL_HEIGHT}`}
      className="block max-w-none"
      style={{ width: `${contentWidth}px`, height: `${layout.TOTAL_HEIGHT}px` }}
      preserveAspectRatio="xMinYMin meet"
    >
      <path d={createBracePath(layout)} stroke="#0f172a" strokeWidth={1.5} fill="none" />
      <rect
        x={layout.treble.HIGHLIGHT_X}
        y={layout.treble.STAFF_SPACE}
        width={layout.treble.HIGHLIGHT_WIDTH}
        height={layout.TOTAL_HEIGHT - layout.treble.STAFF_SPACE * 2}
        fill="#f1f5f9"
        rx="8"
      />
      <SingleStaffContent
        clef={ClefType.TREBLE}
        layout={layout.treble}
        layoutNotes={trebleLayoutNotes}
        notes={trebleNotes}
        exitingNotes={trebleExiting}
        detectedNote={detectedNote}
        centerMidi={CLEF_CENTER_MIDI[ClefType.TREBLE]}
        contentWidth={contentWidth}
        timeSignature={timeSignature}
      />
      <SingleStaffContent
        clef={ClefType.BASS}
        layout={layout.bass}
        layoutNotes={bassLayoutNotes}
        notes={bassNotes}
        exitingNotes={bassExiting}
        detectedNote={detectedNote}
        centerMidi={CLEF_CENTER_MIDI[ClefType.BASS]}
        contentWidth={contentWidth}
        timeSignature={timeSignature}
      />
    </svg>
  );
};
