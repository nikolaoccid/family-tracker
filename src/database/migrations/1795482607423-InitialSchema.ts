import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795482607423 implements MigrationInterface {
  name = 'InitialSchema1795482607423';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "zone_visit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entry_time" TIMESTAMP WITH TIME ZONE NOT NULL, "exit_time" TIMESTAMP WITH TIME ZONE, "duration" integer, "analytics_id" uuid, CONSTRAINT "PK_6efc033926b551f54fd65fed61a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "zone_analytics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "zone_id" character varying NOT NULL, "zone_name" character varying NOT NULL, "user_id" character varying NOT NULL, "user_name" character varying NOT NULL, "total_time_spent" integer NOT NULL, "time_by_day" jsonb NOT NULL, CONSTRAINT "PK_ff314dd99e7e3973f17bf65731c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "name" character varying NOT NULL DEFAULT 'User', "user_role" character varying NOT NULL DEFAULT 'standard-user', "is_verified" boolean NOT NULL DEFAULT false, "avatar" character varying, "phone" character varying, "is_premium" boolean NOT NULL DEFAULT false, "has_notifications_enabled" boolean NOT NULL DEFAULT true, "has_location_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "stripe_customer_id" character varying, "stripe_subscription_id" character varying, "subscription_valid_until" TIMESTAMP, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sharing_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "days" text NOT NULL, "start_time" character varying NOT NULL, "end_time" character varying NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "privacy_settings_id" uuid, CONSTRAINT "PK_66f9f088ebfd36f2e23a8fde58e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "safe_zones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "color" character varying NOT NULL, "radius" double precision NOT NULL, "center_latitude" double precision NOT NULL, "center_longitude" double precision NOT NULL, "members_to_track" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "family_id" character varying NOT NULL, "familyId" uuid, CONSTRAINT "PK_efbaa771f382f3fffc139467f5f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."privacy_settings_visible_to_enum" AS ENUM('all', 'selected', 'none')`,
    );
    await queryRunner.query(
      `CREATE TABLE "privacy_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "location_sharing_enabled" boolean NOT NULL DEFAULT true, "visible_to" "public"."privacy_settings_visible_to_enum" NOT NULL DEFAULT 'all', "selected_members" text NOT NULL DEFAULT '', "notifications_enabled" boolean NOT NULL DEFAULT true, "notify_low_battery" boolean NOT NULL DEFAULT true, "notify_zone_entry" boolean NOT NULL DEFAULT true, "notify_zone_exit" boolean NOT NULL DEFAULT true, "user_id" uuid, CONSTRAINT "REL_626e170465665a6a6e9831bb15" UNIQUE ("user_id"), CONSTRAINT "PK_e31cc479f8c3267c86511223ea0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "accuracy" double precision, "speed" double precision, "heading" double precision, "timestamp" TIMESTAMP NOT NULL, "who_can_see_location" text, "userId" uuid, CONSTRAINT "PK_969935adbd171d824b649bc03d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "families" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "owner_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ownerId" uuid, CONSTRAINT "PK_70414ac0c8f45664cf71324b9bb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."family_members_role_enum" AS ENUM('admin', 'member')`);
    await queryRunner.query(
      `CREATE TABLE "family_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "family_id" uuid NOT NULL, "user_id" uuid, "invited_email" character varying, "role" "public"."family_members_role_enum" NOT NULL DEFAULT 'member', "is_sharing" boolean NOT NULL DEFAULT true, "battery_level" double precision, "last_seen" TIMESTAMP, "latitude" double precision, "longitude" double precision, "location_timestamp" TIMESTAMP, "accuracy" double precision, "speed" double precision, "heading" double precision, "push_tokens" text, "active_zones" text, "latest_location_id" uuid, CONSTRAINT "PK_186da7c7fcbf23775fdd888a747" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alerts_type_enum" AS ENUM('emergency', 'zone_exit', 'zone_entry', 'low_battery', 'heading_home')`,
    );
    await queryRunner.query(
      `CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."alerts_type_enum" NOT NULL, "user_id" character varying NOT NULL, "family_id" character varying NOT NULL, "message" character varying NOT NULL, "latitude" double precision, "longitude" double precision, "accuracy" double precision, "speed" double precision, "heading" double precision, "location_timestamp" TIMESTAMP, "battery_level" double precision, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid, "familyId" uuid, CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "zone_visit" ADD CONSTRAINT "FK_fb6c29fb5253cfbd80d6607d670" FOREIGN KEY ("analytics_id") REFERENCES "zone_analytics"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sharing_schedule" ADD CONSTRAINT "FK_93996a2a402e66426773be4523d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sharing_schedule" ADD CONSTRAINT "FK_c82089cf6889edc3be5c84fe6d6" FOREIGN KEY ("privacy_settings_id") REFERENCES "privacy_settings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "safe_zones" ADD CONSTRAINT "FK_8747dbcd39f071cd93a02b48ddf" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_settings" ADD CONSTRAINT "FK_626e170465665a6a6e9831bb153" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_history" ADD CONSTRAINT "FK_67385b3f9f7f1196ab9b9f107d6" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "FK_eede7b5dd7a93dbb8ff1c67299f" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_members" ADD CONSTRAINT "FK_0bb82eed69c26581e0884653814" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_members" ADD CONSTRAINT "FK_081fe336d41be74c68b81e8b6d7" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_members" ADD CONSTRAINT "FK_0f66394a3167ceb9980d8512644" FOREIGN KEY ("latest_location_id") REFERENCES "location_history"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_f2678f7b11e5128abbbc4511906" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_6d0dce2047ab3c02e77fa7772ed" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_6d0dce2047ab3c02e77fa7772ed"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_f2678f7b11e5128abbbc4511906"`);
    await queryRunner.query(`ALTER TABLE "family_members" DROP CONSTRAINT "FK_0f66394a3167ceb9980d8512644"`);
    await queryRunner.query(`ALTER TABLE "family_members" DROP CONSTRAINT "FK_081fe336d41be74c68b81e8b6d7"`);
    await queryRunner.query(`ALTER TABLE "family_members" DROP CONSTRAINT "FK_0bb82eed69c26581e0884653814"`);
    await queryRunner.query(`ALTER TABLE "families" DROP CONSTRAINT "FK_eede7b5dd7a93dbb8ff1c67299f"`);
    await queryRunner.query(`ALTER TABLE "location_history" DROP CONSTRAINT "FK_67385b3f9f7f1196ab9b9f107d6"`);
    await queryRunner.query(`ALTER TABLE "privacy_settings" DROP CONSTRAINT "FK_626e170465665a6a6e9831bb153"`);
    await queryRunner.query(`ALTER TABLE "safe_zones" DROP CONSTRAINT "FK_8747dbcd39f071cd93a02b48ddf"`);
    await queryRunner.query(`ALTER TABLE "sharing_schedule" DROP CONSTRAINT "FK_c82089cf6889edc3be5c84fe6d6"`);
    await queryRunner.query(`ALTER TABLE "sharing_schedule" DROP CONSTRAINT "FK_93996a2a402e66426773be4523d"`);
    await queryRunner.query(`ALTER TABLE "zone_visit" DROP CONSTRAINT "FK_fb6c29fb5253cfbd80d6607d670"`);
    await queryRunner.query(`DROP TABLE "alerts"`);
    await queryRunner.query(`DROP TYPE "public"."alerts_type_enum"`);
    await queryRunner.query(`DROP TABLE "family_members"`);
    await queryRunner.query(`DROP TYPE "public"."family_members_role_enum"`);
    await queryRunner.query(`DROP TABLE "families"`);
    await queryRunner.query(`DROP TABLE "location_history"`);
    await queryRunner.query(`DROP TABLE "privacy_settings"`);
    await queryRunner.query(`DROP TYPE "public"."privacy_settings_visible_to_enum"`);
    await queryRunner.query(`DROP TABLE "safe_zones"`);
    await queryRunner.query(`DROP TABLE "sharing_schedule"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "zone_analytics"`);
    await queryRunner.query(`DROP TABLE "zone_visit"`);
  }
}
