interface RequestContext {
  request: Request;
  env: {
    GEMINI_API_KEY: string;
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: RequestContext): Promise<Response> {
  const { message, clef, lang } = (await context.request.json()) as ChatRequestBody;
  const GEMINI_KEY = context.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const langInstruction =
    lang === 'zh' ? 'Respond in Simplified Chinese (Mandarin).' : 'Respond in English.';

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

    When challengeData is provided, it must have these fields:
    - "title": string - Name of the piece or exercise
    - "notes": string[] - Array of notes in Scientific Pitch Notation
    - "description": string - Short tip about this melody`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ error: 'Gemini API error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return new Response(JSON.stringify({ error: 'No response from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const result = JSON.parse(text);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
