import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { loadDatabaseConfig } from '../common/config/app-config';
import { buildConnectionOptions } from '../common/database/typeorm-options';
import { loadEnvFiles, processEnv } from '../common/config/load-env';

loadEnvFiles();

/** Used by the TypeORM CLI (npm run migration:*). The running app builds its own connection from the same options. */
export default new DataSource({
  ...buildConnectionOptions(loadDatabaseConfig(processEnv())),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
