import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { STARTED_MARKER } from './global-setup';

/** Stops the database only if this run started it. */
export default function globalTeardown(): void {
  if (!existsSync(STARTED_MARKER)) return;
  const startedByUs = readFileSync(STARTED_MARKER, 'utf8') === 'yes';
  rmSync(STARTED_MARKER, { force: true });
  if (startedByUs) spawnSync('node', ['scripts/db.mjs', 'down'], { stdio: 'ignore' });
}
