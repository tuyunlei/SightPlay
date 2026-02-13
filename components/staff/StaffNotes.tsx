import React from 'react';

import { Note, TimeSignature } from '../../types';

import { StaffLayout } from './staffLayout';
import { StaffNote } from './StaffNote';

export type NoteLayout = {
  note: Note;
  index: number;
  x: number;
};

interface StaffNotesProps {
  layoutNotes: NoteLayout[];
  noteQueue: Note[];
  detectedNote: Note | null;
  activeNote: Note | undefined;
  centerMidi: number;
  layout: StaffLayout;
  timeSignature: TimeSignature;
}

export const StaffNotes: React.FC<StaffNotesProps> = ({
  layoutNotes,
  noteQueue,
  detectedNote,
  activeNote,
  centerMidi,
  layout,
  timeSignature,
}) => (
  <>
    {layoutNotes.map(({ note, index, x }) => (
      <StaffNote
        key={note.id}
        note={note}
        index={index}
        x={x}
        isExiting={false}
        detectedNote={detectedNote}
        activeNote={activeNote}
        centerMidi={centerMidi}
        layout={layout}
        noteQueue={noteQueue}
        timeSignature={timeSignature}
      />
    ))}
  </>
);
