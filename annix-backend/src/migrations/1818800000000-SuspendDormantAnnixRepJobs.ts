import { type MigrationInterface, type QueryRunner } from "typeorm";

export class SuspendDormantAnnixRepJobs1818800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dormantJobs = [
      "fieldflow:sync-meetings",
      "fieldflow:download-recordings",
      "fieldflow:refresh-tokens",
      "fieldflow:weekly-full-sync",
      "fieldflow:cleanup-old-records",
      "fieldflow:daily-reminders",
      "fieldflow:crm-sync",
      "fieldflow:calendar-sync",
    ];

    for (const jobName of dormantJobs) {
      await queryRunner.query(`
        INSERT INTO scheduled_job_overrides ("jobName", "active", "cronExpression", "nightSuspensionHours")
        VALUES ('${jobName}', false, NULL, NULL)
        ON CONFLICT ("jobName") DO UPDATE
        SET "active" = false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dormantJobs = [
      "fieldflow:sync-meetings",
      "fieldflow:download-recordings",
      "fieldflow:refresh-tokens",
      "fieldflow:weekly-full-sync",
      "fieldflow:cleanup-old-records",
      "fieldflow:daily-reminders",
      "fieldflow:crm-sync",
      "fieldflow:calendar-sync",
    ];

    for (const jobName of dormantJobs) {
      await queryRunner.query(`
        UPDATE scheduled_job_overrides
        SET "active" = true
        WHERE "jobName" = '${jobName}'
      `);
    }
  }
}
