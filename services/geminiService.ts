import { GoogleGenAI, Type } from "@google/genai";
import { AiResponse } from "../types";
import { translations, Language } from "../i18n";

// Helper to safely get the AI client
const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");
    return new GoogleGenAI({ apiKey });
};

/**
 * Unified Chat Handler
 * Can answer theory questions AND generate challenges in the same response.
 */
export const chatWithAiCoach = async (
    userMessage: string, 
    clef: string, 
    lang: Language
): Promise<AiResponse> => {
    const ai = getAiClient();
    const langInstruction = lang === 'zh' ? "Respond in Simplified Chinese (Mandarin)." : "Respond in English.";
    
    // We explain the context to the AI
    const systemInstruction = `You are a friendly and expert Music Sight-Reading Coach. 
    User Context:
    - Current Clef: ${clef}
    - Language: ${langInstruction}
    
    Your capabilities:
    1. Answer music theory questions (e.g., "What is a sharp?", "What does the vertical line mean?").
    2. Generate sight-reading exercises if the user asks for a song, a scale, or a challenge (e.g., "Give me Twinkle Twinkle", "Hard level challenge").

    OUTPUT FORMAT:
    You must return a JSON object with:
    - "replyText": A conversational answer to the user. Keep it concise (under 2 sentences usually).
    - "challengeData": (Optional) If the user's intent is to practice or play music, provide the notes here. Otherwise return null.
    
    For "challengeData", use Scientific Pitch Notation (e.g., C4, D#5). Keep the range appropriate for the ${clef} clef.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userMessage,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        replyText: { 
                            type: Type.STRING, 
                            description: "Conversational response to the user's question or request." 
                        },
                        challengeData: {
                            type: Type.OBJECT,
                            nullable: true,
                            description: "Return this ONLY if user wants to play notes. Otherwise null.",
                            properties: {
                                title: { type: Type.STRING },
                                notes: { 
                                    type: Type.ARRAY, 
                                    items: { type: Type.STRING },
                                    description: "Notes in Scientific Pitch Notation (e.g. C4)"
                                },
                                description: { type: Type.STRING, description: "Short tip about this melody." }
                            },
                            required: ["title", "notes", "description"]
                        }
                    },
                    required: ["replyText"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        return JSON.parse(text) as AiResponse;

    } catch (error) {
        console.error("Gemini chat error:", error);
        const t = translations[lang];
        // Fallback response
        return {
            replyText: "Sorry, I'm having trouble connecting to the musical muse (API Error). Try again?",
            challengeData: null
        };
    }
};

// Kept for backward compatibility if needed, but we will mostly use chatWithAiCoach now
export const getMusicTheoryTip = async (note: string, lang: Language): Promise<string> => {
    const ai = getAiClient();
    const langInstruction = lang === 'zh' ? "in Simplified Chinese" : "in English";
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Give me a very short, one-sentence fun fact or memory aid for the musical note ${note} ${langInstruction}. Keep it under 20 words.`,
        });
        return response.text || translations[lang].practiceTip;
    } catch (e) {
        return translations[lang].practiceTip;
    }
};