import { MigrationInterface, QueryRunner } from "typeorm";

export class ReclassifyCalenderRollCocs1807000000053 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_supplier_cocs
      SET coc_type = 'CALENDER_ROLL'
      WHERE coc_number IN ('B209-257', 'B228-233')
        AND coc_type = 'COMPOUNDER'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_supplier_cocs
      SET coc_type = 'COMPOUNDER'
      WHERE coc_number IN ('B209-257', 'B228-233')
        AND coc_type = 'CALENDER_ROLL'
    `);
  }
}
