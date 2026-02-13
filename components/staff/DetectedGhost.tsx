import React from 'react';

import { Note } from '../../types';

import { StaffLayout } from './staffLayout';
import { getNoteY, isSharp } from './staffUtils';

export type DetectedGhostProps = {
  detectedNote: Note | null;
  activeNote: Note | undefined;
  centerMidi: number;
  layout: StaffLayout;
};

export const DetectedGhost: React.FC<DetectedGhostProps> = ({
  detectedNote,
  activeNote,
  centerMidi,
  layout,
}) => {
  if (!detectedNote || detectedNote.midi === activeNote?.midi) return null;
  const y = getNoteY(detectedNote.midi, centerMidi, layout);
  const isStemUp = y > layout.STAFF_CENTER_Y;

  return (
    <g opacity="0.4" transform={`translate(${layout.START_X}, 0)`}>
      <ellipse
        cx="0"
        cy={y}
        rx={layout.NOTE_HEAD_RX}
        ry={layout.NOTE_HEAD_RY}
        fill="#f43f5e"
        transform={`rotate(-15, 0, ${y})`}
      />
      <line
        x1={isStemUp ? layout.STEM_OFFSET : -layout.STEM_OFFSET}
        y1={y}
        x2={isStemUp ? layout.STEM_OFFSET : -layout.STEM_OFFSET}
        y2={isStemUp ? y - layout.STEM_LENGTH : y + layout.STEM_LENGTH}
        stroke="#f43f5e"
        strokeWidth={layout.STAFF_LINE_THICKNESS}
      />
      {isSharp(detectedNote) && (
        <text
          x={-layout.STAFF_SPACE * 1.2}
          y={y + layout.STAFF_SPACE * 0.4}
          fontSize={layout.ACCIDENTAL_SIZE}
          fill="#f43f5e"
          fontFamily="serif"
        >
          ♯
        </text>
      )}
    </g>
  );
};
