import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementCompoundsAndDatasheets1818300000000
  implements MigrationInterface
{
  name = "CreateStockManagementCompoundsAndDatasheets1818300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_rubber_compound (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        code VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        supplier_id INTEGER NULL,
        supplier_name VARCHAR(255) NULL,
        compound_family VARCHAR(32) NOT NULL DEFAULT 'other',
        shore_hardness INTEGER NULL,
        density_kg_per_m3 NUMERIC(8,2) NULL,
        specific_gravity NUMERIC(6,4) NULL,
        temp_range_min_c NUMERIC(6,2) NULL,
        temp_range_max_c NUMERIC(6,2) NULL,
        elongation_at_break_pct NUMERIC(6,2) NULL,
        tensile_strength_mpa NUMERIC(6,2) NULL,
        chemical_resistance TEXT[] NULL,
        default_colour VARCHAR(64) NULL,
        datasheet_status VARCHAR(32) NOT NULL DEFAULT 'missing',
        last_extraction_datasheet_id INTEGER NULL,
        legacy_firebase_uid VARCHAR(128) NULL,
        notes TEXT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_compound_company_code_unique'
        ) THEN
          ALTER TABLE sm_rubber_compound
            ADD CONSTRAINT sm_rubber_compound_company_code_unique
            UNIQUE (company_id, code);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_compound_family_check'
        ) THEN
          ALTER TABLE sm_rubber_compound
            ADD CONSTRAINT sm_rubber_compound_family_check
            CHECK (compound_family IN ('NR','SBR','NBR','EPDM','CR','FKM','IIR','BR','CSM','PU','other'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_compound_datasheet_status_check'
        ) THEN
          ALTER TABLE sm_rubber_compound
            ADD CONSTRAINT sm_rubber_compound_datasheet_status_check
            CHECK (datasheet_status IN ('missing','pending_upload','uploaded','extracted','verified'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_compound_company
        ON sm_rubber_compound (company_id, active);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_compound_family
        ON sm_rubber_compound (compound_family, shore_hardness);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_compound_legacy_uid
        ON sm_rubber_compound (legacy_firebase_uid)
        WHERE legacy_firebase_uid IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_product_datasheet (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        product_type VARCHAR(32) NOT NULL,
        paint_product_id INTEGER NULL REFERENCES sm_paint_product(product_id) ON DELETE CASCADE,
        rubber_compound_id INTEGER NULL REFERENCES sm_rubber_compound(id) ON DELETE CASCADE,
        solution_product_id INTEGER NULL REFERENCES sm_solution_product(product_id) ON DELETE CASCADE,
        consumable_product_id INTEGER NULL REFERENCES sm_consumable_product(product_id) ON DELETE CASCADE,
        doc_type VARCHAR(32) NOT NULL DEFAULT 'tds',
        file_path VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        revision_number INTEGER NOT NULL DEFAULT 1,
        issued_at DATE NULL,
        expires_at DATE NULL,
        extraction_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        extraction_started_at TIMESTAMP NULL,
        extraction_completed_at TIMESTAMP NULL,
        extracted_data JSONB NULL,
        extraction_model VARCHAR(64) NULL,
        extraction_notes TEXT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT now(),
        uploaded_by_id INTEGER NULL,
        uploaded_by_name VARCHAR(255) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_product_datasheet_product_type_check'
        ) THEN
          ALTER TABLE sm_product_datasheet
            ADD CONSTRAINT sm_product_datasheet_product_type_check
            CHECK (product_type IN ('paint','rubber_compound','solution','consumable'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_product_datasheet_doc_type_check'
        ) THEN
          ALTER TABLE sm_product_datasheet
            ADD CONSTRAINT sm_product_datasheet_doc_type_check
            CHECK (doc_type IN ('tds','sds','msds','product_info','application_guide'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_product_datasheet_extraction_status_check'
        ) THEN
          ALTER TABLE sm_product_datasheet
            ADD CONSTRAINT sm_product_datasheet_extraction_status_check
            CHECK (extraction_status IN ('pending','in_progress','completed','failed','manual_only'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_product_datasheet_exactly_one_owner_check'
        ) THEN
          ALTER TABLE sm_product_datasheet
            ADD CONSTRAINT sm_product_datasheet_exactly_one_owner_check
            CHECK (
              (CASE WHEN paint_product_id IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN rubber_compound_id IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN solution_product_id IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN consumable_product_id IS NOT NULL THEN 1 ELSE 0 END) = 1
            );
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_product_datasheet_company_active
        ON sm_product_datasheet (company_id, product_type, is_active);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_product_datasheet_paint
        ON sm_product_datasheet (paint_product_id)
        WHERE paint_product_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_product_datasheet_rubber_compound
        ON sm_product_datasheet (rubber_compound_id)
        WHERE rubber_compound_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_product_datasheet_solution
        ON sm_product_datasheet (solution_product_id)
        WHERE solution_product_id IS NOT NULL;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_compound_last_extraction_fk'
        ) THEN
          ALTER TABLE sm_rubber_compound
            ADD CONSTRAINT sm_rubber_compound_last_extraction_fk
            FOREIGN KEY (last_extraction_datasheet_id)
            REFERENCES sm_product_datasheet(id) ON DELETE SET NULL;
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sm_rubber_compound DROP CONSTRAINT IF EXISTS sm_rubber_compound_last_extraction_fk;
    `);
    await queryRunner.query("DROP TABLE IF EXISTS sm_product_datasheet CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_rubber_compound CASCADE;");
  }
}
