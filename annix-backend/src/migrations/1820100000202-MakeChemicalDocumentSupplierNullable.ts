import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeChemicalDocumentSupplierNullable1820100000202 implements MigrationInterface {
  name = "MakeChemicalDocumentSupplierNullable1820100000202";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chemical_supplier_documents" ALTER COLUMN "supplier_company_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chemical_supplier_documents" ALTER COLUMN "supplier_company_id" SET NOT NULL`,
    );
  }
}
