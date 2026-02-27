import { MigrationInterface, QueryRunner } from "typeorm";

export class FixMaterialLimitsSchema1778400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'material_limits'
      )
    `);

    if (!tableExists[0]?.exists) {
      console.warn("material_limits table does not exist, skipping migration");
      return;
    }

    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'material_limits' AND column_name = 'steel_specification_id'
      )
    `);

    if (!columnExists[0]?.exists) {
      console.warn("Adding steel_specification_id column to material_limits table...");
      await queryRunner.query(`
        ALTER TABLE material_limits
        ADD COLUMN steel_specification_id INTEGER
        REFERENCES steel_specifications(id) ON DELETE SET NULL
      `);

      await queryRunner.query(`
        UPDATE material_limits ml
        SET steel_specification_id = (
          SELECT ss.id
          FROM steel_specifications ss
          WHERE ss.steel_spec_name LIKE '%' || ml.specification_pattern || '%'
             OR ml.specification_pattern LIKE '%' || ss.steel_spec_name || '%'
          LIMIT 1
        )
      `);

      console.warn("steel_specification_id column added successfully");
    } else {
      console.warn("steel_specification_id column already exists");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'material_limits' AND column_name = 'steel_specification_id'
      )
    `);

    if (columnExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE material_limits DROP COLUMN steel_specification_id
      `);
    }
  }
}
