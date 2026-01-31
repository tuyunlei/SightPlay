import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ClefType, Note } from '../types';

interface StaffDisplayProps {
  clef: ClefType;
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  status: 'waiting' | 'listening' | 'correct' | 'incorrect';
  micLabel: string;
}

type StaffLayout = {
  VIEWPORT_WIDTH: number;
  STAFF_SPACE: number;
  STAFF_HALF_SPACE: number;
  STAFF_LINE_THICKNESS: number;
  SVG_HEIGHT: number;
  STAFF_CENTER_Y: number;
  STAFF_TOP_Y: number;
  STAFF_BOTTOM_Y: number;
  START_X: number;
  NOTE_SPACING: number;
  BAR_INTERVAL: number;
  RIGHT_PADDING: number;
  NOTE_HEAD_RX: number;
  NOTE_HEAD_RY: number;
  STEM_OFFSET: number;
  STEM_LENGTH: number;
  LEDGER_HALF_LENGTH: number;
  CLEF_X: number;
  TREBLE_CLEF_SIZE: number;
  BASS_CLEF_SIZE: number;
  TREBLE_CLEF_Y: number;
  BASS_CLEF_Y: number;
  TIME_SIG_X: number;
  TIME_SIG_SIZE: number;
  ACCIDENTAL_SIZE: number;
  HIGHLIGHT_X: number;
  HIGHLIGHT_WIDTH: number;
};

const FALLBACK_VIEWPORT_WIDTH = 1000;

const createStaffLayout = (viewportWidth: number): StaffLayout => {
  const STAFF_SPACE = 20;
  const STAFF_HALF_SPACE = STAFF_SPACE / 2;
  const STAFF_LINE_THICKNESS = STAFF_SPACE * 0.08;
  const SVG_HEIGHT = STAFF_SPACE * 11;
  const STAFF_CENTER_Y = SVG_HEIGHT / 2;
  const STAFF_TOP_Y = STAFF_CENTER_Y - STAFF_SPACE * 2;
  const STAFF_BOTTOM_Y = STAFF_CENTER_Y + STAFF_SPACE * 2;
  const START_X = STAFF_SPACE * 5.5;
  const NOTE_SPACING = STAFF_SPACE * 2.2;
  const BAR_INTERVAL = 4;
  const RIGHT_PADDING = STAFF_SPACE * 2;
  const NOTE_HEAD_RX = STAFF_SPACE * 0.6;
  const NOTE_HEAD_RY = STAFF_SPACE * 0.42;
  const STEM_OFFSET = NOTE_HEAD_RX * 0.9;
  const STEM_LENGTH = STAFF_SPACE * 3.5;
  const LEDGER_HALF_LENGTH = NOTE_HEAD_RX + STAFF_SPACE / 2;
  const CLEF_X = STAFF_SPACE;
  const TREBLE_CLEF_SIZE = STAFF_SPACE * 4.2;
  const BASS_CLEF_SIZE = STAFF_SPACE * 3.2;
  const TREBLE_CLEF_Y = STAFF_CENTER_Y + STAFF_SPACE * 1.75;
  const BASS_CLEF_Y = STAFF_CENTER_Y + STAFF_SPACE * 0.75;
  const TIME_SIG_X = START_X - STAFF_SPACE * 2.75;
  const TIME_SIG_SIZE = STAFF_SPACE * 2;
  const ACCIDENTAL_SIZE = STAFF_SPACE * 1.1;
  const HIGHLIGHT_X = START_X - NOTE_SPACING / 2.5;
  const HIGHLIGHT_WIDTH = NOTE_SPACING * 0.9;

  return {
    VIEWPORT_WIDTH: viewportWidth,
    STAFF_SPACE,
    STAFF_HALF_SPACE,
    STAFF_LINE_THICKNESS,
    SVG_HEIGHT,
    STAFF_CENTER_Y,
    STAFF_TOP_Y,
    STAFF_BOTTOM_Y,
    START_X,
    NOTE_SPACING,
    BAR_INTERVAL,
    RIGHT_PADDING,
    NOTE_HEAD_RX,
    NOTE_HEAD_RY,
    STEM_OFFSET,
    STEM_LENGTH,
    LEDGER_HALF_LENGTH,
    CLEF_X,
    TREBLE_CLEF_SIZE,
    BASS_CLEF_SIZE,
    TREBLE_CLEF_Y,
    BASS_CLEF_Y,
    TIME_SIG_X,
    TIME_SIG_SIZE,
    ACCIDENTAL_SIZE,
    HIGHLIGHT_X,
    HIGHLIGHT_WIDTH,
  };
};

const getStaffSteps = (midi: number, centerMidi: number) => {
  const diatonicScale = [0, 2, 4, 5, 7, 9, 11];
  const getDiatonicIndex = (m: number) => {
    const octave = Math.floor(m / 12);
    const semitone = m % 12;
    let step = 0;
    for (let i = 0; i < diatonicScale.length; i++) {
      if (diatonicScale[i] === semitone) {
        step = i;
        break;
      }
      if (diatonicScale[i] > semitone) {
        step = i > 0 ? i - 1 : 6;
        break;
      }
      step = i;
    }
    return octave * 7 + step;
  };
  return getDiatonicIndex(midi) - getDiatonicIndex(centerMidi);
};

