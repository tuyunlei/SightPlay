import React, { useEffect, useState } from 'react';
import { ClefType, Note } from '../types';

interface StaffDisplayProps {
  clef: ClefType;
  noteQueue: Note[];
  exitingNotes: Note[]; // Notes that are currently animating out
  detectedNote: Note | null;
  status: 'waiting' | 'listening' | 'correct' | 'incorrect';
  micLabel: string;
}

const StaffDisplay: React.FC<StaffDisplayProps> = ({ clef, noteQueue, exitingNotes, detectedNote, status, micLabel }) => {
  
  // Responsive calculations
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configuration
  const isMobile = viewportWidth < 768;
  const SVG_WIDTH = isMobile ? 500 : 1000; 
  const SVG_HEIGHT = 220;
  
  // Positioning Constants for "Authentic" Look
  const START_X = isMobile ? 80 : 140; // Space for Clef + Time Sig
  const NOTE_SPACING = isMobile ? 32 : 50; // Much tighter spacing
  const BAR_INTERVAL = 4; // 4/4 Time Signature, bar line every 4 notes

  // Y Position Logic
  const getNoteY = (midi: number) => {
    let centerMidi = clef === ClefType.TREBLE ? 71 : 50; 
    const stepsFromCenter = getStaffSteps(midi, centerMidi);
    return (SVG_HEIGHT / 2) - (stepsFromCenter * 10);
  };

  const getStaffSteps = (midi: number, centerMidi: number) => {
    const diatonicScale = [0, 2, 4, 5, 7, 9, 11]; 
    const getDiatonicIndex = (m: number) => {
        const octave = Math.floor(m / 12);
        const semitone = m % 12;
        let step = 0;
        for(let i=0; i<diatonicScale.length; i++) {
            if(diatonicScale[i] === semitone) {
                step = i; break;
            }
            if(diatonicScale[i] > semitone) {
                 step = i > 0 ? i - 1 : 6; break;
            }
            step = i;
        }
        return (octave * 7) + step;
    };
    return getDiatonicIndex(midi) - getDiatonicIndex(centerMidi);
  };

  const isSharp = (note: Note) => note.name.includes('#');
  
  const renderNote = (note: Note, index: number, isExiting: boolean) => {
    const y = getNoteY(note.midi);
    // If exiting, it's at START_X (technically slightly left as it moves out).
    // If queued, X = START_X + index * SPACING
    const x = START_X + (index * NOTE_SPACING);
    
    // Determine color
    let color = '#334155'; // Slate-700
    if (isExiting) color = '#22c55e'; // Green
    else if (index === 0) {
        if (status === 'correct') color = '#22c55e';
        else if (status === 'incorrect') color = '#f43f5e';
        else color = '#1e293b'; // Active Target
    } else {
        color = '#0f172a'; // Future notes (Black/Dark Slate)
    }

    const isStemUp = y > (SVG_HEIGHT / 2);

    // Ledger lines
    const ledgers = [];
    const staffTop = (SVG_HEIGHT/2) - 40; 
    const staffBottom = (SVG_HEIGHT/2) + 40;
    
    if (y >= staffBottom + 10) { 
        for (let ly = staffBottom + 20; ly <= y; ly += 20) ledgers.push(ly); 
    }
    if (y <= staffTop - 10) { 
        for (let ly = staffTop - 20; ly >= y; ly -= 20) ledgers.push(ly); 
    }

    // Bar Lines
    // Draw bar line BEFORE the note if it starts a new measure (e.g., globalIndex % 4 === 0)
    // We offset it slightly to the left of the note
    const showBarLine = !isExiting && note.globalIndex > 0 && note.globalIndex % BAR_INTERVAL === 0;

    return (
      <g 
        key={note.id} 
        className={`transition-all duration-300 ease-out ${isExiting ? 'opacity-0 -translate-y-8 -translate-x-4 scale-110' : 'opacity-100'}`}
        style={{ 
            transform: isExiting ? `translate(${x}px, -40px)` : `translate(${x}px, 0)`,
            transformOrigin: `${x}px ${y}px`
        }}
      >
        {/* Bar Line */}
        {showBarLine && (
            <line 
                x1={-NOTE_SPACING/2} y1={(SVG_HEIGHT/2) - 40} 
                x2={-NOTE_SPACING/2} y2={(SVG_HEIGHT/2) + 40} 
                stroke="#94a3b8" 
                strokeWidth="1"
                transform={`translate(${x}, 0)`}
            />
        )}

        {/* Ledger Lines */}
        {ledgers.map((ly, i) => (
             <line key={i} x1="-14" y1={ly} x2="14" y2={ly} stroke={color} strokeWidth="1.5" opacity="1" transform={`translate(${x}, 0)`} />
        ))}
        
        <g transform={`translate(${x}, 0)`}>
            {/* Note Head (Slightly smaller for tighter packing) */}
            <ellipse 
                cx="0" cy={y} rx={isMobile ? "10" : "11"} ry={isMobile ? "7.5" : "8"} 
                fill={color} 
                transform={`rotate(-15, 0, ${y})`}
            />
            
            {/* Accidental */}
            {isSharp(note) && (
                 <text x="-24" y={y + 8} fontSize="22" fill={color} fontFamily="serif" fontWeight="normal">♯</text>
            )}
            
            {/* Stem */}
            <line 
                x1={isStemUp ? (isMobile ? "9" : "10") : (isMobile ? "-9" : "-10")} 
                y1={y} 
                x2={isStemUp ? (isMobile ? "9" : "10") : (isMobile ? "-9" : "-10")} 
                y2={isStemUp ? y - 40 : y + 40} 
                stroke={color} 
                strokeWidth="1.5" 
            />
        </g>
      </g>
    );
  };

  const detectedY = detectedNote ? getNoteY(detectedNote.midi) : 0;

  return (
    <div className="w-full bg-white dark:bg-slate-50 rounded-xl relative overflow-hidden select-none border border-slate-200 dark:border-slate-800 shadow-sm">
      <svg 
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Highlight Zone for Current Note */}
        <rect 
            x={START_X - NOTE_SPACING/2.5} 
            y="20" 
            width={NOTE_SPACING} 
            height={SVG_HEIGHT - 40} 
            fill="#f1f5f9" // Very subtle background highlight
            rx="8"
        />

        {/* Clef Symbol */}
        {clef === ClefType.TREBLE ? (
           <text x="20" y={SVG_HEIGHT/2 + 35} fontSize="85" fontFamily="serif" fill="#0f172a">𝄞</text>
        ) : (
           <text x="20" y={SVG_HEIGHT/2 + 15} fontSize="65" fontFamily="serif" fill="#0f172a">𝄢</text>
        )}

        {/* Time Signature (4/4) */}
        <text x={isMobile ? 55 : 85} y={SVG_HEIGHT/2 - 5} fontSize={isMobile ? "30" : "40"} fontFamily="serif" fontWeight="bold" fill="#0f172a">4</text>
        <text x={isMobile ? 55 : 85} y={SVG_HEIGHT/2 + 35} fontSize={isMobile ? "30" : "40"} fontFamily="serif" fontWeight="bold" fill="#0f172a">4</text>

        {/* Staff Lines */}
        {[-2, -1, 0, 1, 2].map((i) => {
            const y = (SVG_HEIGHT / 2) + (i * 20);
            return <line key={i} x1="10" y1={y} x2={SVG_WIDTH - 10} y2={y} stroke="#cbd5e1" strokeWidth="1.5" />;
        })}

        {/* Note Queue */}
        {noteQueue.map((note, index) => renderNote(note, index, false))}

        {/* Exiting Notes (Animations) */}
        {exitingNotes.map((note) => renderNote(note, 0, true))}

        {/* Detected Ghost Note (Visual Feedback) at the Active Position */}
        {detectedNote && (detectedNote.midi !== noteQueue[0]?.midi) && (
             <g opacity="0.4" transform={`translate(${START_X}, 0)`}>
                 <ellipse cx="0" cy={detectedY} rx="11" ry="8" fill="#f43f5e" transform={`rotate(-15, 0, ${detectedY})`} />
                 <line x1={detectedY > SVG_HEIGHT/2 ? "10" : "-10"} y1={detectedY} x2={detectedY > SVG_HEIGHT/2 ? "10" : "-10"} y2={detectedY > SVG_HEIGHT/2 ? detectedY - 40 : detectedY + 40} stroke="#f43f5e" strokeWidth="1.5" />
                 {isSharp(detectedNote) && <text x="-24" y={detectedY + 8} fontSize="22" fill="#f43f5e" fontFamily="serif">♯</text>}
             </g>
        )}
      </svg>
      
      {status === 'listening' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{micLabel}</span>
          </div>
      )}
    </div>
  );
};

export default StaffDisplay;