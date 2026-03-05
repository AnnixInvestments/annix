import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAiUsageLogsTable1800200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id SERIAL PRIMARY KEY,
        app VARCHAR(50) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        provider VARCHAR(20) NOT NULL,
        model VARCHAR(100),
        tokens_used INTEGER,
        page_count INTEGER,
        processing_time_ms INTEGER,
        context_info JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_app ON ai_usage_logs (app)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs (created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON ai_usage_logs (provider)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_usage_logs_provider`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_usage_logs_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_usage_logs_app`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_usage_logs`);
  }
}
