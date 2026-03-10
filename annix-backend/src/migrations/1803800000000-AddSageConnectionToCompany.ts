import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSageConnectionToCompany1803800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies' AND column_name = 'sage_username'
        ) THEN
          ALTER TABLE stock_control_companies ADD COLUMN sage_username VARCHAR(255);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies' AND column_name = 'sage_pass_encrypted'
        ) THEN
          ALTER TABLE stock_control_companies ADD COLUMN sage_pass_encrypted BYTEA;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies' AND column_name = 'sage_company_id'
        ) THEN
          ALTER TABLE stock_control_companies ADD COLUMN sage_company_id INTEGER;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies' AND column_name = 'sage_company_name'
        ) THEN
          ALTER TABLE stock_control_companies ADD COLUMN sage_company_name VARCHAR(255);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies' AND column_name = 'sage_connected_at'
        ) THEN
          ALTER TABLE stock_control_companies ADD COLUMN sage_connected_at TIMESTAMP;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
        DROP COLUMN IF EXISTS sage_username,
        DROP COLUMN IF EXISTS sage_pass_encrypted,
        DROP COLUMN IF EXISTS sage_company_id,
        DROP COLUMN IF EXISTS sage_company_name,
        DROP COLUMN IF EXISTS sage_connected_at;
    `);
  }
}
