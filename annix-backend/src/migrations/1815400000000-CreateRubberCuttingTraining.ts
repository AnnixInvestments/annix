import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberCuttingTraining1815400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_cutting_training (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES stock_control_companies(id),
        job_card_id INT NOT NULL,
        panel_fingerprint VARCHAR(64) NOT NULL,
        panel_count INT NOT NULL,
        panel_summary JSONB NOT NULL DEFAULT '[]',
        auto_plan_snapshot JSONB NOT NULL DEFAULT '{}',
        manual_plan JSONB NOT NULL DEFAULT '{}',
        auto_waste_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
        manual_waste_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
        roll_width_mm INT NOT NULL DEFAULT 1200,
        roll_length_mm INT NOT NULL DEFAULT 12500,
        usage_count INT NOT NULL DEFAULT 1,
        reviewed_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_cutting_training_fingerprint
      ON rubber_cutting_training (company_id, panel_fingerprint)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_cutting_training_job_card
      ON rubber_cutting_training (company_id, job_card_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS rubber_cutting_training");
  }
}
