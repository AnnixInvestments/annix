import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedRubberSupplierCompanies1800700000000 implements MigrationInterface {
  name = "SeedRubberSupplierCompanies1800700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO rubber_company (firebase_uid, name, company_type, code, created_at, updated_at)
      VALUES ('supplier-impilo-industries', 'Impilo Industries', 'SUPPLIER', 'IMP', NOW(), NOW())
      ON CONFLICT (firebase_uid) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO rubber_company (firebase_uid, name, company_type, code, created_at, updated_at)
      VALUES ('supplier-sn-rubber', 'S&N Rubber', 'SUPPLIER', 'SN', NOW(), NOW())
      ON CONFLICT (firebase_uid) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM rubber_company WHERE firebase_uid IN ('supplier-impilo-industries', 'supplier-sn-rubber')`,
    );
  }
}
