import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementStockTake1818600000000 implements MigrationInterface {
  name = "CreateStockManagementStockTake1818600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_stock_take_variance_category (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        slug VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        description TEXT NULL,
        sort_order INTEGER NOT NULL DEFAULT 100,
        requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
        requires_incident_ref BOOLEAN NOT NULL DEFAULT FALSE,
        notify_on_submit TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        severity VARCHAR(16) NOT NULL DEFAULT 'low',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_take_variance_category_company_slug_unique'
        ) THEN
          ALTER TABLE sm_stock_take_variance_category
            ADD CONSTRAINT sm_stock_take_variance_category_company_slug_unique
            UNIQUE (company_id, slug);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_take_variance_category_severity_check'
        ) THEN
          ALTER TABLE sm_stock_take_variance_category
            ADD CONSTRAINT sm_stock_take_variance_category_severity_check
            CHECK (severity IN ('low','medium','high','critical'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_stock_take (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        period_label VARCHAR(64) NULL,
        period_start DATE NULL,
        period_end DATE NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        snapshot_at TIMESTAMP NULL,
        started_at TIMESTAMP NOT NULL DEFAULT now(),
        started_by_staff_id INTEGER NULL,
        submitted_at TIMESTAMP NULL,
        submitted_by_staff_id INTEGER NULL,
        approved_at TIMESTAMP NULL,
        approved_by_staff_id INTEGER NULL,
        approver_role VARCHAR(32) NULL,
        rejected_at TIMESTAMP NULL,
        rejected_by_staff_id INTEGER NULL,
        rejection_reason TEXT NULL,
        posted_at TIMESTAMP NULL,
        posted_by_staff_id INTEGER NULL,
        valuation_before_r NUMERIC(14,4) NULL,
        valuation_after_r NUMERIC(14,4) NULL,
        total_variance_r NUMERIC(14,4) NULL,
        total_variance_abs_r NUMERIC(14,4) NULL,
        requires_escalated_review BOOLEAN NOT NULL DEFAULT FALSE,
        requires_high_value_approval BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_stock_take_status_check'
        ) THEN
          ALTER TABLE sm_stock_take
            ADD CONSTRAINT sm_stock_take_status_check
            CHECK (status IN ('draft','counting','pending_approval','approved','rejected','posted','archived'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_take_company_status
        ON sm_stock_take (company_id, status, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_stock_take_line (
        id SERIAL PRIMARY KEY,
        stock_take_id INTEGER NOT NULL REFERENCES sm_stock_take(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL REFERENCES sm_issuable_product(id) ON DELETE RESTRICT,
        location_id INTEGER NULL,
        expected_qty NUMERIC(14,4) NOT NULL DEFAULT 0,
        expected_cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
        expected_value_r NUMERIC(14,4) NOT NULL DEFAULT 0,
        counted_qty NUMERIC(14,4) NULL,
        counted_at TIMESTAMP NULL,
        counted_by_staff_id INTEGER NULL,
        expected_at_count_time NUMERIC(14,4) NULL,
        expected_at_snapshot NUMERIC(14,4) NULL,
        in_flight_movement_ids INTEGER[] NULL,
        variance_qty NUMERIC(14,4) NULL,
        variance_value_r NUMERIC(14,4) NULL,
        variance_category_id INTEGER NULL REFERENCES sm_stock_take_variance_category(id) ON DELETE SET NULL,
        variance_reason TEXT NULL,
        photo_url TEXT NULL,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        resolved_by_staff_id INTEGER NULL,
        resolved_at TIMESTAMP NULL,
        resolution_notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_take_line_take
        ON sm_stock_take_line (stock_take_id, location_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_stock_take_line_product
        ON sm_stock_take_line (product_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_stock_take_adjustment (
        id SERIAL PRIMARY KEY,
        stock_take_line_id INTEGER NOT NULL REFERENCES sm_stock_take_line(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL,
        adjustment_qty NUMERIC(14,4) NOT NULL,
        adjustment_value_r NUMERIC(14,4) NOT NULL,
        purchase_batch_id INTEGER NULL REFERENCES sm_stock_purchase_batch(id) ON DELETE SET NULL,
        posted_at TIMESTAMP NOT NULL DEFAULT now(),
        posted_by_staff_id INTEGER NULL,
        notes TEXT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_stock_take_adjustment CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_stock_take_line CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_stock_take CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_stock_take_variance_category CASCADE;");
  }
}
