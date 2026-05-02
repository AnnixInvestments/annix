import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeletionTokenToCvAssistantProfile1820100000048 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_profiles' AND column_name = 'deletion_token'
        ) THEN
          ALTER TABLE cv_assistant_profiles ADD COLUMN deletion_token VARCHAR(255);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_profiles' AND column_name = 'deletion_token_expires'
        ) THEN
          ALTER TABLE cv_assistant_profiles ADD COLUMN deletion_token_expires TIMESTAMPTZ;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_assistant_profiles_deletion_token
      ON cv_assistant_profiles (deletion_token)
      WHERE deletion_token IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_assistant_profiles_deletion_token");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_profiles
        DROP COLUMN IF EXISTS deletion_token,
        DROP COLUMN IF EXISTS deletion_token_expires
    `);
  }
}
