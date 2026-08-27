import {
  accepted,
  asAccountId,
  asCredentialId,
  asSecretDigest,
  asSessionId,
  asTimestamp,
  failed,
  normalizeInvitationCode,
  type AccountRecord,
  type CeremonyRecord,
  type CompleteLoginCommand,
  type CompleteRegistrationCommand,
  type CredentialRecord,
  type IdentitySecretsPort,
  type IdentityServerResult,
  type IdentityStore,
  type InvitationRecord,
  type InvitationAccessRecord,
  type SecretDigest,
  type SessionRecord,
  type Timestamp,
} from '../packages/identity-server/src/public.ts';

export class MemoryIdentityStore implements IdentityStore {
  private readonly accounts = new Map<string, AccountRecord>();
  private readonly credentials = new Map<string, CredentialRecord>();
  private readonly invitations = new Map<string, InvitationRecord>();
  private readonly ceremonies = new Map<string, CeremonyRecord>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly invitationAccess = new Map<string, InvitationAccessRecord>();
  private bootstrapClaimed = false;
  private serial = Promise.resolve();

  clear(): void {
    this.accounts.clear();
    this.credentials.clear();
    this.invitations.clear();
    this.ceremonies.clear();
    this.sessions.clear();
    this.invitationAccess.clear();
    this.bootstrapClaimed = false;
  }

  async seedInvitation(
    code: string,
    expiresAt: Timestamp,
    secrets: IdentitySecretsPort
  ): Promise<void> {
    const normalized = normalizeInvitationCode(code);
    if (!normalized) throw new Error('Invalid seeded invitation code');
    const codeDigest = await secrets.digest(normalized);
    this.invitations.set(codeDigest, {
      codeDigest,
      purpose: 'createAccount',
      issuerAccountId: null,
      expiresAt,
      consumedAt: null,
      consumedByAccountId: null,
    });
  }

  async seedAuthenticatedSession(
    token: string,
    now: Timestamp,
    secrets: IdentitySecretsPort
  ): Promise<void> {
    const accountId = asAccountId(`e2e-account-${crypto.randomUUID()}`);
    const account = { id: accountId, status: 'active' as const, createdAt: now };
    const credential: CredentialRecord = {
      id: asCredentialId(`e2e-credential-${crypto.randomUUID()}`),
      accountId,
      publicKey: 'unused-seeded-public-key',
      publicKeyFormat: 'cose',
      algorithm: 'ES256',
      counter: 0,
      transports: ['internal'],
      name: 'E2E seeded session',
      createdAt: now,
      revokedAt: null,
    };
    this.accounts.set(accountId, account);
    this.credentials.set(credential.id, credential);
    const tokenDigest = await secrets.digest(token);
    this.sessions.set(tokenDigest, {
      id: asSessionId(`e2e-session-${crypto.randomUUID()}`),
      tokenDigest,
      accountId,
      createdAt: now,
      expiresAt: asTimestamp(now + 3_600_000),
      revokedAt: null,
    });
  }

  async hasCredentials() {
    return accepted([...this.credentials.values()].some((credential) => !credential.revokedAt));
  }

  async validateInvitation(input: Parameters<IdentityStore['validateInvitation']>[0]) {
    const invitation = this.invitations.get(input.invitationDigest);
    if (!invitation) return failed('invitationInvalid');
    if (invitation.consumedAt) return failed('invitationUsed');
    if (invitation.expiresAt <= input.now) return failed('invitationExpired');
    return accepted({ expiresAt: invitation.expiresAt });
  }

  async createInvitations(invitations: readonly InvitationRecord[]) {
    return this.exclusive(() => {
      if (invitations.some((invitation) => this.invitations.has(invitation.codeDigest))) {
        return failed('invitationConflict');
      }
      for (const invitation of invitations) this.invitations.set(invitation.codeDigest, invitation);
      return accepted(undefined);
    });
  }

