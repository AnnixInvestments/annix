import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementHold1818700000000 implements MigrationInterface {
  name = "CreateStockManagementHold1818700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_stock_hold_item (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        stock_take_id INTEGER NULL REFERENCES sm_stock_take(id) ON DELETE SET NULL,
        product_id INTEGER NOT NULL REFERENCES sm_issuable_product(id) ON DELETE RESTRICT,
        quantity NUMERIC(14,4) NULL,
        dimensions_json JSONB NULL,
        reason VARCHAR(32) NOT NULL,
        reason_notes TEXT NOT NULL,
        photo_url TEXT NULL,
        flagged_by_staff_id INTEGER NOT NULL,
        flagged_at TIMESTAMP NOT NULL DEFAULT now(),
        write_off_value_r NUMERIC(14,4) NOT NULL DEFAULT 0,
        hold_movement_id INTEGER NULL,
        disposition_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        disposition_action TEXT NULL,
        disposition_by_staff_id INTEGER NULL,
        disposition_at TIMESTAMP NULL,
        disposition_ref_id INTEGER NULL,
        disposition_notes TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_hold_item_reason_check'
        ) THEN
          ALTER TABLE sm_stock_hold_item
            ADD CONSTRAINT sm_stock_hold_item_reason_check
            CHECK (reason IN ('damaged','expired','contaminated','recalled','wrong_spec','other'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_hold_item_disposition_status_check'
        ) THEN
          ALTER TABLE sm_stock_hold_item
            ADD CONSTRAINT sm_stock_hold_item_disposition_status_check
            CHECK (disposition_status IN ('pending','scrapped','returned_to_supplier','repaired','donated','other'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_hold_item_company_status
        ON sm_stock_hold_item (company_id, disposition_status, flagged_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_hold_item_product
        ON sm_stock_hold_item (product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_hold_item_stock_take
        ON sm_stock_hold_item (stock_take_id)
        WHERE stock_take_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sm_stock_hold_item CASCADE;`);
  }
}
