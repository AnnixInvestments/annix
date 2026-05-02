import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTypeToCvAssistantProfile1820100000046 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_profiles' AND column_name = 'user_type'
        ) THEN
          ALTER TABLE cv_assistant_profiles
          ADD COLUMN user_type varchar(20) NOT NULL DEFAULT 'company';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_assistant_profiles_user_type
      ON cv_assistant_profiles (user_type)
    `);
    await queryRunner.query(`
      ALTER TABLE cv_assistant_profiles ALTER COLUMN company_id DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_assistant_profiles_user_type");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_profiles DROP COLUMN IF EXISTS user_type
    `);
  }
}
