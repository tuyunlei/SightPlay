const INVITE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_RAW_LENGTH = 8;

export function createInvitationCode(bytes: Uint8Array): string {
  if (bytes.length !== INVITE_RAW_LENGTH) throw new Error('Invitation entropy must be 8 bytes');
  const characters = [...bytes].map((value) => INVITE_CHARSET[value & 31]).join('');
  return `${characters.slice(0, 4)}-${characters.slice(4)}`;
}

export function normalizeInvitationCode(input: string): string | null {
  const normalized = input.replaceAll('-', '').trim().toUpperCase();
  if (normalized.length !== INVITE_RAW_LENGTH) return null;
  return [...normalized].every((character) => INVITE_CHARSET.includes(character))
    ? normalized
    : null;
}
