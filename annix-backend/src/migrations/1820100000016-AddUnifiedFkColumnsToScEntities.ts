import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Sub-phase 1 of issue #208: Add parallel unified FK columns to all Stock Control
 * entity tables. Each table that references stock_control_companies gets a nullable
 * unified_company_id column pointing to the unified companies table. Each table that
 * references stock_control_users gets a nullable unified_*_user column pointing to
 * the unified user table. All columns are backfilled from the legacy mapping columns
 * (companies.legacy_sc_company_id and stock_control_profiles.legacy_sc_user_id).
 */
export class AddUnifiedFkColumnsToScEntities1820100000016 implements MigrationInterface {
  private readonly companyTables = [
    "stock_control_users",
    "stock_control_staff_members",
    "stock_control_departments",
    "stock_control_locations",
    "stock_control_invitations",
    "stock_control_admin_transfers",
    "stock_control_company_roles",
    "stock_control_rbac_config",
    "stock_control_supplier",
    "job_cards",
    "job_card_line_items",
    "job_card_versions",
    "job_card_approvals",
    "job_card_attachments",
    "job_card_coating_analyses",
    "job_card_data_books",
    "job_card_documents",
    "job_card_extraction_corrections",
    "job_card_import_mappings",
    "job_card_job_files",
    "job_card_background_completions",
    "job_card_action_completions",
    "stock_items",
    "stock_allocations",
    "stock_movements",
    "stock_returns",
    "stock_price_history",
    "delivery_notes",
    "delivery_note_items",
    "requisitions",
    "requisition_items",
    "customer_purchase_orders",
    "customer_purchase_order_items",
    "cpo_calloff_records",
    "push_subscriptions",
    "dashboard_preferences",
    "calibration_certificates",
    "dispatch_cdns",
    "dispatch_load_photos",
    "dispatch_scans",
    "dn_extraction_corrections",
    "inspection_bookings",
    "invoice_clarifications",
    "invoice_extraction_corrections",
    "issuance_batch_records",
    "issuance_sessions",
    "positector_devices",
    "positector_uploads",
    "qa_review_decisions",
    "qc_batch_assignments",
    "qc_blast_profiles",
    "qc_control_plans",
    "qc_defelsko_batches",
    "qc_dft_readings",
    "qc_dust_debris_tests",
    "qc_environmental_batch_links",
    "qc_environmental_records",
    "qc_items_releases",
    "qc_pull_tests",
    "qc_release_certificates",
    "qc_shore_hardness",
    "qcp_approval_tokens",
    "qcp_customer_preferences",
    "reconciliation_documents",
    "reconciliation_items",
    "rubber_cutting_training",
    "rubber_dimension_overrides",
    "sc_glossary_terms",
    "staff_leave_records",
    "staff_signatures",
    "supplier_certificates",
    "supplier_invoices",
    "supplier_invoice_items",
    "supplier_documents",
    "user_location_assignments",
    "workflow_notification_recipients",
    "workflow_notifications",
    "workflow_step_assignments",
    "workflow_step_configs",
    "stock_control_chat_conversations",
    "stock_control_chat_messages",
    "stock_control_chat_conversation_participants",
    "stock_issuances",
  ];

