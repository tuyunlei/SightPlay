import { useCallback, useRef, useState } from 'react';

import { Language, translations } from '../i18n';
import { chatWithAiCoach } from '../services/geminiService';
import { ChatMessage, GeneratedChallenge } from '../types';

interface UseAiCoachOptions {
  clef: string;
  lang: Language;
  onLoadChallenge: (challenge: GeneratedChallenge) => number;
}

const formatTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template
  );

export const useAiCoach = ({ clef, lang, onLoadChallenge }: UseAiCoachOptions) => {
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => [
    {
      role: 'ai',
      text: translations[lang].defaultAi,
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoadingAi) return;

      const userMsg: ChatMessage = { role: 'user', text };
      setChatHistory((prev) => [...prev, userMsg]);
      setChatInput('');
      setIsLoadingAi(true);

      try {
        const response = await chatWithAiCoach(text, clef, lang);

        const aiMsg: ChatMessage = {
          role: 'ai',
          text: response.replyText,
          hasAction: !!response.challengeData,
        };

        setChatHistory((prev) => [...prev, aiMsg]);

        if (response.challengeData) {
          const noteCount = onLoadChallenge(response.challengeData!);
          if (noteCount > 0) {
            const t = translations[lang];
            setChatHistory((prev) => [
              ...prev,
              {
                role: 'ai',
                text: formatTemplate(t.aiChallengeLoaded, {
                  challenge: t.challenge,
                  title: response.challengeData!.title,
                  count: noteCount,
                  notes: t.notes,
                }),
                hasAction: true,
              },
            ]);
          }
        }
      } catch (error) {
        console.error(error);
        setChatHistory((prev) => [
          ...prev,
          { role: 'ai', text: translations[lang].aiConnectionErrorMessage },
        ]);
      } finally {
        setIsLoadingAi(false);
      }
    },
    [clef, isLoadingAi, lang, onLoadChallenge]
  );

  return {
    chatInput,
    setChatInput,
    chatHistory,
    isLoadingAi,
    sendMessage,
    chatEndRef,
  };
};
