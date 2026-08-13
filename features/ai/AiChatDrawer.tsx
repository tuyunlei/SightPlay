import { Send, Wand2, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { useGuidance } from '@sightplay/guidance';

import { translations } from '../../i18n';
import { ClefType, Note } from '../../types';

import { ChatMessageList } from './ChatMessageList';
import { QuickActions } from './QuickActions';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clef: ClefType;
  targetNote: Note | null;
  t: typeof translations.en;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  onClose,
  clef,
  targetNote,
  t,
}) => {
  const guidance = useGuidance();
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  if (!isOpen) return null;

  const handleSend = (text: string) => {
    if (!text.trim() || guidance.view.isLoading) return;
    guidance.sendMessage(text);
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg h-[70vh] sm:h-[60vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Wand2 size={18} />
            </div>
            <span className="font-bold text-sm">{t.aiCoach}</span>
          </div>
          <button
            onClick={onClose}
            data-testid="close-chat-drawer"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-hidden p-4">
          <ChatMessageList
            chatHistory={guidance.view.messages}
            isLoadingAi={guidance.view.isLoading}
            t={t}
            chatEndRef={chatEndRef}
          />
          <QuickActions clef={clef} targetNote={targetNote} t={t} onSend={handleSend} />
          <div className="relative flex items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(chatInput)}
              placeholder={t.inputPlaceholder}
              data-testid="chat-drawer-input"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl py-3 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
            />
            <button
              onClick={() => handleSend(chatInput)}
              disabled={!chatInput.trim() || guidance.view.isLoading}
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
