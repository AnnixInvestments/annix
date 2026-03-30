import type { MigrationInterface, QueryRunner } from "typeorm";

export class DeduplicateCalloffRecordsAndFixDeliveryMatch1809000000020
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM cpo_calloff_records
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM cpo_calloff_records
        WHERE job_card_id IS NOT NULL
        GROUP BY company_id, cpo_id, job_card_id, calloff_type
      )
      AND job_card_id IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'uq_calloff_company_cpo_jc_type'
        ) THEN
          ALTER TABLE cpo_calloff_records
          ADD CONSTRAINT uq_calloff_company_cpo_jc_type
          UNIQUE (company_id, cpo_id, job_card_id, calloff_type);
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cpo_calloff_records
      DROP CONSTRAINT IF EXISTS uq_calloff_company_cpo_jc_type
    `);
  }
}
