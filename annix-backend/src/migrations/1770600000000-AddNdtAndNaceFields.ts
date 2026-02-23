import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNdtAndNaceFields1770600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      ADD COLUMN IF NOT EXISTS "ndt_coverage_pct" DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "lot_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "nace_compliant" BOOLEAN,
      ADD COLUMN IF NOT EXISTS "h2s_zone" INTEGER,
      ADD COLUMN IF NOT EXISTS "max_hardness_hrc" DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS "ssc_tested" BOOLEAN
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "ndt_coverage_pct" DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "lot_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "nace_compliant" BOOLEAN,
      ADD COLUMN IF NOT EXISTS "h2s_zone" INTEGER,
      ADD COLUMN IF NOT EXISTS "max_hardness_hrc" DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS "ssc_tested" BOOLEAN
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      ADD COLUMN IF NOT EXISTS "ndt_coverage_pct" DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "lot_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "nace_compliant" BOOLEAN,
      ADD COLUMN IF NOT EXISTS "h2s_zone" INTEGER,
      ADD COLUMN IF NOT EXISTS "max_hardness_hrc" DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS "ssc_tested" BOOLEAN
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      "ndt_coverage_pct",
      "lot_number",
      "nace_compliant",
      "h2s_zone",
      "max_hardness_hrc",
      "ssc_tested",
    ];
    const tables = ["straight_pipe_rfqs", "bend_rfqs", "fitting_rfqs"];

    for (const table of tables) {
      for (const col of columns) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${col}"`);
      }
    }
  }
}
