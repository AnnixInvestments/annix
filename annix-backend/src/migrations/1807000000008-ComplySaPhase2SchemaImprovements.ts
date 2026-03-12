import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaPhase2SchemaImprovements1807000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_compliance_statuses_company_id
      ON comply_sa_compliance_statuses (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_documents_company_id
      ON comply_sa_documents (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_notifications_user_read
      ON comply_sa_notifications (user_id, read_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_audit_logs_company_id
      ON comply_sa_audit_logs (company_id)
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_compliance_statuses
      ALTER COLUMN next_due_date TYPE timestamp
      USING CASE WHEN next_due_date IS NOT NULL AND next_due_date != '' THEN next_due_date::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_compliance_statuses
      ALTER COLUMN last_completed_date TYPE timestamp
      USING CASE WHEN last_completed_date IS NOT NULL AND last_completed_date != '' THEN last_completed_date::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_subscriptions
      ALTER COLUMN trial_ends_at TYPE timestamp
      USING CASE WHEN trial_ends_at IS NOT NULL AND trial_ends_at != '' THEN trial_ends_at::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_subscriptions
      ALTER COLUMN current_period_start TYPE timestamp
      USING CASE WHEN current_period_start IS NOT NULL AND current_period_start != '' THEN current_period_start::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_subscriptions
      ALTER COLUMN current_period_end TYPE timestamp
      USING CASE WHEN current_period_end IS NOT NULL AND current_period_end != '' THEN current_period_end::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_subscriptions
      ALTER COLUMN cancelled_at TYPE timestamp
      USING CASE WHEN cancelled_at IS NOT NULL AND cancelled_at != '' THEN cancelled_at::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_notifications
      ALTER COLUMN read_at TYPE timestamp
      USING CASE WHEN read_at IS NOT NULL AND read_at != '' THEN read_at::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_compliance_checklist_progress
      ALTER COLUMN completed_at TYPE timestamp
      USING CASE WHEN completed_at IS NOT NULL AND completed_at != '' THEN completed_at::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_documents
      ALTER COLUMN expiry_date TYPE timestamp
      USING CASE WHEN expiry_date IS NOT NULL AND expiry_date != '' THEN expiry_date::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_api_keys
      ALTER COLUMN last_used_at TYPE timestamp
      USING CASE WHEN last_used_at IS NOT NULL AND last_used_at != '' THEN last_used_at::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_api_keys
      ALTER COLUMN expires_at TYPE timestamp
      USING CASE WHEN expires_at IS NOT NULL AND expires_at != '' THEN expires_at::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_users
      ALTER COLUMN password_reset_expires_at TYPE timestamp
      USING CASE WHEN password_reset_expires_at IS NOT NULL AND password_reset_expires_at != '' THEN password_reset_expires_at::timestamp ELSE NULL END
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_comply_sa_documents_company'
          AND table_name = 'comply_sa_documents'
        ) THEN
          ALTER TABLE comply_sa_documents
          ADD CONSTRAINT fk_comply_sa_documents_company
          FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_comply_sa_notifications_user'
          AND table_name = 'comply_sa_notifications'
        ) THEN
          ALTER TABLE comply_sa_notifications
          ADD CONSTRAINT fk_comply_sa_notifications_user
          FOREIGN KEY (user_id) REFERENCES comply_sa_users(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_comply_sa_notifications_requirement'
          AND table_name = 'comply_sa_notifications'
        ) THEN
          ALTER TABLE comply_sa_notifications
          ADD CONSTRAINT fk_comply_sa_notifications_requirement
          FOREIGN KEY (requirement_id) REFERENCES comply_sa_compliance_requirements(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_comply_sa_notifications_company'
          AND table_name = 'comply_sa_notifications'
        ) THEN
          ALTER TABLE comply_sa_notifications
          ADD CONSTRAINT fk_comply_sa_notifications_company
          FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_comply_sa_audit_logs_company'
          AND table_name = 'comply_sa_audit_logs'
        ) THEN
          ALTER TABLE comply_sa_audit_logs
          ADD CONSTRAINT fk_comply_sa_audit_logs_company
          FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE comply_sa_users DROP CONSTRAINT IF EXISTS "FK_comply_sa_users_company";
        ALTER TABLE comply_sa_users
        ADD CONSTRAINT "FK_comply_sa_users_company"
        FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE comply_sa_compliance_statuses DROP CONSTRAINT IF EXISTS "FK_comply_sa_compliance_statuses_company";
        ALTER TABLE comply_sa_compliance_statuses
        ADD CONSTRAINT "FK_comply_sa_compliance_statuses_company"
        FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE comply_sa_compliance_checklist_progress DROP CONSTRAINT IF EXISTS "FK_comply_sa_checklist_progress_company";
        ALTER TABLE comply_sa_compliance_checklist_progress
        ADD CONSTRAINT "FK_comply_sa_checklist_progress_company"
        FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE comply_sa_subscriptions DROP CONSTRAINT IF EXISTS "FK_comply_sa_subscriptions_company";
        ALTER TABLE comply_sa_subscriptions
        ADD CONSTRAINT "FK_comply_sa_subscriptions_company"
        FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_comply_sa_compliance_statuses_company_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_comply_sa_documents_company_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_comply_sa_notifications_user_read");
    await queryRunner.query("DROP INDEX IF EXISTS idx_comply_sa_audit_logs_company_id");

    await queryRunner.query(
      "ALTER TABLE comply_sa_compliance_statuses ALTER COLUMN next_due_date TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_compliance_statuses ALTER COLUMN last_completed_date TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_subscriptions ALTER COLUMN trial_ends_at TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_subscriptions ALTER COLUMN current_period_start TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_subscriptions ALTER COLUMN current_period_end TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_subscriptions ALTER COLUMN cancelled_at TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_notifications ALTER COLUMN read_at TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_compliance_checklist_progress ALTER COLUMN completed_at TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_documents ALTER COLUMN expiry_date TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_api_keys ALTER COLUMN last_used_at TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_api_keys ALTER COLUMN expires_at TYPE varchar(50)",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_users ALTER COLUMN password_reset_expires_at TYPE varchar(50)",
    );

    await queryRunner.query(
      "ALTER TABLE comply_sa_documents DROP CONSTRAINT IF EXISTS fk_comply_sa_documents_company",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_notifications DROP CONSTRAINT IF EXISTS fk_comply_sa_notifications_user",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_notifications DROP CONSTRAINT IF EXISTS fk_comply_sa_notifications_requirement",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_notifications DROP CONSTRAINT IF EXISTS fk_comply_sa_notifications_company",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_audit_logs DROP CONSTRAINT IF EXISTS fk_comply_sa_audit_logs_company",
    );
  }
}
