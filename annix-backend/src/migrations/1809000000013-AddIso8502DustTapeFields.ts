import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddIso8502DustTapeFields1809000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "qc_dust_debris_tests"
        ADD COLUMN IF NOT EXISTS "surface_prep_method" varchar(255),
        ADD COLUMN IF NOT EXISTS "acceptance_criteria" jsonb,
        ADD COLUMN IF NOT EXISTS "environmental_conditions" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "qc_dust_debris_tests"
        DROP COLUMN IF EXISTS "surface_prep_method",
        DROP COLUMN IF EXISTS "acceptance_criteria",
        DROP COLUMN IF EXISTS "environmental_conditions"
    `);
  }
}
