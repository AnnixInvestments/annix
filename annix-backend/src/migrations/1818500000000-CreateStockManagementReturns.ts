import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementReturns1818500000000 implements MigrationInterface {
  name = "CreateStockManagementReturns1818500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_return_session (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        return_kind VARCHAR(32) NOT NULL,
        target_issuance_row_id INTEGER NULL REFERENCES sm_issuance_row(id) ON DELETE SET NULL,
        target_session_id INTEGER NULL REFERENCES sm_issuance_session(id) ON DELETE SET NULL,
        target_job_card_id INTEGER NULL,
        returned_by_staff_id INTEGER NULL,
        confirmed_by_staff_id INTEGER NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_return_session_kind_check'
        ) THEN
          ALTER TABLE sm_return_session
            ADD CONSTRAINT sm_return_session_kind_check
            CHECK (return_kind IN ('rubber_offcut','paint_litres','consumable_qty','solution_volume','other'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_return_session_status_check'
        ) THEN
          ALTER TABLE sm_return_session
            ADD CONSTRAINT sm_return_session_status_check
            CHECK (status IN ('pending','confirmed','rejected','cancelled'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_return_session_company_status
        ON sm_return_session (company_id, status, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_rubber_offcut_return (
        id SERIAL PRIMARY KEY,
        return_session_id INTEGER NOT NULL REFERENCES sm_return_session(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL,
        source_issuance_row_id INTEGER NULL REFERENCES sm_issuance_row(id) ON DELETE SET NULL,
        source_rubber_roll_id INTEGER NULL,
        offcut_number VARCHAR(100) NULL,
        width_mm NUMERIC(10,2) NOT NULL,
        length_m NUMERIC(10,3) NOT NULL,
        thickness_mm NUMERIC(10,3) NOT NULL,
        computed_weight_kg NUMERIC(10,3) NULL,
        compound_id INTEGER NULL,
        compound_code VARCHAR(100) NULL,
        colour VARCHAR(64) NULL,
        photo_url TEXT NULL,
        creates_offcut_product_id INTEGER NULL REFERENCES sm_issuable_product(id) ON DELETE SET NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_offcut_return_session
        ON sm_rubber_offcut_return (return_session_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_rubber_wastage_bin (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        colour VARCHAR(64) NOT NULL,
        current_weight_kg NUMERIC(12,3) NOT NULL DEFAULT 0,
        current_value_r NUMERIC(14,4) NOT NULL DEFAULT 0,
        location_id INTEGER NULL,
        scrap_rate_per_kg_r NUMERIC(10,4) NULL,
        last_emptied_at TIMESTAMP NULL,
        last_emptied_value_r NUMERIC(14,4) NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_wastage_bin_company_colour_unique'
        ) THEN
          ALTER TABLE sm_rubber_wastage_bin
            ADD CONSTRAINT sm_rubber_wastage_bin_company_colour_unique
            UNIQUE (company_id, colour);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_rubber_wastage_entry (
        id SERIAL PRIMARY KEY,
        wastage_bin_id INTEGER NOT NULL REFERENCES sm_rubber_wastage_bin(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL,
        weight_kg_added NUMERIC(10,3) NOT NULL,
        source_offcut_product_id INTEGER NULL REFERENCES sm_issuable_product(id) ON DELETE SET NULL,
        source_issuance_row_id INTEGER NULL REFERENCES sm_issuance_row(id) ON DELETE SET NULL,
        source_purchase_batch_id INTEGER NULL REFERENCES sm_stock_purchase_batch(id) ON DELETE SET NULL,
        cost_per_kg_at_entry NUMERIC(12,4) NOT NULL,
        total_cost_r NUMERIC(14,4) NOT NULL,
        added_at TIMESTAMP NOT NULL DEFAULT now(),
        added_by_staff_id INTEGER NULL,
        notes TEXT NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_wastage_entry_bin
        ON sm_rubber_wastage_entry (wastage_bin_id, added_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_rubber_wastage_entry CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_rubber_wastage_bin CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_rubber_offcut_return CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_return_session CASCADE;");
  }
}
