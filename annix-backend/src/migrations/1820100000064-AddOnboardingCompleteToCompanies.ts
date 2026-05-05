import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnboardingCompleteToCompanies1820100000064 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'onboarding_complete'
        ) THEN
          ALTER TABLE companies
            ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
          UPDATE companies SET onboarding_complete = TRUE WHERE id IS NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE companies DROP COLUMN IF EXISTS onboarding_complete");
  }
}
