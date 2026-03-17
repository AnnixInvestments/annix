import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateScheduledJobOverrides1807000000047 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scheduled_job_overrides (
        "jobName" VARCHAR(100) PRIMARY KEY,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "cronExpression" VARCHAR(50)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS scheduled_job_overrides");
  }
}