  private readonly userFkColumns: Array<{ table: string; columns: string[] }> = [
    { table: "stock_control_chat_conversations", columns: ["created_by_id"] },
    { table: "stock_control_chat_conversation_participants", columns: ["user_id"] },
    { table: "stock_control_chat_messages", columns: ["sender_id"] },
    { table: "dashboard_preferences", columns: ["user_id"] },
    { table: "dispatch_cdns", columns: ["uploaded_by_id"] },
    { table: "dispatch_load_photos", columns: ["uploaded_by_id"] },
    { table: "dispatch_scans", columns: ["scanned_by_id"] },
    { table: "dn_extraction_corrections", columns: ["corrected_by"] },
    { table: "inspection_bookings", columns: ["booked_by_id", "completed_by_id"] },
    { table: "invoice_clarifications", columns: ["answered_by"] },
    { table: "invoice_extraction_corrections", columns: ["corrected_by"] },
    { table: "issuance_sessions", columns: ["issued_by_user_id"] },
    { table: "job_card_action_completions", columns: ["completed_by_id"] },
    { table: "job_card_approvals", columns: ["approved_by_id"] },
    { table: "job_card_background_completions", columns: ["completed_by_id"] },
    { table: "job_card_documents", columns: ["uploaded_by_id"] },
    { table: "job_card_extraction_corrections", columns: ["corrected_by"] },
    { table: "job_card_job_files", columns: ["uploaded_by_id"] },
    { table: "push_subscriptions", columns: ["user_id"] },
    { table: "staff_leave_records", columns: ["user_id"] },
    { table: "staff_signatures", columns: ["user_id"] },
    { table: "stock_control_admin_transfers", columns: ["initiated_by_id"] },
    { table: "stock_control_invitations", columns: ["invited_by_id"] },
    { table: "stock_issuances", columns: ["issued_by_user_id"] },
    { table: "stock_price_history", columns: ["changed_by"] },
    { table: "supplier_invoices", columns: ["approved_by"] },
    { table: "user_location_assignments", columns: ["user_id"] },
    { table: "workflow_notifications", columns: ["user_id", "sender_id"] },
    { table: "workflow_step_assignments", columns: ["user_id", "secondary_user_id"] },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Step 1: Add unified_company_id columns ───
    for (const table of this.companyTables) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS unified_company_id INT;
        END $$
      `);
    }

    // ─── Step 2: Add unified user FK columns ───
    for (const { table, columns } of this.userFkColumns) {
      for (const col of columns) {
        const unifiedCol = `unified_${col}`;
        await queryRunner.query(`
          DO $$ BEGIN
            ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${unifiedCol}" INT;
          END $$
        `);
      }
    }

    // ─── Step 3: Backfill unified_company_id from companies.legacy_sc_company_id ───
    for (const table of this.companyTables) {
      await queryRunner.query(`
        UPDATE "${table}" t
        SET unified_company_id = c.id
        FROM companies c
        WHERE c.legacy_sc_company_id = t.company_id
          AND t.unified_company_id IS NULL
      `);
    }

    // ─── Step 4: Backfill unified user FK columns from stock_control_profiles.legacy_sc_user_id ───
    for (const { table, columns } of this.userFkColumns) {
      for (const col of columns) {
        const unifiedCol = `unified_${col}`;
        await queryRunner.query(`
          UPDATE "${table}" t
          SET "${unifiedCol}" = scp.user_id
          FROM stock_control_profiles scp
          WHERE scp.legacy_sc_user_id = t."${col}"
            AND t."${unifiedCol}" IS NULL
        `);
      }
    }

    // ─── Step 5: Add FK constraints for unified_company_id ───
    for (const table of this.companyTables) {
      const constraintName = `FK_${table}_unified_company`;
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${table}"
            ADD CONSTRAINT "${constraintName}"
            FOREIGN KEY (unified_company_id) REFERENCES companies(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
    }

    // ─── Step 6: Add FK constraints for unified user columns ───
    for (const { table, columns } of this.userFkColumns) {
      for (const col of columns) {
        const unifiedCol = `unified_${col}`;
        const constraintName = `FK_${table}_${unifiedCol}`;
        await queryRunner.query(`
          DO $$ BEGIN
            ALTER TABLE "${table}"
              ADD CONSTRAINT "${constraintName}"
              FOREIGN KEY ("${unifiedCol}") REFERENCES "user"(id) ON DELETE SET NULL;
          EXCEPTION WHEN duplicate_object THEN NULL;
          END $$
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unified user FK constraints and columns
    for (const { table, columns } of this.userFkColumns) {
      for (const col of columns) {
        const unifiedCol = `unified_${col}`;
        const constraintName = `FK_${table}_${unifiedCol}`;
        await queryRunner.query(`
          ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraintName}"
        `);
        await queryRunner.query(`
          ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${unifiedCol}"
        `);
      }
    }

    // Drop unified_company_id FK constraints and columns
    for (const table of this.companyTables) {
      const constraintName = `FK_${table}_unified_company`;
      await queryRunner.query(`
        ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraintName}"
      `);
      await queryRunner.query(`
        ALTER TABLE "${table}" DROP COLUMN IF EXISTS unified_company_id
      `);
    }
  }
}
