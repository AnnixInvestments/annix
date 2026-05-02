import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvAssistantIndividualDocuments1820100000047 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_individual_documents (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES cv_assistant_profiles(id) ON DELETE CASCADE,
        kind VARCHAR(20) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes INTEGER NOT NULL,
        label VARCHAR(100),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_assistant_individual_documents_profile_kind
      ON cv_assistant_individual_documents (profile_id, kind)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_cv_assistant_individual_documents_one_cv
      ON cv_assistant_individual_documents (profile_id)
      WHERE kind = 'cv'
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_profiles' AND column_name = 'cv_file_path'
        ) THEN
          ALTER TABLE cv_assistant_profiles ADD COLUMN cv_file_path VARCHAR(500);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_profiles' AND column_name = 'raw_cv_text'
        ) THEN
          ALTER TABLE cv_assistant_profiles ADD COLUMN raw_cv_text TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_profiles' AND column_name = 'extracted_cv_data'
        ) THEN
          ALTER TABLE cv_assistant_profiles ADD COLUMN extracted_cv_data JSONB;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_profiles' AND column_name = 'cv_uploaded_at'
        ) THEN
          ALTER TABLE cv_assistant_profiles ADD COLUMN cv_uploaded_at TIMESTAMPTZ;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS uniq_cv_assistant_individual_documents_one_cv");
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_cv_assistant_individual_documents_profile_kind",
    );
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_individual_documents");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_profiles
        DROP COLUMN IF EXISTS cv_file_path,
        DROP COLUMN IF EXISTS raw_cv_text,
        DROP COLUMN IF EXISTS extracted_cv_data,
        DROP COLUMN IF EXISTS cv_uploaded_at
    `);
  }
}
