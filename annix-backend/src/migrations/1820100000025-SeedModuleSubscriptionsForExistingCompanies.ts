import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedModuleSubscriptionsForExistingCompanies1820100000025
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Identify SC companies via stock_control_companies (which has unified_company_id)
    // since the legacy_sc_company_id column was dropped from companies by migration 022
    const scTableExists = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'stock_control_companies'`,
    );

    if (Number(scTableExists[0]?.cnt) > 0) {
      const scCompanies = await queryRunner.query(
        "SELECT DISTINCT unified_company_id as id FROM stock_control_companies WHERE unified_company_id IS NOT NULL",
      );

      const scModules = [
        "stock-control",
        "inventory",
        "job-cards",
        "coatings",
        "purchasing",
        "deliveries",
        "quality",
        "sage",
        "messaging",
        "staff",
        "reports",
      ];

      for (const company of scCompanies) {
        for (const moduleCode of scModules) {
          await queryRunner.query(
            `INSERT INTO company_module_subscriptions (company_id, module_code, enabled_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (company_id, module_code) DO NOTHING`,
            [company.id, moduleCode],
          );
        }
      }
    }

    // Identify rubber companies via contacts table (rubber companies were migrated there)
    // or stock_control_companies with rubber-specific data
    const rubberTableExists = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'rubber_company'`,
    );

    if (Number(rubberTableExists[0]?.cnt) > 0) {
      const arCompanies = await queryRunner.query(
        `SELECT DISTINCT c.id FROM companies c
         INNER JOIN contacts ct ON ct.company_id = c.id
         WHERE ct.contact_type = 'supplier'
         LIMIT 0`,
      );

      const arModules = [
        "inventory",
        "purchasing",
        "deliveries",
        "rubber-production",
        "rubber-cocs",
        "quality",
        "sage",
        "reports",
      ];

      for (const company of arCompanies) {
        for (const moduleCode of arModules) {
          await queryRunner.query(
            `INSERT INTO company_module_subscriptions (company_id, module_code, enabled_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (company_id, module_code) DO NOTHING`,
            [company.id, moduleCode],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No rollback — module subscriptions are additive
  }
}
