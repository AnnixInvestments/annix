import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSAMarketFieldsToCandidates1803500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cv_assistant_candidates
      ADD COLUMN IF NOT EXISTS bee_level integer,
      ADD COLUMN IF NOT EXISTS popia_consent boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS popia_consented_at timestamptz,
      ADD COLUMN IF NOT EXISTS last_active_at timestamptz
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_candidates_last_active
      ON cv_assistant_candidates (last_active_at)
      WHERE last_active_at IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_candidates_popia_consent
      ON cv_assistant_candidates (popia_consent)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_candidates_popia_consent");
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_candidates_last_active");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_candidates
      DROP COLUMN IF EXISTS bee_level,
      DROP COLUMN IF EXISTS popia_consent,
      DROP COLUMN IF EXISTS popia_consented_at,
      DROP COLUMN IF EXISTS last_active_at
    `);
  }
}
