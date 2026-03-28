import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddExtIntSurfacePrep1809000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_card_coating_analyses"
        ADD COLUMN IF NOT EXISTS "ext_surface_prep" varchar(100),
        ADD COLUMN IF NOT EXISTS "int_surface_prep" varchar(100)
    `);

    await queryRunner.query(`
      UPDATE "job_card_coating_analyses"
      SET "ext_surface_prep" = "surface_prep",
          "int_surface_prep" = "surface_prep"
      WHERE "surface_prep" IS NOT NULL
        AND "ext_surface_prep" IS NULL
        AND "int_surface_prep" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_card_coating_analyses"
        DROP COLUMN IF EXISTS "ext_surface_prep",
        DROP COLUMN IF EXISTS "int_surface_prep"
    `);
  }
}
