import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriority2MaterialFields1770700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      ADD COLUMN IF NOT EXISTS "manufacturing_process" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "delivery_condition" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "bevel_angle_deg" DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS "root_face_mm" DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS "root_gap_mm" DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS "uns_number" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "smys_mpa" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "carbon_equivalent" DECIMAL(4,3)
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "manufacturing_process" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "delivery_condition" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "bevel_angle_deg" DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS "root_face_mm" DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS "root_gap_mm" DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS "uns_number" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "smys_mpa" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "carbon_equivalent" DECIMAL(4,3)
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      ADD COLUMN IF NOT EXISTS "manufacturing_process" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "delivery_condition" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "bevel_angle_deg" DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS "root_face_mm" DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS "root_gap_mm" DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS "uns_number" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "smys_mpa" DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS "carbon_equivalent" DECIMAL(4,3)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      "manufacturing_process",
      "delivery_condition",
      "bevel_angle_deg",
      "root_face_mm",
      "root_gap_mm",
      "uns_number",
      "smys_mpa",
      "carbon_equivalent",
    ];
    const tables = ["straight_pipe_rfqs", "bend_rfqs", "fitting_rfqs"];

    for (const table of tables) {
      for (const col of columns) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${col}"`);
      }
    }
  }
}
