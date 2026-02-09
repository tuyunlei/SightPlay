import { ChevronDown, ChevronUp, Send, Wand2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { translations } from '../../i18n';
import { ChatMessage, ClefType, Note } from '../../types';

import { ChatMessageList } from './ChatMessageList';
import { QuickActions } from './QuickActions';

interface AiCoachPanelProps {
  clef: ClefType;
  targetNote: Note | null;
  t: typeof translations.en;
  chatHistory: ChatMessage[];
  chatInput: string;
  isLoadingAi: boolean;
  onChatInputChange: (value: string) => void;
  onSendMessage: (text: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

const AiCoachPanel: React.FC<AiCoachPanelProps> = ({
  clef, targetNote, t, chatHistory, chatInput, isLoadingAi,
  onChatInputChange, onSendMessage, chatEndRef,
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
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="lg:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
          >
            {showAiPanel ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        <div className={`flex-1 flex flex-col gap-3 overflow-hidden transition-all duration-300 ${showAiPanel ? 'opacity-100' : 'opacity-0 lg:opacity-100 h-0 lg:h-auto'}`}>
          <ChatMessageList chatHistory={chatHistory} isLoadingAi={isLoadingAi} t={t} chatEndRef={chatEndRef} />
          <QuickActions clef={clef} targetNote={targetNote} t={t} onSend={handleSend} />
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
