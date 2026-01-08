import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarkStep5DraftsAsConverted1767900001000
  implements MigrationInterface
{
  name = 'MarkStep5DraftsAsConverted1767900001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const draftsAtStep5 = await queryRunner.query(`
      SELECT d.id, d.draft_number, d.project_name, r.id as rfq_id, r.rfq_number
      FROM rfq_drafts d
      LEFT JOIN rfqs r ON d.project_name = r.project_name
      WHERE d.current_step = 5 AND d.is_converted = false
    `);

    console.log(`Found ${draftsAtStep5.length} drafts at step 5 to convert`);

    for (const draft of draftsAtStep5) {
      if (draft.rfq_id) {
        await queryRunner.query(
          `UPDATE rfq_drafts SET is_converted = true, converted_rfq_id = $1 WHERE id = $2`,
          [draft.rfq_id, draft.id],
        );
        console.log(
          `Marked draft ${draft.draft_number} as converted to RFQ ${draft.rfq_number}`,
        );
      } else {
        await queryRunner.query(
          `UPDATE rfq_drafts SET is_converted = true WHERE id = $1`,
          [draft.id],
        );
        console.log(
          `Marked draft ${draft.draft_number} as converted (no matching RFQ found)`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rfq_drafts
      SET is_converted = false, converted_rfq_id = NULL
      WHERE is_converted = true
    `);
  }
}
