import { type MigrationInterface, type QueryRunner } from "typeorm";

export class CreatePollingJobOverrides1820000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS polling_job_overrides (
        "jobName" varchar(100) PRIMARY KEY,
        "active" boolean NOT NULL DEFAULT true,
        "intervalMs" integer,
        "nightSuspensionHours" smallint
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS polling_jobs_global_settings (
        "settingsKey" varchar(50) PRIMARY KEY DEFAULT 'default',
        "suspendOnWeekendsAndHolidays" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      INSERT INTO polling_jobs_global_settings ("settingsKey", "suspendOnWeekendsAndHolidays")
      VALUES ('default', true)
      ON CONFLICT ("settingsKey") DO NOTHING
    `);

    const pollingJobs = [
      "dashboard:workflow-lane-counts",
      "dashboard:stats",
      "dashboard:soh-by-location",
      "dashboard:soh-summary",
      "dashboard:recent-activity",
      "dashboard:reorder-alerts",
      "dashboard:pending-approvals",
      "dashboard:cpo-summary",
      "dashboard:role-summary",
      "admin:scheduled-jobs-list",
      "admin:scheduled-jobs-sync-status",
      "admin:scheduled-jobs-global-settings",
      "annix-rep:crm",
    ];

    for (const jobName of pollingJobs) {
      await queryRunner.query(
        `INSERT INTO polling_job_overrides ("jobName", "active", "intervalMs", "nightSuspensionHours")
         VALUES ($1, true, NULL, 12)
         ON CONFLICT ("jobName") DO NOTHING`,
        [jobName],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS polling_job_overrides");
    await queryRunner.query("DROP TABLE IF EXISTS polling_jobs_global_settings");
  }
}
