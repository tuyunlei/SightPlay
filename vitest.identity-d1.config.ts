import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      miniflare: {
        compatibilityDate: '2026-08-12',
        d1Databases: ['IDENTITY_DB'],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(root, 'packages/identity-server/migrations')
          ),
        },
      },
    })),
  ],
  test: {
    include: [
      'packages/identity-server/src/adapters/d1/**/*.d1.test.ts',
      'edge-functions/api/auth/**/*.d1.test.ts',
    ],
    setupFiles: ['packages/identity-server/src/adapters/d1/applyMigrations.d1.ts'],
  },
});
