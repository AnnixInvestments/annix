import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanySmtpConfig1801800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies' AND column_name = 'smtp_host'
        ) THEN
          ALTER TABLE stock_control_companies
            ADD COLUMN smtp_host VARCHAR(255),
            ADD COLUMN smtp_port INTEGER,
            ADD COLUMN smtp_user VARCHAR(255),
            ADD COLUMN smtp_pass_encrypted BYTEA,
            ADD COLUMN smtp_from_name VARCHAR(255),
            ADD COLUMN smtp_from_email VARCHAR(255);
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
        DROP COLUMN IF EXISTS smtp_host,
        DROP COLUMN IF EXISTS smtp_port,
        DROP COLUMN IF EXISTS smtp_user,
        DROP COLUMN IF EXISTS smtp_pass_encrypted,
        DROP COLUMN IF EXISTS smtp_from_name,
        DROP COLUMN IF EXISTS smtp_from_email
    `);
  }
}
