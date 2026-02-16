const INVITE_CHARSET = /[A-HJ-NP-Z2-9]/g;

export function normalizeInviteCode(value: string): string {
  return (
    value
      .toUpperCase()
      .replace(/[^A-Z2-9]/g, '')
      .match(INVITE_CHARSET)
      ?.join('') ?? ''
  );
}

export function toDisplayInviteCode(value: string): string {
  const normalized = value.replace(/-/g, '').toUpperCase();
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
}
