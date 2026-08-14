import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

await applyD1Migrations(env.IDENTITY_DB, env.TEST_MIGRATIONS);
