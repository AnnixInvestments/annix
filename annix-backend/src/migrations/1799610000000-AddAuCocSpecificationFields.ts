import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuCocSpecificationFields1799610000000 implements MigrationInterface {
  name = "AddAuCocSpecificationFields1799610000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_compound_quality_configs
      ADD COLUMN IF NOT EXISTS shore_a_nominal DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS shore_a_min DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS shore_a_max DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS density_nominal DECIMAL(5,3),
      ADD COLUMN IF NOT EXISTS density_min DECIMAL(5,3),
      ADD COLUMN IF NOT EXISTS density_max DECIMAL(5,3),
      ADD COLUMN IF NOT EXISTS rebound_nominal DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS rebound_min DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS rebound_max DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS tear_strength_nominal DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS tear_strength_min DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS tear_strength_max DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS tensile_nominal DECIMAL(6,2),
      ADD COLUMN IF NOT EXISTS tensile_min DECIMAL(6,2),
      ADD COLUMN IF NOT EXISTS tensile_max DECIMAL(6,2),
      ADD COLUMN IF NOT EXISTS elongation_nominal DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS elongation_min DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS elongation_max DECIMAL(6,1),
      ADD COLUMN IF NOT EXISTS compound_description VARCHAR(255)
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      ADD COLUMN IF NOT EXISTS production_date DATE
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_compound_quality_configs
      DROP COLUMN IF EXISTS shore_a_nominal,
      DROP COLUMN IF EXISTS shore_a_min,
      DROP COLUMN IF EXISTS shore_a_max,
      DROP COLUMN IF EXISTS density_nominal,
      DROP COLUMN IF EXISTS density_min,
      DROP COLUMN IF EXISTS density_max,
      DROP COLUMN IF EXISTS rebound_nominal,
      DROP COLUMN IF EXISTS rebound_min,
      DROP COLUMN IF EXISTS rebound_max,
      DROP COLUMN IF EXISTS tear_strength_nominal,
      DROP COLUMN IF EXISTS tear_strength_min,
      DROP COLUMN IF EXISTS tear_strength_max,
      DROP COLUMN IF EXISTS tensile_nominal,
      DROP COLUMN IF EXISTS tensile_min,
      DROP COLUMN IF EXISTS tensile_max,
      DROP COLUMN IF EXISTS elongation_nominal,
      DROP COLUMN IF EXISTS elongation_min,
      DROP COLUMN IF EXISTS elongation_max,
      DROP COLUMN IF EXISTS compound_description
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      DROP COLUMN IF EXISTS production_date
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      DROP COLUMN IF EXISTS approved_by_name,
      DROP COLUMN IF EXISTS approved_at
    `);
  }
}
