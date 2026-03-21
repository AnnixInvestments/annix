import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidateQaSteps1807000000061 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const companies = await queryRunner.query("SELECT id FROM stock_control_companies");

    for (const company of companies) {
      const companyId = company.id;

      await queryRunner.query(
        `INSERT INTO workflow_step_configs (company_id, key, label, sort_order, is_system, is_background, trigger_after_step, action_label, branch_color)
         VALUES ($1, 'qc_batch_certs', 'Rubber/Paint Certs', 8, true, true, 'quality_check', 'Certs Done', NULL)
         ON CONFLICT (company_id, key) DO NOTHING`,
        [companyId],
      );

      await queryRunner.query(
        `INSERT INTO workflow_step_configs (company_id, key, label, sort_order, is_system, is_background, trigger_after_step, action_label, branch_color)
         VALUES ($1, 'qc_repairs', 'Rubber/Paint Repairs', 10, true, true, 'quality_check', 'Repairs Done', NULL)
         ON CONFLICT (company_id, key) DO NOTHING`,
        [companyId],
      );

      const rubberCertCompletions = await queryRunner.query(
        `SELECT job_card_id, completed_by_id, completed_by_name, completed_at, notes, completion_type
         FROM job_card_background_completions
         WHERE company_id = $1 AND step_key = 'qc_rubber_batch_certs'`,
        [companyId],
      );

      for (const c of rubberCertCompletions) {
        await queryRunner.query(
          `INSERT INTO job_card_background_completions (company_id, job_card_id, step_key, completed_by_id, completed_by_name, completed_at, notes, completion_type)
           VALUES ($1, $2, 'qc_batch_certs', $3, $4, $5, $6, $7)
           ON CONFLICT (job_card_id, step_key) DO NOTHING`,
          [
            companyId,
            c.job_card_id,
            c.completed_by_id,
            c.completed_by_name,
            c.completed_at,
            c.notes,
            c.completion_type,
          ],
        );
      }

      const paintCertCompletions = await queryRunner.query(
        `SELECT job_card_id, completed_by_id, completed_by_name, completed_at, notes, completion_type
         FROM job_card_background_completions
         WHERE company_id = $1 AND step_key = 'qc_paint_batch_certs'
           AND job_card_id NOT IN (
             SELECT job_card_id FROM job_card_background_completions
             WHERE company_id = $1 AND step_key = 'qc_batch_certs'
           )`,
        [companyId],
      );

      for (const c of paintCertCompletions) {
        await queryRunner.query(
          `INSERT INTO job_card_background_completions (company_id, job_card_id, step_key, completed_by_id, completed_by_name, completed_at, notes, completion_type)
           VALUES ($1, $2, 'qc_batch_certs', $3, $4, $5, $6, $7)
           ON CONFLICT (job_card_id, step_key) DO NOTHING`,
          [
            companyId,
            c.job_card_id,
            c.completed_by_id,
            c.completed_by_name,
            c.completed_at,
            c.notes,
            c.completion_type,
          ],
        );
      }

      const rubberRepairCompletions = await queryRunner.query(
        `SELECT job_card_id, completed_by_id, completed_by_name, completed_at, notes, completion_type
         FROM job_card_background_completions
         WHERE company_id = $1 AND step_key = 'qc_rubber_repairs'`,
        [companyId],
      );

      for (const c of rubberRepairCompletions) {
        await queryRunner.query(
          `INSERT INTO job_card_background_completions (company_id, job_card_id, step_key, completed_by_id, completed_by_name, completed_at, notes, completion_type)
           VALUES ($1, $2, 'qc_repairs', $3, $4, $5, $6, $7)
           ON CONFLICT (job_card_id, step_key) DO NOTHING`,
          [
            companyId,
            c.job_card_id,
            c.completed_by_id,
            c.completed_by_name,
            c.completed_at,
            c.notes,
            c.completion_type,
          ],
        );
      }

      const paintRepairCompletions = await queryRunner.query(
        `SELECT job_card_id, completed_by_id, completed_by_name, completed_at, notes, completion_type
         FROM job_card_background_completions
         WHERE company_id = $1 AND step_key = 'qc_paint_repairs'
           AND job_card_id NOT IN (
             SELECT job_card_id FROM job_card_background_completions
             WHERE company_id = $1 AND step_key = 'qc_repairs'
           )`,
        [companyId],
      );

      for (const c of paintRepairCompletions) {
        await queryRunner.query(
          `INSERT INTO job_card_background_completions (company_id, job_card_id, step_key, completed_by_id, completed_by_name, completed_at, notes, completion_type)
           VALUES ($1, $2, 'qc_repairs', $3, $4, $5, $6, $7)
           ON CONFLICT (job_card_id, step_key) DO NOTHING`,
          [
            companyId,
            c.job_card_id,
            c.completed_by_id,
            c.completed_by_name,
            c.completed_at,
            c.notes,
            c.completion_type,
          ],
        );
      }

      const oldKeys = [
        "qc_rubber_batch_certs",
        "qc_paint_batch_certs",
        "qc_rubber_repairs",
        "qc_paint_repairs",
        "qa_release",
      ];

      for (const key of oldKeys) {
        await queryRunner.query(
          "DELETE FROM job_card_background_completions WHERE company_id = $1 AND step_key = $2",
          [companyId, key],
        );
        await queryRunner.query(
          "DELETE FROM workflow_step_configs WHERE company_id = $1 AND key = $2",
          [companyId, key],
        );
      }

      await queryRunner.query(
        `UPDATE workflow_step_configs SET sort_order = 8
         WHERE company_id = $1 AND key = 'qc_batch_certs'`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE workflow_step_configs SET sort_order = 9
         WHERE company_id = $1 AND key = 'qa_review'`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE workflow_step_configs SET sort_order = 10
         WHERE company_id = $1 AND key = 'qc_repairs'`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE workflow_step_configs SET sort_order = 11
         WHERE company_id = $1 AND key = 'qa_final_check'`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE workflow_step_configs SET sort_order = 12
         WHERE company_id = $1 AND key = 'book_3rd_party_inspections'`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE workflow_step_configs SET sort_order = 13
         WHERE company_id = $1 AND key = 'compile_data_book'`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE workflow_step_configs SET sort_order = 17
         WHERE company_id = $1 AND key = 'contact_customer_collection'
           AND trigger_after_step = 'dispatched'`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE workflow_step_configs SET trigger_after_step = 'quality_check'
         WHERE company_id = $1 AND key = 'contact_customer_collection'`,
        [companyId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const companies = await queryRunner.query("SELECT id FROM stock_control_companies");

    for (const company of companies) {
      const companyId = company.id;

      await queryRunner.query(
        `INSERT INTO workflow_step_configs (company_id, key, label, sort_order, is_system, is_background, trigger_after_step, action_label)
         VALUES
           ($1, 'qc_rubber_batch_certs', 'Rubber Certs', 8, true, true, 'quality_check', 'Rubber Certs Done'),
           ($1, 'qc_paint_batch_certs', 'Paint Certs', 9, true, true, 'quality_check', 'Paint Certs Done'),
           ($1, 'qc_rubber_repairs', 'Rubber Repairs', 11, true, true, 'quality_check', 'Rubber Repaired'),
           ($1, 'qc_paint_repairs', 'Paint Repairs', 12, true, true, 'quality_check', 'Paint Repaired'),
           ($1, 'qa_release', 'QA Release', 16, true, true, 'quality_check', 'QA Released')
         ON CONFLICT (company_id, key) DO NOTHING`,
        [companyId],
      );

      await queryRunner.query(
        "DELETE FROM workflow_step_configs WHERE company_id = $1 AND key IN ('qc_batch_certs', 'qc_repairs')",
        [companyId],
      );

      await queryRunner.query(
        `UPDATE workflow_step_configs SET trigger_after_step = 'dispatched'
         WHERE company_id = $1 AND key = 'contact_customer_collection'`,
        [companyId],
      );
    }
  }
}
