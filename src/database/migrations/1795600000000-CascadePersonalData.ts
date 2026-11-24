import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive fix for personal data that survived account and family deletion.
 *
 * location_history, alerts, safe_zones and zone_analytics identify their owner through a plain
 * `user_id` / `family_id` (or `owner_id`) column. The foreign keys the entities declare sit on separate
 * camelCase columns that the application never writes, so ON DELETE CASCADE never fired.
 * Rather than rewrite those tables (contract step, later), BEFORE DELETE triggers on "user" and
 * "families" remove the rows that reference them through the string columns. No column changes,
 * so old and new application versions both keep working.
 */
export class CascadePersonalData1795600000000 implements MigrationInterface {
  name = 'CascadePersonalData1795600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION delete_user_personal_data() RETURNS trigger AS $$
      BEGIN
        DELETE FROM zone_visit WHERE analytics_id IN (SELECT id FROM zone_analytics WHERE user_id = OLD.id::text);
        DELETE FROM zone_analytics WHERE user_id = OLD.id::text;
        DELETE FROM location_history WHERE user_id = OLD.id::text;
        DELETE FROM alerts WHERE user_id = OLD.id::text;
        DELETE FROM families WHERE owner_id::text = OLD.id::text;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql`);
    await queryRunner.query(
      `CREATE TRIGGER trg_user_delete_personal_data BEFORE DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION delete_user_personal_data()`,
    );
    await queryRunner.query(`
      CREATE FUNCTION delete_family_data() RETURNS trigger AS $$
      BEGIN
        DELETE FROM zone_visit WHERE analytics_id IN (
          SELECT a.id FROM zone_analytics a JOIN safe_zones z ON z.id::text = a.zone_id WHERE z.family_id = OLD.id::text);
        DELETE FROM zone_analytics WHERE zone_id IN (SELECT id::text FROM safe_zones WHERE family_id = OLD.id::text);
        DELETE FROM safe_zones WHERE family_id = OLD.id::text;
        DELETE FROM alerts WHERE family_id = OLD.id::text;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql`);
    await queryRunner.query(
      `CREATE TRIGGER trg_family_delete_data BEFORE DELETE ON "families" FOR EACH ROW EXECUTE FUNCTION delete_family_data()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER trg_family_delete_data ON "families"`);
    await queryRunner.query(`DROP FUNCTION delete_family_data()`);
    await queryRunner.query(`DROP TRIGGER trg_user_delete_personal_data ON "user"`);
    await queryRunner.query(`DROP FUNCTION delete_user_personal_data()`);
  }
}
