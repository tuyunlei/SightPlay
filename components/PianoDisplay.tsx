import React, { useEffect, useRef } from 'react';

import { Note } from '../types';

interface PianoDisplayProps {
  targetNote: Note | null;
  detectedNote: Note | null; // For microphone input only
  pressedKeys: Map<number, { note: Note; isCorrect: boolean; targetId?: string | null }>; // For MIDI input - each key has its own frozen state
}

type PianoKey = { midi: number; type: 'white' | 'black'; x: number };

type PressedKeyInfo = {
  note: Note;
  isCorrect: boolean;
  targetId?: string | null;
};

const START_MIDI = 36;
const END_MIDI = 84;
const WHITE_KEY_WIDTH = 36; // Slightly narrower for cleaner look on mobile
const BLACK_KEY_WIDTH = 20;
const HEIGHT = 90;

const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

const buildPianoLayout = () => {
  const keys: PianoKey[] = [];
  let whiteKeyCount = 0;

  for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
    const blackKey = isBlackKey(midi);
    if (!blackKey) {
      keys.push({ midi, type: 'white', x: whiteKeyCount * WHITE_KEY_WIDTH });
      whiteKeyCount += 1;
    } else {
      keys.push({
        midi,
        type: 'black',
        x: whiteKeyCount * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
      });
    }
  }

  return {
    keys,
    whiteKeys: keys.filter((key) => key.type === 'white'),
    blackKeys: keys.filter((key) => key.type === 'black'),
    totalWidth: whiteKeyCount * WHITE_KEY_WIDTH,
  };
};

const PIANO_LAYOUT = buildPianoLayout();

const getKeyStyles = ({
  type,
  isTarget,
  isMicDetected,
  pressedInfo,
}: {
  type: PianoKey['type'];
  isTarget: boolean;
  isMicDetected: boolean;
  pressedInfo?: PressedKeyInfo;
}) => {
  let fill = type === 'white' ? '#fff' : 'url(#blackKeyGradient)';
  const stroke = type === 'white' ? '#e2e8f0' : '#1e293b';

  if (pressedInfo) {
    fill = pressedInfo.isCorrect ? '#4ade80' : '#fb7185';
  } else if (isMicDetected) {
    fill = isTarget ? '#4ade80' : '#fb7185';
  } else if (isTarget) {
    fill = '#818cf8';
  }

  return {
    fill,
    stroke,
    isHighlighted: Boolean(pressedInfo) || isMicDetected || isTarget,
  };
};

type PianoKeyShapeProps = {
  keyData: PianoKey;
  isTarget: boolean;
  isMicDetected: boolean;
  pressedInfo?: PressedKeyInfo;
};

const PianoKeyShape: React.FC<PianoKeyShapeProps> = ({
  keyData,
  isTarget,
  isMicDetected,
  pressedInfo,
}) => {
  const { fill, stroke, isHighlighted } = getKeyStyles({
    type: keyData.type,
    isTarget,
    isMicDetected,
    pressedInfo,
  });

  if (keyData.type === 'white') {
    return (
      <g key={keyData.midi}>
        <rect
          x={keyData.x}
          y={0}
          width={WHITE_KEY_WIDTH}
          height={HEIGHT}
          fill={fill}
          stroke={stroke}
          strokeWidth="1"
          rx="4"
          ry="4"
          className="transition-colors duration-200"
        />
        <rect
          x={keyData.x + 2}
          y={HEIGHT - 5}
          width={WHITE_KEY_WIDTH - 4}
          height={3}
          rx="1"
          fill="#000"
          opacity="0.1"
        />
      </g>
    );
  }

  return (
    <rect
      key={keyData.midi}
      x={keyData.x}
      y={0}
      width={BLACK_KEY_WIDTH}
      height={HEIGHT * 0.6}
      fill={isHighlighted ? fill : 'url(#blackKeyGradient)'}
      stroke={isHighlighted ? 'none' : '#0f172a'}
      strokeWidth="0.5"
      rx="2"
      ry="2"
      className="z-10 transition-colors duration-200"
      style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}
    />
  );
};

type PianoSvgProps = {
  targetMidi: number | null;
  detectedMidi: number | null;
  pressedKeys: Map<number, PressedKeyInfo>;
};

const PianoSvg: React.FC<PianoSvgProps> = ({ targetMidi, detectedMidi, pressedKeys }) => (
  <svg width={PIANO_LAYOUT.totalWidth} height={HEIGHT} className="block mx-auto">
    <defs>
      <linearGradient id="blackKeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>

    {PIANO_LAYOUT.whiteKeys.map((key) => (
      <PianoKeyShape
        key={key.midi}
        keyData={key}
        isTarget={targetMidi === key.midi}
        isMicDetected={detectedMidi === key.midi}
        pressedInfo={pressedKeys.get(key.midi)}
      />
    ))}

    {PIANO_LAYOUT.blackKeys.map((key) => (
      <PianoKeyShape
        key={key.midi}
        keyData={key}
        isTarget={targetMidi === key.midi}
        isMicDetected={detectedMidi === key.midi}
        pressedInfo={pressedKeys.get(key.midi)}
      />
    ))}

    {PIANO_LAYOUT.whiteKeys
      .filter((key) => key.midi % 12 === 0)
      .map((key) => (
        <text
          key={`label-${key.midi}`}
          x={key.x + WHITE_KEY_WIDTH / 2}
          y={HEIGHT - 8}
          fontSize="9"
          textAnchor="middle"
          fill="#94a3b8"
          fontWeight="600"
          pointerEvents="none"
        >
          C{Math.floor(key.midi / 12) - 1}
        </text>
      ))}
  </svg>
);

const PianoDisplay: React.FC<PianoDisplayProps> = ({ targetNote, detectedNote, pressedKeys }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetMidi = targetNote?.midi ?? null;
  const detectedMidi = detectedNote?.midi ?? null;

  useEffect(() => {
    if (targetMidi === null || !scrollRef.current) return;
    const keyData = PIANO_LAYOUT.keys.find((key) => key.midi === targetMidi);
    if (!keyData) return;

    const containerWidth = scrollRef.current.clientWidth;
    const scrollPos = keyData.x - containerWidth / 2 + WHITE_KEY_WIDTH / 2;

    scrollRef.current.scrollTo({
      left: scrollPos,
      behavior: 'smooth',
    });
  }, [targetMidi]);

  return (
    <div className="w-full relative rounded-b-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar relative w-full pt-1 pb-1 px-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        <PianoSvg targetMidi={targetMidi} detectedMidi={detectedMidi} pressedKeys={pressedKeys} />
      </div>
    </div>
  );
};

export default PianoDisplay;
