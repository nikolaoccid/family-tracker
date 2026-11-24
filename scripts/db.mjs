#!/usr/bin/env node
// Local Postgres without Docker, from the embedded-postgres binaries.
//
//   npm run db:up [-- --seed]   init (first run), start, create the database, run migrations
//   npm run db:down             stop the server
//   npm run db:reset            stop and delete .pgdata/
//
// Data lives in .pgdata/ (git-ignored). The server listens on 127.0.0.1 only, port DB_PORT (default 54320),
// trust auth. Safe to run repeatedly.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, '.pgdata');
const portFile = join(dataDir, 'ft-port');
const logFile = join(dataDir, 'server.log');

const DB_NAME = process.env.DB_NAME ?? 'familytracker';
const DB_USER = process.env.DB_USER ?? 'familytracker';
const DEFAULT_PORT = Number(process.env.DB_PORT ?? 54320);

const PLATFORM_PACKAGES = {
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'darwin-x64': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'win32-x64': 'windows-x64',
};

function binDir() {
  const pkg = PLATFORM_PACKAGES[`${process.platform}-${process.arch}`];
  if (!pkg) throw new Error(`embedded-postgres has no binaries for ${process.platform}-${process.arch}`);
  // The package only exports its ESM entry (dist/index.js); the binaries sit next to dist/.
  const entry = fileURLToPath(import.meta.resolve(`@embedded-postgres/${pkg}`));
  return join(dirname(entry), '..', 'native', 'bin');
}

const exe = (name) => join(binDir(), process.platform === 'win32' ? `${name}.exe` : name);
const initialised = () => existsSync(join(dataDir, 'PG_VERSION'));
const currentPort = () => (existsSync(portFile) ? Number(readFileSync(portFile, 'utf8')) : DEFAULT_PORT);
const databaseUrl = (port) => `postgres://${DB_USER}:${DB_USER}@localhost:${port}/${DB_NAME}`;

function isRunning() {
  if (!initialised()) return false;
  return spawnSync(exe('pg_ctl'), ['status', '-D', dataDir], { stdio: 'ignore' }).status === 0;
}

function initialise() {
  if (initialised()) return;
  console.log('Initialising .pgdata ...');
  execFileSync(exe('initdb'), ['-D', dataDir, '-U', DB_USER, '--auth=trust', '--encoding=UTF8', '--locale=C'], {
    stdio: 'ignore',
  });
}

function start() {
  if (isRunning()) return;
  const port = DEFAULT_PORT;
  writeFileSync(portFile, String(port));
  const options = `-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=`;
  execFileSync(exe('pg_ctl'), ['start', '-D', dataDir, '-w', '-l', logFile, '-o', options], { stdio: 'ignore' });
  console.log(`Postgres started on 127.0.0.1:${port}`);
}

async function ensureDatabase(port) {
  const { Client } = require('pg');
  const client = new Client({ host: '127.0.0.1', port, user: DB_USER, database: 'postgres' });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    if (found.rowCount === 0) {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Created database ${DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

function npmRun(script, env) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', script], { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function stop() {
  if (isRunning()) {
    execFileSync(exe('pg_ctl'), ['stop', '-D', dataDir, '-m', 'fast', '-w'], { stdio: 'ignore' });
    console.log('Postgres stopped');
  } else {
    console.log('Postgres is not running');
  }
}

const [command, ...flags] = process.argv.slice(2);

switch (command) {
  case 'up': {
    initialise();
    start();
    const port = currentPort();
    await ensureDatabase(port);
    // Only the database variables: the migration CLI needs nothing else.
    const env = { DATABASE_URL: databaseUrl(port), DATABASE_DISABLE_SSL: 'true' };
    npmRun('migration:run', env);
    if (flags.includes('--seed')) npmRun('seed', env);
    console.log(`\nDATABASE_URL=${databaseUrl(port)}`);
    break;
  }
  case 'down':
    stop();
    break;
  case 'reset':
    stop();
    rmSync(dataDir, { recursive: true, force: true });
    console.log('Deleted .pgdata');
    break;
  case 'status':
    // Exit code 0 when the server is running; used by the test setup to decide whether to stop it afterwards.
    process.exit(isRunning() ? 0 : 1);
    break;
  case 'url':
    console.log(databaseUrl(currentPort()));
    break;
  default:
    console.error('usage: db.mjs up [--seed] | down | reset | status | url');
    process.exit(1);
}
