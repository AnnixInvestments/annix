import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedModuleSubscriptionsForExistingCompanies1820100000025
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const scCompanies = await queryRunner.query(
      "SELECT id FROM companies WHERE legacy_sc_company_id IS NOT NULL",
    );

    const scModules = [
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

    const arCompanies = await queryRunner.query(
      "SELECT id FROM companies WHERE legacy_rubber_company_id IS NOT NULL",
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM company_module_subscriptions
       WHERE company_id IN (SELECT id FROM companies WHERE legacy_sc_company_id IS NOT NULL OR legacy_rubber_company_id IS NOT NULL)`,
    );
  }
}