  async bootstrapInvitations(input: Parameters<IdentityStore['bootstrapInvitations']>[0]) {
    return this.exclusive(() => {
      if (this.bootstrapClaimed || this.accounts.size > 0 || this.invitations.size > 0) {
        return failed('authenticationRequired');
      }
      this.bootstrapClaimed = true;
      for (const invitation of input.invitations) this.invitations.set(invitation.codeDigest, invitation);
      return accepted(undefined);
    });
  }

  async beginRegistration(input: Parameters<IdentityStore['beginRegistration']>[0]) {
    if (!input.ceremony.invitationDigest) return failed('invitationInvalid');
    const invitation = await this.validateInvitation({
      now: input.now,
      invitationDigest: input.ceremony.invitationDigest,
    });
    if (!invitation.ok) return invitation;
    this.ceremonies.set(input.ceremony.challengeDigest, input.ceremony);
    return accepted(undefined);
  }

  async findRegistrationContext(input: Parameters<IdentityStore['findRegistrationContext']>[0]) {
    const invitation = await this.validateInvitation({
      now: input.now,
      invitationDigest: input.invitationDigest,
    });
    if (!invitation.ok) return invitation;
    const ceremony = this.ceremonies.get(input.challengeDigest);
    return ceremony && ceremony.invitationDigest === input.invitationDigest
      ? activeCeremony(ceremony, input.now)
      : failed('ceremonyInvalid');
  }

  async completeRegistration(command: CompleteRegistrationCommand) {
    return this.exclusive(() => {
      const ceremony = findCeremonyById(this.ceremonies, command.ceremonyId);
      const invitation = this.invitations.get(command.invitationDigest);
      const active = ceremony ? activeCeremony(ceremony, command.now) : failed('ceremonyInvalid');
      if (!active.ok) return active;
      if (!invitation) return failed('invitationInvalid');
      if (invitation.consumedAt) return failed('invitationUsed');
      if (invitation.expiresAt <= command.now) return failed('invitationExpired');
      if (this.credentials.has(command.credential.id)) return failed('credentialConflict');
      if (this.sessions.has(command.session.tokenDigest)) return failed('internal', true);
      this.accounts.set(command.account.id, command.account);
      this.credentials.set(command.credential.id, command.credential);
      this.sessions.set(command.session.tokenDigest, command.session);
      this.ceremonies.set(ceremony!.challengeDigest, { ...ceremony!, consumedAt: command.now });
      this.invitations.set(command.invitationDigest, {
        ...invitation,
        consumedAt: command.now,
        consumedByAccountId: command.account.id,
      });
      return accepted(undefined);
    });
  }

  async beginAuthentication(input: Parameters<IdentityStore['beginAuthentication']>[0]) {
    const credentials = activeCredentials(this.credentials);
    if (credentials.length === 0) return failed('credentialNotFound');
    this.ceremonies.set(input.ceremony.challengeDigest, input.ceremony);
    return accepted(credentials);
  }

  async findAuthenticationContext(input: Parameters<IdentityStore['findAuthenticationContext']>[0]) {
    const ceremony = this.ceremonies.get(input.challengeDigest);
    const credential = this.credentials.get(input.credentialId);
    if (!ceremony) return failed('ceremonyInvalid');
    const active = activeCeremony(ceremony, input.now);
    if (!active.ok) return active;
    return credential && !credential.revokedAt
      ? accepted({ ceremony, credential })
      : failed('credentialNotFound');
  }

  async completeAuthentication(command: CompleteLoginCommand) {
    return this.exclusive(() => {
      const ceremony = findCeremonyById(this.ceremonies, command.ceremonyId);
      const credential = this.credentials.get(command.credentialId);
      if (!ceremony) return failed('ceremonyInvalid');
      const active = activeCeremony(ceremony, command.now);
      if (!active.ok) return active;
      if (!credential || credential.revokedAt) return failed('credentialNotFound');
      if (command.nextCounter < credential.counter) return failed('counterRegression');
      this.credentials.set(credential.id, { ...credential, counter: command.nextCounter });
      this.ceremonies.set(ceremony.challengeDigest, { ...ceremony, consumedAt: command.now });
      this.sessions.set(command.session.tokenDigest, command.session);
      return accepted(undefined);
    });
  }

