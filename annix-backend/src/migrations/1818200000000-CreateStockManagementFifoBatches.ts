import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementFifoBatches1818200000000 implements MigrationInterface {
  name = "CreateStockManagementFifoBatches1818200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_stock_purchase_batch (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL REFERENCES sm_issuable_product(id) ON DELETE CASCADE,
        source_type VARCHAR(32) NOT NULL,
        source_ref_id INTEGER NULL,
        supplier_name VARCHAR(255) NULL,
        supplier_batch_ref VARCHAR(100) NULL,
        quantity_purchased NUMERIC(14,4) NOT NULL,
        quantity_remaining NUMERIC(14,4) NOT NULL,
        cost_per_unit NUMERIC(12,4) NOT NULL,
        total_cost_r NUMERIC(14,4) NOT NULL,
        received_at TIMESTAMP NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        is_legacy_batch BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_staff_id INTEGER NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_purchase_batch_source_type_check'
        ) THEN
          ALTER TABLE sm_stock_purchase_batch
            ADD CONSTRAINT sm_stock_purchase_batch_source_type_check
            CHECK (source_type IN ('supplier_invoice','grn','manual_adjustment','stock_take_overage','customer_return','legacy'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_purchase_batch_status_check'
        ) THEN
          ALTER TABLE sm_stock_purchase_batch
            ADD CONSTRAINT sm_stock_purchase_batch_status_check
            CHECK (status IN ('active','exhausted','written_off'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_purchase_batch_quantity_remaining_nonnegative_check'
        ) THEN
          ALTER TABLE sm_stock_purchase_batch
            ADD CONSTRAINT sm_stock_purchase_batch_quantity_remaining_nonnegative_check
            CHECK (quantity_remaining >= 0);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_purchase_batch_fifo_order
        ON sm_stock_purchase_batch (product_id, received_at, id)
        WHERE status = 'active';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_purchase_batch_company
        ON sm_stock_purchase_batch (company_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_purchase_batch_legacy
        ON sm_stock_purchase_batch (product_id, is_legacy_batch)
        WHERE is_legacy_batch = TRUE;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_stock_movement_batch_consumption (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        purchase_batch_id INTEGER NOT NULL REFERENCES sm_stock_purchase_batch(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES sm_issuable_product(id) ON DELETE CASCADE,
        movement_kind VARCHAR(32) NOT NULL,
        movement_ref_id INTEGER NULL,
        quantity_consumed NUMERIC(14,4) NOT NULL,
        cost_per_unit_at_consumption NUMERIC(12,4) NOT NULL,
        total_cost_consumed_r NUMERIC(14,4) NOT NULL,
        consumed_at TIMESTAMP NOT NULL DEFAULT now(),
        consumed_by_staff_id INTEGER NULL,
        notes TEXT NULL
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_movement_batch_consumption_movement_kind_check'
        ) THEN
          ALTER TABLE sm_stock_movement_batch_consumption
            ADD CONSTRAINT sm_stock_movement_batch_consumption_movement_kind_check
            CHECK (movement_kind IN ('issuance','allocation','return_to_supplier','stock_take_write_off','wastage','damaged_hold','manual_adjustment'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_movement_batch_consumption_batch
        ON sm_stock_movement_batch_consumption (purchase_batch_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_movement_batch_consumption_product
        ON sm_stock_movement_batch_consumption (product_id, consumed_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_movement_batch_consumption_movement
        ON sm_stock_movement_batch_consumption (movement_kind, movement_ref_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_stock_movement_batch_consumption CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_stock_purchase_batch CASCADE;");
  }
}
