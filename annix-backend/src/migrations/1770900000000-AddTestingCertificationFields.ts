import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestingCertificationFields1770900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      ADD COLUMN IF NOT EXISTS "hydrotest_pressure_multiplier" DECIMAL(3,2),
      ADD COLUMN IF NOT EXISTS "hydrotest_hold_min" INT,
      ADD COLUMN IF NOT EXISTS "ndt_methods" JSON,
      ADD COLUMN IF NOT EXISTS "length_type" VARCHAR(10)
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "hydrotest_pressure_multiplier" DECIMAL(3,2),
      ADD COLUMN IF NOT EXISTS "hydrotest_hold_min" INT,
      ADD COLUMN IF NOT EXISTS "ndt_methods" JSON
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      ADD COLUMN IF NOT EXISTS "hydrotest_pressure_multiplier" DECIMAL(3,2),
      ADD COLUMN IF NOT EXISTS "hydrotest_hold_min" INT,
      ADD COLUMN IF NOT EXISTS "ndt_methods" JSON
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      DROP COLUMN IF EXISTS "hydrotest_pressure_multiplier",
      DROP COLUMN IF EXISTS "hydrotest_hold_min",
      DROP COLUMN IF EXISTS "ndt_methods",
      DROP COLUMN IF EXISTS "length_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      DROP COLUMN IF EXISTS "hydrotest_pressure_multiplier",
      DROP COLUMN IF EXISTS "hydrotest_hold_min",
      DROP COLUMN IF EXISTS "ndt_methods"
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      DROP COLUMN IF EXISTS "hydrotest_pressure_multiplier",
      DROP COLUMN IF EXISTS "hydrotest_hold_min",
      DROP COLUMN IF EXISTS "ndt_methods"
    `);
  }
}
