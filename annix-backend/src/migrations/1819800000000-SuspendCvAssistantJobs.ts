import { type MigrationInterface, type QueryRunner } from "typeorm";

export class SuspendCvAssistantJobs1819800000000 implements MigrationInterface {
  private readonly jobs = [
    "cv-assistant:poll-job-sources",
    "cv-assistant:weekly-digests",
    "cv-assistant:job-alerts",
    "cv-assistant:purge-inactive",
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const jobName of this.jobs) {
      await queryRunner.query(
        `INSERT INTO scheduled_job_overrides ("jobName", "active", "cronExpression", "nightSuspensionHours")
         VALUES ($1, false, NULL, NULL)
         ON CONFLICT ("jobName") DO UPDATE SET "active" = false`,
        [jobName],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const jobName of this.jobs) {
      await queryRunner.query(
        `UPDATE scheduled_job_overrides SET "active" = true WHERE "jobName" = $1`,
        [jobName],
      );
    }
  }
}
