import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSdnStatusToDeliveryNotes1811500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delivery_notes
      ADD COLUMN IF NOT EXISTS sdn_status VARCHAR(30) DEFAULT 'CONFIRMED' NOT NULL
    `);

    await queryRunner.query(`
      UPDATE delivery_notes
      SET sdn_status = 'STOCK_LINKED'
      WHERE id IN (
        SELECT DISTINCT delivery_note_id FROM delivery_note_items
      )
    `);

    await queryRunner.query(`
      UPDATE delivery_notes
      SET sdn_status = 'PENDING_REVIEW'
      WHERE sdn_status = 'CONFIRMED'
        AND extracted_data IS NOT NULL
        AND id NOT IN (
          SELECT DISTINCT delivery_note_id FROM delivery_note_items
        )
        AND extraction_status = 'completed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delivery_notes DROP COLUMN IF EXISTS sdn_status
    `);
  }
}
