import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvEmailTemplates1820100000059 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_email_templates (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES cv_assistant_companies(id) ON DELETE CASCADE,
        kind VARCHAR(40) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS cv_email_templates_company_kind_idx
      ON cv_assistant_email_templates (company_id, kind);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_email_templates");
  }
}
