import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJobCardWorkflowTables1799000000000 implements MigrationInterface {
  name = "CreateJobCardWorkflowTables1799000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_cards
        ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'draft'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_cards_workflow_status
        ON job_cards(workflow_status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_card_documents (
        id SERIAL PRIMARY KEY,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        original_filename VARCHAR(255),
        mime_type VARCHAR(100),
        file_size_bytes INTEGER,
        uploaded_by_id INTEGER REFERENCES stock_control_users(id) ON DELETE SET NULL,
        uploaded_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_card_documents_job_card_id
        ON job_card_documents(job_card_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_card_approvals (
        id SERIAL PRIMARY KEY,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        step VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        approved_by_id INTEGER REFERENCES stock_control_users(id) ON DELETE SET NULL,
        approved_by_name VARCHAR(255),
        signature_url TEXT,
        comments TEXT,
        rejected_reason TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_card_approvals_job_card_id
        ON job_card_approvals(job_card_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_card_approvals_step_status
        ON job_card_approvals(step, status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_notifications (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES stock_control_users(id) ON DELETE CASCADE,
        job_card_id INTEGER REFERENCES job_cards(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        action_type VARCHAR(50) NOT NULL,
        action_url TEXT,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_notifications_user_id
        ON workflow_notifications(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_notifications_user_unread
        ON workflow_notifications(user_id, read_at)
        WHERE read_at IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dispatch_scans (
        id SERIAL PRIMARY KEY,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
        allocation_id INTEGER REFERENCES stock_allocations(id) ON DELETE SET NULL,
        quantity_dispatched INTEGER NOT NULL,
        scanned_by_id INTEGER REFERENCES stock_control_users(id) ON DELETE SET NULL,
        scanned_by_name VARCHAR(255),
        dispatch_notes TEXT,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dispatch_scans_job_card_id
        ON dispatch_scans(job_card_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dispatch_scans_stock_item_id
        ON dispatch_scans(stock_item_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS staff_signatures (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES stock_control_users(id) ON DELETE CASCADE,
        signature_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS staff_signatures");
    await queryRunner.query("DROP INDEX IF EXISTS idx_dispatch_scans_stock_item_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_dispatch_scans_job_card_id");
    await queryRunner.query("DROP TABLE IF EXISTS dispatch_scans");
    await queryRunner.query("DROP INDEX IF EXISTS idx_workflow_notifications_user_unread");
    await queryRunner.query("DROP INDEX IF EXISTS idx_workflow_notifications_user_id");
    await queryRunner.query("DROP TABLE IF EXISTS workflow_notifications");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_card_approvals_step_status");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_card_approvals_job_card_id");
    await queryRunner.query("DROP TABLE IF EXISTS job_card_approvals");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_card_documents_job_card_id");
    await queryRunner.query("DROP TABLE IF EXISTS job_card_documents");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_cards_workflow_status");
    await queryRunner.query("ALTER TABLE job_cards DROP COLUMN IF EXISTS workflow_status");
  }
}
