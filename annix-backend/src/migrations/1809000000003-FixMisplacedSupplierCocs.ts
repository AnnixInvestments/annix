import type { MigrationInterface, QueryRunner } from "typeorm";

export class FixMisplacedSupplierCocs1809000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_supplier_cocs
      SET coc_type = 'CALENDARER'
      WHERE id IN (152, 153)
        AND coc_type = 'COMPOUNDER'
    `);

    await queryRunner.query(`
      UPDATE rubber_supplier_cocs
      SET graph_pdf_path = (
        SELECT document_path FROM rubber_supplier_cocs WHERE id = 163
      )
      WHERE id = (
        SELECT sc.id
        FROM rubber_supplier_cocs sc
        WHERE sc.supplier_company_id = (SELECT supplier_company_id FROM rubber_supplier_cocs WHERE id = 163)
          AND sc.coc_type = 'COMPOUNDER'
          AND sc.id != 163
          AND sc.graph_pdf_path IS NULL
        ORDER BY sc.id DESC
        LIMIT 1
      )
      AND EXISTS (SELECT 1 FROM rubber_supplier_cocs WHERE id = 163)
    `);

    await queryRunner.query(`
      DELETE FROM rubber_supplier_cocs WHERE id = 163
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_supplier_cocs
      SET coc_type = 'COMPOUNDER'
      WHERE id IN (152, 153)
        AND coc_type = 'CALENDARER'
    `);
  }
}
