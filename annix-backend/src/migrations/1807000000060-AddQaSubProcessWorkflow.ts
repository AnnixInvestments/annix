import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQaSubProcessWorkflow1807000000060 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_background_completions
      ADD COLUMN IF NOT EXISTS completion_type VARCHAR(20) DEFAULT 'manual'
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS branch_color VARCHAR(20)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qa_review_decisions (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        cycle_number INTEGER NOT NULL DEFAULT 1,
        rubber_applicable BOOLEAN NOT NULL DEFAULT false,
        paint_applicable BOOLEAN NOT NULL DEFAULT false,
        rubber_accepted BOOLEAN,
        paint_accepted BOOLEAN,
        reviewed_by_id INTEGER,
        reviewed_by_name VARCHAR(255),
        reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qa_review_decisions_jc ON qa_review_decisions(job_card_id)
    `);

    const qaSteps = [
      {
        key: "qa_check",
        label: "QA Check",
        sortOrder: 7,
        actionLabel: "QA Checked",
        branchColor: "#3b82f6",
      },
      {
        key: "qc_rubber_batch_certs",
        label: "Rubber Certs",
        sortOrder: 8,
        actionLabel: "Rubber Certs Done",
        branchColor: null,
      },
      {
        key: "qc_paint_batch_certs",
        label: "Paint Certs",
        sortOrder: 9,
        actionLabel: "Paint Certs Done",
        branchColor: null,
      },
      {
        key: "qa_review",
        label: "QA Review",
        sortOrder: 10,
        actionLabel: "QA Reviewed",
        branchColor: null,
      },
      {
        key: "qc_rubber_repairs",
        label: "Rubber Repairs",
        sortOrder: 11,
        actionLabel: "Rubber Repaired",
        branchColor: null,
      },
      {
        key: "qc_paint_repairs",
        label: "Paint Repairs",
        sortOrder: 12,
        actionLabel: "Paint Repaired",
        branchColor: null,
      },
      {
        key: "qa_final_check",
        label: "QA Final",
        sortOrder: 13,
        actionLabel: "Final Check Done",
        branchColor: null,
      },
      {
        key: "book_3rd_party_inspections",
        label: "3rd Party Insp",
        sortOrder: 14,
        actionLabel: "Inspections Booked",
        branchColor: null,
      },
      {
        key: "compile_data_book",
        label: "Data Book",
        sortOrder: 15,
        actionLabel: "Data Book Compiled",
        branchColor: null,
      },
      {
        key: "qa_release",
        label: "QA Release",
        sortOrder: 16,
        actionLabel: "QA Released",
        branchColor: null,
      },
    ];

    const companies = await queryRunner.query("SELECT id FROM stock_control_companies");

    for (const company of companies) {
      await queryRunner.query(
        `DELETE FROM workflow_step_configs WHERE company_id = $1 AND key = 'ready'`,
        [company.id],
      );

      for (const step of qaSteps) {
        await queryRunner.query(
          `INSERT INTO workflow_step_configs (company_id, key, label, sort_order, is_system, is_background, trigger_after_step, action_label, branch_color)
           VALUES ($1, $2, $3, $4, true, true, 'quality_check', $5, $6)
           ON CONFLICT (company_id, key) DO NOTHING`,
          [company.id, step.key, step.label, step.sortOrder, step.actionLabel, step.branchColor],
        );
      }

      const readyCompletions = await queryRunner.query(
        `SELECT job_card_id, company_id, completed_by_id, completed_by_name, completed_at, notes
         FROM job_card_background_completions
         WHERE company_id = $1 AND step_key = 'ready'`,
        [company.id],
      );

      for (const completion of readyCompletions) {
        await queryRunner.query(
          `INSERT INTO job_card_background_completions (company_id, job_card_id, step_key, completed_by_id, completed_by_name, completed_at, notes, completion_type)
           VALUES ($1, $2, 'qa_release', $3, $4, $5, $6, 'migrated')
           ON CONFLICT (job_card_id, step_key) DO NOTHING`,
          [
            completion.company_id,
            completion.job_card_id,
            completion.completed_by_id,
            completion.completed_by_name,
            completion.completed_at,
            completion.notes,
          ],
        );

        const allQaKeys = qaSteps.filter((s) => s.key !== "qa_release").map((s) => s.key);
        for (const qaKey of allQaKeys) {
          await queryRunner.query(
            `INSERT INTO job_card_background_completions (company_id, job_card_id, step_key, completed_by_id, completed_by_name, completed_at, notes, completion_type)
             VALUES ($1, $2, $3, $4, $5, $6, 'Migrated from ready step', 'migrated')
             ON CONFLICT (job_card_id, step_key) DO NOTHING`,
            [
              completion.company_id,
              completion.job_card_id,
              qaKey,
              completion.completed_by_id,
              completion.completed_by_name,
              completion.completed_at,
            ],
          );
        }
      }

      await queryRunner.query(
        `DELETE FROM job_card_background_completions WHERE company_id = $1 AND step_key = 'ready'`,
        [company.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const companies = await queryRunner.query("SELECT id FROM stock_control_companies");
    const qaKeys = [
      "qa_check",
      "qc_rubber_batch_certs",
      "qc_paint_batch_certs",
      "qa_review",
      "qc_rubber_repairs",
      "qc_paint_repairs",
      "qa_final_check",
      "book_3rd_party_inspections",
      "compile_data_book",
      "qa_release",
    ];

    for (const company of companies) {
      await queryRunner.query(
        `INSERT INTO workflow_step_configs (company_id, key, label, sort_order, is_system, is_background, trigger_after_step, action_label)
         VALUES ($1, 'ready', 'Ready', 7, true, true, 'quality_check', 'Ready')
         ON CONFLICT (company_id, key) DO NOTHING`,
        [company.id],
      );

      const qaReleaseCompletions = await queryRunner.query(
        `SELECT job_card_id, company_id, completed_by_id, completed_by_name, completed_at, notes
         FROM job_card_background_completions
         WHERE company_id = $1 AND step_key = 'qa_release'`,
        [company.id],
      );

      for (const completion of qaReleaseCompletions) {
        await queryRunner.query(
          `INSERT INTO job_card_background_completions (company_id, job_card_id, step_key, completed_by_id, completed_by_name, completed_at, notes)
           VALUES ($1, $2, 'ready', $3, $4, $5, $6)
           ON CONFLICT (job_card_id, step_key) DO NOTHING`,
          [
            completion.company_id,
            completion.job_card_id,
            completion.completed_by_id,
            completion.completed_by_name,
            completion.completed_at,
            completion.notes,
          ],
        );
      }

      for (const key of qaKeys) {
        await queryRunner.query(
          "DELETE FROM job_card_background_completions WHERE company_id = $1 AND step_key = $2",
          [company.id, key],
        );
        await queryRunner.query(
          "DELETE FROM workflow_step_configs WHERE company_id = $1 AND key = $2",
          [company.id, key],
        );
      }
    }

    await queryRunner.query("DROP INDEX IF EXISTS idx_qa_review_decisions_jc");
    await queryRunner.query("DROP TABLE IF EXISTS qa_review_decisions");
    await queryRunner.query("ALTER TABLE workflow_step_configs DROP COLUMN IF EXISTS branch_color");
    await queryRunner.query(
      "ALTER TABLE job_card_background_completions DROP COLUMN IF EXISTS completion_type",
    );
  }
}
