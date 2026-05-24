import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateModuleCatalogOverride1820100002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_catalog_override (
        id SERIAL PRIMARY KEY,
        module_key varchar(64) NOT NULL,
        tier_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
        tier_features jsonb NOT NULL DEFAULT '{}'::jsonb,
        add_on_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_by_id integer NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_module_catalog_override_module
        ON module_catalog_override (module_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS module_catalog_override");
  }
}
