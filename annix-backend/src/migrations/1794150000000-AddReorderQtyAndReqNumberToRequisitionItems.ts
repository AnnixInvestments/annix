import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReorderQtyAndReqNumberToRequisitionItems1794150000000
  implements MigrationInterface
{
  name = "AddReorderQtyAndReqNumberToRequisitionItems1794150000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "requisition_items" ADD COLUMN IF NOT EXISTS "reorder_qty" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "requisition_items" ADD COLUMN IF NOT EXISTS "req_number" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requisition_items" DROP COLUMN "req_number"`);
    await queryRunner.query(`ALTER TABLE "requisition_items" DROP COLUMN "reorder_qty"`);
  }
}
