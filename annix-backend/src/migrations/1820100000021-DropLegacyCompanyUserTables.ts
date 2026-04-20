import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacyCompanyUserTables1820100000021 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // NO-OP: Legacy SC tables (stock_control_users, stock_control_companies,
    // stock_control_profiles, stock_control_company_roles) cannot be dropped yet.
    // The auth guard, auth service, and many controllers still reference these
    // entities. Dropping them crashes the app at startup.
    //
    // This migration will be re-enabled once ALL service code has been migrated
    // to use the unified User, Company, and StockControlProfile entities exclusively.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
