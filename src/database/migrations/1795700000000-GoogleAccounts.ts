import { MigrationInterface, QueryRunner } from 'typeorm';

/** Expand step for Google sign-in: accounts may have no password, and are linked by Google subject. */
export class GoogleAccounts1795700000000 implements MigrationInterface {
  name = 'GoogleAccounts1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ADD "google_subject" character varying`);
    await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_user_google_subject" UNIQUE ("google_subject")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_user_google_subject"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "google_subject"`);
    // password_hash stays nullable: rows created without one cannot be given a NOT NULL again.
  }
}
