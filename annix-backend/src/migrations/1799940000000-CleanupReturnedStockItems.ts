import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupReturnedStockItems1799940000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const returnedItems = await queryRunner.query(
      `SELECT id, sku, name FROM stock_items WHERE LOWER(name) LIKE '%returned%' OR LOWER(name) LIKE '%return%'`,
    );

    for (const item of returnedItems) {
      await queryRunner.query("DELETE FROM stock_movements WHERE stock_item_id = $1", [item.id]);
      await queryRunner.query("DELETE FROM delivery_note_items WHERE stock_item_id = $1", [
        item.id,
      ]);
      await queryRunner.query("DELETE FROM stock_items WHERE id = $1", [item.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore deleted items
  }
}
