import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnnixCvAiRoleAndRevokeEeAccess1820100000067 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        role_created BOOLEAN := FALSE;
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'annix_cv_ai') THEN
          BEGIN
            CREATE ROLE annix_cv_ai NOLOGIN;
            role_created := TRUE;
          EXCEPTION WHEN insufficient_privilege THEN
            RAISE WARNING 'Skipping annix_cv_ai role: CREATE ROLE not permitted on this Postgres instance. EE firewall layers 1 (DI) and 2 (ESLint) remain enforced; layer 3 (DB role) is dormant until the database admin provisions the role manually (see issue #240 Phase B).';
            RETURN;
          END;
        ELSE
          role_created := TRUE;
        END IF;

        IF role_created THEN
          BEGIN
            EXECUTE 'GRANT USAGE ON SCHEMA public TO annix_cv_ai';
            EXECUTE 'GRANT SELECT ON cv_assistant_candidates, cv_assistant_job_postings, cv_assistant_companies TO annix_cv_ai';
            EXECUTE 'REVOKE ALL ON cv_assistant_candidate_ee_attributes FROM annix_cv_ai';
            EXECUTE 'REVOKE ALL ON cv_assistant_ee_consent_text_versions FROM annix_cv_ai';
            EXECUTE 'REVOKE ALL ON cv_assistant_ee_disclosure_invites FROM annix_cv_ai';
            EXECUTE 'REVOKE ALL ON cv_assistant_ee_sectoral_targets FROM annix_cv_ai';
          EXCEPTION WHEN insufficient_privilege THEN
            RAISE WARNING 'Skipping annix_cv_ai grants/revokes: insufficient privilege on managed Postgres. Configure manually as DB admin per issue #240 Phase B follow-up.';
          END;

          BEGIN
            EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM annix_cv_ai';
            EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO annix_cv_ai';
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE annix_cv_ai IN SCHEMA public REVOKE ALL ON TABLES FROM annix_cv_ai';
          EXCEPTION WHEN insufficient_privilege THEN
            RAISE WARNING 'Skipping annix_cv_ai default privileges: insufficient privilege on managed Postgres.';
          END;
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'annix_cv_ai') THEN
          BEGIN
            EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM annix_cv_ai';
          EXCEPTION WHEN insufficient_privilege THEN
            RAISE WARNING 'Skipping annix_cv_ai default privilege revoke: insufficient privilege.';
          END;

          BEGIN
            EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM annix_cv_ai';
            EXECUTE 'REVOKE USAGE ON SCHEMA public FROM annix_cv_ai';
            EXECUTE 'DROP ROLE annix_cv_ai';
          EXCEPTION WHEN insufficient_privilege THEN
            RAISE WARNING 'Skipping annix_cv_ai drop: insufficient privilege.';
          END;
        END IF;
      END
      $$
    `);
  }
}
