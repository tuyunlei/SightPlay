import { spawnSync } from 'node:child_process';

const KEYCHAIN_SERVICE = 'org.xclz.sightplay.invitation-cli';
const TOKEN_PATTERN = /^sp_inv_[A-Za-z0-9_-]{40,}$/;
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const command = args[0];
const environment = option('--env');

if (!['save', 'create'].includes(command) || !['preview', 'production'].includes(environment)) {
  fail(usage());
}

if (process.platform !== 'darwin') fail('This CLI currently requires macOS Keychain.');

if (command === 'save') {
  const token = (await readStdin()).trim();
  if (!TOKEN_PATTERN.test(token)) fail('stdin did not contain a valid SightPlay Invite CLI credential.');
  const saved = security(
    ['add-generic-password', '-U', '-a', environment, '-s', KEYCHAIN_SERVICE, '-w'],
    `${token}\n${token}\n`
  );
  if (saved.status !== 0) fail('Keychain did not save the Invite CLI credential.');
  const verified = security([
    'find-generic-password',
    '-a',
    environment,
    '-s',
    KEYCHAIN_SERVICE,
    '-w',
  ]);
  if (verified.status !== 0 || verified.stdout.trim() !== token) {
    fail('Keychain verification failed; the credential was not confirmed.');
  }
  process.stdout.write(`Saved ${environment} Invite CLI credential in macOS Keychain.\n`);
} else {
  const origin = resolveOrigin(environment, option('--url'));
  const loaded = security([
    'find-generic-password',
    '-a',
    environment,
    '-s',
    KEYCHAIN_SERVICE,
    '-w',
  ]);
  const token = loaded.stdout.trim();
  if (loaded.status !== 0 || !TOKEN_PATTERN.test(token)) {
    fail(`No valid ${environment} Invite CLI credential was found in macOS Keychain.`);
  }
  const response = await fetch(new URL('/api/auth/invite', origin), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ count: 1 }),
  });
  const payload = await response.json().catch(() => null);
  const code = payload?.ok === true ? payload.data?.codes?.[0] : null;
  if (!response.ok || typeof code !== 'string') {
    const failure = payload?.error?.code;
    fail(`Invite creation failed${typeof failure === 'string' ? ` (${failure})` : ''}.`);
  }
  process.stdout.write(`${code}\n`);
}

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function resolveOrigin(target, rawUrl) {
  if (target === 'production') {
    const value = rawUrl ?? 'https://sightplay.xclz.org';
    if (value !== 'https://sightplay.xclz.org') fail('Production URL must be sightplay.xclz.org.');
    return value;
  }
  if (!rawUrl) fail('Preview invite creation requires --url with a generated Pages deployment URL.');
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    fail('Preview URL is invalid.');
  }
  const canonical =
    url.protocol === 'https:' &&
    url.port === '' &&
    url.username === '' &&
    url.password === '' &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '' &&
    url.hostname !== 'sightplay.pages.dev' &&
    url.hostname.endsWith('.sightplay.pages.dev');
  if (!canonical) fail('Preview URL must be a canonical HTTPS subdomain of sightplay.pages.dev.');
  return url.origin;
}

function security(securityArgs, input) {
  return spawnSync('/usr/bin/security', securityArgs, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

async function readStdin() {
  let value = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

function usage() {
  return [
    'Usage:',
    '  pbpaste | pnpm identity:invite -- save --env preview',
    '  pnpm identity:invite -- create --env preview --url https://<deployment>.sightplay.pages.dev',
    '  pbpaste | pnpm identity:invite -- save --env production',
    '  pnpm identity:invite -- create --env production',
  ].join('\n');
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