const getNoteY = (midi: number, centerMidi: number, layout: StaffLayout) => {
  const stepsFromCenter = getStaffSteps(midi, centerMidi);
  return layout.STAFF_CENTER_Y - stepsFromCenter * layout.STAFF_HALF_SPACE;
};

const buildLedgers = (y: number, layout: StaffLayout) => {
  const ledgers: number[] = [];
  if (y >= layout.STAFF_BOTTOM_Y + layout.STAFF_HALF_SPACE) {
    for (let ly = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE; ly <= y; ly += layout.STAFF_SPACE) {
      ledgers.push(ly);
    }
  }
  if (y <= layout.STAFF_TOP_Y - layout.STAFF_HALF_SPACE) {
    for (let ly = layout.STAFF_TOP_Y - layout.STAFF_SPACE; ly >= y; ly -= layout.STAFF_SPACE) {
      ledgers.push(ly);
    }
  }
  return ledgers;
};

const getNoteColor = (isExiting: boolean, index: number, status: StaffDisplayProps['status']) => {
  if (isExiting) return '#22c55e';
  if (index === 0) {
    if (status === 'correct') return '#22c55e';
    if (status === 'incorrect') return '#f43f5e';
    return '#1e293b';
  }
  return '#0f172a';
};

const isSharp = (note: Note) => note.name.includes('#');

type StaffNoteProps = {
  note: Note;
  index: number;
  x: number;
  isExiting: boolean;
  status: StaffDisplayProps['status'];
  centerMidi: number;
  layout: StaffLayout;
};

const StaffNote: React.FC<StaffNoteProps> = ({
  note,
  index,
  x,
  isExiting,
  status,
  centerMidi,
  layout,
}) => {
  const y = getNoteY(note.midi, centerMidi, layout);
  const color = getNoteColor(isExiting, index, status);
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

type StaffHeaderProps = {
  clef: ClefType;
  layout: StaffLayout;
};

const StaffHeader: React.FC<StaffHeaderProps> = ({ clef, layout }) => (
  <>
    {clef === ClefType.TREBLE ? (
      <text
        x={layout.CLEF_X}
        y={layout.TREBLE_CLEF_Y}
        fontSize={layout.TREBLE_CLEF_SIZE}
        fontFamily="serif"
        fill="#0f172a"
      >
        𝄞
      </text>
    ) : (
      <text
        x={layout.CLEF_X}
        y={layout.BASS_CLEF_Y}
        fontSize={layout.BASS_CLEF_SIZE}
        fontFamily="serif"
        fill="#0f172a"
      >
        𝄢
      </text>
    )}
    <text
      x={layout.TIME_SIG_X}
      y={layout.STAFF_CENTER_Y - layout.STAFF_SPACE * 0.25}
      fontSize={layout.TIME_SIG_SIZE}
      fontFamily="serif"
      fontWeight="bold"
      fill="#0f172a"
    >
      4
    </text>
    <text
      x={layout.TIME_SIG_X}
      y={layout.STAFF_CENTER_Y + layout.STAFF_SPACE * 1.75}
      fontSize={layout.TIME_SIG_SIZE}
      fontFamily="serif"
      fontWeight="bold"
      fill="#0f172a"
    >
      4
    </text>
  </>
);

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
  status: StaffDisplayProps['status'];
  centerMidi: number;
  layout: StaffLayout;
};

const StaffNotes: React.FC<StaffNotesProps> = ({ layoutNotes, status, centerMidi, layout }) => (
  <>
    {layoutNotes.map(({ note, index, x }) => (
      <StaffNote
        key={note.id}
        note={note}
        index={index}
        x={x}
        isExiting={false}
        status={status}
        centerMidi={centerMidi}
        layout={layout}
      />
    ))}
  </>
);

type ExitingNotesProps = {
  exitingNotes: Note[];
  centerMidi: number;
  layout: StaffLayout;
};

const ExitingNotes: React.FC<ExitingNotesProps> = ({ exitingNotes, centerMidi, layout }) => (
  <>
    {exitingNotes.map((note) => (
      <StaffNote
        key={`exit-${note.id}`}
        note={note}
        index={0}
        x={layout.START_X}
        isExiting
        status="waiting"
        centerMidi={centerMidi}
        layout={layout}
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
  status: StaffDisplayProps['status'];
  viewportWidth: number;
};

const StaffCanvas: React.FC<StaffCanvasProps> = ({
  clef,
  noteQueue,
  exitingNotes,
  detectedNote,
  status,
  viewportWidth,
}) => {
  const layout = useMemo(() => createStaffLayout(viewportWidth), [viewportWidth]);
  const centerMidi = clef === ClefType.TREBLE ? 71 : 50;
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
      <StaffHeader clef={clef} layout={layout} />
      <StaffLines layout={layout} contentWidth={contentWidth} />
      <StaffNotes
        layoutNotes={layoutNotes}
        status={status}
        centerMidi={centerMidi}
        layout={layout}
      />
      <ExitingNotes exitingNotes={exitingNotes} centerMidi={centerMidi} layout={layout} />
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

  return (
    <div
      ref={containerRef}
      className="w-full bg-white dark:bg-slate-50 rounded-xl relative overflow-hidden select-none border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <StaffCanvas
        clef={clef}
        noteQueue={noteQueue}
        exitingNotes={exitingNotes}
        detectedNote={detectedNote}
        status={status}
        viewportWidth={viewportWidth}
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
