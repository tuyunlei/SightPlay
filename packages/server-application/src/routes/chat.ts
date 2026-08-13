import {
  decodeChatReply,
  decodeChatRequest,
  guidanceFailed,
  guidanceSucceeded,
  parseUnknownJson,
  readUnknownJson,
  type ChatRequestDto,
} from '@sightplay/api-contracts';

import { createRequestContext, logError } from '../observability/logger';
import type { PlatformContext } from '../platform';

import { authenticateIdentityRequest, createIdentityRequest } from './auth/identity-http';
import { createIdentityDependencies } from './auth/identity-runtime';

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildSystemInstruction(
  clef: ChatRequestDto['clef'],
  lang: ChatRequestDto['lang']
): string {
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

async function callGemini(
  apiKey: string,
  requestBody: object,
  requestContext: { requestId: string; method: string; path: string },
  fetcher: typeof fetch
): Promise<Response> {
  const response = await fetcher(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logError('chat.gemini.upstream', errorText, {
      ...requestContext,
      status: response.status,
    });
    return jsonResponse(
      guidanceFailed('provider_unavailable', true, requestContext.requestId),
      502
    );
  }

  const text = extractProviderText(await readUnknownJson(response));

  if (!text) {
    return jsonResponse(
      guidanceFailed('invalid_provider_response', true, requestContext.requestId),
      502
    );
  }

  try {
    const decoded = decodeChatReply(parseUnknownJson(text));
    return decoded.ok
      ? jsonResponse(guidanceSucceeded(decoded.value, requestContext.requestId))
      : jsonResponse(
          guidanceFailed('invalid_provider_response', true, requestContext.requestId),
          502
        );
  } catch {
    return jsonResponse(
      guidanceFailed('invalid_provider_response', true, requestContext.requestId),
      502
    );
  }
}

function extractProviderText(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return null;
  const candidate = value.candidates[0];
  if (
    !isRecord(candidate) ||
    !isRecord(candidate.content) ||
    !Array.isArray(candidate.content.parts)
  ) {
    return null;
  }
  const part = candidate.content.parts[0];
  return isRecord(part) && typeof part.text === 'string' ? part.text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function handlePostChat(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);
  const dependencies = createIdentityDependencies(platform);
  const identityRequest = createIdentityRequest(platform, dependencies);
  const session = await authenticateIdentityRequest(identityRequest, true);
  if (!session.ok)
    return jsonResponse(guidanceFailed('unauthorized', false, requestContext.requestId), 401);

  const rawRequest = await readUnknownJson(platform.request);
  const request = decodeChatRequest(rawRequest);
  if (!request.ok) {
    return jsonResponse(guidanceFailed('invalid_request', false, requestContext.requestId), 400);
  }
  const { message, clef, lang } = request.value;
  const apiKey = platform.env('GEMINI_API_KEY');
  if (!apiKey) {
    logError(
      'chat.configuration',
      'GEMINI_API_KEY environment variable not available',
      requestContext
    );
    return jsonResponse(guidanceFailed('internal', true, requestContext.requestId), 500);
  }

  try {
    const systemInstruction = buildSystemInstruction(clef, lang);
    const requestBody = buildGeminiRequestBody(message, systemInstruction);
    return await callGemini(
      apiKey,
      requestBody,
      requestContext,
      platform.fetch ?? globalThis.fetch.bind(globalThis)
    );
  } catch (error) {
    logError('chat.post', error, requestContext);
    return jsonResponse(guidanceFailed('internal', true, requestContext.requestId), 500);
  }
}
