import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaSeedRegulatoryUpdates1807000000005 implements MigrationInterface {
  name = "ComplySaSeedRegulatoryUpdates1807000000005";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO comply_sa_regulatory_updates (title, summary, category, effective_date, source_url, affected_requirement_codes)
      VALUES
        (
          'VAT Registration Threshold Increased to R2.3 Million',
          'The 2026 Budget has increased the mandatory VAT registration threshold from R1 million to R2.3 million in taxable turnover over a 12-month period. Businesses currently registered with turnover below the new threshold may apply to deregister. Voluntary registration remains available for businesses with turnover exceeding R50,000.',
          'tax',
          '2026-04-01',
          NULL,
          '["SARS_VAT_REGISTRATION", "SARS_VAT_RETURNS"]'
        ),
        (
          'National Minimum Wage Increase to R30.23/hour',
          'The National Minimum Wage has increased from R27.58 to R30.23 per hour effective 1 March 2026, representing a 9.6% increase. All employers must update payroll systems and ensure compliance. The expanded public works programme rate has also been adjusted.',
          'labour',
          '2026-03-01',
          NULL,
          '["MINIMUM_WAGE"]'
        ),
        (
          'Employment Equity Turnover Threshold Removed',
          'The Employment Equity Amendment Act now requires only designated employers with 50 or more employees to comply with employment equity plans and reporting, removing the previous turnover-based threshold. This simplifies compliance for smaller businesses that previously qualified based on turnover alone.',
          'labour',
          '2025-01-01',
          NULL,
          '["EE_REPORTING"]'
        ),
        (
          'CIPC Beneficial Ownership Hard Stop Enforced',
          'CIPC now enforces a hard stop blocking all company transactions (including annual return filing) for entities that have not filed their beneficial ownership register. Companies must submit their BO register through the CIPC e-services portal before any other filings can proceed.',
          'corporate',
          '2024-07-01',
          NULL,
          '["CIPC_BENEFICIAL_OWNERSHIP", "CIPC_ANNUAL_RETURN"]'
        ),
        (
          'COIDA Assessment Thresholds Increased for 2025/2026',
          'The Compensation Fund has increased the minimum annual assessment for COIDA to R1,621 for the 2025/2026 period. Employers must ensure their assessments are up to date and Letters of Good Standing are renewed. Late payment attracts interest at the prescribed rate.',
          'labour',
          '2025-04-01',
          NULL,
          '["COIDA_REGISTRATION", "COIDA_GOOD_STANDING"]'
        )
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM comply_sa_regulatory_updates
      WHERE title IN (
        'VAT Registration Threshold Increased to R2.3 Million',
        'National Minimum Wage Increase to R30.23/hour',
        'Employment Equity Turnover Threshold Removed',
        'CIPC Beneficial Ownership Hard Stop Enforced',
        'COIDA Assessment Thresholds Increased for 2025/2026'
      )
    `);
  }
}
