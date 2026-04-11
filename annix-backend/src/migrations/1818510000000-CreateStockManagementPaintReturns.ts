import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementPaintReturns1818510000000 implements MigrationInterface {
  name = "CreateStockManagementPaintReturns1818510000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_paint_return (
        id SERIAL PRIMARY KEY,
        return_session_id INTEGER NOT NULL REFERENCES sm_return_session(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL,
        source_issuance_row_id INTEGER NULL REFERENCES sm_paint_issuance_row(id) ON DELETE SET NULL,
        source_product_id INTEGER NULL REFERENCES sm_issuable_product(id) ON DELETE SET NULL,
        litres_returned NUMERIC(10,3) NOT NULL,
        condition VARCHAR(32) NOT NULL,
        batch_number VARCHAR(100) NULL,
        photo_url TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_paint_return_condition_check'
        ) THEN
          ALTER TABLE sm_paint_return
            ADD CONSTRAINT sm_paint_return_condition_check
            CHECK (condition IN ('usable','contaminated'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_paint_return_session
        ON sm_paint_return (return_session_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_paint_return_company_created
        ON sm_paint_return (company_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_paint_return CASCADE;");
  }
}
