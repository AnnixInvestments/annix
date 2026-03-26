import { MigrationInterface, QueryRunner } from "typeorm";

export class ClearAllRubberOrders1809000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE rubber_productions SET order_id = NULL WHERE order_id IS NOT NULL",
    );

    await queryRunner.query("DELETE FROM rubber_order");
  }

  public async down(): Promise<void> {
    // Data deletion is not reversible
  }
}
