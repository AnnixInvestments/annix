import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPslAndCvnFields1770500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      ADD COLUMN IF NOT EXISTS "psl_level" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "cvn_test_temperature_c" DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS "cvn_average_joules" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "cvn_minimum_joules" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "heat_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "mtc_reference" VARCHAR(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "psl_level" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "cvn_test_temperature_c" DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS "cvn_average_joules" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "cvn_minimum_joules" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "heat_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "mtc_reference" VARCHAR(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      ADD COLUMN IF NOT EXISTS "psl_level" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "cvn_test_temperature_c" DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS "cvn_average_joules" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "cvn_minimum_joules" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "heat_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "mtc_reference" VARCHAR(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      "psl_level",
      "cvn_test_temperature_c",
      "cvn_average_joules",
      "cvn_minimum_joules",
      "heat_number",
      "mtc_reference",
    ];
    const tables = ["straight_pipe_rfqs", "bend_rfqs", "fitting_rfqs"];

    for (const table of tables) {
      for (const col of columns) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${col}"`);
      }
    }
  }
}
