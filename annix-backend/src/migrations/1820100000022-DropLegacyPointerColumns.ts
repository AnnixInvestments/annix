import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacyPointerColumns1820100000022 implements MigrationInterface {
  private async dropColumnIfTableExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    const tableExists = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}'`,
    );
    if (Number(tableExists[0]?.cnt) === 0) {
      return;
    }
    await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumnIfTableExists(queryRunner, "companies", "legacy_sc_company_id");
    await this.dropColumnIfTableExists(queryRunner, "companies", "legacy_rubber_company_id");
    await this.dropColumnIfTableExists(queryRunner, "companies", "legacy_comply_company_id");
    await this.dropColumnIfTableExists(queryRunner, "companies", "legacy_cv_company_id");

    await this.dropColumnIfTableExists(queryRunner, "contacts", "legacy_sc_supplier_id");
    await this.dropColumnIfTableExists(queryRunner, "contacts", "legacy_rubber_company_id");

    await this.dropColumnIfTableExists(queryRunner, "stock_control_profiles", "legacy_sc_user_id");
    await this.dropColumnIfTableExists(queryRunner, "cv_assistant_profiles", "legacy_cv_user_id");
    await this.dropColumnIfTableExists(queryRunner, "comply_sa_profiles", "legacy_comply_user_id");

    await this.dropColumnIfTableExists(queryRunner, "user", "password");
    await this.dropColumnIfTableExists(queryRunner, "user", "salt");

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_companies_legacy_sc_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_companies_legacy_rubber_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_companies_legacy_comply_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_companies_legacy_cv_company_id"`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Column restoration not supported — restore from backup if needed
  }
}
