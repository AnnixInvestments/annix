import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourcePageNumbersToRubberDeliveryNotes1820100000039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      ADD COLUMN IF NOT EXISTS source_page_numbers jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      DROP COLUMN IF EXISTS source_page_numbers
    `);
  }
}
