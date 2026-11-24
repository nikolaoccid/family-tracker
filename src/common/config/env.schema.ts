import { z } from 'zod';

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const databaseShape = {
  DATABASE_URL: z.string().url().optional(),
  DATABASE_HOST: z.string().min(1).optional(),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_USERNAME: z.string().min(1).optional(),
  DATABASE_PASSWORD: z.string().min(1).optional(),
  DATABASE_NAME: z.string().min(1).optional(),
  DATABASE_DISABLE_SSL: flag,
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(15_000),
};

function requireDatabaseTarget(
  env: { DATABASE_URL?: string; DATABASE_HOST?: string; DATABASE_USERNAME?: string; DATABASE_NAME?: string },
  ctx: z.RefinementCtx,
): void {
  const discrete = [env.DATABASE_HOST, env.DATABASE_USERNAME, env.DATABASE_NAME];
  if (!env.DATABASE_URL && discrete.some((v) => !v)) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL'],
      message: 'set DATABASE_URL, or DATABASE_HOST + DATABASE_USERNAME + DATABASE_PASSWORD + DATABASE_NAME',
    });
  }
}

/** Only the database settings: enough for the migration CLI and seed, which need no other secrets. */
export const databaseEnvSchema = z.object(databaseShape).superRefine(requireDatabaseTarget);

/** Everything the process reads from the environment. No defaults for secrets or URLs. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((v) =>
        v
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),
    ...databaseShape,
    SESSION_SECRET: z.string().min(16),
    JWT_SECRET: z.string().min(16),
    JWT_MAIL_SECRET: z.string().min(16),
    MAIL_HOST: z.string().min(1),
    MAIL_PORT: z.coerce.number().int().positive().default(465),
    MAIL_USER: z.string().min(1),
    MAIL_PASS: z.string().min(1),
    MAIL_FROM: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STREAM_API_KEY: z.string().min(1),
    STREAM_API_SECRET: z.string().min(1),
    /** OAuth client ids whose Google ID tokens are accepted. Empty disables Google sign-in. */
    GOOGLE_CLIENT_IDS: z
      .string()
      .default('')
      .transform((v) =>
        v
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
  })
  .superRefine(requireDatabaseTarget);

export type Env = z.infer<typeof envSchema>;

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
