import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBoqNumberToMatchRfq1766000360000 implements MigrationInterface {
  name = 'FixBoqNumberToMatchRfq1766000360000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE boqs b
      SET boq_number = REPLACE(r.rfq_number, 'RFQ-', 'BOQ-')
      FROM rfqs r
      WHERE b.rfq_id = r.id
      AND b.boq_number != REPLACE(r.rfq_number, 'RFQ-', 'BOQ-')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration cannot be safely reverted as we don't store original BOQ numbers
  }
}
