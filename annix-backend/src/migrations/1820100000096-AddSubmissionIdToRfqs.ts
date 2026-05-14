import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubmissionIdToRfqs1820100000096 implements MigrationInterface {
  name = "AddSubmissionIdToRfqs1820100000096";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rfqs" ADD COLUMN IF NOT EXISTS "submission_id" varchar(36) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_rfqs_submission_id" ON "rfqs" ("submission_id") WHERE "submission_id" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_rfqs_submission_id"`);
    await queryRunner.query(`ALTER TABLE "rfqs" DROP COLUMN IF EXISTS "submission_id"`);
  }
}
