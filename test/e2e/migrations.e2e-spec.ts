import { join } from 'node:path';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { buildConnectionOptions } from '../../src/common/database/typeorm-options';
import { loadDatabaseConfig } from '../../src/common/config/app-config';

describe('migrations', () => {
  const scratch = `ft_migrations_${Date.now()}`;
  const adminUrl = () => (process.env.TEST_DATABASE_URL as string).replace(/\/[^/]+$/, '/postgres');
  const scratchUrl = () => (process.env.TEST_DATABASE_URL as string).replace(/\/[^/]+$/, `/${scratch}`);

  beforeAll(async () => {
    const admin = new Client({ connectionString: adminUrl() });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${scratch}"`);
    await admin.end();
  });

  afterAll(async () => {
    const admin = new Client({ connectionString: adminUrl() });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${scratch}" WITH (FORCE)`);
    await admin.end();
  });

  it('builds the full schema on an empty database, matches the entities, and reverts cleanly', async () => {
    const db = loadDatabaseConfig({ DATABASE_URL: scratchUrl(), DATABASE_DISABLE_SSL: 'true' });
    const ds = new DataSource({
      ...buildConnectionOptions(db),
      entities: [join(__dirname, '../../src/**/*.entity.ts')],
      migrations: [join(__dirname, '../../src/database/migrations/*.ts')],
    });
    await ds.initialize();
    try {
      const applied = await ds.runMigrations();
      expect(applied.map((m) => m.name)).toEqual([
        'InitialSchema1795482607423',
        'AddIndexesAndChecks1795500000000',
        'CascadePersonalData1795600000000',
        'GoogleAccounts1795700000000',
        'IdempotencyKeys1795800000000',
      ]);

      const tables = await ds.query<Array<{ table_name: string }>>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
      );
      expect(tables.map((t) => t.table_name)).toEqual(
        expect.arrayContaining([
          'user',
          'families',
          'family_members',
          'safe_zones',
          'location_history',
          'alerts',
          'zone_analytics',
          'zone_visit',
          'privacy_settings',
          'sharing_schedule',
        ]),
      );

      // Entities and migrations describe the same schema: nothing is left to generate.
      const pending = await ds.driver.createSchemaBuilder().log();
      expect(pending.upQueries.map((q) => q.query)).toEqual([]);

      await ds.undoLastMigration();
      await ds.undoLastMigration();
      await ds.undoLastMigration();
      await ds.undoLastMigration();
      const indexes = await ds.query<Array<{ indexname: string }>>(
        `SELECT indexname FROM pg_indexes WHERE indexname = 'IDX_alerts_family_time'`,
      );
      expect(indexes).toEqual([]);
    } finally {
      await ds.destroy();
    }
  });
});
