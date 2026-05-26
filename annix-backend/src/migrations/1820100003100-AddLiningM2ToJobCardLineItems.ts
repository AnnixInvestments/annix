import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Job-card line items now carry two surface areas: `m2` (external / paint) and the new
 * `lining_m2` (internal rubber-lining = bore + flange faces, which drives rubber quoting).
 * NULL = not yet calculated. Idempotent.
 */
export class AddLiningM2ToJobCardLineItems1820100003100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_card_line_items" ADD COLUMN IF NOT EXISTS "lining_m2" numeric(12,4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_card_line_items" DROP COLUMN IF EXISTS "lining_m2"`);
  }
}
