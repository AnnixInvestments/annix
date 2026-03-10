import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQcControlPlansTable1804700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_control_plans (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        plan_type varchar(30) NOT NULL,
        qcp_number varchar(100),
        document_ref varchar(50),
        revision varchar(20),
        customer_name varchar(255),
        order_number varchar(255),
        job_name varchar(255),
        specification varchar(500),
        item_description varchar(500),
        activities jsonb NOT NULL,
        approval_signatures jsonb NOT NULL,
        created_by_name varchar(255) NOT NULL,
        created_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_control_plans_company
        ON qc_control_plans (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_control_plans_job_card
        ON qc_control_plans (job_card_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_control_plans_type
        ON qc_control_plans (job_card_id, plan_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS qc_control_plans");
  }
}
