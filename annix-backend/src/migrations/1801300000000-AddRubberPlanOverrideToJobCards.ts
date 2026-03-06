import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberPlanOverrideToJobCards1801300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_cards"
        ADD COLUMN IF NOT EXISTS "rubber_plan_override" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_cards"
        DROP COLUMN IF EXISTS "rubber_plan_override"
    `);
  }
}
