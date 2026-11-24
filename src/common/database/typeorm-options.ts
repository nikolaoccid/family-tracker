import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { DatabaseConfig } from '../config/app-config';

/** Connection settings shared by the running app and the migration CLI. */
export function buildConnectionOptions(db: DatabaseConfig): DataSourceOptions {
  const base = {
    type: 'postgres' as const,
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: false,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    extra: { max: db.poolSize, statement_timeout: db.statementTimeoutMs },
  };
  return db.url
    ? { ...base, url: db.url }
    : { ...base, host: db.host, port: db.port, username: db.username, password: db.password, database: db.name };
}
