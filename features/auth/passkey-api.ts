export async function generateInviteCode(): Promise<string> {
  const response = await fetch('/api/auth/invite', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 1 }),
  });
  if (!response.ok) throw new Error('passkeyInviteGenerateFailed');
  const data = (await response.json()) as { codes: string[] };
  return data.codes[0];
}

export async function deletePasskeyById(id: string): Promise<boolean> {
  const response = await fetch(`/api/auth/passkeys?id=${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.ok;
}
