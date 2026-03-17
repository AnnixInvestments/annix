import { MigrationInterface, QueryRunner } from "typeorm";

export class DeduplicateDeliveryNotes1807000000049 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH duplicates AS (
        SELECT
          id,
          delivery_note_number,
          supplier_company_id,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(delivery_note_number)), supplier_company_id
            ORDER BY created_at ASC
          ) AS row_num
        FROM rubber_delivery_notes
        WHERE version_status = 'ACTIVE'
          AND delivery_note_number IS NOT NULL
          AND delivery_note_number != ''
          AND delivery_note_number !~ '^DN-\\d+$'
      )
      UPDATE rubber_delivery_notes
      SET version_status = 'SUPERSEDED'
      WHERE id IN (
        SELECT id FROM duplicates WHERE row_num > 1
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot reliably reverse - duplicates were genuinely duplicated records
  }
}
