import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive only (expand step): indexes for the hot queries and integrity rules.
 * The CHECK constraints and unique indexes fail if existing rows violate them. Find those first with:
 *   SELECT id FROM safe_zones WHERE radius <= 0 OR center_latitude NOT BETWEEN -90 AND 90 OR center_longitude NOT BETWEEN -180 AND 180;
 *   SELECT family_id, user_id, count(*) FROM family_members WHERE user_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;
 *   SELECT user_id, zone_id, count(*) FROM zone_analytics GROUP BY 1, 2 HAVING count(*) > 1;
 */
export class AddIndexesAndChecks1795500000000 implements MigrationInterface {
  name = 'AddIndexesAndChecks1795500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_location_history_user_time" ON "location_history" ("user_id", "timestamp")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_alerts_family_time" ON "alerts" ("family_id", "timestamp")`);
    await queryRunner.query(`CREATE INDEX "IDX_family_members_family" ON "family_members" ("family_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_family_members_user" ON "family_members" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_safe_zones_family" ON "safe_zones" ("family_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_zone_visit_analytics_entry" ON "zone_visit" ("analytics_id", "entry_time")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_family_members_family_user" ON "family_members" ("family_id", "user_id") WHERE "user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_family_members_family_invite" ON "family_members" ("family_id", "invited_email") WHERE "invited_email" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_zone_analytics_user_zone" ON "zone_analytics" ("user_id", "zone_id")`,
    );

    await queryRunner.query(`ALTER TABLE "safe_zones" ADD CONSTRAINT "CHK_safe_zones_radius" CHECK ("radius" > 0)`);
    await queryRunner.query(
      `ALTER TABLE "safe_zones" ADD CONSTRAINT "CHK_safe_zones_center" CHECK ("center_latitude" BETWEEN -90 AND 90 AND "center_longitude" BETWEEN -180 AND 180)`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_history" ADD CONSTRAINT "CHK_location_history_coords" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "location_history" DROP CONSTRAINT "CHK_location_history_coords"`);
    await queryRunner.query(`ALTER TABLE "safe_zones" DROP CONSTRAINT "CHK_safe_zones_center"`);
    await queryRunner.query(`ALTER TABLE "safe_zones" DROP CONSTRAINT "CHK_safe_zones_radius"`);
    await queryRunner.query(`DROP INDEX "UQ_zone_analytics_user_zone"`);
    await queryRunner.query(`DROP INDEX "UQ_family_members_family_invite"`);
    await queryRunner.query(`DROP INDEX "UQ_family_members_family_user"`);
    await queryRunner.query(`DROP INDEX "IDX_zone_visit_analytics_entry"`);
    await queryRunner.query(`DROP INDEX "IDX_safe_zones_family"`);
    await queryRunner.query(`DROP INDEX "IDX_family_members_user"`);
    await queryRunner.query(`DROP INDEX "IDX_family_members_family"`);
    await queryRunner.query(`DROP INDEX "IDX_alerts_family_time"`);
    await queryRunner.query(`DROP INDEX "IDX_location_history_user_time"`);
  }
}
