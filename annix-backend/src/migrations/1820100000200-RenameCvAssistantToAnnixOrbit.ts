import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 3 of the "CV Assistant → Annix Orbit" rename.
 *
 * Phase 1 + 2 renamed display strings, code identifiers, directories,
 * URL paths, and API route prefixes. After those landed, the runtime
 * code looks up app + schedule + feature-flag rows by NEW keys
 * (annix-orbit / ANNIX_ORBIT_*), but the seeded DB rows still had the
 * OLD keys (cv-assistant / CV_ASSISTANT_*) — which broke auth, scheduling,
 * and feature flags.
 *
 * This migration brings the DB in line with the renamed code:
 *   - apps.code: 'cv-assistant' → 'annix-orbit' (used by the auth lookup
 *     in annix-orbit-auth.guard.ts and auth.service.ts)
 *   - scheduled_job_overrides.jobName: 'cv-assistant:*' → 'annix-orbit:*'
 *     (matches the @Cron(name: 'annix-orbit:...') declarations)
 *   - inbound_email_configs.app: 'cv-assistant' → 'annix-orbit'
 *   - company_module_subscriptions.module_code: 'cv-assistant' → 'annix-orbit'
 *   - feature_flags.flag_key: CV_ASSISTANT_* → ANNIX_ORBIT_* (matches the
 *     renamed FEATURE_FLAGS constants)
 *
 * The down() reverses each update so an emergency rollback still leaves
 * the DB internally consistent if it's paired with a checkout of the
 * pre-rename code.
 */
export class RenameCvAssistantToAnnixOrbit1820100000200 implements MigrationInterface {
  name = "RenameCvAssistantToAnnixOrbit1820100000200";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "apps"
      SET "code" = 'annix-orbit',
          "name" = 'Annix Orbit',
          "description" = 'AI-powered hiring, talent, and compliance platform'
      WHERE "code" = 'cv-assistant'
    `);

    await queryRunner.query(`
      UPDATE "scheduled_job_overrides"
      SET "jobName" = 'annix-orbit:' || substring("jobName" from 14)
      WHERE "jobName" LIKE 'cv-assistant:%'
    `);

    await queryRunner.query(`
      UPDATE "inbound_email_configs"
      SET "app" = 'annix-orbit'
      WHERE "app" = 'cv-assistant'
    `);

    await queryRunner.query(`
      UPDATE "company_module_subscriptions"
      SET "module_code" = 'annix-orbit'
      WHERE "module_code" = 'cv-assistant'
    `);

    await queryRunner.query(`
      UPDATE "feature_flags"
      SET "flag_key" = 'ANNIX_ORBIT_EE_COMPLIANCE_ENABLED'
      WHERE "flag_key" = 'CV_ASSISTANT_EE_COMPLIANCE_ENABLED'
    `);

    await queryRunner.query(`
      UPDATE "feature_flags"
      SET "flag_key" = 'ANNIX_ORBIT_NIX_CV_BUILDER'
      WHERE "flag_key" = 'CV_ASSISTANT_NIX_CV_BUILDER'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "feature_flags"
      SET "flag_key" = 'CV_ASSISTANT_NIX_CV_BUILDER'
      WHERE "flag_key" = 'ANNIX_ORBIT_NIX_CV_BUILDER'
    `);

    await queryRunner.query(`
      UPDATE "feature_flags"
      SET "flag_key" = 'CV_ASSISTANT_EE_COMPLIANCE_ENABLED'
      WHERE "flag_key" = 'ANNIX_ORBIT_EE_COMPLIANCE_ENABLED'
    `);

    await queryRunner.query(`
      UPDATE "company_module_subscriptions"
      SET "module_code" = 'cv-assistant'
      WHERE "module_code" = 'annix-orbit'
    `);

    await queryRunner.query(`
      UPDATE "inbound_email_configs"
      SET "app" = 'cv-assistant'
      WHERE "app" = 'annix-orbit'
    `);

    await queryRunner.query(`
      UPDATE "scheduled_job_overrides"
      SET "jobName" = 'cv-assistant:' || substring("jobName" from 13)
      WHERE "jobName" LIKE 'annix-orbit:%'
    `);

    await queryRunner.query(`
      UPDATE "apps"
      SET "code" = 'cv-assistant',
          "name" = 'CV Assistant',
          "description" = 'Candidate recruitment and reference checking'
      WHERE "code" = 'annix-orbit'
    `);
  }
}
