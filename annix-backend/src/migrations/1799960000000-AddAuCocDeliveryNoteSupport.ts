import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuCocDeliveryNoteSupport1799960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      ADD COLUMN IF NOT EXISTS source_delivery_note_id INT NULL,
      ADD COLUMN IF NOT EXISTS extracted_roll_data JSONB NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_rubber_au_cocs_delivery_note'
        ) THEN
          ALTER TABLE rubber_au_cocs
          ADD CONSTRAINT fk_rubber_au_cocs_delivery_note
          FOREIGN KEY (source_delivery_note_id)
          REFERENCES rubber_delivery_notes(id)
          ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN rubber_au_cocs.source_delivery_note_id IS 'Reference to the delivery note this COC was generated from'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN rubber_au_cocs.extracted_roll_data IS 'Roll data extracted from delivery note for COCs without stock rolls'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      DROP CONSTRAINT IF EXISTS fk_rubber_au_cocs_delivery_note
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      DROP COLUMN IF EXISTS source_delivery_note_id,
      DROP COLUMN IF EXISTS extracted_roll_data
    `);
  }
}
