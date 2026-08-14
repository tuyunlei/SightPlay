import { decoded, isRecord, rejected, type DecodeResult } from '../codec';

import type {
  ChatReplyDto,
  ChatRequestDto,
  ExerciseProposalDto,
  GuidanceApiFailure,
  GuidanceApiResult,
  GuidanceErrorCode,
} from './types';

const MAX_MESSAGE_LENGTH = 4_000;
const MAX_REPLY_LENGTH = 8_000;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_NOTES = 128;
const guidanceCodes: readonly GuidanceErrorCode[] = [
  'invalid_request',
  'unauthorized',
  'provider_unavailable',
  'invalid_provider_response',
  'internal',
];

const boundedText = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
};

const isClef = (value: unknown): value is ChatRequestDto['clef'] =>
  value === 'treble' || value === 'bass';

const isLanguage = (value: unknown): value is ChatRequestDto['lang'] =>
  value === 'en' || value === 'zh';

export function decodeChatRequest(value: unknown): DecodeResult<ChatRequestDto> {
  if (!isRecord(value)) return rejected('invalidChatRequest');
  const message = boundedText(value.message, MAX_MESSAGE_LENGTH);
  if (!message || !isClef(value.clef) || !isLanguage(value.lang)) {
    return rejected('invalidChatRequest');
  }
  return decoded({ message, clef: value.clef, lang: value.lang });
}

function decodeScientificPitch(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  const match = /^([A-G])(#?)(-?\d+)$/.exec(normalized);
  if (!match) return null;
  const naturalIndex = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(match[1]);
  const semitones = [0, 2, 4, 5, 7, 9, 11];
  const midi = (Number(match[3]) + 1) * 12 + semitones[naturalIndex] + (match[2] ? 1 : 0);
  return Number.isInteger(midi) && midi >= 0 && midi <= 127 ? normalized : null;
}

function decodeProposal(value: unknown): ExerciseProposalDto | null {
  if (!isRecord(value)) return null;
  const title = boundedText(value.title, MAX_TITLE_LENGTH);
  const description = boundedText(value.description, MAX_DESCRIPTION_LENGTH);
  if (!title || !description || !Array.isArray(value.notes)) return null;
  const notes = value.notes.map(decodeScientificPitch);
  if (notes.length === 0 || notes.length > MAX_NOTES || notes.some((note) => note === null)) {
    return null;
  }
  return { title, description, notes: notes as string[] };
}

export function decodeChatReply(value: unknown): DecodeResult<ChatReplyDto> {
  if (!isRecord(value)) return rejected('invalidChatReply');
  const replyText = boundedText(value.replyText, MAX_REPLY_LENGTH);
  if (!replyText) return rejected('invalidChatReply');
  if (value.challengeData === null || value.challengeData === undefined) {
    return decoded({ replyText, challengeData: null });
  }
  const challengeData = decodeProposal(value.challengeData);
  return challengeData
    ? decoded({ replyText, challengeData })
    : rejected('invalidExerciseProposal');
}

function decodeFailure(value: Record<string, unknown>): GuidanceApiFailure | null {
  if (!isRecord(value.error)) return null;
  const code = value.error.code;
  return guidanceCodes.includes(code as GuidanceErrorCode) &&
    typeof value.error.retryable === 'boolean' &&
    typeof value.requestId === 'string'
    ? {
        ok: false,
        error: { code: code as GuidanceErrorCode, retryable: value.error.retryable },
        requestId: value.requestId,
      }
    : null;
}

export function decodeChatApiResult(value: unknown): DecodeResult<GuidanceApiResult<ChatReplyDto>> {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return rejected('invalidChatApiResult');
  if (!value.ok) {
    const failure = decodeFailure(value);
    return failure ? decoded(failure) : rejected('invalidChatApiFailure');
  }
  if (typeof value.requestId !== 'string') return rejected('invalidChatApiSuccess');
  const reply = decodeChatReply(value.data);
  return reply.ok
    ? decoded({ ok: true, data: reply.value, requestId: value.requestId })
    : rejected(reply.issue);
}
