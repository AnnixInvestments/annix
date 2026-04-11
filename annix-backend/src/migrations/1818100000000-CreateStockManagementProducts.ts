import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementProducts1818100000000 implements MigrationInterface {
  name = "CreateStockManagementProducts1818100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_product_category (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        product_type VARCHAR(32) NOT NULL,
        slug VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        description TEXT NULL,
        sort_order INTEGER NOT NULL DEFAULT 100,
        icon_key VARCHAR(64) NULL,
        workflow_hints JSONB NOT NULL DEFAULT '{}'::jsonb,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_product_category_company_type_slug_unique'
        ) THEN
          ALTER TABLE sm_product_category
            ADD CONSTRAINT sm_product_category_company_type_slug_unique
            UNIQUE (company_id, product_type, slug);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_product_category_company
        ON sm_product_category (company_id, product_type, active);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_issuable_product (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        product_type VARCHAR(32) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        category_id INTEGER NULL REFERENCES sm_product_category(id) ON DELETE SET NULL,
        unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'each',
        cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
        quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
        min_stock_level NUMERIC(14,4) NOT NULL DEFAULT 0,
        location_id INTEGER NULL,
        photo_url TEXT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        legacy_stock_item_id INTEGER NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_issuable_product_company_sku_unique'
        ) THEN
          ALTER TABLE sm_issuable_product
            ADD CONSTRAINT sm_issuable_product_company_sku_unique
            UNIQUE (company_id, sku);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_issuable_product_product_type_check'
        ) THEN
          ALTER TABLE sm_issuable_product
            ADD CONSTRAINT sm_issuable_product_product_type_check
            CHECK (product_type IN ('consumable','paint','rubber_roll','rubber_offcut','solution'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_issuable_product_company
        ON sm_issuable_product (company_id, product_type, active);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_issuable_product_legacy_stock_item
        ON sm_issuable_product (legacy_stock_item_id)
        WHERE legacy_stock_item_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_consumable_product (
        product_id INTEGER PRIMARY KEY REFERENCES sm_issuable_product(id) ON DELETE CASCADE,
        notes TEXT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_paint_product (
        product_id INTEGER PRIMARY KEY REFERENCES sm_issuable_product(id) ON DELETE CASCADE,
        coverage_m2_per_litre NUMERIC(8,3) NULL,
        wet_film_thickness_um INTEGER NULL,
        dry_film_thickness_um INTEGER NULL,
        coat_type VARCHAR(32) NULL,
        paint_system VARCHAR(32) NULL,
        number_of_parts INTEGER NULL,
        mixing_ratio VARCHAR(32) NULL,
        pot_life_minutes INTEGER NULL,
        is_banding BOOLEAN NOT NULL DEFAULT FALSE,
        supplier_product_code VARCHAR(64) NULL,
        colour_code VARCHAR(64) NULL,
        gloss_level VARCHAR(32) NULL,
        voc_content_g_per_l NUMERIC(8,2) NULL,
        density_kg_per_l NUMERIC(8,4) NULL,
        datasheet_url TEXT NULL,
        msds_url TEXT NULL,
        thinner_reference VARCHAR(64) NULL,
        shelf_life_months INTEGER NULL,
        surface_prep_requirement VARCHAR(64) NULL,
        min_application_temp_c NUMERIC(5,2) NULL,
        max_application_temp_c NUMERIC(5,2) NULL,
        substrate_compatibility TEXT[] NULL
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_paint_product_coat_type_check'
        ) THEN
          ALTER TABLE sm_paint_product
            ADD CONSTRAINT sm_paint_product_coat_type_check
            CHECK (coat_type IS NULL OR coat_type IN ('primer','intermediate','finish','sealer','banding'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_paint_product_paint_system_check'
        ) THEN
          ALTER TABLE sm_paint_product
            ADD CONSTRAINT sm_paint_product_paint_system_check
            CHECK (paint_system IS NULL OR paint_system IN ('epoxy','polyurethane','alkyd','zinc_rich','acrylic','other'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_paint_product_is_banding
        ON sm_paint_product (is_banding)
        WHERE is_banding = TRUE;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_rubber_roll (
        product_id INTEGER PRIMARY KEY REFERENCES sm_issuable_product(id) ON DELETE CASCADE,
        roll_number VARCHAR(100) NOT NULL,
        compound_code VARCHAR(100) NULL,
        compound_id INTEGER NULL,
        colour VARCHAR(64) NULL,
        width_mm NUMERIC(10,2) NULL,
        thickness_mm NUMERIC(10,3) NULL,
        length_m NUMERIC(10,3) NULL,
        weight_kg NUMERIC(10,3) NULL,
        batch_number VARCHAR(100) NULL,
        supplier_name VARCHAR(255) NULL,
        received_at TIMESTAMP NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'available',
        density_override_kg_per_m3 NUMERIC(8,2) NULL,
        legacy_rubber_roll_id INTEGER NULL
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_roll_company_roll_number_unique'
        ) THEN
          ALTER TABLE sm_rubber_roll
            ADD CONSTRAINT sm_rubber_roll_company_roll_number_unique
            UNIQUE (roll_number);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_roll_status_check'
        ) THEN
          ALTER TABLE sm_rubber_roll
            ADD CONSTRAINT sm_rubber_roll_status_check
            CHECK (status IN ('available','allocated','issued','partially_issued','consumed','missing','written_off'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_roll_status
        ON sm_rubber_roll (status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_roll_compound
        ON sm_rubber_roll (compound_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_rubber_offcut_stock (
        product_id INTEGER PRIMARY KEY REFERENCES sm_issuable_product(id) ON DELETE CASCADE,
        offcut_number VARCHAR(100) NOT NULL,
        source_roll_id INTEGER NULL REFERENCES sm_rubber_roll(product_id) ON DELETE SET NULL,
        source_purchase_batch_id INTEGER NULL,
        source_issuance_row_id INTEGER NULL,
        compound_code VARCHAR(100) NULL,
        compound_id INTEGER NULL,
        colour VARCHAR(64) NULL,
        width_mm NUMERIC(10,2) NOT NULL,
        length_m NUMERIC(10,3) NOT NULL,
        thickness_mm NUMERIC(10,3) NOT NULL,
        computed_weight_kg NUMERIC(10,3) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'available',
        location_id INTEGER NULL,
        received_at TIMESTAMP NOT NULL DEFAULT now(),
        received_by_staff_id INTEGER NULL,
        photo_url TEXT NULL,
        last_counted_at TIMESTAMP NULL,
        last_counted_by_staff_id INTEGER NULL,
        last_counted_variance JSONB NULL,
        written_off_at TIMESTAMP NULL,
        written_off_by_staff_id INTEGER NULL,
        write_off_reason TEXT NULL,
        notes TEXT NULL
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_rubber_offcut_stock_status_check'
        ) THEN
          ALTER TABLE sm_rubber_offcut_stock
            ADD CONSTRAINT sm_rubber_offcut_stock_status_check
            CHECK (status IN ('available','allocated','issued','missing','written_off'));
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_offcut_stock_status
        ON sm_rubber_offcut_stock (status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_rubber_offcut_stock_source_roll
        ON sm_rubber_offcut_stock (source_roll_id)
        WHERE source_roll_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_solution_product (
        product_id INTEGER PRIMARY KEY REFERENCES sm_issuable_product(id) ON DELETE CASCADE,
        active_ingredient VARCHAR(255) NULL,
        concentration_pct NUMERIC(6,3) NULL,
        density_kg_per_l NUMERIC(8,4) NULL,
        hazard_classification VARCHAR(64) NULL,
        storage_requirement TEXT NULL,
        shelf_life_months INTEGER NULL,
        notes TEXT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_solution_product CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_rubber_offcut_stock CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_rubber_roll CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_paint_product CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_consumable_product CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_issuable_product CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS sm_product_category CASCADE;");
  }
}
