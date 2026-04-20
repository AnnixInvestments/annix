import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacyCompanyUserTables1820100000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const scCompanyCount = await queryRunner.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = 'stock_control_companies'",
    );
    const scExists = Number(scCompanyCount[0]?.cnt) > 0;

    if (!scExists) {
      return;
    }

    const unmigratedSc = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM stock_control_companies
      WHERE id NOT IN (SELECT legacy_sc_company_id FROM companies WHERE legacy_sc_company_id IS NOT NULL)
    `);

    if (Number(unmigratedSc[0]?.cnt) > 0) {
      throw new Error(
        `Cannot drop legacy tables: ${unmigratedSc[0].cnt} stock_control_companies not yet migrated to unified companies table. Run data migration first.`,
      );
    }

    const rubberTableExists = await queryRunner.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = 'rubber_company'",
    );

    if (Number(rubberTableExists[0]?.cnt) > 0) {
      const unmigratedRubber = await queryRunner.query(`
        SELECT COUNT(*) as cnt FROM rubber_company
        WHERE id NOT IN (SELECT legacy_rubber_company_id FROM companies WHERE legacy_rubber_company_id IS NOT NULL)
          AND id NOT IN (SELECT COALESCE(legacy_rubber_company_id, 0) FROM contacts WHERE legacy_rubber_company_id IS NOT NULL)
      `);

      if (Number(unmigratedRubber[0]?.cnt) > 0) {
        throw new Error(
          `Cannot drop legacy tables: ${unmigratedRubber[0].cnt} rubber_company records not yet migrated. Run data migration first.`,
        );
      }
    }

    await queryRunner.query("DROP TABLE IF EXISTS stock_control_action_permissions CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_company_roles CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_profiles CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_users CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_companies CASCADE");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        RAISE NOTICE 'Legacy SC tables cannot be restored from this migration. Restore from backup if needed.';
      END $$
    `);
  }
}
