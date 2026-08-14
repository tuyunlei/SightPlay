import { createHash } from 'node:crypto';

import { createServer } from 'vite';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));

const raw = Buffer.concat(chunks).toString('utf8');
let value;
try {
  value = JSON.parse(raw);
} catch {
  process.stderr.write('Legacy Identity export is not valid JSON.\n');
  process.exitCode = 1;
}

if (value !== undefined) {
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'silent',
    root: process.cwd(),
    server: { middlewareMode: true },
  });
  try {
    const { decodeLegacyCredentialExport } = await server.ssrLoadModule(
      '/packages/identity-server/src/migration/legacyCredentials.ts'
    );
    const decoded = decodeLegacyCredentialExport(value);
    if (!decoded.ok) {
      process.stderr.write(`Legacy Identity export rejected: ${decoded.failure.code}.\n`);
      process.exitCode = 1;
    } else {
      const fingerprint = createHash('sha256').update(raw).digest('hex');
      process.stdout.write(
        JSON.stringify({
          valid: true,
          credentialCount: decoded.value.credentials.length,
          accountId: decoded.value.account.id,
          exportSha256: fingerprint,
        }) + '\n'
      );
    }
  } finally {
    await server.close();
  }
}
