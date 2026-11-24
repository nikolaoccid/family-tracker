import { config as loadDotenv } from 'dotenv';

/**
 * Loads dotenv files into the given target (default: process.env).
 * Real environment variables win over files. Lives in config because it is the
 * single place allowed to touch process.env.
 */
export function loadEnvFiles(target: Record<string, string | undefined> = process.env): void {
  const name = target.ENV_NAME ?? 'local';
  for (const path of ['.env', `./envs/.env.${name}`]) {
    loadDotenv({ path, processEnv: target as Record<string, string> });
  }
}

export function processEnv(): Record<string, string | undefined> {
  return process.env;
}
