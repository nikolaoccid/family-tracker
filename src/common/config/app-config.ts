import { z } from 'zod';
import { DatabaseEnv, Env, databaseEnvSchema, envSchema } from './env.schema';

export class ConfigError extends Error {}

export interface DatabaseConfig {
  url?: string;
  host?: string;
  port: number;
  username?: string;
  password?: string;
  name?: string;
  ssl: boolean;
  poolSize: number;
  statementTimeoutMs: number;
}

function describe(error: z.ZodError): ConfigError {
  const lines = error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
  return new ConfigError(`Invalid configuration:\n${lines.join('\n')}`);
}

function toDatabaseConfig(e: DatabaseEnv): DatabaseConfig {
  return {
    url: e.DATABASE_URL,
    host: e.DATABASE_HOST,
    port: e.DATABASE_PORT,
    username: e.DATABASE_USERNAME,
    password: e.DATABASE_PASSWORD,
    name: e.DATABASE_NAME,
    ssl: !e.DATABASE_DISABLE_SSL,
    poolSize: e.DATABASE_POOL_SIZE,
    statementTimeoutMs: e.DATABASE_STATEMENT_TIMEOUT_MS,
  };
}

/** Database settings alone, for tooling that must not require the rest of the secrets. */
export function loadDatabaseConfig(source: Record<string, string | undefined>): DatabaseConfig {
  const parsed = databaseEnvSchema.safeParse(source);
  if (!parsed.success) throw describe(parsed.error);
  return toDatabaseConfig(parsed.data);
}

/** Typed, validated view of the environment. The only place that knows variable names. */
export class AppConfig {
  constructor(private readonly env: Env) {}

  static fromEnv(source: Record<string, string | undefined>): AppConfig {
    const parsed = envSchema.safeParse(source);
    if (!parsed.success) throw describe(parsed.error);
    return new AppConfig(parsed.data);
  }

  get nodeEnv() {
    return this.env.NODE_ENV;
  }
  get isProduction() {
    return this.env.NODE_ENV === 'production';
  }
  get port() {
    return this.env.PORT;
  }
  get logLevel() {
    return this.env.LOG_LEVEL;
  }
  get corsOrigins() {
    return this.env.CORS_ORIGINS;
  }
  get sessionSecret() {
    return this.env.SESSION_SECRET;
  }
  get jwtSecret() {
    return this.env.JWT_SECRET;
  }
  get jwtMailSecret() {
    return this.env.JWT_MAIL_SECRET;
  }
  get stripeSecretKey() {
    return this.env.STRIPE_SECRET_KEY;
  }
  get googleClientIds() {
    return this.env.GOOGLE_CLIENT_IDS;
  }
  get stream() {
    return { key: this.env.STREAM_API_KEY, secret: this.env.STREAM_API_SECRET };
  }
  get mail() {
    const e = this.env;
    return { host: e.MAIL_HOST, port: e.MAIL_PORT, user: e.MAIL_USER, pass: e.MAIL_PASS, from: e.MAIL_FROM };
  }
  get database(): DatabaseConfig {
    return toDatabaseConfig(this.env);
  }
}
