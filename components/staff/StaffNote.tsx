import React from 'react';

import { Duration, Note, TimeSignature } from '../../types';

import { shouldShowBarLine } from './barLine';
import { StaffLayout } from './staffLayout';
import { buildLedgers, getNoteColor, getNoteY, isFlat, isSharp } from './staffUtils';

export type StaffNoteProps = {
  note: Note;
  index: number;
  x: number;
  isExiting: boolean;
  detectedNote: Note | null;
  activeNote: Note | undefined;
  centerMidi: number;
  layout: StaffLayout;
  noteQueue: Note[];
  timeSignature: TimeSignature;
};

type DurationRenderInfo = {
  isHollowHead: boolean;
  hasStem: boolean;
  flagCount: number;
};

type NoteGlyphProps = {
  note: Note;
  y: number;
  color: string;
  isStemUp: boolean;
  layout: StaffLayout;
};

const getDurationRenderInfo = (duration?: Duration): DurationRenderInfo => {
  const effectiveDuration = duration ?? 'quarter';

  return {
    isHollowHead: effectiveDuration === 'whole' || effectiveDuration === 'half',
    hasStem: effectiveDuration !== 'whole',
    flagCount: effectiveDuration === 'eighth' ? 1 : effectiveDuration === 'sixteenth' ? 2 : 0,
  };
};

const getFlagPath = (
  flagIndex: number,
  stemX: number,
  stemEndY: number,
  isStemUp: boolean,
  layout: StaffLayout
) => {
  const flagSpacing = layout.STAFF_HALF_SPACE * 0.8;
  const direction = isStemUp ? 1 : -1;
  const flagStartY = stemEndY + flagIndex * flagSpacing * direction;
  const flagControlX = stemX + layout.STAFF_SPACE * 1.1 * direction;
  const flagEndX = stemX + layout.STAFF_SPACE * 0.6 * direction;
  const flagControlY = flagStartY + layout.STAFF_SPACE * 0.7 * direction;
  const flagEndY = flagStartY + layout.STAFF_SPACE * 1.1 * direction;

  return `M ${stemX} ${flagStartY} Q ${flagControlX} ${flagControlY} ${flagEndX} ${flagEndY}`;
};

const NoteGlyph: React.FC<NoteGlyphProps> = ({ note, y, color, isStemUp, layout }) => {
  const { isHollowHead, hasStem, flagCount } = getDurationRenderInfo(note.duration);
  const stemX = isStemUp ? layout.STEM_OFFSET : -layout.STEM_OFFSET;
  const stemEndY = isStemUp ? y - layout.STEM_LENGTH : y + layout.STEM_LENGTH;

  return (
    <g>
      <ellipse
        cx="0"
        cy={y}
        rx={layout.NOTE_HEAD_RX}
        ry={layout.NOTE_HEAD_RY}
        fill={isHollowHead ? 'var(--color-note-hollow-fill)' : color}
        stroke={color}
        strokeWidth={layout.STAFF_LINE_THICKNESS}
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
      {isFlat(note) && (
        <text
          x={-layout.STAFF_SPACE * 1.2}
          y={y + layout.STAFF_SPACE * 0.4}
          fontSize={layout.ACCIDENTAL_SIZE}
          fill={color}
          fontFamily="serif"
          fontWeight="normal"
        >
          ♭
        </text>
      )}
      {hasStem && (
        <line
          x1={stemX}
          y1={y}
          x2={stemX}
          y2={stemEndY}
          stroke={color}
          strokeWidth={layout.STAFF_LINE_THICKNESS}
        />
      )}
      {Array.from({ length: flagCount }, (_, flagIndex) => (
        <path
          key={`${note.id}-flag-${flagIndex}`}
          d={getFlagPath(flagIndex, stemX, stemEndY, isStemUp, layout)}
          fill="none"
          stroke={color}
          strokeWidth={layout.STAFF_LINE_THICKNESS}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
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
  noteQueue,
  timeSignature,
}) => {
  const y = getNoteY(note, centerMidi, layout);
  const color = getNoteColor({ isExiting, index, detectedNote, activeNote });
  const isStemUp = y > layout.STAFF_CENTER_Y;
  const ledgers = buildLedgers(y, layout);
  const showBarLine = !isExiting && shouldShowBarLine(noteQueue, index, timeSignature);

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
          stroke="var(--color-staff-ledger)"
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
      <NoteGlyph note={note} y={y} color={color} isStemUp={isStemUp} layout={layout} />
    </g>
  );
};
