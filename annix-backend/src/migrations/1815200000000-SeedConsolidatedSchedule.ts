import type { MigrationInterface, QueryRunner } from "typeorm";

const SCHEDULE_OVERRIDES: Array<{ jobName: string; cronExpression: string }> = [
  { jobName: "comply-sa:regulatory-sync", cronExpression: "0 8 * * *" },
  { jobName: "comply-sa:deadline-notifications", cronExpression: "0 8 * * *" },
  { jobName: "comply-sa:document-expiry", cronExpression: "0 8 * * *" },
  { jobName: "stock-control:calibration-expiry", cronExpression: "0 8 * * *" },
  { jobName: "stock-control:uninvoiced-arrivals", cronExpression: "0 8 * * *" },
  { jobName: "customers:bee-expiry-check", cronExpression: "0 8 * * *" },
  { jobName: "fieldflow:daily-reminders", cronExpression: "0 8 * * *" },
  { jobName: "cv-assistant:job-alerts", cronExpression: "0 8 * * *" },
  { jobName: "cv-assistant:purge-inactive", cronExpression: "0 2 * * *" },
  { jobName: "secure-docs:cleanup-deleted", cronExpression: "0 2 * * *" },
  { jobName: "fieldflow:weekly-full-sync", cronExpression: "0 2 * * *" },
  { jobName: "fieldflow:cleanup-old-records", cronExpression: "0 2 * * *" },
  { jobName: "fieldflow:sync-meetings", cronExpression: "0 */2 * * *" },
  { jobName: "fieldflow:download-recordings", cronExpression: "0 */2 * * *" },
  { jobName: "fieldflow:crm-sync", cronExpression: "0 */2 * * *" },
  { jobName: "fieldflow:calendar-sync", cronExpression: "0 */2 * * *" },
  { jobName: "cv-assistant:poll-emails", cronExpression: "0 */2 * * *" },
  { jobName: "cv-assistant:poll-job-sources", cronExpression: "0 */2 * * *" },
  { jobName: "inbound-email:poll-all", cronExpression: "0 */2 * * *" },
  { jobName: "au-rubber:poll-emails", cronExpression: "0 */2 * * *" },
];

export class SeedConsolidatedSchedule1815200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { jobName, cronExpression } of SCHEDULE_OVERRIDES) {
      await queryRunner.query(
        `
        INSERT INTO scheduled_job_overrides ("jobName", "active", "cronExpression")
        VALUES ($1, TRUE, $2)
        ON CONFLICT ("jobName") DO UPDATE
        SET "cronExpression" = EXCLUDED."cronExpression"
        `,
        [jobName, cronExpression],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { jobName, cronExpression } of SCHEDULE_OVERRIDES) {
      await queryRunner.query(
        `DELETE FROM scheduled_job_overrides WHERE "jobName" = $1 AND "cronExpression" = $2`,
        [jobName, cronExpression],
      );
    }
  }
}
