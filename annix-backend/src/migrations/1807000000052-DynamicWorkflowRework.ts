import { MigrationInterface, QueryRunner } from "typeorm";

export class DynamicWorkflowRework1807000000052 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS action_label varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE job_cards
      ALTER COLUMN workflow_status TYPE varchar(50) USING workflow_status::text
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS job_card_workflow_status_enum
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_card_action_completions (
        id serial PRIMARY KEY,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        company_id integer NOT NULL,
        step_key varchar(50) NOT NULL,
        action_type varchar(20) NOT NULL DEFAULT 'primary',
        completed_by_id integer NOT NULL,
        completed_by_name varchar(255) NOT NULL,
        completed_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(job_card_id, step_key, action_type)
      )
    `);

    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'draft' WHERE workflow_status = 'draft'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'document_upload' WHERE workflow_status = 'document_uploaded'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'admin_approval' WHERE workflow_status = 'admin_approved'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'manager_approval' WHERE workflow_status = 'manager_approved'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'requisition' WHERE workflow_status = 'requisition_sent'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'stock_allocation' WHERE workflow_status = 'stock_allocated'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'manager_approval' WHERE workflow_status = 'manager_final'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'ready' WHERE workflow_status = 'ready_for_dispatch'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'dispatched' WHERE workflow_status = 'dispatched'
    `);

    await queryRunner.query(`
      UPDATE workflow_step_configs SET action_label = 'Accept JC' WHERE key = 'admin_approval' AND action_label IS NULL
    `);
    await queryRunner.query(`
      UPDATE workflow_step_configs SET action_label = 'Release to Factory' WHERE key = 'manager_approval' AND action_label IS NULL
    `);
    await queryRunner.query(`
      UPDATE workflow_step_configs SET action_label = 'Dispatched' WHERE key = 'dispatched' AND action_label IS NULL
    `);
    await queryRunner.query(`
      UPDATE workflow_step_configs SET action_label = 'Accept Draft' WHERE key = 'document_upload' AND action_label IS NULL
    `);
    await queryRunner.query(`
      UPDATE workflow_step_configs SET action_label = 'Complete Stock Alloc' WHERE key = 'stock_allocation' AND action_label IS NULL
    `);
    await queryRunner.query(`
      UPDATE workflow_step_configs SET action_label = 'Req Sent' WHERE key = 'requisition_sent' AND action_label IS NULL
    `);
    await queryRunner.query(`
      UPDATE workflow_step_configs SET action_label = 'Ready' WHERE key = 'ready_for_dispatch' AND action_label IS NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_action_type') THEN
          ALTER TYPE notification_action_type ADD VALUE IF NOT EXISTS 'document_arrived';
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'document_uploaded' WHERE workflow_status = 'document_upload'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'admin_approved' WHERE workflow_status = 'admin_approval'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'manager_approved' WHERE workflow_status = 'manager_approval'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'requisition_sent' WHERE workflow_status = 'requisition'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'stock_allocated' WHERE workflow_status = 'stock_allocation'
    `);
    await queryRunner.query(`
      UPDATE job_cards SET workflow_status = 'ready_for_dispatch' WHERE workflow_status = 'ready'
    `);

    await queryRunner.query("DROP TABLE IF EXISTS job_card_action_completions");
    await queryRunner.query("ALTER TABLE workflow_step_configs DROP COLUMN IF EXISTS action_label");
  }
}
