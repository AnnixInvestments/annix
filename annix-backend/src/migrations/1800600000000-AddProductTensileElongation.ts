import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductTensileElongation1800600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_product
      ADD COLUMN IF NOT EXISTS tensile_strength_mpa decimal(5,1) NULL,
      ADD COLUMN IF NOT EXISTS elongation_at_break integer NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_product
      DROP COLUMN IF EXISTS tensile_strength_mpa,
      DROP COLUMN IF EXISTS elongation_at_break
    `);
  }
}
