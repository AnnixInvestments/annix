import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReorderQtyAndReqNumberToRequisitionItems1772109400000
  implements MigrationInterface
{
  name = "AddReorderQtyAndReqNumberToRequisitionItems1772109400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requisition_items" ADD "reorder_qty" integer`);
    await queryRunner.query(
      `ALTER TABLE "requisition_items" ADD "req_number" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requisition_items" DROP COLUMN "req_number"`);
    await queryRunner.query(`ALTER TABLE "requisition_items" DROP COLUMN "reorder_qty"`);
  }
}
