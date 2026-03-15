import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberCompanyEmailConfig1807000000032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_company ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
      ALTER TABLE rubber_company ADD COLUMN IF NOT EXISTS contact_person VARCHAR(200);
      ALTER TABLE rubber_company ADD COLUMN IF NOT EXISTS email_config JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_company DROP COLUMN IF EXISTS email_config;
      ALTER TABLE rubber_company DROP COLUMN IF EXISTS contact_person;
      ALTER TABLE rubber_company DROP COLUMN IF EXISTS phone;
    `);
  }
}
