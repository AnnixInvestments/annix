import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddNightSuspensionAndHolidayPause1817100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE scheduled_job_overrides
      ADD COLUMN IF NOT EXISTS "nightSuspensionHours" smallint
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scheduled_jobs_global_settings (
        "settingsKey" varchar(50) NOT NULL DEFAULT 'default',
        "suspendOnSundaysAndHolidays" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_scheduled_jobs_global_settings" PRIMARY KEY ("settingsKey")
      )
    `);

    await queryRunner.query(`
      INSERT INTO scheduled_jobs_global_settings ("settingsKey", "suspendOnSundaysAndHolidays")
      VALUES ('default', true)
      ON CONFLICT ("settingsKey") DO UPDATE SET "suspendOnSundaysAndHolidays" = true
    `);

    const emailPollingJobs = [
      "inbound-email:poll-all",
      "au-rubber:poll-emails",
      "cv-assistant:poll-emails",
    ];

    for (const jobName of emailPollingJobs) {
      await queryRunner.query(`
        INSERT INTO scheduled_job_overrides ("jobName", "active", "cronExpression", "nightSuspensionHours")
        VALUES ('${jobName}', true, '0 6-18 * * *', 12)
        ON CONFLICT ("jobName") DO UPDATE
        SET "cronExpression" = '0 6-18 * * *', "nightSuspensionHours" = 12
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emailPollingJobs = [
      "inbound-email:poll-all",
      "au-rubber:poll-emails",
      "cv-assistant:poll-emails",
    ];

    for (const jobName of emailPollingJobs) {
      await queryRunner.query(`
        UPDATE scheduled_job_overrides
        SET "cronExpression" = '0 */2 * * *', "nightSuspensionHours" = NULL
        WHERE "jobName" = '${jobName}'
      `);
    }

    await queryRunner.query("DROP TABLE IF EXISTS scheduled_jobs_global_settings");

    await queryRunner.query(`
      ALTER TABLE scheduled_job_overrides DROP COLUMN IF EXISTS "nightSuspensionHours"
    `);
  }
}
