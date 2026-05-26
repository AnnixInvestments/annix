import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Un-suspends the Annix Orbit job-market ingestion cron (paused by
 * 1819800000000-SuspendCvAssistantJobs) and aligns every source to a
 * quota-safe poll cadence so they populate together (#268 follow-up).
 *
 * - cron annix-orbit:poll-job-sources becomes active, polling every 2 hours
 * - crawl sources (no API quota) poll every 2 hours
 * - Adzuna (25 req/day) and Remotive poll every 6 hours
 * - DPSA (10 req/day, weekly circular) polls weekly (168 hours)
 *
 * Takes effect on the next app restart/deploy, when the scheduled-jobs
 * service re-reads overrides and starts the active cron.
 */
export class EnableOrbitJobMarketIngestion1820100003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO scheduled_job_overrides ("jobName", "active", "cronExpression", "nightSuspensionHours")
       VALUES ('annix-orbit:poll-job-sources', true, '0 */2 * * *', NULL)
       ON CONFLICT ("jobName") DO UPDATE SET "active" = true, "cronExpression" = '0 */2 * * *'`,
    );

    await queryRunner.query(
      `UPDATE cv_assistant_job_market_sources
       SET ingestion_interval_hours = CASE provider
         WHEN 'adzuna' THEN 6
         WHEN 'remotive' THEN 6
         WHEN 'dpsa' THEN 168
         ELSE 2
       END
       WHERE provider IN ('executiveplacements', 'jobplacements', 'jobmail', 'careerjunction', 'adzuna', 'remotive', 'dpsa')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE scheduled_job_overrides
       SET "active" = false, "cronExpression" = NULL
       WHERE "jobName" = 'annix-orbit:poll-job-sources'`,
    );

    await queryRunner.query(
      `UPDATE cv_assistant_job_market_sources
       SET ingestion_interval_hours = 6
       WHERE provider IN ('executiveplacements', 'jobplacements', 'jobmail', 'careerjunction', 'adzuna', 'remotive', 'dpsa')`,
    );
  }
}
