import { MigrationInterface, QueryRunner } from "typeorm";

export class AddItemCategoryAndStockCategory1809000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      ADD COLUMN IF NOT EXISTS item_category VARCHAR(50) NOT NULL DEFAULT 'ROLL'
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      ADD COLUMN IF NOT EXISTS description VARCHAR(500) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      ADD COLUMN IF NOT EXISTS stock_category VARCHAR(100) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      DROP COLUMN IF EXISTS stock_category
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      DROP COLUMN IF EXISTS description
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      DROP COLUMN IF EXISTS item_category
    `);
  }
}
