import React from 'react';

import { Note } from '../../types';

import { StaffLayout } from './staffLayout';
import { buildLedgers, getNoteColor, getNoteY, isSharp } from './staffUtils';

export type StaffNoteProps = {
  note: Note;
  index: number;
  x: number;
  isExiting: boolean;
  detectedNote: Note | null;
  activeNote: Note | undefined;
  centerMidi: number;
  layout: StaffLayout;
};

export const StaffNote: React.FC<StaffNoteProps> = ({
  note,
  index,
  x,
  isExiting,
  detectedNote,
  activeNote,
  centerMidi,
  layout,
}) => {
  const y = getNoteY(note.midi, centerMidi, layout);
  const color = getNoteColor({ isExiting, index, detectedNote, activeNote });
  const isStemUp = y > layout.STAFF_CENTER_Y;
  const ledgers = buildLedgers(y, layout);
  const showBarLine =
    !isExiting && note.globalIndex > 0 && note.globalIndex % layout.BAR_INTERVAL === 0;

  return (
    <g
      key={note.id}
      className={`transition-all duration-300 ease-out ${isExiting ? 'opacity-0 -translate-y-8 -translate-x-4 scale-110' : 'opacity-100'}`}
      style={{
        transform: isExiting ? `translate(${x}px, -40px)` : `translate(${x}px, 0)`,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      {showBarLine && (
        <line
          x1={-layout.NOTE_SPACING / 2}
          y1={layout.STAFF_TOP_Y}
          x2={-layout.NOTE_SPACING / 2}
          y2={layout.STAFF_BOTTOM_Y}
          stroke="#94a3b8"
          strokeWidth={layout.STAFF_LINE_THICKNESS * 1.25}
        />
      )}
      {ledgers.map((ly, ledgerIndex) => (
        <line
          key={`${note.id}-ledger-${ledgerIndex}`}
          x1={-layout.LEDGER_HALF_LENGTH}
          y1={ly}
          x2={layout.LEDGER_HALF_LENGTH}
          y2={ly}
          stroke={color}
          strokeWidth={layout.STAFF_LINE_THICKNESS}
        />
      ))}
      <g>
        <ellipse
          cx="0"
          cy={y}
          rx={layout.NOTE_HEAD_RX}
          ry={layout.NOTE_HEAD_RY}
          fill={color}
          transform={`rotate(-15, 0, ${y})`}
        />
        {isSharp(note) && (
          <text
            x={-layout.STAFF_SPACE * 1.2}
            y={y + layout.STAFF_SPACE * 0.4}
            fontSize={layout.ACCIDENTAL_SIZE}
            fill={color}
            fontFamily="serif"
            fontWeight="normal"
          >
            ♯
          </text>
        )}
        <line
          x1={isStemUp ? layout.STEM_OFFSET : -layout.STEM_OFFSET}
          y1={y}
          x2={isStemUp ? layout.STEM_OFFSET : -layout.STEM_OFFSET}
          y2={isStemUp ? y - layout.STEM_LENGTH : y + layout.STEM_LENGTH}
          stroke={color}
          strokeWidth={layout.STAFF_LINE_THICKNESS}
        />
      </g>
    </g>
  );
};
