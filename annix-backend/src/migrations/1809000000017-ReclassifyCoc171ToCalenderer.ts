import type { MigrationInterface, QueryRunner } from "typeorm";

export class ReclassifyCoc171ToCalenderer1809000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_supplier_cocs
      SET coc_type = 'CALENDARER'
      WHERE id = 171
        AND coc_type != 'CALENDARER'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_supplier_cocs
      SET coc_type = 'COMPOUNDER'
      WHERE id = 171
        AND coc_type = 'CALENDARER'
    `);
  }
}
