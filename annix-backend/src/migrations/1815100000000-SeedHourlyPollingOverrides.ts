import type { MigrationInterface, QueryRunner } from "typeorm";

const HOURLY_POLLING_JOBS = [
  "fieldflow:sync-meetings",
  "fieldflow:download-recordings",
  "fieldflow:crm-sync",
  "fieldflow:calendar-sync",
  "cv-assistant:poll-emails",
  "inbound-email:poll-all",
  "au-rubber:poll-emails",
];

export class SeedHourlyPollingOverrides1815100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const jobName of HOURLY_POLLING_JOBS) {
      await queryRunner.query(
        `
        INSERT INTO scheduled_job_overrides ("jobName", "active", "cronExpression")
        VALUES ($1, TRUE, $2)
        ON CONFLICT ("jobName") DO UPDATE
        SET "cronExpression" = EXCLUDED."cronExpression"
        `,
        [jobName, "0 * * * *"],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const jobName of HOURLY_POLLING_JOBS) {
      await queryRunner.query(
        `DELETE FROM scheduled_job_overrides WHERE "jobName" = $1 AND "cronExpression" = $2`,
        [jobName, "0 * * * *"],
      );
    }
  }
}
