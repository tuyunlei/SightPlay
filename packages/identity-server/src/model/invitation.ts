const INVITE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_RAW_LENGTH = 8;

export function normalizeInvitationCode(input: string): string | null {
  const normalized = input.replaceAll('-', '').trim().toUpperCase();
  if (normalized.length !== INVITE_RAW_LENGTH) return null;
  return [...normalized].every((character) => INVITE_CHARSET.includes(character))
    ? normalized
    : null;
}
