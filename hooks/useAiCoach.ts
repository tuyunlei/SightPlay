import { useCallback, useRef, useState } from 'react';
import { chatWithAiCoach } from '../services/geminiService';
import { ChatMessage, GeneratedChallenge } from '../types';
import { translations, Language } from '../i18n';

interface UseAiCoachOptions {
  clef: string;
  lang: Language;
  onLoadChallenge: (challenge: GeneratedChallenge) => number;
  onMissingApiKey: () => void;
}

export const useAiCoach = ({ clef, lang, onLoadChallenge, onMissingApiKey }: UseAiCoachOptions) => {
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => [{
    role: 'ai',
    text: translations[lang].defaultAi
  }]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoadingAi) return;
    if (!process.env.API_KEY) {
      onMissingApiKey();
      return;
    }

    const userMsg: ChatMessage = { role: 'user', text };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsLoadingAi(true);

    try {
      const response = await chatWithAiCoach(text, clef, lang);

      const aiMsg: ChatMessage = {
        role: 'ai',
        text: response.replyText,
        hasAction: !!response.challengeData
      };

      setChatHistory((prev) => [...prev, aiMsg]);

      if (response.challengeData) {
        const noteCount = onLoadChallenge(response.challengeData);
        if (noteCount > 0) {
          const t = translations[lang];
          setChatHistory((prev) => [...prev, {
            role: 'ai',
            text: `${t.challenge}: ${response.challengeData.title} (${noteCount} notes) loaded!`,
            hasAction: true
          }]);
        }
      }
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [...prev, { role: 'ai', text: 'Error connecting to AI.' }]);
    } finally {
      setIsLoadingAi(false);
    }
  }, [clef, isLoadingAi, lang, onLoadChallenge, onMissingApiKey]);

  return {
    chatInput,
    setChatInput,
    chatHistory,
    isLoadingAi,
    sendMessage,
    chatEndRef
  };
};
