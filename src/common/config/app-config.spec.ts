import { AppConfig, ConfigError, loadDatabaseConfig } from './app-config';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  SESSION_SECRET: 'session-secret-0123',
  JWT_SECRET: 'jwt-secret-0123456',
  JWT_MAIL_SECRET: 'mail-secret-0123456',
  MAIL_HOST: 'smtp.example.com',
  MAIL_USER: 'u',
  MAIL_PASS: 'p',
  MAIL_FROM: 'a@example.com',
  STRIPE_SECRET_KEY: 'sk_test_x',
  STREAM_API_KEY: 'k',
  STREAM_API_SECRET: 's',
};

describe('AppConfig.fromEnv', () => {
  it('parses a complete environment and applies defaults', () => {
    const config = AppConfig.fromEnv({ ...valid, CORS_ORIGINS: 'https://a.example, https://b.example' });
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('development');
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.database.ssl).toBe(true);
    expect(config.mail.port).toBe(465);
  });

  it('fails with one message listing every problem', () => {
    const { JWT_SECRET: _a, STRIPE_SECRET_KEY: _b, ...incomplete } = valid;
    expect(() => AppConfig.fromEnv(incomplete)).toThrow(ConfigError);
    expect(() => AppConfig.fromEnv(incomplete)).toThrow(/JWT_SECRET[\s\S]*STRIPE_SECRET_KEY/);
  });

  it('rejects short secrets', () => {
    expect(() => AppConfig.fromEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('requires some way to reach the database', () => {
    const { DATABASE_URL: _url, ...noDb } = valid;
    expect(() => AppConfig.fromEnv(noDb)).toThrow(/DATABASE_URL/);
  });

  it('accepts discrete database variables instead of a URL', () => {
    const { DATABASE_URL: _url, ...rest } = valid;
    const config = AppConfig.fromEnv({
      ...rest,
      DATABASE_HOST: 'h',
      DATABASE_USERNAME: 'u',
      DATABASE_PASSWORD: 'p',
      DATABASE_NAME: 'n',
      DATABASE_PORT: '6543',
    });
    expect(config.database).toMatchObject({ host: 'h', port: 6543, name: 'n' });
  });

  it('rejects an invalid port', () => {
    expect(() => AppConfig.fromEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });
});

describe('loadDatabaseConfig', () => {
  it('needs nothing but the database variables', () => {
    expect(loadDatabaseConfig({ DATABASE_URL: 'postgres://localhost/db', DATABASE_DISABLE_SSL: 'true' })).toMatchObject(
      { ssl: false },
    );
  });
});
