import React, { useEffect, useRef } from 'react';
import { Note } from '../types';

interface PianoDisplayProps {
  targetNote: Note | null;
  detectedNote: Note | null;
}

const START_MIDI = 36; 
const END_MIDI = 84; 
const WHITE_KEY_WIDTH = 36; // Slightly narrower for cleaner look on mobile
const BLACK_KEY_WIDTH = 20;
const HEIGHT = 90;

const PianoDisplay: React.FC<PianoDisplayProps> = ({ targetNote, detectedNote }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

  const keys = [];
  let whiteKeyCount = 0;

  for (let m = START_MIDI; m <= END_MIDI; m++) {
    const isBlack = isBlackKey(m);
    if (!isBlack) {
      keys.push({ midi: m, type: 'white', x: whiteKeyCount * WHITE_KEY_WIDTH });
      whiteKeyCount++;
    } else {
      keys.push({ midi: m, type: 'black', x: (whiteKeyCount * WHITE_KEY_WIDTH) - (BLACK_KEY_WIDTH / 2) });
    }
  }

  const totalWidth = whiteKeyCount * WHITE_KEY_WIDTH;

  useEffect(() => {
    if (targetNote && scrollRef.current) {
      const keyData = keys.find(k => k.midi === targetNote.midi);
      if (keyData) {
        const containerWidth = scrollRef.current.clientWidth;
        const scrollPos = keyData.x - (containerWidth / 2) + (WHITE_KEY_WIDTH / 2);
        
        scrollRef.current.scrollTo({
          left: scrollPos,
          behavior: 'smooth'
        });
      }
    }
  }, [targetNote?.midi]);

  const renderKey = (key: { midi: number, type: string, x: number }) => {
    const isTarget = targetNote?.midi === key.midi;
    const isDetected = detectedNote?.midi === key.midi;

    // Default styles
    let fill = key.type === 'white' ? 'white' : 'url(#blackKeyGradient)';
    let stroke = key.type === 'white' ? '#e2e8f0' : '#1e293b';

    // State Colors
    if (isDetected) {
      fill = isTarget ? '#4ade80' : '#fb7185'; // Green-400 or Rose-400
    } else if (isTarget) {
      fill = '#818cf8'; // Indigo-400
    }

    if (key.type === 'white') {
      return (
        <g key={key.midi}>
            <rect
            x={key.x}
            y={0}
            width={WHITE_KEY_WIDTH}
            height={HEIGHT}
            fill={fill === 'white' ? '#fff' : fill}
            stroke={stroke}
            strokeWidth="1"
            rx="4" ry="4"
            className="transition-colors duration-200"
            />
            {/* Shadow for white key depth */}
            <rect x={key.x + 2} y={HEIGHT - 5} width={WHITE_KEY_WIDTH - 4} height={3} rx="1" fill="#000" opacity="0.1" />
        </g>
      );
    } else {
      return (
        <rect
          key={key.midi}
          x={key.x}
          y={0}
          width={BLACK_KEY_WIDTH}
          height={HEIGHT * 0.6}
          fill={isDetected || isTarget ? fill : 'url(#blackKeyGradient)'}
          stroke={isDetected || isTarget ? 'none' : '#0f172a'}
          strokeWidth="0.5"
          rx="2" ry="2"
          className="z-10 transition-colors duration-200"
          style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}
        />
      );
    }
  };

  const whiteKeys = keys.filter(k => k.type === 'white');
  const blackKeys = keys.filter(k => k.type === 'black');

  return (
    <div className="w-full relative rounded-b-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
      <div 
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar relative w-full pt-1 pb-1 px-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        <svg width={totalWidth} height={HEIGHT} className="block mx-auto">
          <defs>
             <linearGradient id="blackKeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
             </linearGradient>
          </defs>
          
          {whiteKeys.map(renderKey)}
          {blackKeys.map(renderKey)}
          
          {/* Note Labels */}
          {whiteKeys.filter(k => k.midi % 12 === 0).map(k => (
             <text 
                key={`label-${k.midi}`} 
                x={k.x + WHITE_KEY_WIDTH/2} 
                y={HEIGHT - 8} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#94a3b8"
                fontWeight="600"
                pointerEvents="none"
             >
               C{Math.floor(k.midi / 12) - 1}
             </text>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default PianoDisplay;