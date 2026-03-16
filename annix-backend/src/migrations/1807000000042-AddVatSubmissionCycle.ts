import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVatSubmissionCycle1807000000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE comply_sa_companies
      ADD COLUMN IF NOT EXISTS vat_submission_cycle VARCHAR(10) DEFAULT NULL
    `);

    await queryRunner.query(`
      UPDATE comply_sa_compliance_requirements
      SET deadline_rule = '{"type": "bi_monthly", "day": 25}'::jsonb
      WHERE code = 'SARS_VAT_RETURNS'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE comply_sa_companies
      DROP COLUMN IF EXISTS vat_submission_cycle
    `);

    await queryRunner.query(`
      UPDATE comply_sa_compliance_requirements
      SET deadline_rule = '{"type": "fixed_monthly", "day": 25}'::jsonb
      WHERE code = 'SARS_VAT_RETURNS'
    `);
  }
}
