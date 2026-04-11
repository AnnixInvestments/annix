import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementIssuance1818400000000 implements MigrationInterface {
  name = "CreateStockManagementIssuance1818400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_issuance_session (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        session_kind VARCHAR(32) NOT NULL DEFAULT 'standard',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        issuer_staff_id INTEGER NULL,
        recipient_staff_id INTEGER NULL,
        cpo_id INTEGER NULL,
        job_card_ids INTEGER[] NULL,
        notes TEXT NULL,
        approval_threshold_value_r NUMERIC(14,4) NULL,
        approved_at TIMESTAMP NULL,
        approved_by_staff_id INTEGER NULL,
        rejected_at TIMESTAMP NULL,
        rejected_by_staff_id INTEGER NULL,
        rejection_reason TEXT NULL,
        undone_at TIMESTAMP NULL,
        undone_by_staff_id INTEGER NULL,
        legacy_session_id INTEGER NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_issuance_session_kind_check'
        ) THEN
          ALTER TABLE sm_issuance_session
            ADD CONSTRAINT sm_issuance_session_kind_check
            CHECK (session_kind IN ('standard','cpo_batch','rubber_roll','mixed'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_issuance_session_status_check'
        ) THEN
          ALTER TABLE sm_issuance_session
            ADD CONSTRAINT sm_issuance_session_status_check
            CHECK (status IN ('active','pending_approval','approved','rejected','undone'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_issuance_session_company_status
        ON sm_issuance_session (company_id, status, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_issuance_session_cpo
        ON sm_issuance_session (cpo_id)
        WHERE cpo_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_issuance_row (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sm_issuance_session(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL,
        row_type VARCHAR(32) NOT NULL,
        product_id INTEGER NOT NULL REFERENCES sm_issuable_product(id) ON DELETE RESTRICT,
        job_card_id INTEGER NULL,
        undone BOOLEAN NOT NULL DEFAULT FALSE,
        undone_at TIMESTAMP NULL,
        undone_by_staff_id INTEGER NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_issuance_row_row_type_check'
        ) THEN
          ALTER TABLE sm_issuance_row
            ADD CONSTRAINT sm_issuance_row_row_type_check
            CHECK (row_type IN ('consumable','paint','rubber_roll','solution'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_issuance_row_session
        ON sm_issuance_row (session_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_issuance_row_product
        ON sm_issuance_row (product_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_issuance_row_jc
        ON sm_issuance_row (job_card_id)
        WHERE job_card_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_consumable_issuance_row (
        row_id INTEGER PRIMARY KEY REFERENCES sm_issuance_row(id) ON DELETE CASCADE,
        quantity NUMERIC(14,4) NOT NULL,
        batch_number VARCHAR(100) NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_paint_issuance_row (
        row_id INTEGER PRIMARY KEY REFERENCES sm_issuance_row(id) ON DELETE CASCADE,
        litres NUMERIC(14,4) NOT NULL,
        coverage_m2 NUMERIC(14,4) NULL,
        coat_count INTEGER NULL,
        coating_analysis_id INTEGER NULL,
        batch_number VARCHAR(100) NULL,
        cpo_pro_rata_split JSONB NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_rubber_roll_issuance_row (
        row_id INTEGER PRIMARY KEY REFERENCES sm_issuance_row(id) ON DELETE CASCADE,
        weight_kg_issued NUMERIC(10,3) NOT NULL,
        issued_width_mm NUMERIC(10,2) NULL,
        issued_length_m NUMERIC(10,3) NULL,
        issued_thickness_mm NUMERIC(10,3) NULL,
        expected_return_dimensions JSONB NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active'
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_roll_issuance_row_status_check'
        ) THEN
          ALTER TABLE sm_rubber_roll_issuance_row
            ADD CONSTRAINT sm_rubber_roll_issuance_row_status_check
            CHECK (status IN ('active','partial_return','fully_returned','written_off'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_solution_issuance_row (
        row_id INTEGER PRIMARY KEY REFERENCES sm_issuance_row(id) ON DELETE CASCADE,
        volume_l NUMERIC(14,4) NOT NULL,
        concentration_pct NUMERIC(6,3) NULL,
        batch_number VARCHAR(100) NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_solution_issuance_row CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_rubber_roll_issuance_row CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_paint_issuance_row CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_consumable_issuance_row CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_issuance_row CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_issuance_session CASCADE;");
  }
}
