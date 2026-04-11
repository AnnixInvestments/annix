import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockManagementLicense1818000000000 implements MigrationInterface {
  name = "CreateStockManagementLicense1818000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sm_company_module_license (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        module_key VARCHAR(64) NOT NULL DEFAULT 'stock-management',
        tier VARCHAR(32) NOT NULL DEFAULT 'basic',
        feature_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
        valid_from TIMESTAMPTZ NULL,
        valid_until TIMESTAMPTZ NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sm_company_module_license_company_module_key_unique'
        ) THEN
          ALTER TABLE sm_company_module_license
            ADD CONSTRAINT sm_company_module_license_company_module_key_unique
            UNIQUE (company_id, module_key);
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_company_module_license_company
        ON sm_company_module_license (company_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sm_company_module_license_active
        ON sm_company_module_license (active)
        WHERE active = TRUE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sm_company_module_license CASCADE;");
  }
}
