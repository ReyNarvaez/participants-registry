import { execSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

// Creates the test database if it is missing (migrate deploy does that) and applies the migrations.
// Needs Postgres running (`pnpm db:up`); without it this throws and the whole run fails loudly.
export default function setup(project: TestProject) {
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: project.config.env.DATABASE_URL },
  });
}
