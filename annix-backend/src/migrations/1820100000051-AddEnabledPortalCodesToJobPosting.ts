import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnabledPortalCodesToJobPosting1820100000051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'enabled_portal_codes'
        ) THEN
          ALTER TABLE cv_assistant_job_postings
            ADD COLUMN enabled_portal_codes JSONB NOT NULL DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE cv_assistant_job_postings DROP COLUMN IF EXISTS enabled_portal_codes",
    );
  }
}