  async findSession(input: Parameters<IdentityStore['findSession']>[0]) {
    const session = this.sessions.get(input.tokenDigest);
    return session && !session.revokedAt && session.expiresAt > input.now
      ? accepted(session)
      : failed('sessionInvalid');
  }

  async revokeSession(input: Parameters<IdentityStore['revokeSession']>[0]) {
    const session = this.sessions.get(input.tokenDigest);
    if (!session || session.revokedAt || session.expiresAt <= input.now) return failed('sessionInvalid');
    this.sessions.set(input.tokenDigest, { ...session, revokedAt: input.now });
    return accepted(undefined);
  }

  async listCredentials(accountId: AccountRecord['id']) {
    return accepted(activeCredentials(this.credentials).filter((item) => item.accountId === accountId));
  }

  async revokeCredential(input: Parameters<IdentityStore['revokeCredential']>[0]) {
    return this.exclusive(() => {
      const credential = this.credentials.get(input.credentialId);
      if (!credential || credential.accountId !== input.accountId || credential.revokedAt) {
        return failed('credentialNotFound');
      }
      const active = activeCredentials(this.credentials).filter(
        (item) => item.accountId === input.accountId
      );
      if (active.length <= 1) return failed('lastCredential');
      this.credentials.set(credential.id, { ...credential, revokedAt: input.now });
      return accepted(undefined);
    });
  }

  async findInvitationAccess(input: Parameters<IdentityStore['findInvitationAccess']>[0]) {
    const credential = this.invitationAccess.get(input.tokenDigest);
    const account = credential ? this.accounts.get(credential.accountId) : null;
    return credential &&
      !credential.revokedAt &&
      credential.expiresAt > input.now &&
      account?.status === 'active'
      ? accepted(credential)
      : failed('authenticationRequired');
  }

  async getInvitationAccess(
    accountId: Parameters<IdentityStore['getInvitationAccess']>[0],
    now: Parameters<IdentityStore['getInvitationAccess']>[1]
  ) {
    const credential = [...this.invitationAccess.values()].find(
      (item) => item.accountId === accountId && !item.revokedAt && item.expiresAt > now
    );
    return accepted(credential ?? null);
  }

  async replaceInvitationAccess(input: Parameters<IdentityStore['replaceInvitationAccess']>[0]) {
    return this.exclusive(() => {
      for (const [digest, credential] of this.invitationAccess) {
        if (credential.accountId === input.credential.accountId && !credential.revokedAt) {
          this.invitationAccess.set(digest, { ...credential, revokedAt: input.now });
        }
      }
      this.invitationAccess.set(input.credential.tokenDigest, input.credential);
      return accepted(undefined);
    });
  }

  async revokeInvitationAccess(input: Parameters<IdentityStore['revokeInvitationAccess']>[0]) {
    for (const [digest, credential] of this.invitationAccess) {
      if (credential.accountId === input.accountId && !credential.revokedAt) {
        this.invitationAccess.set(digest, { ...credential, revokedAt: input.now });
      }
    }
    return accepted(undefined);
  }

  private async exclusive<T>(operation: () => IdentityServerResult<T>) {
    const previous = this.serial;
    let release: () => void = () => undefined;
    this.serial = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return operation();
    } finally {
      release();
    }
  }
}

function activeCredentials(credentials: Map<string, CredentialRecord>): CredentialRecord[] {
  return [...credentials.values()].filter((credential) => credential.revokedAt === null);
}

function findCeremonyById(ceremonies: Map<string, CeremonyRecord>, id: string) {
  return [...ceremonies.values()].find((ceremony) => ceremony.id === id);
}

function activeCeremony(ceremony: CeremonyRecord, now: Timestamp) {
  if (ceremony.consumedAt) return failed('ceremonyReplayed');
  if (ceremony.expiresAt <= now) return failed('ceremonyExpired');
  return accepted({ ceremony });
}
