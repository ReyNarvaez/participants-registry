import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

if (existsSync('.env')) process.loadEnvFile();

// Tests use their own database on the dev Postgres, so they never write to dev data.
const testDatabaseUrl = new URL(process.env.DATABASE_URL ?? '');
testDatabaseUrl.pathname = '/curebase_test';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.spec.ts'],
    env: { DATABASE_URL: testDatabaseUrl.href },
    globalSetup: './vitest.global-setup.ts',
  },
});
