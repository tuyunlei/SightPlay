import React, { useEffect, useMemo, useRef, useState } from 'react';

import { CLEF_CENTER_MIDI, TIME_SIGNATURES } from '../config/music';
import { ClefType, Note, TimeSignature } from '../types';

import { StaffHeader } from './staff/StaffHeader';
import { createStaffLayout, FALLBACK_VIEWPORT_WIDTH, StaffLayout } from './staff/staffLayout';
import { StaffNote } from './staff/StaffNote';
import { getNoteY, isSharp } from './staff/staffUtils';

interface StaffDisplayProps {
  clef: ClefType;
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  status: 'waiting' | 'listening' | 'correct' | 'incorrect';
  micLabel: string;
}

const StaffLines: React.FC<{ layout: StaffLayout; contentWidth: number }> = ({
  layout,
  contentWidth,
}) => (
  <>
    {[-2, -1, 0, 1, 2].map((i) => {
      const y = layout.STAFF_CENTER_Y + i * layout.STAFF_SPACE;
      return (
        <line
          key={`staff-line-${i}`}
          x1={layout.STAFF_SPACE * 0.5}
          y1={y}
          x2={contentWidth - layout.STAFF_SPACE * 0.5}
          y2={y}
          stroke="#cbd5e1"
          strokeWidth={layout.STAFF_LINE_THICKNESS}
        />
      );
    })}
  </>
);

type NoteLayout = {
  note: Note;
  index: number;
  x: number;
};

type StaffNotesProps = {
  layoutNotes: NoteLayout[];
  noteQueue: Note[];
  detectedNote: Note | null;
  activeNote: Note | undefined;
  centerMidi: number;
  layout: StaffLayout;
  timeSignature: TimeSignature;
};

const StaffNotes: React.FC<StaffNotesProps> = ({
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

type ExitingNotesProps = {
  exitingNotes: Note[];
  centerMidi: number;
  layout: StaffLayout;
  timeSignature: TimeSignature;
};

const ExitingNotes: React.FC<ExitingNotesProps> = ({
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

type DetectedGhostProps = {
  detectedNote: Note | null;
  activeNote: Note | undefined;
  centerMidi: number;
  layout: StaffLayout;
};

const DetectedGhost: React.FC<DetectedGhostProps> = ({
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

type StaffCanvasProps = {
  clef: ClefType;
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  viewportWidth: number;
  timeSignature: TimeSignature;
};

const StaffCanvas: React.FC<StaffCanvasProps> = ({
  clef,
  noteQueue,
  exitingNotes,
  detectedNote,
  viewportWidth,
  timeSignature,
}) => {
  const layout = useMemo(() => createStaffLayout(viewportWidth), [viewportWidth]);
  const centerMidi = CLEF_CENTER_MIDI[clef];
  const availableWidth = Math.max(0, layout.VIEWPORT_WIDTH - layout.START_X - layout.RIGHT_PADDING);
  const maxFitNotes = Math.max(1, Math.floor(availableWidth / layout.NOTE_SPACING) + 1);
  const visibleCount = Math.min(noteQueue.length, maxFitNotes);
  const contentWidth =
    layout.START_X + Math.max(visibleCount - 1, 0) * layout.NOTE_SPACING + layout.RIGHT_PADDING;

  const layoutNotes = useMemo(
    () =>
      noteQueue.slice(0, visibleCount).map((note, index) => ({
        note,
        index,
        x: layout.START_X + index * layout.NOTE_SPACING,
      })),
    [noteQueue, visibleCount, layout.START_X, layout.NOTE_SPACING]
  );

  return (
    <svg
      width={contentWidth}
      height={layout.SVG_HEIGHT}
      viewBox={`0 0 ${contentWidth} ${layout.SVG_HEIGHT}`}
      className="block max-w-none"
      style={{ width: `${contentWidth}px`, height: `${layout.SVG_HEIGHT}px` }}
      preserveAspectRatio="xMinYMin meet"
    >
      <rect
        x={layout.HIGHLIGHT_X}
        y={layout.STAFF_SPACE}
        width={layout.HIGHLIGHT_WIDTH}
        height={layout.SVG_HEIGHT - layout.STAFF_SPACE * 2}
        fill="#f1f5f9"
        rx="8"
      />
      <StaffHeader clef={clef} layout={layout} timeSignature={timeSignature} />
      <StaffLines layout={layout} contentWidth={contentWidth} />
      <StaffNotes
        layoutNotes={layoutNotes}
        noteQueue={noteQueue}
        detectedNote={detectedNote}
        activeNote={noteQueue[0]}
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
        activeNote={noteQueue[0]}
        centerMidi={centerMidi}
        layout={layout}
      />
    </svg>
  );
};

const StaffDisplay: React.FC<StaffDisplayProps> = ({
  clef,
  noteQueue,
  exitingNotes,
  detectedNote,
  status,
  micLabel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => setContainerWidth(el.getBoundingClientRect().width);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const viewportWidth = containerWidth || FALLBACK_VIEWPORT_WIDTH;
  const timeSignature = TIME_SIGNATURES['4/4'];

  return (
    <div
      ref={containerRef}
      data-testid="staff-display"
      className="w-full bg-white dark:bg-slate-50 rounded-xl relative overflow-hidden select-none border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <StaffCanvas
        clef={clef}
        noteQueue={noteQueue}
        exitingNotes={exitingNotes}
        detectedNote={detectedNote}
        viewportWidth={viewportWidth}
        timeSignature={timeSignature}
      />
      {status === 'listening' && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
            {micLabel}
          </span>
        </div>
      )}
    </div>
  );
};

export default StaffDisplay;
