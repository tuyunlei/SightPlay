import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

import {
  createInvitationCode,
  normalizeInvitationCode,
} from '../packages/identity-server/src/model/invitation.ts';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const environment = option('--env');

if (!['preview', 'production'].includes(environment)) fail(usage());
if (environment === 'production' && !args.includes('--confirm-production')) {
  fail('Production invitation creation requires --confirm-production.');
}

const target =
  environment === 'preview'
    ? { database: 'sightplay-identity-ppe', wranglerEnvironment: 'preview' }
    : { database: 'sightplay-identity-production', wranglerEnvironment: null };
const accounts = queryActiveAccounts(target);
const requestedAccountId = option('--account');
const accountId = selectAccount(accounts, requestedAccountId);
const code = createInvitationCode(randomBytes(8));
const normalizedCode = normalizeInvitationCode(code);
if (!normalizedCode) fail('Generated invitation did not satisfy the identity domain.');
const digest = createHash('sha256').update(normalizedCode).digest('base64url');
const expiresAt = Date.now() + INVITATION_TTL_MS;

execute(
  target,
  `INSERT INTO invitations (code_digest, purpose, issuer_account_id, expires_at, consumed_at, consumed_by_account_id) VALUES ('${digest}', 'createAccount', '${accountId}', ${expiresAt}, NULL, NULL)`
);
process.stdout.write(`${code}\n`);

function queryActiveAccounts(selectedTarget) {
  const result = execute(
    selectedTarget,
    "SELECT id FROM accounts WHERE status = 'active' ORDER BY created_at",
    true
  );
  const accounts = result?.[0]?.results;
  if (!Array.isArray(accounts) || !accounts.every((account) => isAccount(account))) {
    fail('Cloudflare returned an invalid active-account result.');
  }
  return accounts.map(({ id }) => id);
}

function selectAccount(accounts, requestedAccountId) {
  if (requestedAccountId) {
    if (!isUuid(requestedAccountId) || !accounts.includes(requestedAccountId)) {
      fail('The requested account is not active in the selected environment.');
    }
    return requestedAccountId;
  }
  if (accounts.length !== 1) {
    fail(
      accounts.length === 0
        ? 'The selected environment has no active account.'
        : 'Multiple active accounts exist; select one with --account <uuid>.'
    );
  }
  return accounts[0];
}

function execute(selectedTarget, command, json = false) {
  const commandArgs = [
    'exec',
    'wrangler',
    'd1',
    'execute',
    selectedTarget.database,
    '--remote',
    '--command',
    command,
  ];
  if (selectedTarget.wranglerEnvironment) {
    commandArgs.push('--env', selectedTarget.wranglerEnvironment);
  }
  if (json) commandArgs.push('--json');
  const result = spawnSync('pnpm', commandArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) fail('Cloudflare rejected the operator invitation command.');
  if (!json) return undefined;
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail('Cloudflare did not return valid JSON.');
  }
}

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function isAccount(value) {
  return typeof value === 'object' && value !== null && isUuid(value.id);
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

function usage() {
  return [
    'Usage:',
    '  pnpm identity:invite:operator -- --env preview [--account <uuid>]',
    '  pnpm identity:invite:operator -- --env production --confirm-production [--account <uuid>]',
  ].join('\n');
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
