import { MigrationInterface, QueryRunner } from "typeorm";

export class ReverseWrongBatchCertSkips1819400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM job_card_background_completions
      WHERE step_key IN ('qc_batch_certs', 'qc_repairs', 'qa_review')
        AND completion_type = 'skipped'
        AND notes = 'Auto-skipped — not applicable'
        AND job_card_id IN (
          SELECT jc.id
          FROM job_cards jc
          JOIN job_card_coating_analyses ca ON ca.job_card_id = jc.id AND ca.company_id = jc.company_id
          WHERE (ca.has_internal_lining = true OR jsonb_array_length(COALESCE(ca.coats, '[]'::jsonb)) > 0
                 OR jsonb_array_length(COALESCE(ca.stock_assessment, '[]'::jsonb)) > 0)
        )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no rollback — re-skipping would require re-evaluation
  }
}
