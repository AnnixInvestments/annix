import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaintPackSizeAndComponentGroup1818900000000 implements MigrationInterface {
  name = "AddPaintPackSizeAndComponentGroup1818900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sm_paint_product
        ADD COLUMN IF NOT EXISTS pack_size_litres NUMERIC(10,2) NULL,
        ADD COLUMN IF NOT EXISTS component_group_key VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS component_role VARCHAR(50) NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_paint_product_component_group
        ON sm_paint_product (component_group_key)
        WHERE component_group_key IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_sm_paint_product_component_group;");
    await queryRunner.query(`
      ALTER TABLE sm_paint_product
        DROP COLUMN IF EXISTS pack_size_litres,
        DROP COLUMN IF EXISTS component_group_key,
        DROP COLUMN IF EXISTS component_role;
    `);
  }
}
