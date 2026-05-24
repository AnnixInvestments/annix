import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateModuleLicense1820100001900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_license (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL,
        module_key varchar(64) NOT NULL,
        tier varchar(32) NOT NULL,
        feature_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
        valid_from TIMESTAMPTZ NULL,
        valid_until TIMESTAMPTZ NULL,
        active boolean NOT NULL DEFAULT true,
        notes text NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_module_license_company_module
        ON module_license (company_id, module_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS module_license");
  }
}
