import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIssuanceItemCoatTracking1819000000000 implements MigrationInterface {
  name = "CreateIssuanceItemCoatTracking1819000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_issuance_item_coat_tracking (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        issuance_row_id INTEGER NOT NULL REFERENCES sm_issuance_row(id) ON DELETE CASCADE,
        job_card_id INTEGER NOT NULL,
        line_item_id INTEGER NOT NULL,
        coat_type VARCHAR(32) NOT NULL,
        quantity_issued INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_iict_coat_type_check'
        ) THEN
          ALTER TABLE sm_issuance_item_coat_tracking
            ADD CONSTRAINT sm_iict_coat_type_check
            CHECK (coat_type IN ('primer','intermediate','final','rubber_lining'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_iict_jc_coat
        ON sm_issuance_item_coat_tracking (job_card_id, coat_type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_iict_line_item
        ON sm_issuance_item_coat_tracking (line_item_id, coat_type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_iict_company
        ON sm_issuance_item_coat_tracking (company_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_issuance_item_coat_tracking;");
  }
}
