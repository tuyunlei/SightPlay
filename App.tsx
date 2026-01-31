import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Music, RefreshCw, Wand2, Info, Piano, Languages, ChevronUp, ChevronDown, Trophy, Activity, Target, Sparkles, Send } from 'lucide-react';
import { AudioProcessor } from './services/audioService';
import { MidiService } from './services/midiService';
import { chatWithAiCoach } from './services/geminiService';
import StaffDisplay from './components/StaffDisplay';
import PianoDisplay from './components/PianoDisplay';
import { Note, ClefType, GeneratedChallenge, ChatMessage } from './types';
import { TREBLE_RANGE, BASS_RANGE, createNoteFromMidi, getNoteLabels } from './constants';
import { translations, Language } from './i18n';

// Parse scientific notation (e.g., C4) to MIDI
const noteStringToMidi = (noteStr: string): number | null => {
    const match = noteStr.match(/^([A-G][#]?)(-?\d+)$/);
    if (!match) return null;
    const name = match[1];
    const octave = parseInt(match[2], 10);
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const idx = names.indexOf(name);
    if (idx === -1) return null;
    return (octave + 1) * 12 + idx;
};

// Increased to 20 to fill the staff properly with tight spacing
const QUEUE_SIZE = 20; 

const App = () => {
  // State
  const [lang, setLang] = useState<Language>('zh');
  const [isListening, setIsListening] = useState(false);
  const [isMidiConnected, setIsMidiConnected] = useState(false);
  const [clef, setClef] = useState<ClefType>(ClefType.TREBLE);
  
  // Note Queue System
  const [noteQueue, setNoteQueue] = useState<Note[]>([]);
  const [exitingNotes, setExitingNotes] = useState<Note[]>([]); // Notes animating out
  
  const [detectedNote, setDetectedNote] = useState<Note | null>(null);
  const [status, setStatus] = useState<'waiting' | 'listening' | 'correct' | 'incorrect'>('waiting');
  
  // Stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionStats, setSessionStats] = useState({
      totalAttempts: 0,
      cleanHits: 0,
      bpm: 0
  });
  
  // Challenge Mode State
  const [challengeSequence, setChallengeSequence] = useState<Note[]>([]); 
  const [challengeIndex, setChallengeIndex] = useState(0); // Points to the index of the note *currently at the head of the queue* in the full sequence
  const [challengeInfo, setChallengeInfo] = useState<GeneratedChallenge | null>(null);

  // AI & Chat State
  const [showPiano, setShowPiano] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Computed translation object
  const t = translations[lang];
  // Helper to get current target (head of queue)
  const targetNote = noteQueue.length > 0 ? noteQueue[0] : null;

  // Refs
  const audioProcessor = useRef<AudioProcessor>(new AudioProcessor());
  const midiService = useRef<MidiService>(new MidiService());
  const rafId = useRef<number>(0);
  const matchTimer = useRef<number>(0);
  const wrongTimer = useRef<number>(0);
  const lastHitTime = useRef<number>(0);
  const hasMistakeForCurrent = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false); // Lockout to prevent double triggers/tail overlaps
  
  const MATCH_THRESHOLD_MS = 80; 

  // Initialize first batch and MIDI
  useEffect(() => {
    // Fill initial queue
    const initialNotes = Array.from({ length: QUEUE_SIZE }, (_, i) => generateRandomNoteData(clef, i));
    setNoteQueue(initialNotes);
    
    lastHitTime.current = Date.now();
    
    // Initialize MIDI
    midiService.current.initialize(
        (midiNumber) => {
            // detected notes don't need a valid global index
            const note = createNoteFromMidi(midiNumber, -1);
            setDetectedNote(prev => {
                if (prev?.midi === note.midi) return prev;
                return note;
            });
        },
        (connected) => {
            setIsMidiConnected(connected);
        }
    );
    
    setChatHistory([{
        role: 'ai',
        text: t.defaultAi
    }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When clef changes, regenerate queue if not in challenge
  useEffect(() => {
      if (challengeSequence.length === 0) {
          const newNotes = Array.from({ length: QUEUE_SIZE }, (_, i) => generateRandomNoteData(clef, i));
          setNoteQueue(newNotes);
      }
  }, [clef, challengeSequence.length]);

  // Auto-scroll chat
  useEffect(() => {
      if (showAiPanel && chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, showAiPanel]);

  const resetStats = () => {
      setScore(0);
      setStreak(0);
      setSessionStats({ totalAttempts: 0, cleanHits: 0, bpm: 0 });
      lastHitTime.current = Date.now();
  };

  const generateRandomNoteData = (currentClef: ClefType, globalIdx: number): Note => {
    const range = currentClef === ClefType.TREBLE ? TREBLE_RANGE : BASS_RANGE;
    
    // Simple logic to prefer white keys for basic practice
    const whiteKeyMidi = (() => {
         let m = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
         const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
         return isBlack ? m - 1 : m;
    })();

    return createNoteFromMidi(whiteKeyMidi, globalIdx);
  };

  // --- AI Chat Logic ---
  const handleSendMessage = async (text: string) => {
      if (!text.trim() || isLoadingAi) return;
      if (!process.env.API_KEY) {
          alert(t.apiKeyError);
          return;
      }

      const userMsg: ChatMessage = { role: 'user', text };
      setChatHistory(prev => [...prev, userMsg]);
      setChatInput("");
      setIsLoadingAi(true);
      setShowAiPanel(true);

      try {
          const response = await chatWithAiCoach(text, clef, lang);
          
          const aiMsg: ChatMessage = { 
              role: 'ai', 
              text: response.replyText,
              hasAction: !!response.challengeData
          };
          
          setChatHistory(prev => [...prev, aiMsg]);

          if (response.challengeData) {
              loadChallenge(response.challengeData);
          }

      } catch (e) {
          console.error(e);
          setChatHistory(prev => [...prev, { role: 'ai', text: "Error connecting to AI." }]);
      } finally {
          setIsLoadingAi(false);
      }
  };

  const loadChallenge = (challenge: GeneratedChallenge) => {
      setChallengeInfo(challenge);
      const notes: Note[] = [];
      challenge.notes.forEach((n, i) => {
          const m = noteStringToMidi(n);
          if (m) notes.push(createNoteFromMidi(m, i));
      });
      
      if (notes.length > 0) {
          setChallengeSequence(notes);
          setChallengeIndex(0);
          
          // Fill queue with start of challenge
          const initialQueue = notes.slice(0, QUEUE_SIZE);
          setNoteQueue(initialQueue);
          
          resetStats();
          setChatHistory(prev => [...prev, { 
              role: 'ai', 
              text: `${t.challenge}: ${challenge.title} (${notes.length} notes) loaded!`,
              hasAction: true 
          }]);
      }
  };

  // --- Audio / Detection ---
  const toggleMic = async () => {
    if (isListening) {
      audioProcessor.current.stop();
      cancelAnimationFrame(rafId.current);
      setIsListening(false);
      setStatus('waiting');
      setDetectedNote(null);
    } else {
      try {
        await audioProcessor.current.start();
        setIsListening(true);
        setStatus('listening');
        detectLoop();
      } catch (e) {
        alert(t.micError);
      }
    }
  };

  const detectLoop = () => {
    const note = audioProcessor.current.getPitch();
    
    // Optimization: Only update state if note changed significantly or toggled null
    // This prevents React from re-rendering 60 times a second with new object references
    setDetectedNote(prev => {
        // If both are null, do nothing
        if (!note && !prev) return prev;
        
        // If one is null and other isn't, update
        if (!note || !prev) return note;

        // If MIDI is same, keep previous object reference to prevent re-renders
        if (note.midi === prev.midi) return prev;

        return note;
    });

    rafId.current = requestAnimationFrame(detectLoop);
  };

  // --- Matching Logic ---
  useEffect(() => {
    if (!targetNote || isProcessingRef.current) return;

    if (detectedNote) {
        if (detectedNote.midi === targetNote.midi) {
            wrongTimer.current = 0;
            const now = Date.now();
            if (matchTimer.current === 0) matchTimer.current = now;

            const elapsed = now - matchTimer.current;
            if (elapsed > MATCH_THRESHOLD_MS) {
                handleCorrectNote();
                matchTimer.current = 0;
            }
        } else {
            // Wrong note
            matchTimer.current = 0;
            const now = Date.now();
            if (wrongTimer.current === 0) wrongTimer.current = now;
            
            // Allow a small grace period before flagging as incorrect visually
            if (now - wrongTimer.current > MATCH_THRESHOLD_MS) {
                if (!hasMistakeForCurrent.current) {
                    hasMistakeForCurrent.current = true;
                }
                wrongTimer.current = 0; 
            }
        }
    } else {
        matchTimer.current = 0;
        wrongTimer.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedNote, targetNote]); 

  const handleCorrectNote = () => {
      if (isProcessingRef.current) return;
      
      // Lock processing briefly to prevent "double tap" effect from audio tail
      isProcessingRef.current = true;
      setTimeout(() => {
          isProcessingRef.current = false;
      }, 150);

      // 1. Move head to exiting
      const currentNote = noteQueue[0];
      if (!currentNote) return;

      // Add to exiting list to trigger "fly away" animation
      setExitingNotes(prev => [...prev, currentNote]);

      // Schedule cleanup
      setTimeout(() => {
          setExitingNotes(prev => prev.filter(n => n.id !== currentNote.id));
      }, 600);

      // 2. Stats
      const newScore = score + 10 + (streak * 2);
      setScore(newScore);
      setStreak(s => s + 1);

      const now = Date.now();
      const timeDiff = now - lastHitTime.current;
      lastHitTime.current = now;
      const instantaneousBpm = timeDiff > 0 ? Math.min(300, Math.round(60000 / timeDiff)) : 0;
      
      setSessionStats(prev => {
          const newTotal = prev.totalAttempts + 1;
          const newClean = hasMistakeForCurrent.current ? prev.cleanHits : prev.cleanHits + 1;
          const newBpm = prev.totalAttempts === 0 ? instantaneousBpm : Math.round(prev.bpm * 0.8 + instantaneousBpm * 0.2); // Faster smoothing
          return { totalAttempts: newTotal, cleanHits: newClean, bpm: timeDiff < 8000 ? newBpm : prev.bpm };
      });

      // 3. Shift Queue & Add New Note
      setNoteQueue(prev => {
          const [, ...rest] = prev;
          // Determine the next global index based on the last note in the queue
          const lastNote = rest[rest.length - 1];
          const nextGlobalIndex = lastNote ? lastNote.globalIndex + 1 : 0;
          
          let nextNote: Note | null = null;

          if (challengeSequence.length > 0) {
              const nextSeqIndex = challengeIndex + QUEUE_SIZE;
              if (nextSeqIndex < challengeSequence.length) {
                  nextNote = challengeSequence[nextSeqIndex];
              }
          } else {
              // Endless Random Mode
              nextNote = generateRandomNoteData(clef, nextGlobalIndex);
          }

          return nextNote ? [...rest, nextNote] : rest;
      });

      // 4. Update Challenge Index
      if (challengeSequence.length > 0) {
          const nextIndex = challengeIndex + 1;
          setChallengeIndex(nextIndex);
          
          // Check Finish
          // If queue is empty (or about to be empty in next render), we are done
          if (noteQueue.length <= 1) {
              handleSendMessage("I finished the challenge! How did I do?");
              // Reset to random mode after a moment
              setTimeout(() => {
                  setChallengeSequence([]);
                  setChallengeInfo(null);
                  const resetNotes = Array.from({ length: QUEUE_SIZE }, (_, i) => generateRandomNoteData(clef, i));
                  setNoteQueue(resetNotes);
              }, 1500);
          }
      }

      // Reset flags
      hasMistakeForCurrent.current = false;
  };

  const getAccuracy = () => {
      if (sessionStats.totalAttempts === 0) return 100;
      return Math.round((sessionStats.cleanHits / sessionStats.totalAttempts) * 100);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
        
        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        {/* --- Navbar --- */}
        <nav className="relative z-30 w-full flex flex-col backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0">
            <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                        <Music size={20} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold leading-none tracking-tight hidden sm:block">PitchPerfect</h1>
                        <h1 className="text-lg font-bold leading-none tracking-tight sm:hidden">PitchPerfect</h1>
                    </div>
                </div>

                {/* Dashboard Stats (Desktop: In Navbar, Mobile: Below) */}
                <div className="hidden md:flex items-center gap-6 px-4">
                     <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-yellow-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{score}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Activity size={14} className="text-cyan-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{sessionStats.bpm} BPM</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Target size={14} className="text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{getAccuracy()}%</span>
                     </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMic}
                        className={`p-2 rounded-full transition-all ${
                            isListening 
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/30 animate-pulse' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/30'
                        }`}
                        title={isListening ? t.btnMicStop : t.btnMicStart}
                    >
                        {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>

                    <button
                        onClick={() => setClef(clef === ClefType.TREBLE ? ClefType.BASS : ClefType.TREBLE)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
                    >
                        {clef === ClefType.TREBLE ? <span className="text-xl font-serif">𝄞</span> : <span className="text-xl font-serif">𝄢</span>}
                    </button>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                    <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400">
                        <Languages size={18} />
                    </button>
                    <button onClick={resetStats} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Mobile Stats Bar */}
            <div className="md:hidden px-4 pb-2 border-t border-slate-100 dark:border-slate-800/50 mt-1">
                <div className="flex items-center justify-between pt-2">
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">{t.score}</span>
                        <span className="text-sm font-bold">{score}</span>
                     </div>
                     <div className="w-px h-6 bg-slate-100 dark:bg-slate-800"></div>
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">{t.bpm}</span>
                        <span className="text-sm font-bold">{sessionStats.bpm}</span>
                     </div>
                     <div className="w-px h-6 bg-slate-100 dark:bg-slate-800"></div>
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">{t.accuracy}</span>
                        <span className="text-sm font-bold">{getAccuracy()}%</span>
                     </div>
                </div>
            </div>
        </nav>

        {/* --- Main Grid Layout --- */}
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 gap-6 grid grid-cols-1 lg:grid-cols-3">
            
            {/* Left Column: Practice Area (Staff + Piano) */}
            <div className="lg:col-span-2 flex flex-col gap-4 justify-start">
                
                {/* Staff Card */}
                <div className="w-full relative group">
                    {isMidiConnected && (
                        <div className="absolute -top-3 left-4 z-20 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-sm">
                            <Piano size={10} /> MIDI ACTIVE
                        </div>
                    )}
                    
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-1 min-h-[220px]">
                            <StaffDisplay 
                                clef={clef} 
                                noteQueue={noteQueue}
                                exitingNotes={exitingNotes}
                                detectedNote={detectedNote} 
                                status={status}
                                micLabel={t.micOn}
                            />
                        </div>
                        
                        {/* Note Info Badge */}
                        <div className="absolute bottom-3 left-3">
                            <div className="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-3 py-2 rounded-xl shadow-lg backdrop-blur-md border border-slate-700/50 flex items-center gap-4">
                                {targetNote ? (
                                    <>
                                        <div>
                                            <span className="block text-[8px] opacity-70 uppercase tracking-widest font-bold mb-0.5">{t.target}</span>
                                            <div className="flex items-baseline leading-none">
                                                <span className="text-2xl font-black font-mono">{targetNote.name}</span>
                                                <span className="text-sm font-bold opacity-60 ml-0.5">{targetNote.octave}</span>
                                            </div>
                                        </div>
                                        <div className="w-px h-8 bg-current opacity-20"></div>
                                        <div className="flex flex-col items-center leading-none">
                                            <span className="text-base font-bold text-yellow-400 dark:text-indigo-600">
                                                {getNoteLabels(targetNote.name).solfege}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold opacity-80 mt-1">
                                                {getNoteLabels(targetNote.name).number}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-sm font-bold">Complete!</span>
                                )}
                            </div>
                        </div>

                        {/* Piano Toggle */}
                        <button 
                            onClick={() => setShowPiano(!showPiano)}
                            className="absolute bottom-3 right-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-lg shadow-sm transition-all border border-slate-200 dark:border-slate-700"
                        >
                            {showPiano ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    {/* Piano Display */}
                    <div className={`w-full transition-all duration-500 ease-in-out overflow-hidden mt-2 rounded-xl shadow-lg ${showPiano ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <PianoDisplay targetNote={targetNote} detectedNote={detectedNote} />
                    </div>
                </div>

                {/* Desktop: Challenge Progress Bar */}
                {challengeSequence.length > 0 && (
                    <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                 <Music size={16} className="text-indigo-500" />
                                 {challengeInfo?.title}
                             </span>
                             <span className="text-xs font-mono text-slate-500">{challengeIndex} / {challengeSequence.length}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                             <div 
                                className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${(challengeIndex / challengeSequence.length) * 100}%` }}
                             ></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: AI Coach */}
            <div className="lg:col-span-1 flex flex-col h-full min-h-[400px]">
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-sm h-full overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                             <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <Wand2 size={18} />
                             </div>
                             <div>
                                 <span className="font-bold text-sm block leading-none">{t.aiCoach}</span>
                                 <span className="text-[10px] text-slate-400 font-medium">Assistant</span>
                             </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setShowAiPanel(!showAiPanel)} 
                                className="lg:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            >
                                {showAiPanel ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                        </div>
                    </div>
                    
                    <div className={`flex-1 flex flex-col gap-3 overflow-hidden transition-all duration-300 ${showAiPanel ? 'opacity-100' : 'opacity-0 lg:opacity-100 h-0 lg:h-auto'}`}>
                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-3">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-bl-none'
                                    }`}>
                                        {msg.text}
                                        {msg.hasAction && (
                                            <div className="mt-2 pt-2 border-t border-indigo-500/20 flex items-center gap-1.5 text-xs opacity-90 font-medium">
                                                <Sparkles size={12} /> {t.challenge} Active
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoadingAi && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1 border border-slate-100 dark:border-slate-700">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef}></div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => handleSendMessage(`Generate a simple sight-reading challenge for ${clef} clef.`)}
                                className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-indigo-100 dark:border-indigo-800/50"
                            >
                                <Music size={14} /> {t.btnChallenge}
                            </button>
                            <button 
                                onClick={() => {
                                    if (targetNote) handleSendMessage(`How do I play ${targetNote.name}${targetNote.octave}?`);
                                    else handleSendMessage("Give me a tip.");
                                }}
                                className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                            >
                                <Info size={14} /> {t.btnHint}
                            </button>
                        </div>

                        {/* Input Field */}
                        <div className="relative flex items-center">
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                                placeholder={t.inputPlaceholder}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl py-3 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                            />
                            <button 
                                onClick={() => handleSendMessage(chatInput)}
                                disabled={!chatInput.trim() || isLoadingAi}
                                className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};

export default App;