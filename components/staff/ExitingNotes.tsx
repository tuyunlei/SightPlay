import React from 'react';

import { Note, TimeSignature } from '../../types';

import { StaffLayout } from './staffLayout';
import { StaffNote } from './StaffNote';

interface ExitingNotesProps {
  exitingNotes: Note[];
  centerMidi: number;
  layout: StaffLayout;
  timeSignature: TimeSignature;
}

export const ExitingNotes: React.FC<ExitingNotesProps> = ({
  exitingNotes,
  centerMidi,
  layout,
  timeSignature,
}) => (
  <>
    {exitingNotes.map((note) => (
      <StaffNote
        key={`exit-${note.id}`}
        note={note}
        index={0}
        x={layout.START_X}
        isExiting
        detectedNote={null}
        activeNote={undefined}
        centerMidi={centerMidi}
        layout={layout}
        noteQueue={[note]}
        timeSignature={timeSignature}
      />
    ))}
  </>
);
