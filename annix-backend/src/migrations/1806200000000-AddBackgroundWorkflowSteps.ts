import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBackgroundWorkflowSteps1806200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS is_background boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS trigger_after_step varchar(50) DEFAULT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_card_background_completions (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL,
        job_card_id integer NOT NULL,
        step_key varchar(50) NOT NULL,
        completed_by_id integer,
        completed_by_name varchar(255),
        completed_at TIMESTAMP NOT NULL DEFAULT now(),
        notes text,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_bg_completion_company FOREIGN KEY (company_id) REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_bg_completion_job_card FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
        CONSTRAINT fk_bg_completion_user FOREIGN KEY (completed_by_id) REFERENCES stock_control_users(id) ON DELETE SET NULL,
        CONSTRAINT uq_bg_completion_job_step UNIQUE (job_card_id, step_key)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bg_completion_company_step
      ON job_card_background_completions (company_id, step_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS job_card_background_completions");
    await queryRunner.query(
      "ALTER TABLE workflow_step_configs DROP COLUMN IF EXISTS trigger_after_step",
    );
    await queryRunner.query(
      "ALTER TABLE workflow_step_configs DROP COLUMN IF EXISTS is_background",
    );
  }
}
