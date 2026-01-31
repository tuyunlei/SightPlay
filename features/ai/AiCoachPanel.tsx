import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Info, Music, Send, Sparkles, Wand2 } from 'lucide-react';
import { ChatMessage, ClefType, Note } from '../../types';
import { translations } from '../../i18n';

interface AiCoachPanelProps {
  clef: ClefType;
  targetNote: Note | null;
  t: typeof translations.en;
  chatHistory: ChatMessage[];
  chatInput: string;
  isLoadingAi: boolean;
  onChatInputChange: (value: string) => void;
  onSendMessage: (text: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

const AiCoachPanel: React.FC<AiCoachPanelProps> = ({
  clef,
  targetNote,
  t,
  chatHistory,
  chatInput,
  isLoadingAi,
  onChatInputChange,
  onSendMessage,
  chatEndRef
}) => {
  const [showAiPanel, setShowAiPanel] = useState(true);

  useEffect(() => {
    if (showAiPanel && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, showAiPanel, chatEndRef]);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoadingAi) return;
    setShowAiPanel(true);
    onSendMessage(text);
  };

  return (
    <div className="lg:col-span-1 flex flex-col h-full min-h-[400px]">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-sm h-full overflow-hidden">
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

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSend(`Generate a simple sight-reading challenge for ${clef} clef.`)}
              className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-indigo-100 dark:border-indigo-800/50"
            >
              <Music size={14} /> {t.btnChallenge}
            </button>
            <button
              onClick={() => {
                if (targetNote) handleSend(`How do I play ${targetNote.name}${targetNote.octave}?`);
                else handleSend('Give me a tip.');
              }}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
            >
              <Info size={14} /> {t.btnHint}
            </button>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(chatInput)}
              placeholder={t.inputPlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl py-3 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
            />
            <button
              onClick={() => handleSend(chatInput)}
              disabled={!chatInput.trim() || isLoadingAi}
              className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCoachPanel;
