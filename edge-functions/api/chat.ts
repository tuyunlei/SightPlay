interface RequestContext {
  request: Request;
  env: {
    GEMINI_API_KEY: string;
    JWT_SECRET: string;
  };
}

interface ChatRequestBody {
  message: string;
  clef: string;
  lang: 'zh' | 'en';
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

import { CORS_HEADERS, getAuthenticatedUser, resolveEnv } from './_auth-helpers';

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function buildSystemInstruction(clef: string, lang: string): string {
  const langInstruction =
    lang === 'zh' ? 'Respond in Simplified Chinese (Mandarin).' : 'Respond in English.';

  return `You are a friendly and expert Music Sight-Reading Coach.
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

    When challengeData is provided, it must have these fields:
    - "title": string - Name of the piece or exercise
    - "notes": string[] - Array of notes in Scientific Pitch Notation
    - "description": string - Short tip about this melody`;
}

function buildGeminiRequestBody(message: string, systemInstruction: string) {
  return {
    contents: [{ role: 'user', parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          replyText: {
            type: 'STRING',
            description: "Conversational response to the user's question or request.",
          },
          challengeData: {
            type: 'OBJECT',
            nullable: true,
            description: 'Return this ONLY if user wants to play notes. Otherwise null.',
            properties: {
              title: { type: 'STRING' },
              notes: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'Notes in Scientific Pitch Notation (e.g. C4)',
              },
              description: { type: 'STRING', description: 'Short tip about this melody.' },
            },
            required: ['title', 'notes', 'description'],
          },
        },
        required: ['replyText'],
      },
    },
  };
}

async function callGemini(apiKey: string, requestBody: object): Promise<Response> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    return jsonResponse({ error: 'Gemini API error' }, 502);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return jsonResponse({ error: 'No response from AI' }, 502);
  }

  return jsonResponse(JSON.parse(text));
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: RequestContext): Promise<Response> {
  const user = await getAuthenticatedUser(context.request, resolveEnv(context, 'JWT_SECRET'));
  if (!user) return jsonResponse({ error: 'Authentication required' }, 401);

  const { message, clef, lang } = (await context.request.json()) as ChatRequestBody;
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) return jsonResponse({ error: 'API key not configured' }, 500);

  try {
    const systemInstruction = buildSystemInstruction(clef, lang);
    const requestBody = buildGeminiRequestBody(message, systemInstruction);
    return await callGemini(apiKey, requestBody);
  } catch (error) {
    console.error('Edge function error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}
