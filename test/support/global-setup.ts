import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const TEST_DB = 'familytracker_test';
export const STARTED_MARKER = join(tmpdir(), 'family-tracker-e2e-started-db');

const db = (args: string[], env: Record<string, string> = {}) =>
  spawnSync('node', ['scripts/db.mjs', ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });

/** Starts the embedded Postgres (if it is not already up), creates the test database and applies all migrations. */
export default function globalSetup(): void {
  const alreadyRunning = db(['status']).status === 0;
  writeFileSync(STARTED_MARKER, alreadyRunning ? 'no' : 'yes');

  const up = db(['up'], { DB_NAME: TEST_DB });
  if (up.status !== 0) throw new Error(`db:up failed\n${up.stdout}\n${up.stderr}`);

  process.env.TEST_DATABASE_URL = execFileSync('node', ['scripts/db.mjs', 'url'], {
    env: { ...process.env, DB_NAME: TEST_DB },
    encoding: 'utf8',
  }).trim();
}
