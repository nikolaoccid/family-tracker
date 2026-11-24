import { MigrationInterface, QueryRunner } from 'typeorm';

/** New table only: remembered responses for retry-safe create endpoints. */
export class IdempotencyKeys1795800000000 implements MigrationInterface {
  name = 'IdempotencyKeys1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(255) NOT NULL, "user_id" character varying NOT NULL, "scope" character varying NOT NULL, "request_hash" character varying(64) NOT NULL, "status" integer, "response" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_idempotency_user_scope_key" UNIQUE ("user_id", "scope", "key"), CONSTRAINT "PK_idempotency_keys_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_idempotency_created" ON "idempotency_keys" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_idempotency_created"`);
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
