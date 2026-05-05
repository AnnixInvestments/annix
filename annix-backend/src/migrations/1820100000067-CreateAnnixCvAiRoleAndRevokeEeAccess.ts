import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnnixCvAiRoleAndRevokeEeAccess1820100000067 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'annix_cv_ai') THEN
          CREATE ROLE annix_cv_ai NOLOGIN;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      GRANT USAGE ON SCHEMA public TO annix_cv_ai
    `);
    await queryRunner.query(`
      GRANT SELECT ON
        cv_assistant_candidates,
        cv_assistant_job_postings,
        cv_assistant_companies
      TO annix_cv_ai
    `);

    await queryRunner.query(`
      REVOKE ALL ON cv_assistant_candidate_ee_attributes FROM annix_cv_ai
    `);
    await queryRunner.query(`
      REVOKE ALL ON cv_assistant_ee_consent_text_versions FROM annix_cv_ai
    `);
    await queryRunner.query(`
      REVOKE ALL ON cv_assistant_ee_disclosure_invites FROM annix_cv_ai
    `);
    await queryRunner.query(`
      REVOKE ALL ON cv_assistant_ee_sectoral_targets FROM annix_cv_ai
    `);

    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL ON TABLES FROM annix_cv_ai
    `);
    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT ON TABLES TO annix_cv_ai
    `);
    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE annix_cv_ai IN SCHEMA public
        REVOKE ALL ON TABLES FROM annix_cv_ai
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE SELECT ON TABLES FROM annix_cv_ai
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'annix_cv_ai') THEN
          REVOKE ALL ON ALL TABLES IN SCHEMA public FROM annix_cv_ai;
          REVOKE USAGE ON SCHEMA public FROM annix_cv_ai;
          DROP ROLE annix_cv_ai;
        END IF;
      END
      $$
    `);
  }
}
