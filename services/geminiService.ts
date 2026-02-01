import { AiResponse } from "../types";
import { translations, Language } from "../i18n";

/**
 * Unified Chat Handler
 * Can answer theory questions AND generate challenges in the same response.
 */
export const chatWithAiCoach = async (
    userMessage: string,
    clef: string,
    lang: Language
): Promise<AiResponse> => {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, clef, lang })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data as AiResponse;

    } catch (error) {
        console.error("Gemini chat error:", error);
        const t = translations[lang];
        // Fallback response
        return {
            replyText: t.aiError || "Sorry, I'm having trouble connecting to the musical muse (API Error). Try again?",
            challengeData: null
        };
    }
};
