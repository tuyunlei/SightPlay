import { Sparkles } from 'lucide-react';
import React from 'react';

import { translations } from '../../i18n';
import { ChatMessage } from '../../types';

interface ChatMessageListProps {
  chatHistory: ChatMessage[];
  isLoadingAi: boolean;
  t: typeof translations.en;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  chatHistory,
  isLoadingAi,
  t,
  chatEndRef,
}) => (
  <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-3">
    {chatHistory.map((msg, i) => (
      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
            msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-bl-none'
          }`}
        >
          {msg.text}
          {msg.hasAction && (
            <div className="mt-2 pt-2 border-t border-indigo-500/20 flex items-center gap-1.5 text-xs opacity-90 font-medium">
              <Sparkles size={12} /> {t.challenge} {t.challengeStatusActive}
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
);

export { ChatMessageList };
